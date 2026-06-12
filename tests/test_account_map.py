"""
test_account_map.py — unit and integration tests for backend/account_map.py

Tests:
  1. All constants have 6-digit numeric string values
  2. All mapping dicts reference only declared constants
  3. acct_cash()           — cash vs bank routing
  4. acct_sale_revenue()   — new vs used car
  5. acct_sale_cogs()      — always COGS_ACCOUNT
  6. acct_inventory()      — new vs used car
  7. acct_expense_category() — known categories + fallback
  8. acct_vehicle_cost()   — known types + fallback
"""

import atexit
import os
import shutil
import tempfile
import unittest
from decimal import Decimal
from datetime import datetime

_TEST_DIR = tempfile.mkdtemp(prefix='acct_map_test_')
os.makedirs(os.path.join(_TEST_DIR, 'database'), exist_ok=True)
os.makedirs(os.path.join(_TEST_DIR, 'static'), exist_ok=True)
os.environ['CAR_SHOWROOM_DATA_DIR'] = _TEST_DIR
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_TEST_DIR, 'database', 'showroom.db')
os.environ['BACKUP_FOLDER'] = os.path.join(_TEST_DIR, 'data', 'backups')
os.environ['SECRET_KEY'] = 'account-map-test-secret'
atexit.register(lambda: shutil.rmtree(_TEST_DIR, ignore_errors=True))

import backend.account_map as am  # noqa: E402
from backend.account_map import (  # noqa: E402
    AR_ACCOUNT, AP_ACCOUNT, CASH_ACCOUNT, BANK_ACCOUNT,
    INVENTORY_NEW, INVENTORY_USED, REVENUE_NEW_CAR, REVENUE_USED_CAR,
    COGS_ACCOUNT, EXPENSE_SHIPPING, EXPENSE_MISC,
    EXPENSE_CATEGORY_ACCOUNTS, VEHICLE_COST_ACCOUNTS,
    acct_cash, acct_sale_revenue, acct_sale_cogs,
    acct_inventory, acct_expense_category, acct_vehicle_cost,
)
from backend.accounting import create_journal_entry  # noqa: E402
from backend.app import create_app                   # noqa: E402
from backend.database import db                      # noqa: E402
from backend.seed_chart_of_accounts import seed_chart_of_accounts  # noqa: E402


_6DIGIT = lambda code: (isinstance(code, str) and len(code) == 6 and code.isdigit())  # noqa: E731


# ── Unit tests: constants and helper functions ─────────────────────────────────

class TestAccountMapConstants(unittest.TestCase):

    def test_all_top_level_constants_are_6digit_strings(self):
        constants = [
            am.CASH_ACCOUNT, am.BANK_ACCOUNT, am.AR_ACCOUNT,
            am.INVENTORY_NEW, am.INVENTORY_USED, am.AP_ACCOUNT,
            am.REVENUE_NEW_CAR, am.REVENUE_USED_CAR, am.COGS_ACCOUNT,
            am.EXPENSE_SALARY, am.EXPENSE_RENT, am.EXPENSE_ELECTRICITY,
            am.EXPENSE_WATER, am.EXPENSE_INTERNET, am.EXPENSE_PHONE,
            am.EXPENSE_FUEL, am.EXPENSE_HOSTING, am.EXPENSE_STATIONERY,
            am.EXPENSE_MAINTENANCE, am.EXPENSE_DEVICE_MAINT,
            am.EXPENSE_GOVERNMENT, am.EXPENSE_BANKING,
            am.EXPENSE_ADVERTISING, am.EXPENSE_COMMISSION,
            am.EXPENSE_SHIPPING, am.EXPENSE_CLEARANCE,
            am.EXPENSE_INSPECTION, am.EXPENSE_PREPARATION, am.EXPENSE_MISC,
        ]
        for code in constants:
            self.assertTrue(_6DIGIT(code), f'Expected 6-digit string, got {code!r}')

    def test_expense_category_accounts_values_are_constants(self):
        known = {v for v in vars(am).values() if _6DIGIT(v)}
        for cat, code in EXPENSE_CATEGORY_ACCOUNTS.items():
            self.assertTrue(_6DIGIT(code), f'Category {cat!r} maps to invalid code {code!r}')
            self.assertIn(code, known, f'Category {cat!r} code {code!r} not a declared constant')

    def test_vehicle_cost_accounts_values_are_constants(self):
        known = {v for v in vars(am).values() if _6DIGIT(v)}
        for cost_type, code in VEHICLE_COST_ACCOUNTS.items():
            self.assertTrue(_6DIGIT(code), f'Cost type {cost_type!r} maps to invalid code {code!r}')
            self.assertIn(code, known, f'Cost type {cost_type!r} code {code!r} not a declared constant')

    def test_no_duplicate_values_in_core_accounts(self):
        core = {
            'cash':     CASH_ACCOUNT,
            'bank':     BANK_ACCOUNT,
            'ar':       AR_ACCOUNT,
            'inv_new':  INVENTORY_NEW,
            'inv_used': INVENTORY_USED,
            'ap':       AP_ACCOUNT,
            'rev_new':  REVENUE_NEW_CAR,
            'rev_used': REVENUE_USED_CAR,
            'cogs':     COGS_ACCOUNT,
        }
        codes = list(core.values())
        self.assertEqual(len(codes), len(set(codes)), 'Duplicate codes among core account constants')


