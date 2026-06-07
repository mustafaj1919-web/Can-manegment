"""
clear_business_data.py
----------------------
Removes ONLY business operational data from PostgreSQL (showroom_local).
Preserves all system structure: users, branches, roles, permissions,
accounts, settings, and company configuration.

Usage:
    python clear_business_data.py                          # interactive
    python clear_business_data.py --yes                    # skip confirmation
    python clear_business_data.py --dry-run                # preview only
    python clear_business_data.py --delete-non-admin-users # also remove non-admin users
    python clear_business_data.py --delete-non-admin-users --yes
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import zipfile
from pathlib import Path

# Force UTF-8 output on Windows terminals
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)
sys.path.insert(0, str(BASE_DIR))

from backend.config import Config  # noqa: E402
from sqlalchemy import create_engine, MetaData, func, select, text  # noqa: E402


# ── Preserved forever ──────────────────────────────────────────────────────────
PRESERVED = {
    "account",          # chart of accounts
    "alembic_version",  # schema version
    "branch",           # branches
    "cost_center",      # cost centres
    "exchange_rate",    # exchange rates
    "role_permission",  # role → permission mapping
    "showroom_info",    # company configuration
    "user",             # all users and admins
}

# ── Business tables to clear ───────────────────────────────────────────────────
BUSINESS = {
    "audit_log",
    "car",
    "car_photo",
    "cashbox_close",
    "customer",
    "customer_document",
    "customer_interaction",
    "employee",
    "employee_commission",
    "employee_target",
    "expense",
    "installment_plan",
    "installment_schedule",
    "journal_entry",
    "journal_entry_line",
    "payment",
    "purchase",
    "sale",
    "sale_pipeline",
    "transaction",
    "vehicle_cost",
    "voucher",
    # optional tables present in some installations
    "cashbox_record",
    "installment_payment",
    "inventory",
    "inventory_record",
    "notification",
    "supplier",
    "uploaded_file",
}

# Usernames that are always kept when --delete-non-admin-users is used
ADMIN_USERNAMES = {"admin", "owner"}


# ── Helpers ────────────────────────────────────────────────────────────────────

def build_engine():
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL not found in .env")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return create_engine(url, future=True, pool_pre_ping=True)


def counts(conn, metadata, names: set) -> dict:
    return {
        n: conn.execute(
            select(func.count()).select_from(metadata.tables[n])
        ).scalar_one()
        for n in sorted(names)
        if n in metadata.tables
    }


def print_table(title: str, data: dict, extra: str = "") -> int:
    total = sum(data.values())
    print(f"\n{title}")
    print("-" * 48)
    for name, count in data.items():
        print(f"  {name:<32} {count:>10}")
    if extra:
        print(f"  {extra:<32} {'(kept)':>10}")
    print(f"  {'TOTAL':<32} {total:>10}")
    return total


def create_backup() -> Path:
    from backend.backup_utils import create_backup_archive
    print("\nCreating backup ...")
    result = create_backup_archive(
        created_by="clear_business_data.py",
        reason="pre_clear_business_data",
    )
    path = Path(result["path"]).resolve()
    if not path.is_file() or path.stat().st_size == 0:
        raise RuntimeError("Backup failed — archive is empty.")
    with zipfile.ZipFile(path) as z:
        if z.testzip():
            raise RuntimeError("Backup archive is corrupt.")
    print(f"Backup OK  {path.name}  ({path.stat().st_size // 1024} KB)")
    return path


def delete_uploads() -> int:
    upload_dir = Path(Config.UPLOAD_FOLDER).resolve()
    if not upload_dir.exists():
        return 0
    files = list(upload_dir.rglob("*"))
    count = sum(1 for f in files if f.is_file())
    for f in files:
        if f.is_file():
            f.unlink(missing_ok=True)
    return count


def reset_sequence(conn, table_name: str) -> None:
    seq = conn.execute(
        text("SELECT pg_get_serial_sequence(:t, 'id')"),
        {"t": table_name},
    ).scalar()
    if seq:
        conn.execute(
            text("SELECT setval(CAST(:s AS regclass), 1, false)"),
            {"s": seq},
        )


def reset_sequence_after_keep(conn, table_name: str) -> None:
    """Reset sequence to max existing ID (used after partial deletion)."""
    seq = conn.execute(
        text("SELECT pg_get_serial_sequence(:t, 'id')"),
        {"t": table_name},
    ).scalar()
    if seq:
        max_id = conn.execute(
            text(f'SELECT COALESCE(MAX(id), 1) FROM "{table_name}"')
        ).scalar()
        conn.execute(
            text("SELECT setval(CAST(:s AS regclass), :v, true)"),
            {"s": seq, "v": int(max_id)},
        )


def get_user_info(conn, metadata) -> tuple[list, list]:
    """Return (users_to_keep, users_to_delete)."""
    u = metadata.tables["user"]
    all_users = conn.execute(
        u.select().order_by(u.c.username)
    ).fetchall()
    cols = [c.key for c in u.columns]

    keep   = []
    delete = []
    for row in all_users:
        d = dict(zip(cols, row))
        if d["username"] in ADMIN_USERNAMES:
            keep.append(d)
        else:
            delete.append(d)
    return keep, delete


# ── Main ───────────────────────────────────────────────────────────────────────

def run(yes: bool, dry_run: bool, delete_non_admin: bool) -> int:
    engine   = build_engine()
    metadata = MetaData()
    metadata.reflect(bind=engine)

    actual    = set(metadata.tables)
    business  = actual & BUSINESS
    preserved = actual & PRESERVED
    unknown   = actual - business - preserved

    if unknown:
        print(f"WARNING: unclassified tables (skipped): {', '.join(sorted(unknown))}")

    for required in ("user", "branch", "role_permission"):
        if required not in preserved:
            raise RuntimeError(f"Required table '{required}' not found in database.")

    with engine.connect() as conn:
        before_business  = counts(conn, metadata, business)
        before_preserved = counts(conn, metadata, preserved)

        users_to_keep, users_to_delete = get_user_info(conn, metadata)

    if before_preserved.get("user", 0) == 0:
        raise RuntimeError("No users found — aborting to avoid locking out access.")

    if not users_to_keep and delete_non_admin:
        raise RuntimeError(
            f"No users with username in {ADMIN_USERNAMES} found — "
            "aborting to avoid locking out all access."
        )

    # ── Preview ────────────────────────────────────────────────────────────────
    print_table("Business records (WILL BE DELETED)", before_business)

    if delete_non_admin:
        print("\nUsers (--delete-non-admin-users)")
        print("-" * 48)
        print(f"  {'Kept (admin/owner)':<32} {len(users_to_keep):>10}")
        for u in users_to_keep:
            print(f"    [KEEP]   [{u['role']}] {u['username']}")
        print(f"  {'Deleted (non-admin)':<32} {len(users_to_delete):>10}")
        for u in users_to_delete:
            print(f"    [DELETE] [{u['role']}] {u['username']}")

        preserved_display = {k: v for k, v in before_preserved.items() if k != "user"}
        preserved_display["user (after)"] = len(users_to_keep)
        print_table("System records (WILL BE KEPT)", preserved_display,
                    extra="uploaded business files")
    else:
        print_table("System records (WILL BE KEPT)", before_preserved,
                    extra="uploaded business files")

    if dry_run:
        print("\nDry run complete — nothing changed.")
        return 0

    if not yes:
        prompt = (
            "\nType  YES  to back up and clear business data"
            + (" + delete non-admin users" if delete_non_admin else "")
            + ": "
        )
        ans = input(prompt).strip()
        if ans != "YES":
            print("Aborted.")
            return 1

    backup_path = create_backup()

    deleted       = {}
    files_deleted = 0
    users_deleted = 0

    with engine.connect() as conn:
        txn = conn.begin()
        try:
            # Bypass FK checks for the entire transaction
            conn.execute(text("SET session_replication_role = 'replica'"))

            # 1. Clear all business tables
            for tname in sorted(business):
                if tname not in metadata.tables:
                    continue
                result = conn.execute(metadata.tables[tname].delete())
                deleted[tname] = result.rowcount or 0

            # 2. Reset account balances to zero
            acc = metadata.tables.get("account")
            if acc is not None and "balance" in acc.c:
                conn.execute(acc.update().values(balance=0.0))

            # 3. Reset sequences for cleared business tables
            for tname in sorted(business):
                if tname in metadata.tables:
                    reset_sequence(conn, tname)

            # 4. Delete non-admin users (if requested)
            if delete_non_admin and users_to_delete:
                u = metadata.tables["user"]
                ids_to_delete = [d["id"] for d in users_to_delete]
                result = conn.execute(
                    u.delete().where(u.c.id.in_(ids_to_delete))
                )
                users_deleted = result.rowcount or 0
                # Reset user sequence to max remaining ID
                reset_sequence_after_keep(conn, "user")

            conn.execute(text("SET session_replication_role = 'origin'"))

            # Safety: verify preserved non-user tables are unchanged
            check_preserved = {t for t in preserved if t != "user"}
            after_preserved = counts(conn, metadata, check_preserved)
            changed = {
                t for t in check_preserved
                if before_preserved.get(t, 0) != after_preserved.get(t, 0)
            }
            if changed:
                raise RuntimeError(
                    "Preserved tables changed unexpectedly: " + ", ".join(sorted(changed))
                )

            txn.commit()

        except Exception:
            conn.execute(text("SET session_replication_role = 'origin'"))
            txn.rollback()
            print("\nERROR — rolled back. No data was changed.")
            print(f"Backup: {backup_path}")
            raise

    files_deleted = delete_uploads()

    # ── Summary ────────────────────────────────────────────────────────────────
    total_rows = sum(deleted.values())
    print("\n" + "=" * 52)
    print("  CLEARED TABLES")
    print("=" * 52)
    for tname in sorted(deleted):
        if deleted[tname]:
            print(f"  {tname:<32} {deleted[tname]:>8} rows")
    print("-" * 52)
    print(f"  {'Total rows deleted':<32} {total_rows:>8}")
    print(f"  {'Uploaded files deleted':<32} {files_deleted:>8}")
    if delete_non_admin:
        print(f"  {'Non-admin users deleted':<32} {users_deleted:>8}")
    print("=" * 52)

    print("\n  PRESERVED")
    print("=" * 52)
    for tname, cnt in before_preserved.items():
        if tname == "user" and delete_non_admin:
            print(f"  {tname:<32} {len(users_to_keep):>8} rows (kept)")
        else:
            print(f"  {tname:<32} {cnt:>8} rows (kept)")
    if delete_non_admin:
        print("\n  Admin accounts kept:")
        for u in users_to_keep:
            print(f"    [{u['role']}] {u['username']}")
    print("=" * 52)

    print(f"\nBackup: {backup_path}")
    print("\nSystem is ready — login works, branches and permissions intact.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yes",     action="store_true",
                        help="Skip confirmation prompt")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview only, no changes")
    parser.add_argument("--delete-non-admin-users", action="store_true",
                        help="Also delete all users except admin and owner")
    args = parser.parse_args()
    return run(
        yes=args.yes,
        dry_run=args.dry_run,
        delete_non_admin=args.delete_non_admin_users,
    )


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(130)
    except Exception as exc:
        print(f"\nFatal: {exc}", file=sys.stderr)
        sys.exit(1)
