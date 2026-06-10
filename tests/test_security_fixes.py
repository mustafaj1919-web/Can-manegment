import atexit
import os
import shutil
import tempfile
import unittest
from decimal import Decimal
from uuid import uuid4

_TEST_DIR = tempfile.mkdtemp(prefix='security_test_')
os.makedirs(os.path.join(_TEST_DIR, 'database'), exist_ok=True)
os.makedirs(os.path.join(_TEST_DIR, 'static'), exist_ok=True)
os.environ['CAR_SHOWROOM_DATA_DIR'] = _TEST_DIR
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_TEST_DIR, 'database', 'showroom.db')
os.environ['BACKUP_FOLDER'] = os.path.join(_TEST_DIR, 'data', 'backups')
os.environ['SECRET_KEY'] = 'security-test-secret'
atexit.register(lambda: shutil.rmtree(_TEST_DIR, ignore_errors=True))

from backend.app import create_app, password_hash_fingerprint
from backend.database import db
from backend.models import User, Branch, Customer
from backend.seed_chart_of_accounts import seed_chart_of_accounts
from backend.config import Config


class SecurityFixesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            seed_chart_of_accounts()

            branch = Branch.query.filter_by(is_main=True).first()
            if not branch:
                branch = Branch(name='Main Branch', is_main=True)
                db.session.add(branch)
                db.session.flush()

            # Create different role users for testing permissions
            owner = User(
                username='security_owner',
                role='Owner',
                can_access_all_branches=True,
                is_active_user=True,
            )
            owner.set_password('pass')
            db.session.add(owner)

            admin = User(
                username='security_admin',
                role='Admin',
                can_access_all_branches=True,
                is_active_user=True,
            )
            admin.set_password('pass')
            db.session.add(admin)

            viewer = User(
                username='security_viewer',
                role='Viewer',
                can_access_all_branches=True,
                is_active_user=True,
            )
            viewer.set_password('pass')
            db.session.add(viewer)

            db.session.commit()

            cls.owner_id = owner.id
            cls.owner_hash = owner.password_hash
            cls.admin_id = admin.id
            cls.admin_hash = admin.password_hash
            cls.viewer_id = viewer.id
            cls.viewer_hash = viewer.password_hash

    def authenticate_owner(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.owner_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.owner_hash)

    def authenticate_admin(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.admin_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.admin_hash)

    def authenticate_viewer(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.viewer_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.viewer_hash)

    def clear_session(self):
        with self.client.session_transaction() as session:
            session.clear()

    def test_version_endpoint_login_required(self):
        # 1. Anonymous access should be blocked (401)
        self.clear_session()
        resp = self.client.get('/api/version')
        self.assertEqual(resp.status_code, 401)

        # 2. Authenticated access should be allowed (200)
        self.authenticate_viewer()
        resp = self.client.get('/api/version')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn('version', data)

    def test_system_health_restricted(self):
        # 1. Viewer user (no manage_database permission) -> 403
        self.authenticate_viewer()
        resp = self.client.get('/api/admin/system-health')
        self.assertEqual(resp.status_code, 403)

        # 2. Admin user (has manage_database permission) -> 200
        self.authenticate_admin()
        resp = self.client.get('/api/admin/system-health')
        self.assertEqual(resp.status_code, 200)

        # 3. Owner user (has manage_database permission) -> 200
        self.authenticate_owner()
        resp = self.client.get('/api/admin/system-health')
        self.assertEqual(resp.status_code, 200)

    def test_system_health_owner_sensitive_fields(self):
        # Admin is not Owner, should NOT see sensitive fields (runtime, error_log)
        self.authenticate_admin()
        resp = self.client.get('/api/admin/system-health')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertNotIn('runtime', data)
        self.assertNotIn('error_log', data)

        # Owner should see sensitive fields
        self.authenticate_owner()
        resp = self.client.get('/api/admin/system-health')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn('runtime', data)
        self.assertIn('error_log', data)

    def test_log_path_removed_from_admin_logs(self):
        self.authenticate_admin()
        resp = self.client.get('/api/admin/logs')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertNotIn('log_path', data)
        self.assertIn('buffer', data)
        self.assertIn('file_tail', data)

    def test_per_page_capped(self):
        self.authenticate_owner()
        suffix = uuid4().hex[:8]
        csrf_token = f'security-csrf-{suffix}'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token
        headers = {'X-XSRF-TOKEN': csrf_token}

        # Seed more than 100 customers to test capping
        with self.app.app_context():
            # Create a batch of 105 customers in the database
            branch = Branch.query.filter_by(is_main=True).first()
            for i in range(105):
                c = Customer(
                    branch_id=branch.id,
                    name=f'CustBatch {suffix} {i}',
                    phone=f'07700000{i:03d}',
                    id_number=f'ID{suffix[:4]}{i:03d}',
                    customer_type='Buyer'
                )
                db.session.add(c)
            db.session.commit()

        # Query customers with per_page=999999
        resp = self.client.get('/api/customers?per_page=999999')
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        # The number of returned items in this page should be capped at 100
        self.assertLessEqual(len(data.get('items', [])), 100)

    def test_backup_restore_rejects_path_traversal_and_invalid(self):
        self.authenticate_admin()
        suffix = uuid4().hex[:8]
        csrf_token = f'security-csrf-{suffix}'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token
        headers = {'X-XSRF-TOKEN': csrf_token}

        # 1. Path traversal ZIP file restore -> should fail (404 because get_backup_path sanitizes to None/empty)
        resp = self.client.post('/api/backups/../some_traversal/restore', headers=headers)
        self.assertEqual(resp.status_code, 404)

        # 2. Non-existent backup zip restore -> should fail (404)
        resp = self.client.post('/api/backups/nonexistent_backup_file.zip/restore', headers=headers)
        self.assertEqual(resp.status_code, 404)


if __name__ == '__main__':
    unittest.main()
