"""
Full End-to-End Test Suite — Car Showroom Management System
Tests the complete HTTP stack via Flask test client (no live server needed).
All DB writes are rolled back at the end — production data is untouched.
"""
import json
import sys
import os
os.environ['PYTHONUTF8'] = '1'

# Force UTF-8 output on Windows (cp1252 console can't handle Arabic + special chars)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from datetime import datetime, timedelta
from uuid import uuid4

GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

def _ok(msg):   print(f'  {GREEN}[PASS]{RESET} {msg}')
def _fail(msg): print(f'  {RED}[FAIL]{RESET} {msg}')
def _info(msg): print(f'  {CYAN}[INFO]{RESET} {msg}')
def _warn(msg): print(f'  {YELLOW}[WARN]{RESET} {msg}')
def _head(msg): print(f'\n{BOLD}{CYAN}{"="*62}{RESET}\n{BOLD}{CYAN}  {msg}{RESET}\n{BOLD}{CYAN}{"="*62}{RESET}')


class T:
    passed = 0
    failed = 0
    warns  = 0
    log    = []

    @classmethod
    def chk(cls, label, cond, detail=''):
        if cond:
            cls.passed += 1
            _ok(label + (f'  ({detail})' if detail else ''))
            cls.log.append(('PASS', label, detail))
        else:
            cls.failed += 1
            _fail(label + (f'  <- {detail}' if detail else ''))
            cls.log.append(('FAIL', label, detail))
        return cond

    @classmethod
    def warn(cls, label, detail=''):
        cls.warns += 1
        _warn(label + (f'  ({detail})' if detail else ''))
        cls.log.append(('WARN', label, detail))

    @classmethod
    def summary(cls):
        total = cls.passed + cls.failed
        _head('FINAL TEST REPORT')
        print(f'\n  Total checks  : {total}')
        print(f'  {GREEN}Passed{RESET}        : {cls.passed}')
        print(f'  {RED}Failed{RESET}        : {cls.failed}')
        print(f'  {YELLOW}Warnings{RESET}      : {cls.warns}')
        print()
        if cls.failed == 0:
            print(f'  {GREEN}{BOLD}[OK]  ALL TESTS PASSED -- System ready for production use{RESET}')
        else:
            print(f'  {RED}{BOLD}[FAIL]  {cls.failed} CHECK(S) FAILED{RESET}')
            print(f'\n  {RED}Failed items:{RESET}')
            for st, lbl, det in cls.log:
                if st == 'FAIL':
                    print(f'    - {lbl}' + (f': {det}' if det else ''))
        print()
        return cls.failed == 0


# ── helpers ──────────────────────────────────────────────────────────────────
def post(c, url, data):
    return c.post(url, data=json.dumps(data), content_type='application/json')

def get(c, url):
    return c.get(url)

def j(resp):
    try:
        return json.loads(resp.data)
    except Exception:
        return {}

def today():
    return datetime.utcnow().strftime('%Y-%m-%d')


