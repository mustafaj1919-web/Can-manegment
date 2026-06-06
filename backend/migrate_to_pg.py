"""
migrate_to_pg.py
================
Migrate all data from the local SQLite database (database/showroom.db)
to the PostgreSQL database configured via DATABASE_URL in .env.

Strategy
--------
1. TRUNCATE all 29 tables in one statement (PostgreSQL handles FK ordering
   internally when all referenced tables are in the same TRUNCATE list).
2. INSERT rows in TABLE_ORDER (parents before children).
   Special case: account table uses topological sort (roots before children)
   to satisfy the self-referential parent_id FK.
3. Reset every SERIAL sequence to MAX(id) so future inserts get correct IDs.

Does NOT require superuser privileges.
Safe to re-run: always starts with a full TRUNCATE.
"""
import os
import sys
from pathlib import Path
from datetime import datetime, date

# ── Load .env FIRST ────────────────────────────────────────────────────────
_root = Path(__file__).parent.parent
_env  = _root / '.env'
if _env.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env, override=True)
    except ImportError:
        pass

DATABASE_URL = os.environ.get('DATABASE_URL', '')
if not DATABASE_URL.startswith('postgresql'):
    print(f'ERROR: DATABASE_URL must be a PostgreSQL URL. Got: {DATABASE_URL!r}')
    sys.exit(1)

SQLITE_PATH = _root / 'database' / 'showroom.db'
if not SQLITE_PATH.exists():
    print(f'ERROR: SQLite source not found: {SQLITE_PATH}')
    sys.exit(1)

SQLITE_URL = 'sqlite:///' + str(SQLITE_PATH).replace('\\', '/')

# TABLE_ORDER is computed dynamically from PostgreSQL FK metadata (see below).
# We keep a fallback list only for tables that might not appear in the FK graph.
_ALL_TABLES = [
    'branch', 'user', 'account', 'role_permission', 'cost_center',
    'exchange_rate', 'showroom_info', 'customer', 'car',
    'vehicle_cost', 'car_photo', 'purchase', 'sale',
    'installment_plan', 'installment_schedule', 'payment',
    'employee', 'employee_commission', 'employee_target',
    'expense', 'voucher', 'journal_entry', 'journal_entry_line',
    'audit_log', 'customer_document', 'customer_interaction',
    'transaction', 'cashbox_close', 'sale_pipeline',
]


