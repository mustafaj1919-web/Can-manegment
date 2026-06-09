import json
import os
import shutil
import tempfile
import zipfile
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path

from .config import Config, basedir


BACKUP_FOLDER = Config.BACKUP_FOLDER
DATABASE_PATH = Config.DATABASE_PATH
STATIC_UPLOADS_PATH = Config.UPLOAD_FOLDER
STATIC_IMAGES_PATH = Config.STATIC_IMAGES_FOLDER

_DB_URL = Config.SQLALCHEMY_DATABASE_URI
_IS_PG = _DB_URL.startswith('postgresql')


def ensure_backup_folder():
    os.makedirs(BACKUP_FOLDER, exist_ok=True)


def _safe_name(value):
    return ''.join(char if char.isalnum() or char in ('-', '_') else '_' for char in value)


def _add_path_to_zip(zip_file, source_path, archive_root):
    if not os.path.exists(source_path):
        return
    if os.path.isfile(source_path):
        zip_file.write(source_path, archive_root)
        return
    for root, _, files in os.walk(source_path):
        for filename in files:
            full_path = os.path.join(root, filename)
            relative_path = os.path.relpath(full_path, source_path)
            zip_file.write(full_path, os.path.join(archive_root, relative_path))


def _backup_filename(timestamp):
    filename = f'backup_{timestamp}.zip'
    candidate = os.path.join(BACKUP_FOLDER, filename)
    if not os.path.exists(candidate):
        return filename
    return f'backup_{timestamp}_{datetime.utcnow().strftime("%f")}.zip'


def _json_default(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)


def _export_db_to_json(zip_file):
    """Export all PostgreSQL (or SQLite) tables to JSON files inside the ZIP."""
    from sqlalchemy import create_engine, MetaData, text

    engine = create_engine(_DB_URL)
    meta = MetaData()
    meta.reflect(bind=engine)

    db_data = {}
    with engine.connect() as conn:
        for table_name, table in meta.tables.items():
            rows = conn.execute(table.select()).fetchall()
            col_names = [c.key for c in table.columns]
            db_data[table_name] = [
                {col: row[i] for i, col in enumerate(col_names)}
                for row in rows
            ]

    zip_file.writestr(
        'database/data.json',
        json.dumps(db_data, ensure_ascii=False, indent=2, default=_json_default),
    )
    zip_file.writestr(
        'database/db_type.txt',
        'postgresql' if _IS_PG else 'sqlite',
    )


def _restore_db_from_json(temp_root):
    """Restore all tables from the JSON export."""
    from sqlalchemy import create_engine, MetaData, text

    data_path = os.path.join(temp_root, 'database', 'data.json')
    if not os.path.exists(data_path):
        raise ValueError('Backup does not contain database/data.json')

    with open(data_path, encoding='utf-8') as f:
        db_data = json.load(f)

    engine = create_engine(_DB_URL)
    meta = MetaData()
    meta.reflect(bind=engine)

    # Topological sort to avoid FK violations
    from collections import defaultdict, deque
    with engine.connect() as conn:
        fk_rows = conn.execute(text("""
            SELECT kcu.table_name AS child, ccu.table_name AS parent
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = rc.unique_constraint_name
             AND ccu.table_schema = rc.unique_constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
        """ if _IS_PG else "SELECT '' AS child, '' AS parent WHERE 1=0")).fetchall()

    all_tables = set(meta.tables)
    in_degree = defaultdict(int)
    dependents = defaultdict(set)
    for child, parent in fk_rows:
        if child == parent or child not in all_tables or parent not in all_tables:
            continue
        if child not in dependents[parent]:
            dependents[parent].add(child)
            in_degree[child] += 1

    queue = deque(sorted(t for t in all_tables if in_degree[t] == 0))
    topo_order = []
    while queue:
        node = queue.popleft()
        topo_order.append(node)
        for child in sorted(dependents[node]):
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)
    topo_order.extend(t for t in all_tables if t not in topo_order)

    with engine.connect() as conn:
        if _IS_PG:
            tables_list = ', '.join(f'"{t}"' for t in topo_order if t in db_data)
            if tables_list:
                conn.execute(text(f'TRUNCATE {tables_list}'))
        else:
            conn.execute(text('PRAGMA foreign_keys = OFF'))
            for t in reversed(topo_order):
                if t in meta.tables:
                    conn.execute(meta.tables[t].delete())

        for table_name in topo_order:
            if table_name not in db_data or table_name not in meta.tables:
                continue
            rows = db_data[table_name]
            if not rows:
                continue
            table = meta.tables[table_name]
            conn.execute(table.insert(), rows)

        if _IS_PG:
            for table_name in topo_order:
                if table_name not in meta.tables:
                    continue
                tbl = meta.tables[table_name]
                for col in tbl.primary_key.columns:
                    try:
                        seq = conn.execute(
                            text('SELECT pg_get_serial_sequence(:t, :c)'),
                            {'t': table_name, 'c': col.name}
                        ).scalar()
                        if seq:
                            max_id = conn.execute(
                                text(f'SELECT COALESCE(MAX("{col.name}"), 1) FROM "{table_name}"')
                            ).scalar()
                            conn.execute(
                                text('SELECT setval(:seq, :v, true)'),
                                {'seq': seq, 'v': int(max_id)}
                            )
                    except Exception:
                        pass
        else:
            conn.execute(text('PRAGMA foreign_keys = ON'))

        conn.commit()


