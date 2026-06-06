"""
Migration: clean up old journal entry lines that used parent/wrong account codes.

What this does:
  - Move all JournalEntryLine rows from account 211000 -> 211001
    (old code posted to parent "Suppliers" instead of leaf "Car Suppliers")
  - Move all JournalEntryLine rows from account 330001 -> 360001
    (old COGS posted to "car purchases expense" instead of "COGS sold cars")

Safety:
  - A database backup is created BEFORE any change.
  - Only line rows in the SOURCE accounts are touched; nothing else changes.
  - Trial balance is verified to stay balanced before and after.
  - All changes are committed atomically; any error triggers a full rollback.
"""
import sys
from datetime import datetime


def run(dry_run: bool = False):
    from .app import create_app
    from .database import db
    from .models import Account, JournalEntryLine, JournalEntry
    from .backup_utils import create_backup_archive
    from .accounting import get_trial_balance
    from sqlalchemy import func

    app = create_app()

    MIGRATIONS = [
        ('211000', '211001', 'Suppliers parent -> Car Suppliers leaf'),
        ('330001', '360001', 'Old COGS (car purchase expense) -> COGS sold cars'),
    ]

    def tb_totals():
        _, totals = get_trial_balance()
        return totals['total_debit'], totals['total_credit']

    def acct(code):
        a = Account.query.filter_by(code=code).first()
        if not a:
            raise ValueError(f'Account not found: {code}')
        return a

    with app.app_context():
        mode = '[DRY RUN]' if dry_run else '[LIVE]'
        print(f'\n{"="*64}')
        print(f'  Account Code Migration Script  {mode}')
        print(f'{"="*64}')

        # ── Step 1: backup ────────────────────────────────────
        if not dry_run:
            print('\n[1] Creating database backup before migration...')
            backup = create_backup_archive('migration', 'pre_account_migration')
            print(f'    Backup saved: {backup["filename"]}')
        else:
            print('\n[1] DRY RUN - skipping backup')

        # ── Step 2: pre-migration trial balance ───────────────
        print('\n[2] Pre-migration trial balance check...')
        td_before, tc_before = tb_totals()
        balanced_before = abs(td_before - tc_before) < 0.01
        print(f'    Total Dr: {td_before:>14,.2f}')
        print(f'    Total Cr: {tc_before:>14,.2f}')
        print(f'    Balanced: {"YES" if balanced_before else "NO - ABORTING"}')
        if not balanced_before:
            print('\nABORTED: pre-migration trial balance is not balanced.')
            return False

        # ── Step 3: scan what will be migrated ────────────────
        print('\n[3] Scanning lines to migrate...')
        migration_plan = []   # list of (jel_id, jel_dr, jel_cr, je_id, je_desc, src_code, dst_code, reason)

        for src_code, dst_code, reason in MIGRATIONS:
            src = acct(src_code)
            dst = acct(dst_code)
            lines = (JournalEntryLine.query
                     .filter_by(account_id=src.id)
                     .all())
            print(f'\n    {src_code} ({src.name}) -> {dst_code} ({dst.name})')
            print(f'    Reason: {reason}')
            print(f'    Lines found: {len(lines)}')
            if not lines:
                print('    (nothing to migrate)')
                continue
            for ln in lines:
                je = db.session.get(JournalEntry, ln.journal_entry_id)
                print(f'      JEL id={ln.id:5}  Dr={ln.debit:>12,.2f}  Cr={ln.credit:>12,.2f}'
                      f'  | JE id={je.id} ref={je.reference_type}/{je.reference_id}'
                      f'  "{je.description[:45]}"')
                migration_plan.append((ln.id, ln.debit, ln.credit,
                                       je.id, je.description,
                                       src_code, dst_code, reason,
                                       src.id, dst.id))

        total_lines = len(migration_plan)
        print(f'\n    Total lines to migrate: {total_lines}')

        if total_lines == 0:
            print('\nNothing to migrate - database is already clean.')
            return True

        if dry_run:
            print('\n[DRY RUN] No changes were applied.')
            return True

        # ── Step 4: apply migration ───────────────────────────
        print('\n[4] Applying migration...')
        try:
            migrated = 0
            for (jel_id, dr, cr, je_id, je_desc,
                 src_code, dst_code, reason, src_id, dst_id) in migration_plan:
                jel = db.session.get(JournalEntryLine, jel_id)
                if jel is None:
                    raise ValueError(f'JournalEntryLine {jel_id} disappeared!')
                if jel.account_id != src_id:
                    raise ValueError(
                        f'JEL {jel_id} account_id changed unexpectedly '
                        f'(expected {src_id}, got {jel.account_id})')
                jel.account_id = dst_id
                migrated += 1
                print(f'    Migrated JEL id={jel_id}: {src_code} -> {dst_code}  '
                      f'Dr={dr:,.2f}  Cr={cr:,.2f}')

            # ── Step 5: verify trial balance after migration ──
            print('\n[5] Verifying trial balance after migration...')
            td_after, tc_after = tb_totals()
            balanced_after = abs(td_after - tc_after) < 0.01
            same_total    = abs(td_after - td_before) < 0.01

            print(f'    Total Dr: {td_after:>14,.2f}  (before: {td_before:,.2f})')
            print(f'    Total Cr: {tc_after:>14,.2f}  (before: {tc_before:,.2f})')
            print(f'    Balanced: {"YES" if balanced_after else "NO"}')
            print(f'    Totals unchanged: {"YES" if same_total else "NO"}')

            if not balanced_after:
                raise ValueError('Trial balance is NOT balanced after migration!')
            if not same_total:
                raise ValueError('Trial balance totals changed unexpectedly!')

            db.session.commit()
            print('\n    Migration committed successfully.')

        except Exception as exc:
            db.session.rollback()
            print(f'\n[ERROR] Migration rolled back: {exc}')
            return False

        # ── Step 6: post-migration report ─────────────────────
        print('\n' + '='*64)
        print('[6] Post-migration report')
        print('='*64)

        print('\n  Account balances after migration:')
        for src_code, dst_code, _ in MIGRATIONS:
            for code in [src_code, dst_code]:
                try:
                    a = acct(code)
                    row = db.session.query(
                        func.coalesce(func.sum(JournalEntryLine.debit),  0.0).label('d'),
                        func.coalesce(func.sum(JournalEntryLine.credit), 0.0).label('c'),
                    ).filter(JournalEntryLine.account_id == a.id).first()
                    dr, cr = float(row.d), float(row.c)
                    cnt = JournalEntryLine.query.filter_by(account_id=a.id).count()
                    print(f'    {code}  {a.name:<40} lines={cnt:3}'
                          f'  Dr={dr:>12,.2f}  Cr={cr:>12,.2f}')
                except Exception:
                    print(f'    {code}  (not found)')
            print()

        print('  Full trial balance after migration:')
        lines_tb, totals = get_trial_balance()
        active = [l for l in lines_tb if l['debit'] > 0 or l['credit'] > 0]
        print(f"\n  {'Code':<10} {'Account':<35} {'Type':<10} {'Debit':>13} {'Credit':>13}")
        print('  ' + '-'*85)
        for l in active:
            print(f"  {l['code']:<10} {l['name']:<35} {l['type']:<10} "
                  f"{l['debit']:>13,.2f} {l['credit']:>13,.2f}")
        print('  ' + '-'*85)
        td = totals['total_debit']
        tc = totals['total_credit']
        print(f"  {'TOTAL':<57} {td:>13,.2f} {tc:>13,.2f}")

        # P&L summary
        def net_balance(code):
            try:
                a = acct(code)
                row = db.session.query(
                    func.coalesce(func.sum(JournalEntryLine.debit),  0.0).label('d'),
                    func.coalesce(func.sum(JournalEntryLine.credit), 0.0).label('c'),
                ).filter(JournalEntryLine.account_id == a.id).first()
                return float(row.d) - float(row.c)
            except Exception:
                return 0.0

        rev_codes  = ['410001', '410002', '420001', '430001', '440001']
        exp_codes  = ['360001', '350009', '310001', '320001', '330003', '340001']
        total_rev  = sum(abs(net_balance(c)) for c in rev_codes)
        total_exp  = sum(max(net_balance(c), 0) for c in exp_codes)
        net_profit = total_rev - total_exp

        print(f"\n  P&L Summary:")
        print(f"    Total Revenue:  {total_rev:>12,.2f}")
        print(f"    Total Expenses: {total_exp:>12,.2f}")
        print(f"    Net Profit:     {net_profit:>12,.2f}")

        print(f"\n  Summary:")
        print(f"    Lines migrated : {migrated}")
        print(f"    Trial balance  : {'BALANCED' if abs(td - tc) < 0.01 else 'NOT BALANCED'}")
        print(f"    Status         : MIGRATION COMPLETE\n")

        return True


if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    success = run(dry_run=dry)
    sys.exit(0 if success else 1)