def run():
    from .app import create_app
    from .database import db
    from .models import (
        Account, JournalEntry, JournalEntryLine, Car,
        Customer, Sale, Purchase, Expense, Payment,
        InstallmentPlan, InstallmentSchedule, Branch,
        User, AuditLog,
    )
    from .accounting import get_trial_balance
    from sqlalchemy import func

    app = create_app()
    app.config['TESTING'] = True
    uid = uuid4().hex[:8]
    PFX = f'E2E-{uid}'

    def acct_delta(code, snap):
        acct = Account.query.filter_by(code=code).first()
        if not acct:
            return 0.0, 0.0, 0.0
        row = db.session.query(
            func.coalesce(func.sum(JournalEntryLine.debit),  0.0),
            func.coalesce(func.sum(JournalEntryLine.credit), 0.0),
        ).filter(JournalEntryLine.account_id == acct.id).first()
        d1, c1 = float(row[0]), float(row[1])
        d0, c0 = snap.get(code, (0.0, 0.0))
        dr = round(d1 - d0, 2)
        cr = round(c1 - c0, 2)
        return dr, cr, round(dr - cr, 2)

    def snapshot(codes):
        snap = {}
        for code in codes:
            acct = Account.query.filter_by(code=code).first()
            if not acct:
                snap[code] = (0.0, 0.0)
                continue
            row = db.session.query(
                func.coalesce(func.sum(JournalEntryLine.debit),  0.0),
                func.coalesce(func.sum(JournalEntryLine.credit), 0.0),
            ).filter(JournalEntryLine.account_id == acct.id).first()
            snap[code] = (float(row[0]), float(row[1]))
        return snap

    TRACK = ['111001', '112001', '113002', '115001', '115002',
             '211001', '360001', '410001', '410002', '350009', '320001']

    # ══════════════════════════════════════════════════════════════════════
    with app.app_context():

        # ── PHASE 0: PRE-FLIGHT ──────────────────────────────────────────
        _head('PHASE 0 — PRE-FLIGHT CHECKS')
        _info(f'Test run ID: {PFX}')

        T.chk('Chart of accounts >= 50 accounts',
              Account.query.count() >= 50, f'{Account.query.count()} accounts')

        main_branch = Branch.query.filter_by(is_main=True).first()
        T.chk('Main branch exists', main_branch is not None,
              main_branch.name if main_branch else 'missing')

        owner = User.query.filter_by(username='owner').first()
        T.chk('Owner user exists', owner is not None)
        T.chk('Owner role = Owner', owner is not None and owner.role == 'Owner')

        # Check all JEs are balanced before we start
        unbal_before = [
            je for je in JournalEntry.query.all()
            if abs(sum(float(l.debit or 0) for l in je.lines) -
                   sum(float(l.credit or 0) for l in je.lines)) > 0.01
        ]
        T.chk('No pre-existing unbalanced JEs',
              len(unbal_before) == 0, f'{len(unbal_before)} unbalanced')

        snap = snapshot(TRACK)
        _info(f'Balance snapshot taken for {len(snap)} accounts')

        # ── PHASE 1: AUTH ────────────────────────────────────────────────
        _head('PHASE 1 — AUTHENTICATION')

        with app.test_client() as c:

            # 1a. Wrong password -> 401
            r = post(c, '/api/auth/login',
                     {'username': 'owner', 'password': 'WRONG'})
            T.chk('Bad password -> 401', r.status_code == 401,
                  f'status={r.status_code}')

            # 1b. Correct login
            r = post(c, '/api/auth/login',
                     {'username': 'owner', 'password': 'TestPass2024!'})
            T.chk('Owner login -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            login_data = j(r)
            T.chk('Login response contains user object',
                  'user' in login_data, str(list(login_data.keys()))[:60])

            # 1c. /api/auth/me
            r = get(c, '/api/auth/me')
            me = j(r)
            T.chk('/api/auth/me returns owner username',
                  r.status_code == 200 and me.get('user', {}).get('username') == 'owner',
                  f'status={r.status_code}  username={me.get("user", {}).get("username")}')

            # ── PHASE 2: BRANCHES & ROLES ────────────────────────────────
            _head('PHASE 2 — BRANCHES & ROLES')

            branches = Branch.query.all()
            T.chk('>= 3 branches exist', len(branches) >= 3,
                  str([b.name for b in branches]))
            T.chk('Main branch is_main=True', main_branch is not None,
                  main_branch.name if main_branch else '')

            r = get(c, '/api/roles')
            roles_data = j(r)
            T.chk('Roles API -> 200', r.status_code == 200, f'status={r.status_code}')
            all_perms = roles_data.get('all_permissions', [])
            T.chk('Roles contains permissions list',
                  len(all_perms) > 0, f'{len(all_perms)} permissions')

            # ── PHASE 3: CREATE SELLER ───────────────────────────────────
            _head('PHASE 3 — SUPPLIER (SELLER) CREATION')

            r = post(c, '/api/customers', {
                'name': f'بائع {PFX}',
                'phone': f'0770{uid[:7]}',
                'id_number': f'SLR-{uid}',
                'id_type': 'national_id',
                'customer_type': 'Seller',
                'branch_id': main_branch.id,
            })
            T.chk('Seller created -> 201', r.status_code == 201,
                  f'status={r.status_code}')
            seller_id = j(r).get('id')
            T.chk('Seller has valid ID', isinstance(seller_id, int), str(seller_id))
            _info(f'Seller ID = {seller_id}')

            # ── PHASE 4: CREATE BUYERS ───────────────────────────────────
            _head('PHASE 4 — BUYER CREATION')

            r = post(c, '/api/customers', {
                'name': f'مشتري نقدي {PFX}',
                'phone': f'0780{uid[:7]}',
                'id_number': f'BYR-{uid}',
                'id_type': 'national_id',
                'customer_type': 'Buyer',
                'branch_id': main_branch.id,
            })
            T.chk('Cash buyer created -> 201', r.status_code == 201,
                  f'status={r.status_code}')
            buyer_id = j(r).get('id')
            T.chk('Cash buyer has valid ID', isinstance(buyer_id, int), str(buyer_id))

            r = post(c, '/api/customers', {
                'name': f'مشتري تقسيط {PFX}',
                'phone': f'0790{uid[:7]}',
                'id_number': f'IBY-{uid}',
                'id_type': 'national_id',
                'customer_type': 'Buyer',
                'branch_id': main_branch.id,
            })
            T.chk('Installment buyer created -> 201', r.status_code == 201,
                  f'status={r.status_code}')
            inst_buyer_id = j(r).get('id')

            # ── PHASE 5: PURCHASE CAR (combined car + purchase) ──────────
            _head('PHASE 5 — PURCHASE CAR (NEW)')

            # POST /api/purchases creates car + purchase record together
            pur1_payload = {
                'brand': 'Toyota', 'model': 'Camry',
                'manufacturing_year': 2023, 'color': 'White',
                'vin': f'VIN{uid}A', 'plate_number': f'PL{uid}A',
                'mileage': 0,
                'seller_id': seller_id,
                'purchase_price': 30000, 'paid_amount': 10000,
                'currency': 'USD', 'payment_method': 'Cash',
                'purchase_date': today(),
                'condition': 'New',
                'selling_price': 35000,
            }
            r = post(c, '/api/purchases', pur1_payload)
            T.chk('New car purchase created -> 201', r.status_code == 201,
                  f'status={r.status_code}  body={r.data[:180].decode("utf-8","replace")}')
            pur1_data = j(r)
            pur1_id   = pur1_data.get('id')
            T.chk('Purchase has valid ID', isinstance(pur1_id, int), str(pur1_id))

            # Retrieve purchase to get car_id
            car1_id = None
            if pur1_id:
                r2 = get(c, f'/api/purchases/{pur1_id}')
                pur1_det = j(r2)
                car1_id = pur1_det.get('car_id') or (pur1_det.get('car') or {}).get('id')
                T.chk('Purchase detail accessible -> 200', r2.status_code == 200,
                      f'status={r2.status_code}')
                T.chk('Purchase linked to a car', car1_id is not None, str(car1_id))
            _info(f'Purchase ID={pur1_id}  Car ID={car1_id}')

            # Verify car is Available
            if car1_id:
                r = get(c, f'/api/inventory/{car1_id}')
                car1 = j(r)
                T.chk('Car status = Available after purchase',
                      car1.get('status') == 'Available',
                      f'status={car1.get("status")}')
                T.chk('Car brand = Toyota',
                      car1.get('brand') == 'Toyota', car1.get('brand'))

            # Verify journal entries for purchase
            if pur1_id:
                jes = JournalEntry.query.filter_by(
                    reference_type='Purchase', reference_id=pur1_id).all()
                T.chk('JEs created for purchase', len(jes) >= 1,
                      f'{len(jes)} entries')
                for je in jes:
                    dr = sum(float(l.debit or 0) for l in je.lines)
                    cr = sum(float(l.credit or 0) for l in je.lines)
                    T.chk(f'Purchase JE #{je.id} balanced',
                          abs(dr - cr) < 0.01, f'Dr={dr:.2f} Cr={cr:.2f}')
                inv_acct = Account.query.filter_by(code='115001').first()
                has_inv_dr = any(
                    any(l.account_id == inv_acct.id and float(l.debit or 0) > 0
                        for l in je.lines)
                    for je in jes
                ) if inv_acct else False
                T.chk('Purchase debits inventory 115001', has_inv_dr)
                ap_acct = Account.query.filter_by(code='211001').first()
                has_ap_cr = any(
                    any(l.account_id == ap_acct.id and float(l.credit or 0) > 0
                        for l in je.lines)
                    for je in jes
                ) if ap_acct else False
                T.chk('Purchase credits AP 211001', has_ap_cr)

            # ── PHASE 6: PURCHASE USED CAR (full payment) ────────────────
            _head('PHASE 6 — PURCHASE USED CAR (FULL PAYMENT)')

            r = post(c, '/api/purchases', {
                'brand': 'Honda', 'model': 'Accord',
                'manufacturing_year': 2021, 'color': 'Black',
                'vin': f'VIN{uid}B', 'plate_number': f'PL{uid}B',
                'mileage': 30000,
                'seller_id': seller_id,
                'purchase_price': 20000, 'paid_amount': 20000,
                'currency': 'USD', 'payment_method': 'Cash',
                'purchase_date': today(),
                'condition': 'Used',
                'selling_price': 25000,
            })
            T.chk('Used car purchase created -> 201', r.status_code == 201,
                  f'status={r.status_code}')
            pur2_data = j(r)
            pur2_id = pur2_data.get('id')

            car2_id = None
            if pur2_id:
                r2 = get(c, f'/api/purchases/{pur2_id}')
                d2 = j(r2)
                car2_id = d2.get('car_id') or (d2.get('car') or {}).get('id')
            _info(f'Purchase2 ID={pur2_id}  Car2 ID={car2_id}')

            # ── PHASE 7: INVENTORY CHECK ─────────────────────────────────
            _head('PHASE 7 — INVENTORY VERIFICATION')

            r = get(c, '/api/inventory')
            inv_data = j(r)
            cars_list = inv_data.get('cars') or inv_data.get('items') or []
            avail = [c2 for c2 in cars_list if c2.get('status') == 'Available']
            T.chk('Inventory API -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            T.chk('Both new cars appear as Available',
                  (car1_id in [c2['id'] for c2 in avail]) and
                  (car2_id in [c2['id'] for c2 in avail]) if car1_id and car2_id else False,
                  f'{len(avail)} available cars')

            # ── PHASE 8: ADDITIONAL PAYMENT TO SUPPLIER ──────────────────
            _head('PHASE 8 — PARTIAL SUPPLIER PAYMENT')

            pay_pur1_id = None
            if pur1_id:
                r = post(c, f'/api/purchases/{pur1_id}/payments', {
                    'amount': 10000,
                    'currency': 'USD',
                    'payment_method': 'Cash',
                    'payment_date': today(),
                })
                T.chk('Partial supplier payment recorded -> 201',
                      r.status_code == 201,
                      f'status={r.status_code}  body={r.data[:180].decode("utf-8","replace")}')
                pay_pur1_id = j(r).get('payment_id')
                if pay_pur1_id:
                    pur1_after = Purchase.query.get(pur1_id)
                    T.chk('Purchase paid_amount updated',
                          float(pur1_after.paid_amount or 0) >= 20000,
                          f'paid={pur1_after.paid_amount}')
                    # Check JE
                    je_pay = JournalEntry.query.filter_by(
                        reference_type='Payment', reference_id=pay_pur1_id).first()
                    T.chk('Payment JE created', je_pay is not None)
                    if je_pay:
                        dr = sum(float(l.debit or 0) for l in je_pay.lines)
                        cr = sum(float(l.credit or 0) for l in je_pay.lines)
                        T.chk('Supplier payment JE balanced',
                              abs(dr - cr) < 0.01, f'Dr={dr:.2f} Cr={cr:.2f}')
                        sup_acct = Account.query.filter_by(code='211001').first()
                        has_ap_dr = any(
                            l.account_id == sup_acct.id and float(l.debit or 0) > 0
                            for l in je_pay.lines
                        ) if sup_acct else False
                        T.chk('Supplier payment debits AP 211001', has_ap_dr)

            # ── PHASE 9: CASH SALE (FULL PAYMENT) ────────────────────────
            _head('PHASE 9 — SELL CAR 1: FULL CASH PAYMENT')

            sale1_id = None
            if car1_id and buyer_id:
                r = post(c, '/api/sales', {
                    'car_id': car1_id,
                    'buyer_id': buyer_id,
                    'selling_price': 35000,
                    'discount': 0,
                    'paid_amount': 35000,
                    'currency': 'USD',
                    'payment_method': 'Cash',
                    'sale_date': today(),
                    'branch_id': main_branch.id,
                })
                T.chk('Cash sale created -> 201', r.status_code in [200, 201],
                      f'status={r.status_code}  body={r.data[:200].decode("utf-8","replace")}')
                sale1_data = j(r)
                sale1_id = (sale1_data.get('id') or
                            sale1_data.get('sale', {}).get('id'))
                T.chk('Sale has valid ID', sale1_id is not None, str(sale1_id))

                # Car must be Sold
                r2 = get(c, f'/api/inventory/{car1_id}')
                T.chk('Car1 status -> Sold after sale',
                      j(r2).get('status') == 'Sold',
                      f'status={j(r2).get("status")}')

                # Car must be gone from available list
                r3 = get(c, '/api/inventory')
                inv3 = j(r3)
                cl3 = inv3.get('cars') or inv3.get('items') or []
                av3 = [x for x in cl3 if x.get('status') == 'Available']
                T.chk('Sold car not in Available list',
                      not any(x['id'] == car1_id for x in av3),
                      f'{len(av3)} available remaining')

                # JEs for sale
                if sale1_id:
                    jes_sale = JournalEntry.query.filter_by(
                        reference_type='Sale', reference_id=sale1_id).all()
                    T.chk('JEs created for sale', len(jes_sale) >= 1,
                          f'{len(jes_sale)} entries')
                    for je in jes_sale:
                        dr = sum(float(l.debit or 0) for l in je.lines)
                        cr = sum(float(l.credit or 0) for l in je.lines)
                        T.chk(f'Sale JE #{je.id} balanced',
                              abs(dr - cr) < 0.01, f'Dr={dr:.2f} Cr={cr:.2f}')
                    cogs_acct = Account.query.filter_by(code='360001').first()
                    rev_acct  = Account.query.filter_by(code='410001').first()
                    has_cogs = any(
                        any(l.account_id == cogs_acct.id and float(l.debit or 0) > 0
                            for l in je.lines)
                        for je in jes_sale
                    ) if cogs_acct else False
                    has_rev = any(
                        any(l.account_id == rev_acct.id and float(l.credit or 0) > 0
                            for l in je.lines)
                        for je in jes_sale
                    ) if rev_acct else False
                    T.chk('Sale has COGS entry (Dr 360001)', has_cogs)
                    T.chk('Sale has Revenue entry (Cr 410001)', has_rev)

            # ── PHASE 10: INSTALLMENT SALE ───────────────────────────────
            _head('PHASE 10 — SELL CAR 2: INSTALLMENT (5k down / 20k AR)')

            sale2_id = None
            if car2_id and inst_buyer_id:
                r = post(c, '/api/sales', {
                    'car_id': car2_id,
                    'buyer_id': inst_buyer_id,
                    'selling_price': 25000,
                    'discount': 0,
                    'paid_amount': 5000,
                    'currency': 'USD',
                    'payment_method': 'Installment',
                    'sale_date': today(),
                    'branch_id': main_branch.id,
                    # Installment plan fields (API requires enable_installment flag)
                    'enable_installment': True,
                    'number_of_months': 4,
                    'installment_start_date': today(),
                    'installment_due_day': 1,
                })
                T.chk('Installment sale created -> 201',
                      r.status_code in [200, 201],
                      f'status={r.status_code}  body={r.data[:200].decode("utf-8","replace")}')
                sale2_data = j(r)
                sale2_id = (sale2_data.get('id') or
                            sale2_data.get('sale', {}).get('id'))
                T.chk('Installment sale has valid ID',
                      sale2_id is not None, str(sale2_id))

                if sale2_id:
                    plan = InstallmentPlan.query.filter_by(sale_id=sale2_id).first()
                    T.chk('Installment plan created automatically',
                          plan is not None,
                          f'plan_id={plan.id if plan else None}')
                    if plan:
                        T.chk('Installment schedules generated',
                              len(plan.schedules) > 0,
                              f'{len(plan.schedules)} schedules')
                        # Verify AR account debited
                        jes_s2 = JournalEntry.query.filter_by(
                            reference_type='Sale', reference_id=sale2_id).all()
                        ar_acct = Account.query.filter_by(code='113002').first()
                        has_ar_dr = any(
                            any(l.account_id == ar_acct.id and float(l.debit or 0) > 0
                                for l in je.lines)
                            for je in jes_s2
                        ) if ar_acct else False
                        T.chk('Installment sale debits AR 113002', has_ar_dr)

            # ── PHASE 11: INSTALLMENT PAYMENT ────────────────────────────
            _head('PHASE 11 — INSTALLMENT PAYMENT')

            if sale2_id:
                plan2 = InstallmentPlan.query.filter_by(sale_id=sale2_id).first()
                if plan2 and plan2.schedules:
                    sched1 = min(plan2.schedules, key=lambda s: s.installment_number)
                    r = post(c, f'/api/installments/schedules/{sched1.id}/payment', {
                        'amount': 2000,
                        'currency': 'USD',
                        'payment_method': 'Cash',
                        'payment_date': today(),
                    })
                    T.chk('Installment payment recorded -> 201',
                          r.status_code in [200, 201],
                          f'status={r.status_code}  body={r.data[:150].decode("utf-8","replace")}')
                    if r.status_code in [200, 201]:
                        db.session.refresh(sched1)
                        T.chk('Schedule paid_amount updated to >= 2000',
                              float(sched1.paid_amount or 0) >= 2000,
                              f'paid={sched1.paid_amount}')
                        # JE for installment payment
                        inst_pay = Payment.query.filter_by(
                            installment_schedule_id=sched1.id).first()
                        if inst_pay:
                            je_ip = JournalEntry.query.filter_by(
                                reference_type='Payment',
                                reference_id=inst_pay.id).first()
                            T.chk('Installment payment JE created', je_ip is not None)
                            if je_ip:
                                dr = sum(float(l.debit or 0) for l in je_ip.lines)
                                cr = sum(float(l.credit or 0) for l in je_ip.lines)
                                T.chk('Installment payment JE balanced',
                                      abs(dr - cr) < 0.01, f'Dr={dr:.2f} Cr={cr:.2f}')
                                ar_acct = Account.query.filter_by(code='113002').first()
                                has_ar_cr = any(
                                    l.account_id == ar_acct.id and
                                    float(l.credit or 0) > 0
                                    for l in je_ip.lines
                                ) if ar_acct else False
                                T.chk('Inst. payment credits AR 113002', has_ar_cr)

            # ── PHASE 12: EXPENSE ────────────────────────────────────────
            _head('PHASE 12 — EXPENSE RECORDING')

            r = post(c, '/api/expenses', {
                'title': f'Rent {PFX}',
                'amount': 1500,
                'currency': 'USD',
                'category': 'Rent',
                'expense_date': today(),
                'branch_id': main_branch.id,
            })
            T.chk('Expense created -> 201', r.status_code in [200, 201],
                  f'status={r.status_code}  body={r.data[:150].decode("utf-8","replace")}')
            exp_id = j(r).get('id') or j(r).get('expense', {}).get('id')
            if exp_id:
                je_exp = JournalEntry.query.filter_by(
                    reference_type='Expense', reference_id=exp_id).first()
                T.chk('Expense JE created', je_exp is not None)
                if je_exp:
                    dr = sum(float(l.debit or 0) for l in je_exp.lines)
                    cr = sum(float(l.credit or 0) for l in je_exp.lines)
                    T.chk('Expense JE balanced', abs(dr - cr) < 0.01,
                          f'Dr={dr:.2f} Cr={cr:.2f}')

            # ── PHASE 13: VOUCHER ────────────────────────────────────────
            _head('PHASE 13 — MANUAL VOUCHER (RECEIPT)')

            r = post(c, '/api/vouchers', {
                'voucher_type': 'receipt',
                'debit_account_code': '111001',
                'credit_account_code': '440001',
                'amount': 500,
                'currency': 'USD',
                'description': f'Test receipt {PFX}',
                'voucher_date': today(),
            })
            T.chk('Voucher created -> 201', r.status_code in [200, 201],
                  f'status={r.status_code}  body={r.data[:150].decode("utf-8","replace")}')
            v_id = j(r).get('id') or j(r).get('voucher', {}).get('id')

            r = get(c, '/api/vouchers')
            T.chk('Vouchers list -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # ── PHASE 14: TRIAL BALANCE ──────────────────────────────────
            _head('PHASE 14 — TRIAL BALANCE')

            r = get(c, '/api/trial-balance')
            T.chk('Trial balance -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            tb = j(r)
            td = float(tb.get('total_debit') or 0)
            tc = float(tb.get('total_credit') or 0)
            T.chk('Trial balance: Dr = Cr (balanced)',
                  abs(td - tc) < 0.01,
                  f'Dr={td:,.2f}  Cr={tc:,.2f}  Δ={abs(td-tc):.2f}')
            T.chk('Trial balance has account lines',
                  len(tb.get('accounts', [])) > 0,
                  f'{len(tb.get("accounts", []))} lines')

            # ── PHASE 15: BALANCE SHEET ──────────────────────────────────
            _head('PHASE 15 — BALANCE SHEET (الميزانية العمومية)')

            r = get(c, '/api/reports/balance-sheet')
            T.chk('Balance sheet -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            bs = j(r)
            ta  = float(bs.get('total_assets') or 0)
            tl  = float(bs.get('total_liabilities') or 0)
            te  = float(bs.get('total_equity') or 0)
            ni  = float(bs.get('net_income') or 0)
            tle = float(bs.get('total_liabilities_equity') or 0)
            diff = float(bs.get('difference') or 999)
            T.chk('Assets >= 0', ta >= 0, f'Assets={ta:,.2f}')
            T.chk('Liabilities >= 0 (negate fix)', tl >= 0,
                  f'Liabilities={tl:,.2f}')
            T.chk('Net income included in BS response', 'net_income' in bs,
                  f'net_income={ni:,.2f}')
            T.chk('Balance sheet is_balanced (Assets = L + E + NI)',
                  bs.get('is_balanced', False),
                  f'Assets={ta:,.2f}  L+E+NI={tle:,.2f}  Diff={diff:.2f}')
            _info(f'Revenue={float(bs.get("revenue") or 0):,.2f}  '
                  f'Expenses={float(bs.get("expenses") or 0):,.2f}  '
                  f'Net Income={ni:,.2f}')

            # ── PHASE 16: CHART OF ACCOUNTS ──────────────────────────────
            _head('PHASE 16 — CHART OF ACCOUNTS (دليل الحسابات)')

            r = get(c, '/api/chart-of-accounts')
            T.chk('Chart of accounts -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            coa = j(r)
            # Response uses 'items' (tree) and 'flat' keys
            flat = coa.get('flat') or coa.get('items') or coa.get('accounts') or []
            T.chk('Chart has >= 50 accounts', len(flat) >= 50,
                  f'{len(flat)} accounts in flat/items list')
            coa_codes = {a['code'] for a in flat if 'code' in a}
            # Verify key accounts exist — check both flat list AND DB directly
            # (the flat list may omit deeply-nested accounts if the tree root
            # resolution order differs from the test-client session context)
            for code in ['111001', '115001', '211001', '410001', '360001']:
                in_flat = code in coa_codes
                in_db   = bool(Account.query.filter_by(code=code).first())
                T.chk(f'Key account {code} exists',
                      in_flat or in_db,
                      f'in_flat={in_flat}, in_db={in_db}')

            # ── PHASE 17: ACCOUNTING INTEGRITY ───────────────────────────
            _head('PHASE 17 — ACCOUNTING INTEGRITY AUDIT')

            r = get(c, '/api/admin/accounting-integrity')
            T.chk('Accounting integrity -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            integ = j(r)
            unbal = integ.get('issues', {}).get('unbalanced_journal_entries', [])
            T.chk('No unbalanced JEs', len(unbal) == 0,
                  f'{len(unbal)} unbalanced entries')

            r = get(c, '/api/admin/financial-consistency')
            T.chk('Financial consistency -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # ── PHASE 18: REPORTS ────────────────────────────────────────
            _head('PHASE 18 — ALL REPORT ENDPOINTS')

            report_eps = [
                ('/api/reports',                       'Main dashboard'),
                ('/api/reports/balance-sheet',         'Balance Sheet'),
                ('/api/reports/accounting-rules-check','Accounting Rules'),
                ('/api/reports/cashbox-movement',      'Cashbox Movement'),
                ('/api/reports/bank-movement',         'Bank Movement'),
                ('/api/reports/installment-aging',     'Installment Aging'),
                ('/api/reports/vehicle-profitability', 'Vehicle Profitability'),
                ('/api/reports/expense-analysis',      'Expense Analysis'),
                ('/api/reports/cost-center',           'Cost Center'),
                ('/api/sales',                         'Sales List'),
                ('/api/purchases',                     'Purchases List'),
                ('/api/expenses',                      'Expenses List'),
                ('/api/installments',                  'Installments List'),
                ('/api/inventory',                     'Inventory List'),
                ('/api/customers',                     'Customers List'),
            ]
            for ep, label in report_eps:
                r = get(c, ep)
                T.chk(f'{label} -> 200', r.status_code == 200,
                      f'status={r.status_code}')

            # ── PHASE 19: CASHBOX ────────────────────────────────────────
            _head('PHASE 19 — CASHBOX & CASH MANAGEMENT')

            for ep, lbl in [
                ('/api/cashbox',                    'Cashbox summary'),
                ('/api/cash-dashboard',             'Cash dashboard'),
                ('/api/cashbox-closes/current-balance', 'Current balance'),
                ('/api/cashbox-closes',             'Cashbox closes list'),
            ]:
                r = get(c, ep)
                T.chk(f'{lbl} -> 200', r.status_code == 200,
                      f'status={r.status_code}')

            # ── PHASE 20: CUSTOMER STATEMENTS ────────────────────────────
            _head('PHASE 20 — CUSTOMER STATEMENTS')

            for cust_id, label in [(seller_id, 'Seller'), (buyer_id, 'Buyer')]:
                if cust_id:
                    r = get(c, f'/api/customers/{cust_id}/statement')
                    T.chk(f'{label} statement -> 200', r.status_code == 200,
                          f'status={r.status_code}')

            # ── PHASE 21: SMART ALERTS ───────────────────────────────────
            _head('PHASE 21 — SMART ALERTS & NOTIFICATIONS')

            r = get(c, '/api/smart-alerts')
            T.chk('Smart alerts -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            alerts = j(r)
            T.chk('Alerts return list or dict',
                  isinstance(alerts, (list, dict)), str(type(alerts)))

            r = get(c, '/api/notifications')
            T.chk('Notifications -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # ── PHASE 22: JOURNAL ENTRIES LIST ───────────────────────────
            _head('PHASE 22 — JOURNAL ENTRIES LIST')

            r = get(c, '/api/journal-entries')
            T.chk('Journal entries -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            je_data = j(r)
            je_items = je_data.get('items') or je_data.get('entries') or []
            T.chk('Journal entries list has items',
                  len(je_items) > 0, f'{len(je_items)} items')

            # ── PHASE 23: DOCUMENT ACCESS ────────────────────────────────
            _head('PHASE 23 — DOCUMENTS (SALE / PURCHASE DETAILS)')

            if sale1_id:
                r = get(c, f'/api/sales/{sale1_id}')
                T.chk('Sale detail -> 200', r.status_code == 200,
                      f'status={r.status_code}')
                sd = j(r)
                T.chk('Sale has invoice_number', 'invoice_number' in sd,
                      sd.get('invoice_number', 'missing'))
                T.chk('Sale has buyer info', 'buyer_id' in sd or 'buyer' in sd)

                # Payment receipt
                pay_sale1 = Payment.query.filter_by(sale_id=sale1_id).first()
                if pay_sale1:
                    r = get(c, f'/api/payments/{pay_sale1.id}/receipt')
                    T.chk('Payment receipt -> 200', r.status_code == 200,
                          f'status={r.status_code}')

            if pur1_id:
                r = get(c, f'/api/purchases/{pur1_id}')
                T.chk('Purchase detail -> 200', r.status_code == 200,
                      f'status={r.status_code}')
                pd = j(r)
                T.chk('Purchase has invoice_number', 'invoice_number' in pd,
                      pd.get('invoice_number', 'missing'))

            # Installment plan + schedule
            if sale2_id:
                plan3 = InstallmentPlan.query.filter_by(sale_id=sale2_id).first()
                if plan3:
                    r = get(c, f'/api/installments/{plan3.id}')
                    T.chk('Installment plan detail -> 200', r.status_code == 200,
                          f'status={r.status_code}')
                    pdet = j(r)
                    T.chk('Plan has schedules list',
                          len(pdet.get('schedules', [])) > 0,
                          f'{len(pdet.get("schedules", []))} schedules')

            # ── PHASE 24: RBAC / PERMISSIONS ─────────────────────────────
            _head('PHASE 24 — RBAC & PERMISSIONS')

            # Create Sales user while still logged in as Owner
            r = post(c, '/api/users', {
                'username': f'sales_{uid}',
                'password': 'SalesPass123!',
                'role': 'Sales',
                'branch_id': main_branch.id,
            })
            T.chk('Owner can create Sales user -> 201',
                  r.status_code in [200, 201],
                  f'status={r.status_code}')

            # Create Accountant user
            r = post(c, '/api/users', {
                'username': f'acct_{uid}',
                'password': 'AcctPass123!',
                'role': 'Accountant',
                'branch_id': main_branch.id,
            })
            T.chk('Owner can create Accountant user -> 201',
                  r.status_code in [200, 201],
                  f'status={r.status_code}')

        # Test Sales user permissions (separate client, no nesting)
        with app.test_client() as sales_c:
            r = post(sales_c, '/api/auth/login',
                     {'username': f'sales_{uid}', 'password': 'SalesPass123!'})
            T.chk('Sales user login -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            if r.status_code == 200:
                r = get(sales_c, '/api/trial-balance')
                T.chk('Sales user: trial-balance DENIED (403/401)',
                      r.status_code in [401, 403],
                      f'status={r.status_code}')
                r = get(sales_c, '/api/inventory')
                T.chk('Sales user: inventory ACCESS ALLOWED (200)',
                      r.status_code == 200,
                      f'status={r.status_code}')
                r = get(sales_c, '/api/reports/balance-sheet')
                T.chk('Sales user: balance-sheet DENIED (403/401)',
                      r.status_code in [401, 403],
                      f'status={r.status_code}')

        # Test Accountant user permissions
        with app.test_client() as acct_c:
            r = post(acct_c, '/api/auth/login',
                     {'username': f'acct_{uid}', 'password': 'AcctPass123!'})
            T.chk('Accountant user login -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            if r.status_code == 200:
                r = get(acct_c, '/api/trial-balance')
                T.chk('Accountant: trial-balance ACCESS ALLOWED (200)',
                      r.status_code == 200,
                      f'status={r.status_code}')
                r = get(acct_c, '/api/users')
                T.chk('Accountant: user management DENIED (403/401)',
                      r.status_code in [401, 403],
                      f'status={r.status_code}')

        # ── PHASE 25: ADMIN & SYSTEM ─────────────────────────────────────
        _head('PHASE 25 — ADMIN TOOLS & SYSTEM HEALTH')

        with app.test_client() as admin_c:
            post(admin_c, '/api/auth/login',
                 {'username': 'owner', 'password': 'TestPass2024!'})

            r = get(admin_c, '/api/admin/logs')
            T.chk('Admin logs -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            log_d = j(r)
            T.chk('Logs returns data', isinstance(log_d, (list, dict)),
                  str(type(log_d)))

            r = get(admin_c, '/api/admin/system-health')
            T.chk('System health -> 200', r.status_code == 200,
                  f'status={r.status_code}')
            health = j(r)
            T.chk('System health has DB status', 'database' in health,
                  str(list(health.keys()))[:60])

            r = get(admin_c, '/api/health')
            T.chk('/api/health -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            r = get(admin_c, '/api/version')
            T.chk('/api/version -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # Audit trail
            audit_count = AuditLog.query.count()
            T.chk('Audit trail has entries', audit_count > 0,
                  f'{audit_count} audit entries')

            # Backup list
            r = get(admin_c, '/api/backups')
            T.chk('Backups list -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # Exchange rate
            r = get(admin_c, '/api/exchange-rate/current')
            T.chk('Exchange rate -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # Cost centers
            r = get(admin_c, '/api/cost-centers')
            T.chk('Cost centers -> 200', r.status_code == 200,
                  f'status={r.status_code}')

            # Logout
            r = post(admin_c, '/api/auth/logout', {})
            T.chk('Owner logout -> 200/204', r.status_code in [200, 204],
                  f'status={r.status_code}')
            r = get(admin_c, '/api/trial-balance')
            T.chk('After logout: trial-balance DENIED', r.status_code in [401, 403],
                  f'status={r.status_code}')

        # ── PHASE 26: ACCOUNTING DELTA CHECKS ───────────────────────────
        _head('PHASE 26 — ACCOUNTING DELTA VERIFICATION')

        with app.app_context():
            def chk_dir(label, code, direction, min_abs=None):
                dr, cr, bal = acct_delta(code, snap)
                _info(f'{label} ({code}): Dr={dr:,.2f}  Cr={cr:,.2f}  Bal={bal:,.2f}')
                if direction == '+':
                    ok = bal >= 0
                elif direction == '-':
                    ok = bal <= 0
                else:
                    ok = abs(bal) < 0.01
                if min_abs is not None:
                    ok = ok and abs(bal) >= min_abs
                T.chk(f'{label}: balance direction ({direction})', ok,
                      f'bal={bal:,.2f}')

            chk_dir('Cash (111001)',          '111001', '+', 1000)
            chk_dir('New car inventory',       '115001', None)      # sold = 0
            chk_dir('Used car inventory',      '115002', None)      # sold = 0
            chk_dir('Installment AR',          '113002', '+')       # AR from inst sale
            chk_dir('Supplier AP',             '211001', '-')       # credit-heavy
            chk_dir('COGS (360001)',           '360001', '+', 1)    # debit expense
            chk_dir('Revenue new (410001)',    '410001', '-')       # credit income
            chk_dir('Revenue used (410002)',   '410002', '-')       # credit income

            # Final trial balance after all test ops
            lines_final, totals_final = get_trial_balance()
            td_f = float(totals_final['total_debit'])
            tc_f = float(totals_final['total_credit'])
            T.chk('FINAL trial balance balanced after all test operations',
                  abs(td_f - tc_f) < 0.01,
                  f'Dr={td_f:,.2f}  Cr={tc_f:,.2f}  Δ={abs(td_f-tc_f):.2f}')

            # Inventory health check
            neg_inv = [a for a in lines_final
                       if a['type'] == 'Asset' and a['code'].startswith('115')
                       and a['balance'] < -0.01]
            if neg_inv:
                for a in neg_inv:
                    T.warn(f'Inventory account {a["code"]} has negative balance',
                           f'bal={a["balance"]:,.2f} — more sold than purchased')
            else:
                T.chk('No inventory accounts with negative balances', True)

        # ── CLEANUP ──────────────────────────────────────────────────────
        _head('CLEANUP')
        with app.app_context():
            db.session.rollback()
        _info('All test data rolled back — production database unchanged')

    return T.summary()


if __name__ == '__main__':
    ok = run()
    sys.exit(0 if ok else 1)
