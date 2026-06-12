"""
End-to-End accounting test using delta (before/after snapshots).
Works correctly even when pre-existing data is present in the database.
"""
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import func


def run():
    from .app import create_app
    from .database import db
    from .models import (Account, JournalEntry, JournalEntryLine,
                         Car, Customer, Sale, Purchase, Expense,
                         Payment, InstallmentPlan, InstallmentSchedule, Branch)
    from .accounting import create_journal_entry, get_trial_balance
    from .seed_chart_of_accounts import seed_chart_of_accounts

    app = create_app()
    app.config['TESTING'] = True

    checks_passed = 0
    checks_total  = 0

    TEST_CODES = ['111001', '115001', '115002', '113002', '211001',
                  '360001', '410001', '410002', '350009']

    def raw_dr_cr(code):
        acct = Account.query.filter_by(code=code).first()
        if not acct:
            return 0.0, 0.0
        row = db.session.query(
            func.coalesce(func.sum(JournalEntryLine.debit),  0.0).label('d'),
            func.coalesce(func.sum(JournalEntryLine.credit), 0.0).label('c'),
        ).filter(JournalEntryLine.account_id == acct.id).first()
        return float(row.d), float(row.c)

    def take_snapshot():
        return {c: raw_dr_cr(c) for c in TEST_CODES}

    snap_before = {}

    def delta(code):
        """Change in (dr, cr) since snap_before was taken."""
        d0, c0 = snap_before.get(code, (0.0, 0.0))
        d1, c1 = raw_dr_cr(code)
        dr  = round(d1 - d0, 2)
        cr  = round(c1 - c0, 2)
        bal = round(dr - cr, 2)
        return dr, cr, bal

    def chk(label, code, exp_dr, exp_cr, exp_bal):
        nonlocal checks_passed, checks_total
        checks_total += 1
        dr, cr, bal = delta(code)
        ok = (abs(dr - exp_dr) <= 0.01 and
              abs(cr - exp_cr) <= 0.01 and
              abs(bal - exp_bal) <= 0.01)
        if ok:
            checks_passed += 1
        sym = 'OK' if ok else 'FAIL'
        dr_n  = f'  <- exp {exp_dr:,.2f}'  if abs(dr  - exp_dr)  > 0.01 else ''
        cr_n  = f'  <- exp {exp_cr:,.2f}'  if abs(cr  - exp_cr)  > 0.01 else ''
        bal_n = f'  <- exp {exp_bal:,.2f}' if abs(bal - exp_bal) > 0.01 else ''
        print(f'  [{sym}]  {label} ({code}):')
        print(f'         Dr = {dr:>12,.2f}{dr_n}')
        print(f'         Cr = {cr:>12,.2f}{cr_n}')
        print(f'         Bal= {bal:>12,.2f}{bal_n}')
        return ok

    with app.app_context():
        print('\n' + '='*64)
        print('   E2E Accounting Test — 6-digit chart of accounts')
        print('='*64)

        # ── 0. Setup ──────────────────────────────────────────
        print('\n[0] Initialising database and chart of accounts...')
        db.create_all()
        n_seeded = seed_chart_of_accounts()
        print(f'    Chart seeded: {n_seeded} new accounts')

        branch = Branch.query.first()
        if not branch:
            branch = Branch(name='Main', is_main=True)
            db.session.add(branch)
            db.session.flush()

        uid = uuid4().hex[:8]

        # Capture starting balances BEFORE creating any test data
        snap_before.update(take_snapshot())
        print(f'    Starting snapshot captured for {len(snap_before)} accounts')

        # ── Create test persons ───────────────────────────────
        seller = Customer(branch_id=branch.id, name=f'Supplier-{uid}',
                          phone='07700000001', id_number=f'S{uid}',
                          customer_type='Seller')
        buyer1 = Customer(branch_id=branch.id, name=f'CashBuyer-{uid}',
                          phone='07700000002', id_number=f'B1{uid}',
                          customer_type='Buyer')
        buyer2 = Customer(branch_id=branch.id, name=f'InstBuyer-{uid}',
                          phone='07700000003', id_number=f'B2{uid}',
                          customer_type='Buyer')
        db.session.add_all([seller, buyer1, buyer2])
        db.session.flush()

        # ── [1] Buy new car for $30,000 ───────────────────────
        print('\n[1] Buy Toyota Camry 2023 (new) for $30,000')
        car1 = Car(branch_id=branch.id, brand='Toyota', model='Camry',
                   manufacturing_year=2023, color='White',
                   vin=f'V1{uid}', plate_number=f'P1{uid}',
                   mileage=0, purchase_price=30000.0, selling_price=35000.0,
                   currency='USD', condition='New', status='Available')
        db.session.add(car1)
        db.session.flush()

        pur1 = Purchase(branch_id=branch.id, invoice_number=f'PUR1-{uid}',
                        car_id=car1.id, seller_id=seller.id,
                        purchase_price=30000.0, paid_amount=0.0,
                        remaining_amount=30000.0, currency='USD',
                        payment_method='Cash', status='Active',
                        purchase_date=datetime.utcnow())
        db.session.add(pur1)
        db.session.flush()

        create_journal_entry(
            entry_date=pur1.purchase_date,
            description=f'Purchase car #{pur1.invoice_number}',
            branch_id=branch.id, reference_type='Purchase', reference_id=pur1.id,
            lines=[
                {'account_code': '115001', 'debit': 30000.0, 'credit': 0},
                {'account_code': '211001', 'debit': 0, 'credit': 30000.0},
            ])
        print('    Dr 115001 30,000 | Cr 211001 30,000')

        # ── [2] Pay $10,000 of purchase ───────────────────────
        print('\n[2] Pay $10,000 of purchase price in cash')
        pur1.paid_amount = 10000.0
        pur1.remaining_amount = 20000.0
        pay_p1 = Payment(branch_id=branch.id, payment_type='purchase',
                         purchase_id=pur1.id, amount=10000.0, currency='USD',
                         payment_method='Cash', payment_date=datetime.utcnow())
        db.session.add(pay_p1)
        db.session.flush()

        create_journal_entry(
            entry_date=pay_p1.payment_date,
            description=f'Part payment to supplier #{pur1.invoice_number}',
            branch_id=branch.id, reference_type='Payment', reference_id=pay_p1.id,
            lines=[
                {'account_code': '211001', 'debit': 10000.0, 'credit': 0},
                {'account_code': '111001', 'debit': 0, 'credit': 10000.0},
            ])
        print('    Dr 211001 10,000 | Cr 111001 10,000')

        # ── [3] Sell Car 1 for cash at $35,000 ────────────────
        print('\n[3] Sell Toyota Camry for cash at $35,000')
        car1.status = 'Sold'
        sale1 = Sale(branch_id=branch.id, invoice_number=f'SAL1-{uid}',
                     car_id=car1.id, buyer_id=buyer1.id,
                     selling_price=35000.0, discount=0.0,
                     paid_amount=35000.0, remaining_amount=0.0,
                     currency='USD', payment_method='Cash', status='Active',
                     sale_date=datetime.utcnow())
        db.session.add(sale1)
        db.session.flush()

        create_journal_entry(
            entry_date=sale1.sale_date,
            description=f'Cash sale #{sale1.invoice_number}',
            branch_id=branch.id, reference_type='Sale', reference_id=sale1.id,
            lines=[
                {'account_code': '111001', 'debit': 35000.0, 'credit': 0},
                {'account_code': '410001', 'debit': 0, 'credit': 35000.0},
            ])
        create_journal_entry(
            entry_date=sale1.sale_date,
            description=f'COGS #{sale1.invoice_number}',
            branch_id=branch.id, reference_type='Sale', reference_id=sale1.id,
            lines=[
                {'account_code': '360001', 'debit': 30000.0, 'credit': 0},
                {'account_code': '115001', 'debit': 0, 'credit': 30000.0},
            ])
        print('    Revenue: Dr 111001 35,000 | Cr 410001 35,000')
        print('    COGS:    Dr 360001 30,000 | Cr 115001 30,000')

        # ── [4] Buy used car for $20,000 (paid in full) ───────
        print('\n[4] Buy Honda Accord 2021 (used) for $20,000 — paid in full')
        car2 = Car(branch_id=branch.id, brand='Honda', model='Accord',
                   manufacturing_year=2021, color='Black',
                   vin=f'V2{uid}', plate_number=f'P2{uid}',
                   mileage=30000, purchase_price=20000.0, selling_price=25000.0,
                   currency='USD', condition='Used', status='Available')
        db.session.add(car2)
        db.session.flush()

        pur2 = Purchase(branch_id=branch.id, invoice_number=f'PUR2-{uid}',
                        car_id=car2.id, seller_id=seller.id,
                        purchase_price=20000.0, paid_amount=20000.0,
                        remaining_amount=0.0, currency='USD',
                        payment_method='Cash', status='Active',
                        purchase_date=datetime.utcnow())
        db.session.add(pur2)
        db.session.flush()

        create_journal_entry(
            entry_date=pur2.purchase_date,
            description=f'Purchase car #{pur2.invoice_number}',
            branch_id=branch.id, reference_type='Purchase', reference_id=pur2.id,
            lines=[
                {'account_code': '115002', 'debit': 20000.0, 'credit': 0},
                {'account_code': '211001', 'debit': 0, 'credit': 20000.0},
            ])

        pay_p2 = Payment(branch_id=branch.id, payment_type='purchase',
                         purchase_id=pur2.id, amount=20000.0, currency='USD',
                         payment_method='Cash', payment_date=datetime.utcnow())
        db.session.add(pay_p2)
        db.session.flush()

        create_journal_entry(
            entry_date=pay_p2.payment_date,
            description=f'Full payment to supplier #{pur2.invoice_number}',
            branch_id=branch.id, reference_type='Payment', reference_id=pay_p2.id,
            lines=[
                {'account_code': '211001', 'debit': 20000.0, 'credit': 0},
                {'account_code': '111001', 'debit': 0, 'credit': 20000.0},
            ])
        print('    Purchase: Dr 115002 20,000 | Cr 211001 20,000')
        print('    Payment:  Dr 211001 20,000 | Cr 111001 20,000')

        # ── [5] Sell Car 2 on installments ($25k, $5k down) ───
        print('\n[5] Sell Honda Accord on installments ($5k down / $20k AR)')
        car2.status = 'Sold'
        sale2 = Sale(branch_id=branch.id, invoice_number=f'SAL2-{uid}',
                     car_id=car2.id, buyer_id=buyer2.id,
                     selling_price=25000.0, discount=0.0,
                     paid_amount=5000.0, remaining_amount=20000.0,
                     currency='USD', payment_method='Installment', status='Active',
                     sale_date=datetime.utcnow())
        db.session.add(sale2)
        db.session.flush()

        create_journal_entry(
            entry_date=sale2.sale_date,
            description=f'Installment sale #{sale2.invoice_number}',
            branch_id=branch.id, reference_type='Sale', reference_id=sale2.id,
            lines=[
                {'account_code': '111001', 'debit':  5000.0, 'credit': 0},
                {'account_code': '113002', 'debit': 20000.0, 'credit': 0},
                {'account_code': '410002', 'debit': 0, 'credit': 25000.0},
            ])
        create_journal_entry(
            entry_date=sale2.sale_date,
            description=f'COGS installment sale #{sale2.invoice_number}',
            branch_id=branch.id, reference_type='Sale', reference_id=sale2.id,
            lines=[
                {'account_code': '360001', 'debit': 20000.0, 'credit': 0},
                {'account_code': '115002', 'debit': 0, 'credit': 20000.0},
            ])

        plan = InstallmentPlan(
            branch_id=branch.id, sale_id=sale2.id,
            total_amount=20000.0, paid_amount=0.0, remaining_amount=20000.0,
            currency='USD', number_of_months=4, installment_amount=5000.0,
            installment_start_date=datetime.utcnow(),
            installment_due_day=1, status='Active')
        db.session.add(plan)
        db.session.flush()

        for i in range(4):
            db.session.add(InstallmentSchedule(
                branch_id=branch.id, installment_plan_id=plan.id,
                installment_number=i + 1,
                due_date=datetime.utcnow() + timedelta(days=30 * (i + 1)),
                amount=5000.0, paid_amount=0.0, remaining_amount=5000.0,
                currency='USD', status='Pending'))
        db.session.flush()
        print('    Revenue: Dr 111001 5,000 + Dr 113002 20,000 | Cr 410002 25,000')
        print('    COGS:    Dr 360001 20,000 | Cr 115002 20,000')

        # ── [6] Receive first installment $2,000 ──────────────
        print('\n[6] Receive installment #1: $2,000')
        sched = (InstallmentSchedule.query
                 .filter_by(installment_plan_id=plan.id)
                 .order_by(InstallmentSchedule.installment_number)
                 .first())
        sched.paid_amount = 2000.0
        sched.remaining_amount = 3000.0

        pay_inst = Payment(branch_id=branch.id, payment_type='installment',
                           sale_id=sale2.id, installment_schedule_id=sched.id,
                           amount=2000.0, currency='USD',
                           payment_method='Cash', payment_date=datetime.utcnow())
        db.session.add(pay_inst)
        db.session.flush()

        create_journal_entry(
            entry_date=pay_inst.payment_date,
            description=f'Installment receipt #1 sale {sale2.invoice_number}',
            branch_id=branch.id, reference_type='Payment', reference_id=pay_inst.id,
            lines=[
                {'account_code': '111001', 'debit': 2000.0, 'credit': 0},
                {'account_code': '113002', 'debit': 0, 'credit': 2000.0},
            ])
        print('    Dr 111001 2,000 | Cr 113002 2,000')

        # ── [7] Register $500 expense ─────────────────────────
        print('\n[7] Register admin expense $500')
        expense = Expense(branch_id=branch.id, title='Admin Expense Test',
                          amount=500.0, currency='USD', category='Admin',
                          expense_date=datetime.utcnow())
        db.session.add(expense)
        db.session.flush()

        create_journal_entry(
            entry_date=expense.expense_date,
            description='Admin expense',
            branch_id=branch.id, reference_type='Expense', reference_id=expense.id,
            lines=[
                {'account_code': '350009', 'debit': 500.0, 'credit': 0},
                {'account_code': '111001', 'debit': 0, 'credit': 500.0},
            ])
        print('    Dr 350009 500 | Cr 111001 500')

        print('\n    All 9 journal entries created successfully.')

        # ── [8] Verify account balances (delta) ───────────────
        print('\n' + '='*64)
        print('[8] Ledger verification (DELTA since test start)')
        print('='*64)
        print(f"\n  {'Account':<34} {'Dr':>12} {'Cr':>12} {'Bal':>12}  Result")
        print('  ' + '-'*66)

        # Expected deltas:
        # 111001: Dr=42000 (35k+5k+2k)  Cr=30500 (10k+20k+0.5k)  Bal=+11500
        # 115001: Dr=30000               Cr=30000                  Bal=0
        # 115002: Dr=20000               Cr=20000                  Bal=0
        # 113002: Dr=20000               Cr=2000                   Bal=+18000
        # 211001: Dr=30000 (10k+20k)     Cr=50000 (30k+20k)        Bal=-20000
        # 360001: Dr=50000 (30k+20k)     Cr=0                      Bal=+50000
        # 410001: Dr=0                    Cr=35000                  Bal=-35000
        # 410002: Dr=0                    Cr=25000                  Bal=-25000
        # 350009: Dr=500                  Cr=0                      Bal=+500

        chk('Cash (111001)',              '111001', 42000.0, 30500.0,  11500.0)
        chk('New car inventory (115001)', '115001', 30000.0, 30000.0,      0.0)
        chk('Used car inventory (115002)','115002', 20000.0, 20000.0,      0.0)
        chk('Installment AR (113002)',    '113002', 20000.0,  2000.0,  18000.0)
        chk('Car suppliers (211001)',     '211001', 30000.0, 50000.0, -20000.0)
        chk('COGS sold cars (360001)',    '360001', 50000.0,     0.0,  50000.0)
        chk('Revenue new cars (410001)', '410001',     0.0, 35000.0, -35000.0)
        chk('Revenue used cars (410002)','410002',     0.0, 25000.0, -25000.0)
        chk('Misc expenses (350009)',    '350009',   500.0,     0.0,    500.0)

        # ── [9] Trial balance ─────────────────────────────────
        print('\n' + '='*64)
        print('[9] Trial Balance (all data in DB)')
        print('='*64)
        lines_tb, totals = get_trial_balance()
        active = [l for l in lines_tb if l['debit'] > 0 or l['credit'] > 0]
        print(f"\n  {'Code':<10} {'Account':<32} {'Type':<10} {'Debit':>12} {'Credit':>12}")
        print('  ' + '-'*80)
        for l in active:
            print(f"  {l['code']:<10} {l['name']:<32} {l['type']:<10} "
                  f"{l['debit']:>12,.2f} {l['credit']:>12,.2f}")
        print('  ' + '-'*80)
        td = totals['total_debit']
        tc = totals['total_credit']
        diff = abs(td - tc)
        balanced = diff < 0.01
        print(f"  {'TOTAL':<54} {td:>12,.2f} {tc:>12,.2f}")
        bal_msg = f"[OK] BALANCED" if balanced else f"[FAIL] NOT BALANCED (diff={diff:.2f})"
        print(f"\n  Trial balance: {bal_msg}")

        # ── [10] P&L summary ─────────────────────────────────
        print('\n' + '='*64)
        print('[10] P&L and Balance Sheet (test entries only)')
        print('='*64)

        def test_account_bal(code):
            dr, cr, bal = delta(code)
            return bal

        revenue = abs(test_account_bal('410001')) + abs(test_account_bal('410002'))
        cogs    = test_account_bal('360001')
        gross   = revenue - cogs
        opex    = test_account_bal('350009')
        net_profit = gross - opex

        print(f"\n  Revenue (410001+410002): {revenue:>12,.2f}")
        print(f"  COGS    (360001):        {cogs:>12,.2f}")
        print(f"  Gross Profit:            {gross:>12,.2f}")
        print(f"  OpEx    (350009):        {opex:>12,.2f}")
        print(f"  Net Profit:              {net_profit:>12,.2f}")
        exp_net = 9500.0
        pl_ok = abs(net_profit - exp_net) < 0.01
        print(f"  Expected net profit:     {exp_net:>12,.2f}  [{' OK' if pl_ok else 'FAIL'}]")

        cash_dr,  cash_cr,  cash_bal  = delta('111001')
        ar_dr,    ar_cr,    ar_bal    = delta('113002')
        inv1_dr,  inv1_cr,  inv1_bal  = delta('115001')
        inv2_dr,  inv2_cr,  inv2_bal  = delta('115002')
        sup_dr,   sup_cr,   sup_bal   = delta('211001')

        assets = cash_bal + ar_bal + inv1_bal + inv2_bal
        liab   = -sup_bal
        equity = net_profit
        bs_ok  = abs(assets - (liab + equity)) < 0.01

        print(f"\n  Balance Sheet (test delta):")
        print(f"    Assets:    Cash {cash_bal:,.2f}  AR {ar_bal:,.2f}  Inv {inv1_bal+inv2_bal:,.2f}")
        print(f"    Total Assets:              {assets:>12,.2f}")
        print(f"    Liabilities (211001):      {liab:>12,.2f}")
        print(f"    Equity (net profit):       {equity:>12,.2f}")
        print(f"    Liab+Equity:               {liab+equity:>12,.2f}")
        print(f"    Balance Sheet: [{'OK BALANCED' if bs_ok else 'FAIL NOT BALANCED'}]")

        # ── [11] Final summary ────────────────────────────────
        print('\n' + '='*64)
        print('FINAL TEST RESULTS')
        print('='*64)
        print(f"\n  Account balance checks: {checks_passed}/{checks_total}  "
              f"[{'OK' if checks_passed==checks_total else 'FAIL'}]")
        print(f"  Trial balance:          [{'OK BALANCED' if balanced else 'FAIL'}]")
        print(f"  P&L net profit:         [{'OK' if pl_ok else 'FAIL'}]")
        print(f"  Balance sheet:          [{'OK' if bs_ok else 'FAIL'}]")

        all_ok = (checks_passed == checks_total and balanced and pl_ok and bs_ok)
        verdict = 'ALL TESTS PASSED' if all_ok else 'SOME TESTS FAILED'
        print(f"\n  ==> {verdict}\n")

        db.session.rollback()
        print('  [cleanup] Test data rolled back.')

        return all_ok


if __name__ == '__main__':
    ok = run()
    sys.exit(0 if ok else 1)