class TestAcctCash(unittest.TestCase):

    def test_none_returns_cash(self):
        self.assertEqual(acct_cash(None), CASH_ACCOUNT)

    def test_empty_string_returns_cash(self):
        self.assertEqual(acct_cash(''), CASH_ACCOUNT)

    def test_cash_string_returns_cash(self):
        self.assertEqual(acct_cash('cash'), CASH_ACCOUNT)

    def test_bank_lowercase_returns_bank(self):
        self.assertEqual(acct_cash('bank'), BANK_ACCOUNT)

    def test_bank_uppercase_returns_bank(self):
        self.assertEqual(acct_cash('BANK_TRANSFER'), BANK_ACCOUNT)

    def test_bank_mixed_case_returns_bank(self):
        self.assertEqual(acct_cash('BankTransfer'), BANK_ACCOUNT)

    def test_unknown_method_returns_cash(self):
        self.assertEqual(acct_cash('cheque'), CASH_ACCOUNT)


class _NewCar:
    condition = 'new'

class _UsedCar:
    condition = 'used'

class _NoCond:
    pass


class TestAcctSaleRevenue(unittest.TestCase):

    def test_new_car_returns_revenue_new(self):
        self.assertEqual(acct_sale_revenue(_NewCar()), REVENUE_NEW_CAR)

    def test_used_car_returns_revenue_used(self):
        self.assertEqual(acct_sale_revenue(_UsedCar()), REVENUE_USED_CAR)

    def test_no_condition_returns_revenue_new(self):
        self.assertEqual(acct_sale_revenue(_NoCond()), REVENUE_NEW_CAR)

    def test_used_uppercase_returns_revenue_used(self):
        car = type('Car', (), {'condition': 'USED'})()
        self.assertEqual(acct_sale_revenue(car), REVENUE_USED_CAR)


class TestAcctSaleCogs(unittest.TestCase):

    def test_new_car_returns_cogs(self):
        self.assertEqual(acct_sale_cogs(_NewCar()), COGS_ACCOUNT)

    def test_used_car_returns_cogs(self):
        self.assertEqual(acct_sale_cogs(_UsedCar()), COGS_ACCOUNT)


class TestAcctInventory(unittest.TestCase):

    def test_new_car_returns_inventory_new(self):
        self.assertEqual(acct_inventory(_NewCar()), INVENTORY_NEW)

    def test_used_car_returns_inventory_used(self):
        self.assertEqual(acct_inventory(_UsedCar()), INVENTORY_USED)

    def test_no_condition_returns_inventory_new(self):
        self.assertEqual(acct_inventory(_NoCond()), INVENTORY_NEW)


class TestAcctExpenseCategory(unittest.TestCase):

    def test_known_categories(self):
        for cat, expected in EXPENSE_CATEGORY_ACCOUNTS.items():
            self.assertEqual(acct_expense_category(cat), expected, f'Failed for category {cat!r}')

    def test_none_returns_misc(self):
        self.assertEqual(acct_expense_category(None), EXPENSE_MISC)

    def test_empty_returns_misc(self):
        self.assertEqual(acct_expense_category(''), EXPENSE_MISC)

    def test_unknown_returns_misc(self):
        self.assertEqual(acct_expense_category('xyzzy_unknown'), EXPENSE_MISC)

    def test_case_insensitive(self):
        self.assertEqual(acct_expense_category('SALARY'), acct_expense_category('salary'))


class TestAcctVehicleCost(unittest.TestCase):

    def test_known_cost_types(self):
        for cost_type, expected in VEHICLE_COST_ACCOUNTS.items():
            self.assertEqual(acct_vehicle_cost(cost_type), expected, f'Failed for cost_type {cost_type!r}')

    def test_none_returns_misc(self):
        self.assertEqual(acct_vehicle_cost(None), EXPENSE_MISC)

    def test_empty_returns_misc(self):
        self.assertEqual(acct_vehicle_cost(''), EXPENSE_MISC)

    def test_unknown_returns_misc(self):
        self.assertEqual(acct_vehicle_cost('unknown_type'), EXPENSE_MISC)

    def test_case_insensitive(self):
        self.assertEqual(acct_vehicle_cost('SHIPPING'), acct_vehicle_cost('shipping'))


