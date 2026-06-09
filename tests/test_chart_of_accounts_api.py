import atexit
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch
from decimal import Decimal
from uuid import uuid4
import zipfile


_TEST_DIR = tempfile.mkdtemp(prefix='coa_test_')
os.makedirs(os.path.join(_TEST_DIR, 'database'), exist_ok=True)
os.makedirs(os.path.join(_TEST_DIR, 'static'), exist_ok=True)
os.environ['CAR_SHOWROOM_DATA_DIR'] = _TEST_DIR
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_TEST_DIR, 'database', 'showroom.db')
os.environ['BACKUP_FOLDER'] = os.path.join(_TEST_DIR, 'data', 'backups')
os.environ['SECRET_KEY'] = 'chart-of-accounts-test-secret'
atexit.register(lambda: shutil.rmtree(_TEST_DIR, ignore_errors=True))


from backend.accounting import create_journal_entry, get_trial_balance, recompute_all_account_balances  # noqa: E402
from backend.app import create_app, database_accounting_lock_message, password_hash_fingerprint  # noqa: E402
from backend.backup_utils import create_backup_archive, ensure_daily_backup, list_backup_archives  # noqa: E402
from backend.config import Config  # noqa: E402
from backend.database import db  # noqa: E402
from backend.models import Account, AuditLog, Branch, Car, Customer, Expense, JournalEntry, JournalEntryLine, Payment, Purchase, Sale, Transaction, User  # noqa: E402
from backend.seed_chart_of_accounts import DEFAULT_ACCOUNTS, seed_chart_of_accounts  # noqa: E402


class ChartOfAccountsApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            seed_chart_of_accounts()
            user = User(
                username='accountant',
                role='Accountant',
                can_access_all_branches=True,
                is_active_user=True,
            )
            user.set_password('secret')
            db.session.add(user)
            admin = User(
                username='admin',
                role='Admin',
                can_access_all_branches=True,
                is_active_user=True,
            )
            admin.set_password('secret')
            db.session.add(admin)
            owner = User(
                username='owner',
                role='Owner',
                can_access_all_branches=True,
                is_active_user=True,
            )
            owner.set_password('secret')
            db.session.add(owner)
            db.session.flush()
            cls.user_id = user.id
            cls.password_hash = user.password_hash
            cls.admin_id = admin.id
            cls.admin_password_hash = admin.password_hash
            cls.owner_id = owner.id
            cls.owner_password_hash = owner.password_hash

            create_journal_entry(
                description='COA test balanced entry',
                reference_type='Test',
                reference_id=1,
                lines=[
                    {'account_code': '111001', 'debit': 100, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': 100},
                ],
            )
            db.session.commit()

    def authenticate(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.user_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.password_hash)

    def authenticate_admin(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.admin_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.admin_password_hash)

    def authenticate_owner(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.owner_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.owner_password_hash)

    def assert_balanced_reference(self, reference_type, reference_id, min_entries=1):
        entries = JournalEntry.query.filter_by(
            reference_type=reference_type,
            reference_id=reference_id,
        ).all()
        self.assertGreaterEqual(len(entries), min_entries, f'{reference_type} #{reference_id} has no journal entry')
        for entry in entries:
            debit = round(sum(float(line.debit or 0) for line in entry.lines), 2)
            credit = round(sum(float(line.credit or 0) for line in entry.lines), 2)
            self.assertEqual(debit, credit, f'Journal entry #{entry.id} is not balanced')

    def test_chart_of_accounts_api_requires_login(self):
        with self.client.session_transaction() as session:
            session.clear()
        response = self.client.get('/api/chart-of-accounts')

        self.assertEqual(response.status_code, 401)
        self.assertTrue(response.is_json)

    def test_chart_of_accounts_api_returns_complete_tree(self):
        self.authenticate()

        response = self.client.get('/api/chart-of-accounts')
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['total'], len(DEFAULT_ACCOUNTS))
        self.assertEqual(data['summary']['main'], 5)
        self.assertIn('totals', data)
        self.assertIn('type_summary', data)
        self.assertIn('Asset', data['type_summary'])
        self.assertIn('Liability', data['type_summary'])

        flat = data['flat']
        codes = [item['code'] for item in flat]
        self.assertEqual(len(codes), len(set(codes)))
        self.assertTrue(all(code.isdigit() and len(code) == 6 for code in codes))

        by_code = {item['code']: item for item in flat}
        self.assertIsNone(by_code['100000']['parent_code'])
        self.assertEqual(by_code['111001']['parent_code'], '111000')
        self.assertEqual(by_code['111001']['own_debit'], 100.0)
        self.assertEqual(by_code['100000']['subtree_debit'], 100.0)
        self.assertEqual(by_code['200000']['subtree_credit'], 100.0)

    def test_z_account_delete_archives_and_preserves_accounting_history(self):
        self.authenticate_admin()
        suffix = uuid4().hex[:6]
        code = f'49{int(uuid4().hex[:8], 16) % 10000:04d}'

        with self.app.app_context():
            account = Account(
                code=code,
                name=f'Archive regression {suffix}',
                type='Income',
                classification='other_revenue',
                balance=0,
            )
            db.session.add(account)
            db.session.flush()
            entry = create_journal_entry(
                description='Archive regression entry',
                reference_type='ArchiveRegression',
                reference_id=account.id,
                lines=[
                    {'account_code': '111001', 'debit': 250, 'credit': 0},
                    {'account_code': code, 'debit': 0, 'credit': 250},
                ],
            )
            db.session.commit()
            account_id = account.id
            entry_id = entry.id
            account_count = Account.query.count()

        csrf_token = f'archive-account-{suffix}'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token

        archive_response = self.client.delete(
            f'/api/accounts/{account_id}',
            headers={'X-XSRF-TOKEN': csrf_token},
        )
        self.assertEqual(archive_response.status_code, 200, archive_response.get_data(as_text=True))
        self.assertFalse(archive_response.get_json()['is_active'])

        with self.app.app_context():
            db.session.remove()
            archived = db.session.get(Account, account_id)
            self.assertIsNotNone(archived)
            self.assertFalse(archived.is_active)
            self.assertEqual(Account.query.count(), account_count)
            self.assertTrue(JournalEntryLine.query.filter_by(journal_entry_id=entry_id, account_id=account_id).first())
            with self.assertRaisesRegex(ValueError, 'مؤرشف'):
                create_journal_entry(
                    description='Must reject archived account',
                    lines=[
                        {'account_code': '111001', 'debit': 10, 'credit': 0},
                        {'account_code': code, 'debit': 0, 'credit': 10},
                    ],
                )
            db.session.rollback()

        chart_response = self.client.get('/api/chart-of-accounts')
        self.assertEqual(chart_response.status_code, 200)
        archived_node = next(item for item in chart_response.get_json()['flat'] if item['id'] == account_id)
        self.assertFalse(archived_node['is_active'])

        reverse_response = self.client.post(
            f'/api/journal-entries/{entry_id}/reverse',
            headers={'X-XSRF-TOKEN': csrf_token},
        )
        self.assertEqual(reverse_response.status_code, 200, reverse_response.get_data(as_text=True))

        reactivate_response = self.client.put(
            f'/api/accounts/{account_id}',
            json={'is_active': True},
            headers={'X-XSRF-TOKEN': csrf_token},
        )
        self.assertEqual(reactivate_response.status_code, 200, reactivate_response.get_data(as_text=True))
        self.assertTrue(reactivate_response.get_json()['is_active'])

        with self.app.app_context():
            db.session.remove()
            self.assertTrue(db.session.get(Account, account_id).is_active)
            actions = {
                row.action for row in AuditLog.query.filter_by(
                    entity_type='Account',
                    entity_id=account_id,
                ).all()
            }
            self.assertIn('archive account', actions)
            self.assertIn('enable account', actions)

    def test_trial_balance_api_returns_balanced_status(self):
        self.authenticate()

        response = self.client.get('/api/trial-balance')
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(data.keys()), {
            'accounts',
            'total_debit',
            'total_credit',
            'difference',
            'status',
        })
        self.assertGreaterEqual(data['total_debit'], 100.0)
        self.assertEqual(data['total_debit'], data['total_credit'])
        self.assertEqual(data['difference'], 0.0)
        self.assertEqual(data['status'], 'balanced')

    def test_z_decimal_journal_entry_normalizes_binary_float_inputs(self):
        with self.app.app_context():
            entry = create_journal_entry(
                description='Decimal precision regression',
                reference_type='DecimalPrecision',
                lines=[
                    {'account_code': '111001', 'debit': 0.1 + 0.2, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': Decimal('0.30')},
                ],
            )
            db.session.commit()

            debit = sum((line.debit or Decimal('0')) for line in entry.lines)
            credit = sum((line.credit or Decimal('0')) for line in entry.lines)
            self.assertEqual(debit, Decimal('0.3000'))
            self.assertEqual(credit, Decimal('0.3000'))
            self.assertEqual(debit, credit)

    def test_z_decimal_sale_amounts_and_installment_split_are_exact(self):
        self.authenticate_admin()
        suffix = uuid4().hex[:8]

        with self.app.app_context():
            branch = Branch.query.filter_by(is_main=True).first()
            if branch is None:
                branch = Branch(name='Decimal test branch', is_main=True)
                db.session.add(branch)
                db.session.flush()
            buyer = Customer(
                branch_id=branch.id,
                name=f'Decimal buyer {suffix}',
                phone='07000000004',
                id_number=f'DECIMAL-BUYER-{suffix}',
                customer_type='Buyer',
            )
            car = Car(
                branch_id=branch.id,
                brand='Toyota',
                model='Yaris',
                manufacturing_year=2025,
                color='Silver',
                vin=f'DECIMALVIN{suffix}',
                plate_number=f'DEC{suffix}',
                purchase_price=Decimal('10.01'),
                selling_price=Decimal('100.00'),
                currency='IQD',
                status='Available',
            )
            db.session.add_all([buyer, car])
            db.session.commit()
            buyer_id = buyer.id
            car_id = car.id

        csrf_token = f'decimal-sale-{suffix}'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token

        response = self.client.post(
            '/api/sales',
            json={
                'car_id': car_id,
                'buyer_id': buyer_id,
                'selling_price': '100.00',
                'discount': '0.10',
                'paid_amount': '0.20',
                'currency': 'IQD',
                'payment_method': 'Cash',
                'sale_date': '2026-06-08',
                'enable_installment': True,
                'number_of_months': 3,
                'installment_start_date': '2026-07-01',
                'installment_due_day': 1,
            },
            headers={'X-XSRF-TOKEN': csrf_token},
        )
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))

        with self.app.app_context():
            sale = db.session.get(Sale, response.get_json()['id'])
            schedules = sorted(sale.installment_plan.schedules, key=lambda item: item.installment_number)
            schedule_total = sum((item.amount for item in schedules), Decimal('0'))

            self.assertEqual(sale.selling_price, Decimal('100.00'))
            self.assertEqual(sale.discount, Decimal('0.10'))
            self.assertEqual(sale.paid_amount, Decimal('0.20'))
            self.assertEqual(sale.remaining_amount, Decimal('99.70'))
            self.assertEqual([item.amount for item in schedules], [
                Decimal('33.23'),
                Decimal('33.23'),
                Decimal('33.24'),
            ])
            self.assertEqual(schedule_total, sale.remaining_amount)

            sale_entries = JournalEntry.query.filter_by(
                reference_type='Sale',
                reference_id=sale.id,
            ).all()
            revenue_entry = next(
                entry for entry in sale_entries
                if any(line.account and line.account.code == '410001' for line in entry.lines)
            )
            revenue_credit = next(
                line.credit for line in revenue_entry.lines
                if line.account and line.account.code == '410001'
            )
            self.assertEqual(revenue_credit, Decimal('99.9000'))

    def test_html_routes_remain_pages(self):
        self.authenticate()

        chart_response = self.client.get('/chart-of-accounts')
        trial_response = self.client.get('/trial-balance')

        self.assertEqual(chart_response.status_code, 200)
        self.assertEqual(trial_response.status_code, 200)
        self.assertIn('text/html', chart_response.content_type)
        self.assertIn('text/html', trial_response.content_type)

    def test_accounting_integrity_report_api(self):
        self.authenticate()

        response = self.client.get('/api/admin/accounting-integrity')
        data = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertIn('unbalanced_journal_entries', data['issues'])
        self.assertIn('journal_lines_missing_accounts', data['issues'])
        self.assertIn('operations_missing_journal_entries', data['issues'])
        self.assertEqual(data['issue_counts']['unbalanced_journal_entries'], 0)
        self.assertEqual(data['issue_counts']['journal_lines_missing_accounts'], 0)

    def test_accounting_lock_blocks_records_with_journal_entries(self):
        with self.app.app_context():
            transaction = Transaction(transaction_type='Income', amount=1, currency='IQD')
            db.session.add(transaction)
            db.session.flush()
            db.session.add(JournalEntry(reference_type='Transaction', reference_id=transaction.id))
            db.session.commit()

            message = database_accounting_lock_message(Transaction, transaction)

            self.assertIsNotNone(message)
            self.assertIn('قيد', message)


    def test_backup_archive_includes_database_and_uploads(self):
        with self.app.app_context():
            os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
            upload_path = os.path.join(Config.UPLOAD_FOLDER, 'backup-test.txt')
            with open(upload_path, 'w', encoding='utf-8') as handle:
                handle.write('backup upload fixture')

            backup = create_backup_archive(created_by='tester', reason='manual')

            self.assertRegex(backup['filename'], r'^backup_\d{8}_\d{6}(?:_\d+)?\.zip$')
            self.assertTrue(os.path.exists(backup['path']))
            self.assertEqual(os.path.dirname(backup['path']), os.environ['BACKUP_FOLDER'])

            with zipfile.ZipFile(backup['path'], 'r') as archive:
                names = set(archive.namelist())

            self.assertIn('metadata.json', names)
            self.assertIn('database/showroom.db', names)
            self.assertIn('static/uploads/backup-test.txt', names)

    def test_daily_backup_exists_once_for_current_day(self):
        with self.app.app_context():
            first = ensure_daily_backup(created_by='system')
            second = ensure_daily_backup(created_by='system')
            daily_backups = [
                item for item in list_backup_archives()
                if item['reason'] == 'daily_auto'
            ]

            self.assertIsNone(first)
            self.assertIsNone(second)
            self.assertGreaterEqual(len(daily_backups), 1)

    def test_backup_delete_api_is_disabled(self):
        self.authenticate_admin()
        with self.app.app_context():
            backup = create_backup_archive(created_by='tester', reason='manual')

        response = self.client.delete(f"/api/backups/{backup['filename']}")

        self.assertEqual(response.status_code, 405)
        self.assertTrue(os.path.exists(backup['path']))

    def test_full_accounting_flow_links_operations_to_accounts(self):
        self.authenticate_owner()
        suffix = uuid4().hex[:8]

        seller_response = self.client.post('/api/customers', json={
            'name': f'Seller {suffix}',
            'phone': '07000000001',
            'id_number': f'SELLER-{suffix}',
            'customer_type': 'Seller',
        })
        self.assertEqual(seller_response.status_code, 201, seller_response.get_data(as_text=True))
        seller_id = seller_response.get_json()['id']

        purchase_response = self.client.post('/api/purchases', json={
            'brand': 'Toyota',
            'model': 'Corolla',
            'manufacturing_year': 2024,
            'color': 'White',
            'vin': f'VINP{suffix}',
            'plate_number': f'PLP{suffix}',
            'mileage': 0,
            'seller_id': seller_id,
            'purchase_price': 10000,
            'paid_amount': 2500,
            'currency': 'IQD',
            'payment_method': 'Cash',
            'purchase_date': '2026-06-05',
        })
        self.assertEqual(purchase_response.status_code, 201, purchase_response.get_data(as_text=True))
        purchase_id = purchase_response.get_json()['id']

        buyer_response = self.client.post('/api/customers', json={
            'name': f'Buyer {suffix}',
            'phone': '07000000002',
            'id_number': f'BUYER-{suffix}',
            'customer_type': 'Buyer',
        })
        self.assertEqual(buyer_response.status_code, 201, buyer_response.get_data(as_text=True))
        buyer_id = buyer_response.get_json()['id']

        with self.app.app_context():
            purchase = Purchase.query.get(purchase_id)
            car_id = purchase.car_id
            purchase_payment = Payment.query.filter_by(purchase_id=purchase_id).one()
            self.assert_balanced_reference('Purchase', purchase_id)
            self.assert_balanced_reference('Payment', purchase_payment.id)

        sale_response = self.client.post('/api/sales', json={
            'car_id': car_id,
            'buyer_id': buyer_id,
            'selling_price': 14000,
            'discount': 0,
            'paid_amount': 4000,
            'currency': 'IQD',
            'payment_method': 'Cash',
            'sale_date': '2026-06-05',
        })
        self.assertEqual(sale_response.status_code, 201, sale_response.get_data(as_text=True))
        sale_id = sale_response.get_json()['id']

        expense_response = self.client.post('/api/expenses', json={
            'title': f'Fuel {suffix}',
            'amount': 300,
            'currency': 'IQD',
            'category': 'fuel',
            'payment_method': 'Cash',
            'expense_date': '2026-06-05',
        })
        self.assertEqual(expense_response.status_code, 201, expense_response.get_data(as_text=True))
        expense_id = expense_response.get_json()['id']

        cashbox_response = self.client.get('/api/cashbox?start_date=2026-06-05&end_date=2026-06-05')
        self.assertEqual(cashbox_response.status_code, 200, cashbox_response.get_data(as_text=True))
        self.assertIn('summary', cashbox_response.get_json())

        cash_balance_response = self.client.get('/api/cashbox-closes/current-balance?account_code=111001')
        self.assertEqual(cash_balance_response.status_code, 200, cash_balance_response.get_data(as_text=True))

        trial_response = self.client.get('/api/trial-balance')
        self.assertEqual(trial_response.status_code, 200, trial_response.get_data(as_text=True))
        self.assertEqual(trial_response.get_json()['status'], 'balanced')

        with self.app.app_context():
            sale_payment = Payment.query.filter_by(sale_id=sale_id, payment_type='sale').one()
            self.assert_balanced_reference('Sale', sale_id, min_entries=2)
            self.assert_balanced_reference('Payment', sale_payment.id)
            self.assert_balanced_reference('Expense', expense_id)
            new_refs = {
                ('Purchase', purchase_id),
                ('Payment', purchase_payment.id),
                ('Sale', sale_id),
                ('Payment', sale_payment.id),
                ('Expense', expense_id),
            }
            for reference_type, reference_id in new_refs:
                self.assertTrue(
                    JournalEntry.query.filter_by(reference_type=reference_type, reference_id=reference_id).first(),
                    f'{reference_type} #{reference_id} is missing accounting link',
                )

    def test_sale_cancellation_rolls_back_when_journal_reversal_fails(self):
        self.authenticate_admin()
        suffix = uuid4().hex[:8]

        with self.app.app_context():
            branch = Branch.query.filter_by(is_main=True).first()
            if branch is None:
                branch = Branch(name='Test main branch', is_main=True)
                db.session.add(branch)
                db.session.flush()
            buyer = Customer(
                branch_id=branch.id,
                name=f'Cancellation buyer {suffix}',
                phone='07000000003',
                id_number=f'CANCEL-BUYER-{suffix}',
                customer_type='Buyer',
            )
            car = Car(
                branch_id=branch.id,
                brand='Toyota',
                model='Camry',
                manufacturing_year=2025,
                color='Black',
                vin=f'CANCELVIN{suffix}',
                plate_number=f'CAN{suffix}',
                purchase_price=10000,
                selling_price=14000,
                currency='IQD',
                status='Sold',
            )
            db.session.add_all([buyer, car])
            db.session.flush()
            sale = Sale(
                branch_id=branch.id,
                invoice_number=f'CANCEL-{suffix}',
                car_id=car.id,
                buyer_id=buyer.id,
                selling_price=14000,
                discount=0,
                paid_amount=4000,
                remaining_amount=10000,
                currency='IQD',
                payment_method='Cash',
                status='Active',
            )
            db.session.add(sale)
            db.session.flush()
            original_entry = create_journal_entry(
                description='Sale cancellation rollback fixture',
                branch_id=branch.id,
                reference_type='Sale',
                reference_id=sale.id,
                lines=[
                    {'account_code': '111001', 'debit': 14000, 'credit': 0},
                    {'account_code': '410001', 'debit': 0, 'credit': 14000},
                ],
            )
            db.session.commit()
            sale_id = sale.id
            original_entry_id = original_entry.id

        csrf_token = 'sale-cancellation-rollback-test'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token

        with patch(
            'backend.accounting.create_journal_entry',
            side_effect=RuntimeError('simulated journal reversal failure'),
        ):
            cancel_response = self.client.post(
                f'/api/sales/{sale_id}/cancel',
                json={'cancel_reason': 'Test rollback'},
                headers={'X-XSRF-TOKEN': csrf_token},
            )

        self.assertGreaterEqual(cancel_response.status_code, 500)

        with self.app.app_context():
            db.session.remove()
            sale = db.session.get(Sale, sale_id)
            original_entry = db.session.get(JournalEntry, original_entry_id)

            self.assertEqual(sale.status, 'Active')
            self.assertIsNone(sale.cancelled_at)
            self.assertIsNone(sale.cancel_reason)
            self.assertEqual(original_entry.status, 'posted')
            self.assertFalse(
                JournalEntry.query.filter_by(
                    reversal_of_id=original_entry_id,
                ).first()
            )

    def test_successful_sale_cancellation_has_zero_net_accounting_effect(self):
        self.authenticate_admin()
        suffix = uuid4().hex[:8]

        with self.app.app_context():
            branch = Branch.query.filter_by(is_main=True).first()
            if branch is None:
                branch = Branch(name='Cancellation success branch', is_main=True)
                db.session.add(branch)
                db.session.flush()
            buyer = Customer(
                branch_id=branch.id,
                name=f'Cancellation success buyer {suffix}',
                phone='07000000005',
                id_number=f'CANCEL-SUCCESS-BUYER-{suffix}',
                customer_type='Buyer',
            )
            car = Car(
                branch_id=branch.id,
                brand='Toyota',
                model='Corolla',
                manufacturing_year=2025,
                color='White',
                vin=f'CANCELSUCCESSVIN{suffix}',
                plate_number=f'CAS{suffix}',
                purchase_price=10000,
                selling_price=14000,
                currency='IQD',
                status='Sold',
            )
            db.session.add_all([buyer, car])
            db.session.flush()
            sale = Sale(
                branch_id=branch.id,
                invoice_number=f'CANCEL-SUCCESS-{suffix}',
                car_id=car.id,
                buyer_id=buyer.id,
                selling_price=14000,
                discount=0,
                paid_amount=0,
                remaining_amount=14000,
                currency='IQD',
                payment_method='Cash',
                status='Active',
            )
            db.session.add(sale)
            db.session.flush()

            cash_account = Account.query.filter_by(code='111001').one()
            revenue_account = Account.query.filter_by(code='410001').one()
            baseline_balances = {
                cash_account.id: cash_account.balance,
                revenue_account.id: revenue_account.balance,
            }
            baseline_trial = {
                row['code']: Decimal(str(row['balance']))
                for row in get_trial_balance(branch.id)[0]
                if row['code'] in ('111001', '410001')
            }

            original_entry = create_journal_entry(
                description='Successful sale cancellation fixture',
                branch_id=branch.id,
                reference_type='Sale',
                reference_id=sale.id,
                lines=[
                    {'account_code': '111001', 'debit': 14000, 'credit': 0},
                    {'account_code': '410001', 'debit': 0, 'credit': 14000},
                ],
            )
            db.session.commit()
            sale_id = sale.id
            original_entry_id = original_entry.id
            branch_id = branch.id

        csrf_token = f'sale-cancellation-success-{suffix}'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token

        cancel_response = self.client.post(
            f'/api/sales/{sale_id}/cancel',
            json={'cancel_reason': 'Successful cancellation regression'},
            headers={'X-XSRF-TOKEN': csrf_token},
        )
        self.assertEqual(cancel_response.status_code, 200, cancel_response.get_data(as_text=True))

        with self.app.app_context():
            db.session.remove()
            sale = db.session.get(Sale, sale_id)
            original_entry = db.session.get(JournalEntry, original_entry_id)
            reversal = JournalEntry.query.filter_by(reversal_of_id=original_entry_id).one()

            self.assertEqual(sale.status, 'Cancelled')
            self.assertEqual(original_entry.status, 'reversed')
            self.assertEqual(reversal.status, 'posted')
            self.assertEqual(JournalEntry.query.filter_by(id=original_entry_id).count(), 1)

            trial_after_cancel = {
                row['code']: Decimal(str(row['balance']))
                for row in get_trial_balance(branch_id)[0]
                if row['code'] in ('111001', '410001')
            }
            self.assertEqual(trial_after_cancel, baseline_trial)

            for account_id, expected_balance in baseline_balances.items():
                self.assertEqual(db.session.get(Account, account_id).balance, expected_balance)

            recompute_all_account_balances()
            db.session.remove()

            trial_after_recompute = {
                row['code']: Decimal(str(row['balance']))
                for row in get_trial_balance(branch_id)[0]
                if row['code'] in ('111001', '410001')
            }
            self.assertEqual(trial_after_recompute, baseline_trial)
            for account_id, expected_balance in baseline_balances.items():
                self.assertEqual(db.session.get(Account, account_id).balance, expected_balance)


if __name__ == '__main__':
    unittest.main()