def create_backup_archive(created_by='system', reason='manual'):
    ensure_backup_folder()
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = _backup_filename(timestamp)
    backup_path = os.path.join(BACKUP_FOLDER, filename)
    db_label = 'postgresql' if _IS_PG else 'sqlite'
    metadata = {
        'created_at': datetime.utcnow().isoformat(timespec='seconds'),
        'created_by': created_by or 'system',
        'reason': reason or 'manual',
        'database': db_label,
        'includes': [f'database/data.json ({db_label})', 'static/uploads', 'static/images'],
    }

    with zipfile.ZipFile(backup_path, 'w', compression=zipfile.ZIP_DEFLATED) as zip_file:
        _export_db_to_json(zip_file)
        if not _IS_PG and os.path.exists(DATABASE_PATH):
            zip_file.write(DATABASE_PATH, 'database/showroom.db')
        _add_path_to_zip(zip_file, STATIC_UPLOADS_PATH, 'static/uploads')
        _add_path_to_zip(zip_file, STATIC_IMAGES_PATH, 'static/images')
        zip_file.writestr('metadata.json', json.dumps(metadata, ensure_ascii=False, indent=2))

    return {
        **metadata,
        'filename': filename,
        'path': backup_path,
        'size': os.path.getsize(backup_path),
    }


def ensure_daily_backup(created_by='system'):
    ensure_backup_folder()
    today = datetime.utcnow().date().isoformat()
    for item in list_backup_archives():
        if item.get('reason') != 'daily_auto':
            continue
        created_at = str(item.get('created_at') or '')
        if created_at.startswith(today):
            return None
    return create_backup_archive(created_by=created_by, reason='daily_auto')


def list_backup_archives():
    ensure_backup_folder()
    backups = []
    for path in Path(BACKUP_FOLDER).glob('*.zip'):
        metadata = {}
        try:
            with zipfile.ZipFile(path, 'r') as zip_file:
                if 'metadata.json' in zip_file.namelist():
                    metadata = json.loads(zip_file.read('metadata.json').decode('utf-8'))
        except (OSError, zipfile.BadZipFile, json.JSONDecodeError, UnicodeDecodeError):
            metadata = {}

        backups.append({
            'filename': path.name,
            'created_at': metadata.get('created_at') or datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec='seconds'),
            'created_by': metadata.get('created_by') or 'unknown',
            'reason': metadata.get('reason') or 'unknown',
            'size': path.stat().st_size,
        })
    return sorted(backups, key=lambda item: item['created_at'], reverse=True)


def get_backup_path(filename):
    ensure_backup_folder()
    candidate = os.path.abspath(os.path.join(BACKUP_FOLDER, filename))
    backup_root = os.path.abspath(BACKUP_FOLDER)
    if not candidate.startswith(backup_root + os.sep) or not candidate.endswith('.zip'):
        return None
    return candidate if os.path.exists(candidate) else None


def _replace_directory_from_backup(temp_root, archive_relative_path, target_path):
    source_path = os.path.join(temp_root, archive_relative_path)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    target_abs = os.path.abspath(target_path)
    static_abs = os.path.abspath(Config.STATIC_FOLDER)
    if not target_abs.startswith(static_abs + os.sep):
        raise ValueError('Unsafe restore target')
    if os.path.exists(target_abs):
        shutil.rmtree(target_abs)
    if os.path.exists(source_path):
        shutil.copytree(source_path, target_abs)
    else:
        os.makedirs(target_abs, exist_ok=True)


def _verify_backup_integrity(zip_file):
    """Validate that a backup ZIP contains expected structure and a valid manifest."""
    names = set(zip_file.namelist())
    for name in names:
        normalized = os.path.normpath(name)
        if os.path.isabs(name) or normalized.startswith('..') or '..' + os.sep in normalized:
            raise ValueError('Backup contains unsafe paths')
    if 'metadata.json' not in names:
        raise ValueError('Invalid backup: missing metadata.json')
    try:
        metadata = json.loads(zip_file.read('metadata.json').decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError(f'Invalid backup: malformed metadata.json ({exc})')
    if not isinstance(metadata, dict) or 'created_at' not in metadata:
        raise ValueError('Invalid backup: metadata.json missing required fields')
    has_json = 'database/data.json' in names
    has_sqlite = 'database/showroom.db' in names
    if not has_json and not has_sqlite:
        raise ValueError('Backup does not contain database/data.json or database/showroom.db')
    return names, has_json, has_sqlite


def restore_backup_archive(backup_path):
    if not backup_path or not os.path.exists(backup_path):
        raise FileNotFoundError('Backup file not found')
    with zipfile.ZipFile(backup_path, 'r') as zip_file:
        names, has_json, has_sqlite = _verify_backup_integrity(zip_file)
        with tempfile.TemporaryDirectory() as temp_root:
            zip_file.extractall(temp_root)
            if has_json:
                _restore_db_from_json(temp_root)
            elif has_sqlite and not _IS_PG:
                # Legacy: restore SQLite file directly
                os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
                shutil.copy2(os.path.join(temp_root, 'database', 'showroom.db'), DATABASE_PATH)
            elif has_sqlite and _IS_PG:
                raise ValueError(
                    'هذه نسخة احتياطية قديمة من SQLite ولا يمكن استعادتها إلى PostgreSQL تلقائياً. '
                    'استخدم migrate_to_pg.py لترحيل البيانات.'
                )
            _replace_directory_from_backup(temp_root, os.path.join('static', 'uploads'), STATIC_UPLOADS_PATH)
            _replace_directory_from_backup(temp_root, os.path.join('static', 'images'), STATIC_IMAGES_PATH)
