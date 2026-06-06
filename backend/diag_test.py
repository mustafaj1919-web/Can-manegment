"""Diagnostic script to understand API response structures."""
import json
import sys
import os
os.environ['PYTHONUTF8'] = '1'


def run():
    from .app import create_app
    from .database import db
    app = create_app()

    with app.test_client() as c:
        with app.app_context():
            # login
            r = c.post('/api/auth/login',
                       data=json.dumps({'username': 'owner', 'password': 'TestPass2024!'}),
                       content_type='application/json')
            print(f'LOGIN: {r.status_code}')

            # /api/auth/me structure
            r = c.get('/api/auth/me')
            d = json.loads(r.data)
            print(f'ME keys: {list(d.keys())}  username={d.get("username")}')

            # COA structure
            r = c.get('/api/chart-of-accounts')
            d = json.loads(r.data)
            print(f'COA type: {type(d).__name__}')
            if isinstance(d, dict):
                for k, v in d.items():
                    L = len(v) if hasattr(v, '__len__') else '-'
                    print(f'  {k}: {type(v).__name__}  len={L}')

            # Purchase API - date format test
            r = c.post('/api/purchases',
                       data=json.dumps({
                           'car_id': 999, 'seller_id': 999,
                           'purchase_price': 30000, 'paid_amount': 0,
                           'currency': 'USD', 'payment_method': 'Cash',
                           'purchase_date': '2024-01-01',
                       }),
                       content_type='application/json')
            err = json.loads(r.data).get('error', '')
            print(f'PURCHASE (YYYY-MM-DD) status={r.status_code}  err={err[:100]}')

            # Sale API - date format
            r = c.post('/api/sales',
                       data=json.dumps({
                           'car_id': 999, 'buyer_id': 999,
                           'selling_price': 30000, 'paid_amount': 30000,
                           'currency': 'USD', 'payment_method': 'Cash',
                           'sale_date': '2024-01-01', 'branch_id': 1,
                       }),
                       content_type='application/json')
            err2 = json.loads(r.data).get('error', '')
            print(f'SALE (YYYY-MM-DD) status={r.status_code}  err={err2[:100]}')

            # Expense API
            r = c.post('/api/expenses',
                       data=json.dumps({
                           'title': 'Test', 'amount': 100,
                           'currency': 'USD', 'category': 'Admin',
                           'expense_date': '2024-01-01', 'branch_id': 1,
                       }),
                       content_type='application/json')
            err3 = json.loads(r.data).get('error', '')
            print(f'EXPENSE (YYYY-MM-DD) status={r.status_code}  err={err3[:100]}')

            # Voucher API
            r = c.post('/api/vouchers',
                       data=json.dumps({
                           'voucher_type': 'receipt',
                           'debit_account_code': '111001',
                           'credit_account_code': '440001',
                           'amount': 500, 'currency': 'USD',
                           'description': 'Test',
                           'voucher_date': '2024-01-01',
                       }),
                       content_type='application/json')
            d4 = json.loads(r.data)
            print(f'VOUCHER (YYYY-MM-DD) status={r.status_code}  keys={list(d4.keys())[:5]}')

            # Admin/logs
            r = c.get('/api/admin/logs')
            d5 = json.loads(r.data)
            print(f'ADMIN LOGS: {r.status_code}  err={d5.get("error","OK")[:60]}')

            # System health
            r = c.get('/api/admin/system-health')
            d6 = json.loads(r.data)
            print(f'SYSTEM HEALTH: {r.status_code}  keys={list(d6.keys())[:5]}')

            # Journal entries structure
            r = c.get('/api/journal-entries')
            d7 = json.loads(r.data)
            print(f'JE type={type(d7).__name__}  keys={list(d7.keys()) if isinstance(d7, dict) else "list"}')
            if isinstance(d7, dict):
                for k, v in d7.items():
                    L = len(v) if hasattr(v, '__len__') else '-'
                    print(f'  {k}: {type(v).__name__}  len={L}')

            # Roles structure
            r = c.get('/api/roles')
            d8 = json.loads(r.data)
            print(f'ROLES type={type(d8).__name__}  keys={list(d8.keys()) if isinstance(d8, dict) else "list"}')
            if isinstance(d8, dict) and 'roles' in d8:
                print(f'  roles subkeys: {list(d8["roles"].keys())[:6]}')

            # Balance sheet
            r = c.get('/api/reports/balance-sheet')
            d9 = json.loads(r.data)
            print(f'BS: assets={d9.get("total_assets")}  liab={d9.get("total_liabilities")}  '
                  f'eq={d9.get("total_equity")}  balanced={d9.get("is_balanced")}  '
                  f'diff={d9.get("difference")}')

            # Accounting integrity
            r = c.get('/api/admin/accounting-integrity')
            d10 = json.loads(r.data)
            print(f'INTEGRITY: {r.status_code}  keys={list(d10.keys())[:5]}')
            issues = d10.get('issues', {})
            for k, v in issues.items():
                if v:
                    print(f'  ISSUE {k}: {len(v) if hasattr(v,"__len__") else v}')


if __name__ == '__main__':
    run()
