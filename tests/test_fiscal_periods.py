import atexit
import os
import shutil
import tempfile
import unittest
from datetime import date, datetime

_TEST_DIR = tempfile.mkdtemp(prefix='fiscal_test_')
os.makedirs(os.path.join(_TEST_DIR, 'database'), exist_ok=True)
os.makedirs(os.path.join(_TEST_DIR, 'static'), exist_ok=True)
os.environ['CAR_SHOWROOM_DATA_DIR'] = _TEST_DIR
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_TEST_DIR, 'database', 'showroom.db')
os.environ['BACKUP_FOLDER'] = os.path.join(_TEST_DIR, 'data', 'backups')
os.environ['SECRET_KEY'] = 'fiscal-period-test-secret'
atexit.register(lambda: shutil.rmtree(_TEST_DIR, ignore_errors=True))

from backend.accounting import check_period_lock, create_journal_entry  # noqa: E402
from backend.app import create_app, password_hash_fingerprint           # noqa: E402
from backend.database import db                                          # noqa: E402
from backend.models import AccountingPeriod, JournalEntry, User         # noqa: E402
from backend.seed_chart_of_accounts import seed_chart_of_accounts       # noqa: E402


class FiscalPeriodTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()
        with cls.app.app_context():
            seed_chart_of_accounts()
            user = User(
                username='accountant_fp',
                role='Accountant',
                can_access_all_branches=True,
                is_active_user=True,
            )
            user.set_password('secret')
            db.session.add(user)
            db.session.flush()
            cls.user_id = user.id
            cls.password_hash = user.password_hash
            # Seed a closed February 2026 period used across multiple tests.
            closed_feb = AccountingPeriod(
                name='فبراير 2026',
                start_date=date(2026, 2, 1),
                end_date=date(2026, 2, 28),
                status='closed',
                closed_at=datetime.utcnow(),
            )
            db.session.add(closed_feb)
            db.session.commit()

    def _authenticate(self):
        with self.client.session_transaction() as s:
            s['_user_id'] = str(self.user_id)
            s['_fresh'] = True
            s['password_fingerprint'] = password_hash_fingerprint(self.password_hash)

    def _csrf(self, token):
        with self.client.session_transaction() as s:
            s['csrf_token'] = token

    # ── check_period_lock unit tests ──────────────────────────────────────────

    def test_check_period_lock_passes_for_date_outside_closed_range(self):
        """A date not covered by any closed period should not raise."""
        with self.app.app_context():
            # March 2026 has no closed period
            check_period_lock(datetime(2026, 3, 15))

    def test_check_period_lock_passes_for_open_period(self):
        """A date covered by an open period should not raise."""
        with self.app.app_context():
            open_jan = AccountingPeriod(
                name='يناير 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 31),
                status='open',
            )
            db.session.add(open_jan)
            db.session.commit()
            check_period_lock(datetime(2026, 1, 15))

    def test_check_period_lock_raises_for_closed_period(self):
        """A date inside a closed period must raise ValueError with Arabic text."""
        with self.app.app_context():
            with self.assertRaises(ValueError) as ctx:
                check_period_lock(datetime(2026, 2, 15))
            self.assertIn('مغلق', str(ctx.exception))
            self.assertIn('فبراير 2026', str(ctx.exception))

    def test_check_period_lock_passes_on_boundary_outside(self):
        """The day immediately after a closed period should pass."""
        with self.app.app_context():
            check_period_lock(datetime(2026, 3, 1))  # March 1 — after Feb 28

    def test_check_period_lock_raises_on_boundary_inside(self):
        """The last day of a closed period should still be blocked."""
        with self.app.app_context():
            with self.assertRaises(ValueError):
                check_period_lock(datetime(2026, 2, 28))

    # ── create_journal_entry period-lock tests ────────────────────────────────

    def test_create_journal_entry_auto_post_blocked_in_closed_period(self):
        """auto_post=True with an entry_date in a closed period must raise."""
        with self.app.app_context():
            with self.assertRaises(ValueError) as ctx:
                create_journal_entry(
                    entry_date=datetime(2026, 2, 10),
                    description='يجب أن يرفض',
                    lines=[
                        {'account_code': '111001', 'debit': 500, 'credit': 0},
                        {'account_code': '211001', 'debit': 0, 'credit': 500},
                    ],
                    auto_post=True,
                )
            self.assertIn('مغلق', str(ctx.exception))
            db.session.rollback()

    def test_create_journal_entry_draft_allowed_in_closed_period(self):
        """auto_post=False bypasses the period lock — draft creation must succeed."""
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 2, 10),
                description='مسودة في فترة مغلقة',
                lines=[
                    {'account_code': '111001', 'debit': 200, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': 200},
                ],
                auto_post=False,
            )
            db.session.commit()
            self.assertEqual(je.status, 'draft')

    def test_create_journal_entry_auto_post_allowed_in_open_range(self):
        """auto_post=True succeeds for dates outside any closed period."""
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 6, 1),
                description='قيد في فترة مفتوحة',
                lines=[
                    {'account_code': '111001', 'debit': 300, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': 300},
                ],
                auto_post=True,
            )
            db.session.commit()
            self.assertEqual(je.status, 'posted')

    # ── API: posting a draft whose date is in a closed period ─────────────────

    def test_api_post_draft_in_closed_period_returns_400(self):
        """POST /api/journal-entries/:id/post must return 400 for a closed period date."""
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 2, 5),
                description='مسودة ستُرفض عند النشر',
                lines=[
                    {'account_code': '111001', 'debit': 100, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': 100},
                ],
                auto_post=False,
            )
            db.session.commit()
            je_id = je.id

        self._authenticate()
        csrf = 'post-draft-closed'
        self._csrf(csrf)
        resp = self.client.post(
            f'/api/journal-entries/{je_id}/post',
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('مغلق', resp.get_json().get('error', ''))

        with self.app.app_context():
            db.session.remove()
            self.assertEqual(db.session.get(JournalEntry, je_id).status, 'draft')

    def test_api_reversal_date_today_succeeds(self):
        """Reversing a posted entry always uses utcnow() — should succeed if today
        is not in a closed period."""
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 6, 2),
                description='قيد للعكس',
                lines=[
                    {'account_code': '111001', 'debit': 400, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': 400},
                ],
                auto_post=True,
            )
            db.session.commit()
            je_id = je.id

        self._authenticate()
        csrf = 'reverse-today'
        self._csrf(csrf)
        resp = self.client.post(
            f'/api/journal-entries/{je_id}/reverse',
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(resp.status_code, 200, resp.get_data(as_text=True))

    # ── API: period management endpoints ──────────────────────────────────────

    def test_api_list_periods_requires_auth(self):
        with self.client.session_transaction() as s:
            s.clear()
        resp = self.client.get('/api/accounting-periods')
        self.assertEqual(resp.status_code, 401)

    def test_api_create_period_and_list(self):
        self._authenticate()
        csrf = 'create-period'
        self._csrf(csrf)
        resp = self.client.post(
            '/api/accounting-periods',
            json={'name': 'مارس 2026', 'start_date': '2026-03-01', 'end_date': '2026-03-31'},
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(resp.status_code, 201, resp.get_data(as_text=True))
        data = resp.get_json()
        self.assertEqual(data['status'], 'open')
        self.assertEqual(data['name'], 'مارس 2026')
        self.assertEqual(data['start_date'], '2026-03-01')
        self.assertIsNone(data['closed_at'])

        list_resp = self.client.get('/api/accounting-periods')
        self.assertEqual(list_resp.status_code, 200)
        names = [p['name'] for p in list_resp.get_json()]
        self.assertIn('مارس 2026', names)
        self.assertIn('فبراير 2026', names)

    def test_api_create_period_rejects_inverted_dates(self):
        self._authenticate()
        csrf = 'bad-dates'
        self._csrf(csrf)
        resp = self.client.post(
            '/api/accounting-periods',
            json={'name': 'نطاق خاطئ', 'start_date': '2026-07-31', 'end_date': '2026-07-01'},
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('قبل', resp.get_json().get('error', ''))

    def test_api_create_period_rejects_overlap(self):
        self._authenticate()
        csrf = 'overlap'
        self._csrf(csrf)
        self.client.post(
            '/api/accounting-periods',
            json={'name': 'أبريل 2026', 'start_date': '2026-04-01', 'end_date': '2026-04-30'},
            headers={'X-XSRF-TOKEN': csrf},
        )
        resp = self.client.post(
            '/api/accounting-periods',
            json={'name': 'أبريل-مايو 2026', 'start_date': '2026-04-15', 'end_date': '2026-05-15'},
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('تتداخل', resp.get_json().get('error', ''))

    def test_api_close_and_reopen_period(self):
        self._authenticate()
        csrf = 'close-reopen'
        self._csrf(csrf)
        create_resp = self.client.post(
            '/api/accounting-periods',
            json={'name': 'يونيو 2026', 'start_date': '2026-06-01', 'end_date': '2026-06-30'},
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(create_resp.status_code, 201)
        period_id = create_resp.get_json()['id']

        close_resp = self.client.post(
            f'/api/accounting-periods/{period_id}/close',
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(close_resp.status_code, 200)
        closed = close_resp.get_json()
        self.assertEqual(closed['status'], 'closed')
        self.assertIsNotNone(closed['closed_at'])
        self.assertEqual(closed['closed_by_id'], self.user_id)

        reopen_resp = self.client.post(
            f'/api/accounting-periods/{period_id}/reopen',
            headers={'X-XSRF-TOKEN': csrf},
        )
        self.assertEqual(reopen_resp.status_code, 200)
        reopened = reopen_resp.get_json()
        self.assertEqual(reopened['status'], 'open')
        self.assertIsNone(reopened['closed_at'])

    def test_api_close_already_closed_period_returns_400(self):
        self._authenticate()
        csrf = 'double-close'
        self._csrf(csrf)
        # Create a fresh period to close
        cr = self.client.post(
            '/api/accounting-periods',
            json={'name': 'أغسطس 2026', 'start_date': '2026-08-01', 'end_date': '2026-08-31'},
            headers={'X-XSRF-TOKEN': csrf},
        )
        pid = cr.get_json()['id']
        self.client.post(f'/api/accounting-periods/{pid}/close',
                         headers={'X-XSRF-TOKEN': csrf})
        resp = self.client.post(f'/api/accounting-periods/{pid}/close',
                                headers={'X-XSRF-TOKEN': csrf})
        self.assertEqual(resp.status_code, 400)

    # ── JournalEntryLine.description tests ────────────────────────────────────

    def test_line_description_stored_and_serialised(self):
        """Line descriptions are persisted and returned in the JE list API."""
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 6, 3),
                description='قيد باحتواء وصف السطر',
                lines=[
                    {'account_code': '111001', 'debit': 100, 'credit': 0,
                     'description': 'استلام نقدي'},
                    {'account_code': '211001', 'debit': 0, 'credit': 100,
                     'description': 'ذمة دائنة'},
                ],
            )
            db.session.commit()
            je_id = je.id

        self._authenticate()
        resp = self.client.get('/api/journal-entries?per_page=200')
        self.assertEqual(resp.status_code, 200)
        items = resp.get_json()['items']
        entry = next((i for i in items if i['id'] == je_id), None)
        self.assertIsNotNone(entry, 'Journal entry not found in API response')
        descriptions = [ln['description'] for ln in entry['lines']]
        self.assertIn('استلام نقدي', descriptions)
        self.assertIn('ذمة دائنة', descriptions)

    def test_line_description_none_when_omitted(self):
        """Lines without a description key return null in the API."""
        with self.app.app_context():
            je = create_journal_entry(
                entry_date=datetime(2026, 6, 4),
                description='قيد بدون وصف سطر',
                lines=[
                    {'account_code': '111001', 'debit': 50, 'credit': 0},
                    {'account_code': '211001', 'debit': 0, 'credit': 50},
                ],
            )
            db.session.commit()
            je_id = je.id

        self._authenticate()
        resp = self.client.get('/api/journal-entries?per_page=200')
        items = resp.get_json()['items']
        entry = next((i for i in items if i['id'] == je_id), None)
        self.assertIsNotNone(entry)
        for ln in entry['lines']:
            self.assertIsNone(ln['description'])


if __name__ == '__main__':
    unittest.main()