def _topo_order(engine) -> list:
    """
    Compute table insertion order by topological-sorting PostgreSQL FK constraints.
    Returns a list of table names, parents before children.
    Self-referential edges are ignored (handled separately per-table).
    """
    from sqlalchemy import text
    from collections import defaultdict, deque

    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                kcu.table_name   AS child_table,
                ccu.table_name   AS parent_table
            FROM information_schema.table_constraints        AS tc
            JOIN information_schema.key_column_usage         AS kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema    = kcu.table_schema
            JOIN information_schema.referential_constraints  AS rc
              ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage  AS ccu
              ON ccu.constraint_name = rc.unique_constraint_name
             AND ccu.table_schema    = rc.unique_constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema    = 'public'
        """)).fetchall()

    # Build adjacency: parent -> [children that depend on it]
    in_degree  = defaultdict(int)
    dependents = defaultdict(set)   # parent -> set of children
    all_nodes  = set(_ALL_TABLES)

    for child, parent in rows:
        if child == parent:          # self-referential — skip
            continue
        if child not in all_nodes or parent not in all_nodes:
            continue
        if parent not in dependents[parent]:  # avoid duplicate edges
            if child not in dependents[parent]:
                dependents[parent].add(child)
                in_degree[child] += 1

    # Seed with nodes that have zero in-degree
    queue = deque(sorted(t for t in all_nodes if in_degree[t] == 0))
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for child in sorted(dependents[node]):
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)

    # Any remaining nodes (cycles or isolated) — append at end
    remaining = [t for t in all_nodes if t not in order]
    order.extend(remaining)

    return order


# ── Helpers ────────────────────────────────────────────────────────────────

def _parse_dt(val):
    """SQLite stores datetimes as ISO strings; convert to Python datetime."""
    if val is None or isinstance(val, (datetime, date)):
        return val
    if not isinstance(val, str):
        return val
    for fmt in (
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d',
    ):
        try:
            return datetime.strptime(val.strip(), fmt)
        except ValueError:
            pass
    return val


def _convert(val, pg_col_type):
    """Map a SQLite value to the correct Python type for PostgreSQL."""
    from sqlalchemy.types import Boolean, DateTime, Date
    if val is None:
        return None
    if isinstance(pg_col_type, Boolean):
        return bool(int(val))
    if isinstance(pg_col_type, DateTime):
        return _parse_dt(val)
    if isinstance(pg_col_type, Date):
        dt = _parse_dt(val)
        return dt.date() if isinstance(dt, datetime) else dt
    return val


def _topo_sort_accounts(rows):
    """
    Sort account rows so every parent appears before its children.
    Handles arbitrary depth (3 levels in practice).
    """
    id_map   = {r['id']: r for r in rows}
    ordered  = []
    inserted = set()
    remaining = list(rows)

    for _ in range(50):          # max 50 passes — more than enough for 3-level tree
        if not remaining:
            break
        batch = [
            r for r in remaining
            if r.get('parent_id') is None or r.get('parent_id') in inserted
        ]
        if not batch:
            # orphaned rows — insert them unconditionally to avoid infinite loop
            ordered.extend(remaining)
            break
        ordered.extend(batch)
        inserted.update(r['id'] for r in batch)
        inserted_set = {r['id'] for r in batch}
        remaining = [r for r in remaining if r['id'] not in inserted_set]

    return ordered


# ── Main migration ─────────────────────────────────────────────────────────

def migrate(verbose: bool = True) -> dict:
    from sqlalchemy import create_engine, text, MetaData

    def log(msg=''):
        if verbose:
            print(msg)

    log(f'{"="*62}')
    log('  SQLite -> PostgreSQL Migration')
    log(f'{"="*62}')
    log(f'  Source : {SQLITE_PATH}')
    masked = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL
    log(f'  Target : {masked}')
    log()

    src_engine = create_engine(SQLITE_URL)
    dst_engine = create_engine(DATABASE_URL)

    src_meta = MetaData()
    src_meta.reflect(bind=src_engine)
    dst_meta = MetaData()
    dst_meta.reflect(bind=dst_engine)

    src_tables = set(src_meta.tables)
    dst_tables = set(dst_meta.tables)

    log(f'  SQLite tables     : {len(src_tables)}')
    log(f'  PostgreSQL tables : {len(dst_tables)}')

    # Compute correct insertion order from FK graph
    TABLE_ORDER = _topo_order(dst_engine)
    log(f'  Insertion order   : {" -> ".join(TABLE_ORDER[:5])} ... (auto from FK graph)')
    log()

    # ── Pre-migration counts ──────────────────────────────────────────────
    log('  Row counts BEFORE migration:')
    before = {}
    with src_engine.connect() as sc, dst_engine.connect() as dc:
        for t in TABLE_ORDER:
            if t not in src_tables:
                continue
            sc_n = sc.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            dc_n = dc.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar() if t in dst_tables else 'N/A'
            before[t] = (sc_n, dc_n)
            if sc_n or (isinstance(dc_n, int) and dc_n):
                log(f'    {t:<30} SQLite={sc_n:<6}  PG={dc_n}')

    # ── Migration in a single connection / transaction ────────────────────
    migrated = {}

    with src_engine.connect() as src_conn, dst_engine.connect() as dst_conn:

        # ── Step 1: TRUNCATE all tables at once ───────────────────────────
        # When ALL referenced tables are in the list PostgreSQL can figure out
        # the right order internally — no CASCADE needed for FK resolution.
        log()
        log('  [1/4] Truncating all PostgreSQL tables ...')
        tables_in_pg = [t for t in TABLE_ORDER if t in dst_tables]
        truncate_list = ', '.join(f'"{t}"' for t in tables_in_pg)
        dst_conn.execute(text(f'TRUNCATE {truncate_list}'))
        dst_conn.commit()
        log('        Done.')

        # ── Step 2: Insert data in dependency order ───────────────────────
        log('  [2/4] Migrating rows ...')
        for table_name in TABLE_ORDER:
            if table_name not in src_tables:
                migrated[table_name] = 0
                continue
            if table_name not in dst_tables:
                log(f'    SKIP {table_name}: not in PostgreSQL')
                continue

            src_tbl = src_meta.tables[table_name]
            dst_tbl = dst_meta.tables[table_name]

            src_col_names = {c.name for c in src_tbl.columns}
            dst_col_names = {c.name for c in dst_tbl.columns}
            common = sorted(src_col_names & dst_col_names)

            if not common:
                log(f'    SKIP {table_name}: no common columns')
                continue

            col_list = ', '.join(f'"{c}"' for c in common)
            rows = src_conn.execute(
                text(f'SELECT {col_list} FROM "{table_name}"')
            ).fetchall()

            migrated[table_name] = len(rows)
            if not rows:
                log(f'    {table_name:<30}  0 rows')
                continue

            # Convert SQLite values to PostgreSQL-compatible Python types
            converted = []
            for row in rows:
                d = {col: _convert(row[i], dst_tbl.c[col].type)
                     for i, col in enumerate(common)}
                converted.append(d)

            # Special: account table needs topological sort for parent_id FK
            if table_name == 'account':
                converted = _topo_sort_accounts(converted)

            # Bulk-insert in chunks of 500 rows
            vals_q = ', '.join(f':{c}' for c in common)
            stmt   = text(f'INSERT INTO "{table_name}" ({col_list}) VALUES ({vals_q})')

            for start in range(0, len(converted), 500):
                dst_conn.execute(stmt, converted[start:start + 500])

            log(f'    {table_name:<30} {len(converted):>6} rows  OK')

        dst_conn.commit()
        log('        Commit done.')

        # ── Step 3: Reset sequences ───────────────────────────────────────
        log()
        log('  [3/4] Resetting PostgreSQL sequences ...')
        for table_name in TABLE_ORDER:
            if table_name not in dst_tables:
                continue
            dst_tbl = dst_meta.tables[table_name]
            for col in dst_tbl.primary_key.columns:
                try:
                    seq = dst_conn.execute(
                        text("SELECT pg_get_serial_sequence(:t, :c)"),
                        {'t': table_name, 'c': col.name}
                    ).scalar()
                    if not seq:
                        continue
                    max_id = dst_conn.execute(
                        text(f'SELECT COALESCE(MAX("{col.name}"), 1) FROM "{table_name}"')
                    ).scalar()
                    dst_conn.execute(
                        text("SELECT setval(:seq, :v, true)"),
                        {'seq': seq, 'v': int(max_id)}
                    )
                    log(f'    {table_name}.{col.name:<25}  seq -> {max_id}')
                except Exception as e:
                    log(f'    {table_name}.{col.name}  seq reset failed: {e}')
        dst_conn.commit()

    # ── Post-migration counts ─────────────────────────────────────────────
    log()
    log('  [4/4] Verification ...')
    mismatches = []
    with dst_engine.connect() as conn:
        for t in TABLE_ORDER:
            if t not in dst_tables:
                continue
            pg_n = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            sq_n = before.get(t, (0, 0))[0]
            if pg_n != sq_n:
                mismatches.append((t, sq_n, pg_n))
            if pg_n or sq_n:
                status = 'OK' if pg_n == sq_n else f'MISMATCH SQLite={sq_n}'
                log(f'    {t:<30} PG={pg_n:<6}  {status}')

    log()
    log(f'  {"="*62}')
    total_migrated = sum(migrated.values())
    log(f'  Total rows migrated : {total_migrated}')
    if mismatches:
        log(f'  MISMATCHES ({len(mismatches)}):')
        for t, sq, pg in mismatches:
            log(f'    {t}: SQLite={sq}  PG={pg}')
    else:
        log('  All row counts match. Migration successful.')
    log(f'  {"="*62}')
    log()

    return migrated


if __name__ == '__main__':
    migrate()
