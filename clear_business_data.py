"""Empty PostgreSQL except the admin user and role permissions."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import uuid
import zipfile
from collections import defaultdict, deque
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine, func, select, text
from sqlalchemy.engine import make_url


BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"
EMPTY_DATABASE_MARKER = BASE_DIR / ".preserve_empty_database"
ADMIN_USERNAME = "admin"
PRESERVED_TABLES = {"user", "role_permission", "alembic_version"}

load_dotenv(ENV_FILE, override=False)
sys.path.insert(0, str(BASE_DIR))

from backend.backup_utils import create_backup_archive  # noqa: E402
from backend.config import Config  # noqa: E402


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yes", action="store_true", help="Skip confirmation.")
    parser.add_argument("--dry-run", action="store_true", help="Count only.")
    return parser.parse_args()


def make_engine():
    raw_url = os.environ.get("DATABASE_URL", "").strip()
    if not raw_url:
        raise RuntimeError(f"DATABASE_URL is missing from {ENV_FILE}.")
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)
    url = make_url(raw_url)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("This script only supports PostgreSQL.")
    return create_engine(url, future=True, pool_pre_ping=True), url


def row_counts(connection, metadata, names):
    return {
        name: int(
            connection.execute(
                select(func.count()).select_from(metadata.tables[name])
            ).scalar_one()
        )
        for name in sorted(names)
    }


def print_counts(title, counts):
    print(f"\n{title}")
    print("-" * 48)
    for name, count in counts.items():
        print(f"  {name:<32} {count:>10}")
    print(f"  {'TOTAL':<32} {sum(counts.values()):>10}")


def child_first_order(metadata, table_names):
    children = defaultdict(set)
    in_degree = defaultdict(int)
    for child_name in table_names:
        for foreign_key in metadata.tables[child_name].foreign_keys:
            parent_name = foreign_key.column.table.name
            if parent_name == child_name or parent_name not in table_names:
                continue
            if child_name not in children[parent_name]:
                children[parent_name].add(child_name)
                in_degree[child_name] += 1

    queue = deque(sorted(name for name in table_names if in_degree[name] == 0))
    parent_first = []
    while queue:
        name = queue.popleft()
        parent_first.append(name)
        for child_name in sorted(children[name]):
            in_degree[child_name] -= 1
            if in_degree[child_name] == 0:
                queue.append(child_name)

    unresolved = table_names - set(parent_first)
    if unresolved:
        raise RuntimeError(
            "Cannot calculate safe deletion order for: "
            + ", ".join(sorted(unresolved))
        )
    return list(reversed(parent_first))


def find_admin(connection, metadata):
    users = metadata.tables["user"]
    rows = connection.execute(
        select(users).where(users.c.username == ADMIN_USERNAME)
    ).mappings().all()
    if len(rows) != 1:
        raise RuntimeError(
            f'Expected exactly one "{ADMIN_USERNAME}" user, found {len(rows)}.'
        )
    admin = rows[0]
    if admin["role"] not in {"Admin", "Owner"}:
        raise RuntimeError(f'User "{ADMIN_USERNAME}" is not an administrator.')
    if "is_active_user" in users.c and not admin["is_active_user"]:
        raise RuntimeError(f'User "{ADMIN_USERNAME}" is disabled.')
    return admin


def create_verified_backup():
    print("\nCreating full backup...")
    result = create_backup_archive(
        created_by="clear_business_data.py",
        reason="pre_full_postgresql_clear",
    )
    path = Path(result["path"]).resolve()
    if not path.is_file() or path.stat().st_size == 0:
        raise RuntimeError("Backup archive is missing or empty.")
    with zipfile.ZipFile(path, "r") as archive:
        bad_file = archive.testzip()
        if bad_file:
            raise RuntimeError(f"Backup is corrupt at {bad_file!r}.")
        required = {"database/data.json", "metadata.json"}
        if not required <= set(archive.namelist()):
            raise RuntimeError("Backup archive is incomplete.")
    print(f"Backup verified: {path}")
    return path


def stage_uploads():
    upload_root = Path(Config.UPLOAD_FOLDER).resolve()
    upload_root.parent.mkdir(parents=True, exist_ok=True)
    if not upload_root.exists():
        upload_root.mkdir(parents=True)
        return None, upload_root, 0
    count = sum(1 for path in upload_root.rglob("*") if path.is_file())
    staging = upload_root.parent / f".clear_uploads_{uuid.uuid4().hex}"
    upload_root.replace(staging)
    upload_root.mkdir(parents=True)
    return staging, upload_root, count


def restore_uploads(staging, upload_root):
    if staging is None:
        return
    if upload_root.exists():
        shutil.rmtree(upload_root)
    staging.replace(upload_root)


def reset_empty_sequences(connection, metadata, table_names):
    for table_name in sorted(table_names):
        for column in metadata.tables[table_name].primary_key.columns:
            sequence = connection.execute(
                text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
                {"table_name": table_name, "column_name": column.name},
            ).scalar()
            if sequence:
                connection.execute(
                    text("SELECT setval(CAST(:sequence AS regclass), 1, false)"),
                    {"sequence": sequence},
                )


def reset_user_sequence(connection, metadata):
    users = metadata.tables["user"]
    for column in users.primary_key.columns:
        sequence = connection.execute(
            text("SELECT pg_get_serial_sequence('user', :column_name)"),
            {"column_name": column.name},
        ).scalar()
        if sequence:
            maximum = int(connection.execute(select(func.max(column))).scalar() or 1)
            connection.execute(
                text("SELECT setval(CAST(:sequence AS regclass), :value, true)"),
                {"sequence": sequence, "value": maximum},
            )


def run(yes, dry_run):
    engine, url = make_engine()
    metadata = MetaData()
    with engine.connect() as connection:
        metadata.reflect(bind=connection)
        actual_tables = set(metadata.tables)
        if not {"user", "role_permission"} <= actual_tables:
            raise RuntimeError("Required user/permission tables are missing.")
        clear_tables = actual_tables - PRESERVED_TABLES
        admin = find_admin(connection, metadata)
        before = row_counts(connection, metadata, clear_tables)
        kept_before = row_counts(
            connection, metadata, {"user", "role_permission"}
        )

    print("PostgreSQL target")
    print("-" * 48)
    print(f"  Host:       {url.host or 'localhost'}")
    print(f"  Port:       {url.port or 5432}")
    print(f"  Database:   {url.database}")
    print(f"  Keep user:  {admin['username']} ({admin['role']})")
    print_counts("Rows to delete", before)
    print_counts("Users and permissions before deletion", kept_before)

    if dry_run:
        print("\nDry run complete. Nothing was changed.")
        return 0
    if not yes:
        answer = input(
            "\nType DELETE EVERYTHING EXCEPT ADMIN to continue: "
        ).strip()
        if answer != "DELETE EVERYTHING EXCEPT ADMIN":
            print("Cancelled.")
            return 1

    backup_path = create_verified_backup()
    staging = None
    upload_root = Path(Config.UPLOAD_FOLDER).resolve()
    files_deleted = 0
    committed = False
    try:
        staging, upload_root, files_deleted = stage_uploads()
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                lock_tables = clear_tables | {"user", "role_permission"}
                quoted = ", ".join(
                    connection.dialect.identifier_preparer.quote(name)
                    for name in sorted(lock_tables)
                )
                connection.execute(
                    text(f"LOCK TABLE {quoted} IN ACCESS EXCLUSIVE MODE")
                )

                users = metadata.tables["user"]
                admin_values = {}
                if "branch_id" in users.c:
                    # Branches are being cleared; detach every user first so
                    # PostgreSQL foreign keys do not block branch deletion.
                    connection.execute(users.update().values(branch_id=None))
                if "can_access_all_branches" in users.c:
                    admin_values["can_access_all_branches"] = True
                if "is_active_user" in users.c:
                    admin_values["is_active_user"] = True
                if admin_values:
                    connection.execute(
                        users.update()
                        .where(users.c.username == ADMIN_USERNAME)
                        .values(**admin_values)
                    )

                for table_name in child_first_order(metadata, clear_tables):
                    connection.execute(metadata.tables[table_name].delete())
                connection.execute(
                    users.delete().where(users.c.username != ADMIN_USERNAME)
                )

                reset_empty_sequences(connection, metadata, clear_tables)
                reset_user_sequence(connection, metadata)

                remaining = {
                    name: count
                    for name, count in row_counts(
                        connection, metadata, clear_tables
                    ).items()
                    if count
                }
                if remaining:
                    raise RuntimeError(f"Rows remain after cleanup: {remaining}")

                final_users = connection.execute(
                    select(users.c.username)
                ).scalars().all()
                if final_users != [ADMIN_USERNAME]:
                    raise RuntimeError(f"Unexpected users remain: {final_users!r}")
                permission_count = connection.execute(
                    select(func.count()).select_from(
                        metadata.tables["role_permission"]
                    )
                ).scalar_one()
                if permission_count < 1:
                    raise RuntimeError("Permissions unexpectedly became empty.")

                transaction.commit()
                committed = True
            except Exception:
                if transaction.is_active:
                    transaction.rollback()
                raise
    except Exception:
        if not committed:
            restore_uploads(staging, upload_root)
        print("\nERROR: PostgreSQL transaction rolled back.")
        print(f"Backup remains at: {backup_path}")
        raise

    EMPTY_DATABASE_MARKER.write_text(
        "Remove this file to enable startup default-data seeding.\n",
        encoding="ascii",
    )
    if staging is not None:
        try:
            shutil.rmtree(staging)
        except OSError as exc:
            print(f"WARNING: Could not remove staged uploads: {exc}")

    with engine.connect() as connection:
        after = row_counts(connection, metadata, clear_tables)
        kept_after = row_counts(
            connection, metadata, {"user", "role_permission"}
        )
    print_counts("Rows after deletion", after)
    print_counts("Rows kept after deletion", kept_after)
    print(f"\nUploaded files deleted: {files_deleted}")
    print(f"Backup: {backup_path}")
    print(f"Startup seeding disabled by: {EMPTY_DATABASE_MARKER}")
    return 0


def main():
    args = parse_args()
    return run(args.yes, args.dry_run)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        raise SystemExit(130)
    except Exception as exc:
        print(f"\nFatal error: {exc}", file=sys.stderr)
        raise SystemExit(1)