# ── Integration tests: posting flows via create_journal_entry ──────────────────

class TestPostingFlows(unittest.TestCase):
    """
    Verifies that the 5 core posting flows produce balanced journal entries
    and that each entry line references only account codes declared in account_map.
    """

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        with cls.app.app_context():
            seed_chart_of_accounts()

    def _known_codes(self):
        return {v for v in vars(am).values() if isinstance(v, str) and _6DIGIT(v)}

    def _assert_balanced_and_known(self, je, context=''):
        total_d = sum(ln.debit or Decimal('0') for ln in je.lines)
        total_c = sum(ln.credit or Decimal('0') for ln in je.lines)
        self.assertAlmostEqual(
            float(total_d), float(total_c), places=2,
            msg=f'{context}: journal entry not balanced (D={total_d}, C={total_c})',
        )
        known = self._known_codes()
        for ln in je.lines:
            code = ln.account.code
            self.assertIn(code, known, f'{context}: line account {code!r} not in account_map constants')

    def test_sale_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 1),
                description='[TEST] sale posting',
                lines=[
                    {'account_code': CASH_ACCOUNT,    'debit': 5000, 'credit': 0},
                    {'account_code': AR_ACCOUNT,      'debit': 8000, 'credit': 0},
                    {'account_code': REVENUE_NEW_CAR, 'debit': 0,    'credit': 13000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'sale')
            db.session.rollback()

    def test_sale_cogs_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 1),
                description='[TEST] sale COGS',
                lines=[
                    {'account_code': COGS_ACCOUNT, 'debit': 10000, 'credit': 0},
                    {'account_code': INVENTORY_NEW,'debit': 0,     'credit': 10000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'sale_cogs')
            db.session.rollback()

    def test_purchase_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 2),
                description='[TEST] purchase posting',
                lines=[
                    {'account_code': INVENTORY_NEW, 'debit': 10000, 'credit': 0},
                    {'account_code': AP_ACCOUNT,    'debit': 0,     'credit': 10000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'purchase')
            db.session.rollback()

    def test_payment_to_supplier_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 3),
                description='[TEST] supplier payment',
                lines=[
                    {'account_code': AP_ACCOUNT,   'debit': 4000, 'credit': 0},
                    {'account_code': CASH_ACCOUNT, 'debit': 0,    'credit': 4000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'payment_supplier')
            db.session.rollback()

    def test_payment_from_customer_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 4),
                description='[TEST] customer payment',
                lines=[
                    {'account_code': CASH_ACCOUNT, 'debit': 3000, 'credit': 0},
                    {'account_code': AR_ACCOUNT,   'debit': 0,    'credit': 3000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'payment_customer')
            db.session.rollback()

    def test_expense_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 5),
                description='[TEST] expense posting',
                lines=[
                    {'account_code': EXPENSE_MISC, 'debit': 500, 'credit': 0},
                    {'account_code': CASH_ACCOUNT, 'debit': 0,   'credit': 500},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'expense')
            db.session.rollback()

    def test_installment_payment_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 6),
                description='[TEST] installment payment',
                lines=[
                    {'account_code': CASH_ACCOUNT, 'debit': 1000, 'credit': 0},
                    {'account_code': AR_ACCOUNT,   'debit': 0,    'credit': 1000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'installment')
            db.session.rollback()

    def test_vehicle_cost_shipping_posting(self):
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 7),
                description='[TEST] vehicle cost shipping',
                lines=[
                    {'account_code': EXPENSE_SHIPPING, 'debit': 500, 'credit': 0},
                    {'account_code': CASH_ACCOUNT,     'debit': 0,   'credit': 500},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'vehicle_cost_shipping')
            db.session.rollback()

    def test_bank_payment_routes_to_bank_account(self):
        """acct_cash('bank') must return BANK_ACCOUNT, which is a valid chart account."""
        with self.app.app_context():
            account_code = acct_cash('bank')
            self.assertEqual(account_code, BANK_ACCOUNT)
            je = create_journal_entry(
                entry_date=datetime(2026, 7, 8),
                description='[TEST] bank payment',
                lines=[
                    {'account_code': AP_ACCOUNT,    'debit': 2000, 'credit': 0},
                    {'account_code': BANK_ACCOUNT,  'debit': 0,    'credit': 2000},
                ],
                auto_post=True,
            )
            self._assert_balanced_and_known(je, 'bank_payment')
            db.session.rollback()


if __name__ == '__main__':
    unittest.main()
