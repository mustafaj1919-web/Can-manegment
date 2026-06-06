"""Deep diagnostic for balance sheet imbalance + API structure verification."""
import json
import os
os.environ['PYTHONUTF8'] = '1'


def run():
    from .app import create_app
    from .database import db
    from .models import Account, JournalEntry, JournalEntryLine
    from .accounting import get_trial_balance
    from sqlalchemy import func

    app = create_app()

    with app.app_context():
        print('\n=== TRIAL BALANCE TOTALS ===')
        lines, totals = get_trial_balance()
        td = float(totals['total_debit'])
        tc = float(totals['total_credit'])
        print(f'  Total Debit  : {td:>18,.2f}')
        print(f'  Total Credit : {tc:>18,.2f}')
        print(f'  Difference   : {td - tc:>18,.2f}')
        print(f'  Balanced     : {abs(td-tc) < 0.01}')

        print('\n=== ACCOUNT TYPE BALANCES ===')
        type_totals = {}
        for row in lines:
            t = row['type']
            if t not in type_totals:
                type_totals[t] = {'dr': 0, 'cr': 0}
            type_totals[t]['dr'] += row['debit']
            type_totals[t]['cr'] += row['credit']
        for t, v in type_totals.items():
            bal = v['dr'] - v['cr']
            print(f'  {t:<12}: Dr={v["dr"]:>14,.2f}  Cr={v["cr"]:>14,.2f}  Bal={bal:>14,.2f}')

        print('\n=== BALANCE SHEET MATH ===')
        asset_bal = sum(r['balance'] for r in lines if r['type'] == 'Asset')
        liab_bal  = sum(r['balance'] for r in lines if r['type'] == 'Liability')
        eq_bal    = sum(r['balance'] for r in lines if r['type'] == 'Equity')
        inc_bal   = sum(r['balance'] for r in lines if r['type'] == 'Income')
        exp_bal   = sum(r['balance'] for r in lines if r['type'] == 'Expense')
        print(f'  Assets (raw Dr-Cr)       : {asset_bal:>18,.2f}')
        print(f'  Liabilities (raw Dr-Cr)  : {liab_bal:>18,.2f}  (negate for BS: {-liab_bal:,.2f})')
        print(f'  Equity (raw Dr-Cr)       : {eq_bal:>18,.2f}  (negate for BS: {-eq_bal:,.2f})')
        print(f'  Income (raw Dr-Cr)       : {inc_bal:>18,.2f}  (credit = negative = revenue)')
        print(f'  Expense (raw Dr-Cr)      : {exp_bal:>18,.2f}  (debit = positive = expense)')
        net_income = -inc_bal - exp_bal
        print(f'  Net Income (Rev-Exp)     : {net_income:>18,.2f}')
        print()
        total_equity_with_ni = -eq_bal + net_income
        print(f'  Assets                   : {asset_bal:>18,.2f}')
        print(f'  Liabilities (shown +)    : {-liab_bal:>18,.2f}')
        print(f'  Equity accounts (shown +): {-eq_bal:>18,.2f}')
        print(f'  Net Income               : {net_income:>18,.2f}')
        print(f'  Total L + E + NI         : {-liab_bal + total_equity_with_ni:>18,.2f}')
        print(f'  Balance sheet diff       : {asset_bal - (-liab_bal + total_equity_with_ni):>18,.2f}')
        print()
        print('  NOTE: The BS will only balance if Net Income is added to Equity.')
        print(f'  Simple check (Assets + all): {asset_bal + liab_bal + eq_bal + inc_bal + exp_bal:>14,.2f}')

        print('\n=== UNBALANCED JOURNAL ENTRIES ===')
        unbal = []
        for je in JournalEntry.query.all():
            dr = sum(float(l.debit or 0) for l in je.lines)
            cr = sum(float(l.credit or 0) for l in je.lines)
            if abs(dr - cr) > 0.01:
                unbal.append((je.id, je.description, dr, cr))
        if not unbal:
            print('  NONE — all journal entries are balanced')
        else:
            print(f'  {len(unbal)} unbalanced entries:')
            for je_id, desc, dr, cr in unbal[:10]:
                print(f'    JE#{je_id}: Dr={dr:.2f} Cr={cr:.2f} Diff={dr-cr:.2f}  {desc}')

        print('\n=== TOP ACCOUNTS WITH BALANCES ===')
        active = [(r['code'], r['name'], r['type'], r['balance'])
                  for r in lines if abs(r['balance']) > 0]
        active.sort(key=lambda x: abs(x[3]), reverse=True)
        for code, name, t, bal in active[:20]:
            print(f'  {code:<8} {t:<10} {bal:>16,.2f}  {name}')

    with app.test_client() as c:
        with app.app_context():
            r = c.post('/api/auth/login',
                       data=json.dumps({'username': 'owner', 'password': 'TestPass2024!'}),
                       content_type='application/json')
            print(f'\n=== PURCHASE API TEST (correct format) ===')
            # Test purchase with all required fields
            r = c.post('/api/purchases', data=json.dumps({
                'brand': 'Toyota', 'model': 'Test', 'manufacturing_year': 2023,
                'color': 'White', 'vin': 'DIAGVIN999', 'plate_number': 'DIAGPL999',
                'mileage': 0, 'seller_id': 6,
                'purchase_price': 10000, 'paid_amount': 0,
                'currency': 'USD', 'payment_method': 'Cash',
                'purchase_date': '2024-01-01',
            }), content_type='application/json')
            d = json.loads(r.data)
            print(f'  status={r.status_code}  keys={list(d.keys())[:6]}')
            if r.status_code not in [200, 201]:
                print(f'  error: {d.get("error")}')
            else:
                print(f'  purchase_id={d.get("id") or d.get("purchase", {}).get("id")}')
                print(f'  car_id={d.get("car_id") or d.get("car", {}).get("id")}')
                print('  (rolling back...)')
                db.session.rollback()


if __name__ == '__main__':
    run()
