import atexit
import json
import os
import shutil
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

_TEST_DIR = tempfile.mkdtemp(prefix='ent_security_test_')
os.makedirs(os.path.join(_TEST_DIR, 'database'), exist_ok=True)
os.makedirs(os.path.join(_TEST_DIR, 'static'), exist_ok=True)
os.environ['CAR_SHOWROOM_DATA_DIR'] = _TEST_DIR
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_TEST_DIR, 'database', 'showroom_ent.db')
os.environ['BACKUP_FOLDER'] = os.path.join(_TEST_DIR, 'data', 'backups')
os.environ['PRIVATE_STORAGE_FOLDER'] = os.path.join(_TEST_DIR, 'storage', 'private')
os.environ['SECRET_KEY'] = 'enterprise-security-test-secret'
atexit.register(lambda: shutil.rmtree(_TEST_DIR, ignore_errors=True))

from backend.app import create_app, password_hash_fingerprint
from backend.database import db
from backend.models import (
    User, Branch, Customer, CustomerInteraction, SalePipeline, Employee, Payment, Car, CustomerDocument, Sale, RolePermission
)
from backend.seed_chart_of_accounts import seed_chart_of_accounts
from backend.config import Config


class EnterpriseSecurityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()
            seed_chart_of_accounts()

            # إنشاء الفروع
            branch_a = Branch(name='Branch A', is_main=True)
            branch_b = Branch(name='Branch B', is_main=False)
            db.session.add(branch_a)
            db.session.add(branch_b)
            db.session.flush()

            cls.branch_a_id = branch_a.id
            cls.branch_b_id = branch_b.id

            # إنشاء صلاحيات الأدوار للتأكيد
            # الأدوار تحتاج إلى صلاحيات في جدول RolePermission
            # Sales role requirements
            perms = ['view_dashboard', 'manage_customers', 'manage_sales', 'manage_installments', 'manage_users']
            for p in perms:
                db.session.add(RolePermission(role='Sales', permission=p))
            db.session.commit()

            # مستخدم فرع A
            user_a = User(
                username='user_branch_a',
                role='Sales',
                can_access_all_branches=False,
                branch_id=cls.branch_a_id,
                is_active_user=True,
            )
            user_a.set_password('pass')
            db.session.add(user_a)

            # مستخدم فرع B
            user_b = User(
                username='user_branch_b',
                role='Sales',
                can_access_all_branches=False,
                branch_id=cls.branch_b_id,
                is_active_user=True,
            )
            user_b.set_password('pass')
            db.session.add(user_b)
            db.session.commit()

            cls.user_a_id = user_a.id
            cls.user_a_hash = user_a.password_hash
            cls.user_b_id = user_b.id
            cls.user_b_hash = user_b.password_hash

            # إنشاء بيانات في فرع B لتجربة اختراقها من فرع A
            car_b = Car(
                branch_id=cls.branch_b_id,
                brand='Ford',
                model='Mustang',
                manufacturing_year=2022,
                color='Red',
                vin='VINBRANCHB11223344',
                plate_number='PLATE-B-1122',
                purchase_price=Decimal('25000.00'),
                selling_price=Decimal('30000.00'),
                status='Available'
            )
            db.session.add(car_b)

            cust_b = Customer(
                branch_id=cls.branch_b_id,
                name='Customer B',
                phone='07800000001',
                id_number='ID-BRANCH-B-1',
                customer_type='Buyer'
            )
            db.session.add(cust_b)
            db.session.flush()

            cls.car_b_id = car_b.id
            cls.cust_b_id = cust_b.id

            # موظف في فرع B
            emp_b = Employee(
                branch_id=cls.branch_b_id,
                full_name='Employee B',
                phone='07800000002',
                is_active=True
            )
            db.session.add(emp_b)
            db.session.flush()
            cls.emp_b_id = emp_b.id

            # تفاعل CRM في فرع B
            inter_b = CustomerInteraction(
                branch_id=cls.branch_b_id,
                customer_id=cust_b.id,
                employee_id=emp_b.id,
                interaction_type='call',
                notes='Test note branch B'
            )
            db.session.add(inter_b)

            # صفقة Pipeline في فرع B
            deal_b = SalePipeline(
                branch_id=cls.branch_b_id,
                customer_id=cust_b.id,
                car_id=car_b.id,
                assigned_to_id=emp_b.id,
                stage='lead',
                expected_price=Decimal('29500.00'),
                currency='USD'
            )
            db.session.add(deal_b)

            # دفعة مالية في فرع B
            sale_b = Sale(
                branch_id=cls.branch_b_id,
                invoice_number='SALE-B-TEST-1',
                car_id=car_b.id,
                buyer_id=cust_b.id,
                selling_price=Decimal('30000.00'),
                paid_amount=Decimal('5000.00'),
                remaining_amount=Decimal('25000.00'),
                payment_method='Cash',
                status='Active'
            )
            db.session.add(sale_b)
            db.session.flush()

            pay_b = Payment(
                branch_id=cls.branch_b_id,
                payment_type='sale',
                sale_id=sale_b.id,
                amount=Decimal('5000.00'),
                currency='USD',
                payment_method='Cash'
            )
            db.session.add(pay_b)

            db.session.commit()
            cls.inter_b_id = inter_b.id
            cls.deal_b_id = deal_b.id
            cls.pay_b_id = pay_b.id

    def authenticate_user_a(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.user_a_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.user_a_hash)
            session['branch_id'] = self.branch_a_id

    def authenticate_user_b(self):
        with self.client.session_transaction() as session:
            session['_user_id'] = str(self.user_b_id)
            session['_fresh'] = True
            session['password_fingerprint'] = password_hash_fingerprint(self.user_b_hash)
            session['branch_id'] = self.branch_b_id

    def clear_session(self):
        self.client = self.app.test_client()

    def get_csrf_headers(self):
        suffix = uuid4().hex[:8]
        csrf_token = f'security-csrf-{suffix}'
        with self.client.session_transaction() as session:
            session['csrf_token'] = csrf_token
        return {'X-XSRF-TOKEN': csrf_token}

    # ==========================================
    # 1. CRM Branch Isolation Tests
    # ==========================================

    def test_crm_create_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        # محاولة إنشاء تفاعل لعميل في فرع B من قبل مستخدم فرع A
        resp = self.client.post('/api/crm/interactions', json={
            'customer_id': self.cust_b_id,
            'interaction_type': 'call',
            'notes': 'Attempting cross-branch crm create'
        }, headers=headers)
        self.assertEqual(resp.status_code, 403)

    def test_crm_update_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        # محاولة تعديل تفاعل فرع B من قبل مستخدم فرع A
        resp = self.client.put(f'/api/crm/interactions/{self.inter_b_id}', json={
            'notes': 'Hacked notes'
        }, headers=headers)
        self.assertEqual(resp.status_code, 403)

    def test_crm_delete_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        # محاولة حذف تفاعل فرع B من قبل مستخدم فرع A
        resp = self.client.delete(f'/api/crm/interactions/{self.inter_b_id}', headers=headers)
        self.assertEqual(resp.status_code, 403)

    # ==========================================
    # 2. Pipeline Branch Isolation Tests
    # ==========================================

    def test_pipeline_create_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        resp = self.client.post('/api/pipeline', json={
            'customer_id': self.cust_b_id,
            'stage': 'lead'
        }, headers=headers)
        self.assertEqual(resp.status_code, 403)

    def test_pipeline_update_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        resp = self.client.put(f'/api/pipeline/{self.deal_b_id}', json={
            'notes': 'Hacked pipeline notes'
        }, headers=headers)
        self.assertEqual(resp.status_code, 403)

    def test_pipeline_move_stage_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        resp = self.client.put(f'/api/pipeline/{self.deal_b_id}/stage', json={
            'stage': 'contacted'
        }, headers=headers)
        self.assertEqual(resp.status_code, 403)

    def test_pipeline_delete_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        resp = self.client.delete(f'/api/pipeline/{self.deal_b_id}', headers=headers)
        self.assertEqual(resp.status_code, 403)

    # ==========================================
    # 3. Employees Branch Isolation Tests
    # ==========================================

    def test_employee_detail_cross_branch_blocked(self):
        self.authenticate_user_a()
        resp = self.client.get(f'/api/employees/{self.emp_b_id}')
        self.assertEqual(resp.status_code, 403)

    def test_employee_update_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        resp = self.client.put(f'/api/employees/{self.emp_b_id}', json={
            'full_name': 'Hacked Employee Name',
            'phone': '07700000000'
        }, headers=headers)
        self.assertEqual(resp.status_code, 403)

    def test_employee_delete_cross_branch_blocked(self):
        self.authenticate_user_a()
        headers = self.get_csrf_headers()
        resp = self.client.delete(f'/api/employees/{self.emp_b_id}', headers=headers)
        self.assertEqual(resp.status_code, 403)

    # ==========================================
    # 4. Payments Receipt Branch Isolation Tests
    # ==========================================

    def test_payment_receipt_cross_branch_blocked(self):
        self.authenticate_user_a()
        resp = self.client.get(f'/api/payments/{self.pay_b_id}/receipt')
        self.assertEqual(resp.status_code, 403)

    # ==========================================
    # 5. Customer Documents Storage & Download Tests
    # ==========================================

    def test_customer_document_private_storage_and_download(self):
        # 1. إنشاء مستند للعميل في فرع B
        self.authenticate_user_b()
        headers = self.get_csrf_headers()

        # إنشاء ملف مؤقت للرفع
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            tmp_file.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01')  # Magic bytes PNG
            tmp_path = tmp_file.name

        try:
            with open(tmp_path, 'rb') as f:
                resp = self.client.post(
                    f'/api/customers/{self.cust_b_id}/documents',
                    data={
                        'document_type': 'passport',
                        'file': (f, 'my_passport.png')
                    },
                    headers=headers
                )
            self.assertEqual(resp.status_code, 201)
            doc_data = resp.get_json()
            doc_id = doc_data['id']
            filename = doc_data['filename']

            # 2. التحقق من مكان الحفظ الفعلي
            private_file_path = os.path.join(Config.PRIVATE_STORAGE_FOLDER, 'customers', filename)
            static_file_path = os.path.join(Config.UPLOAD_FOLDER, 'customers', filename)
            self.assertTrue(os.path.exists(private_file_path))
            self.assertFalse(os.path.exists(static_file_path))  # يجب ألا يقع في المجلد العام

            # 3. محاولة التنزيل بدون جلسة -> 401
            self.clear_session()
            resp = self.client.get(f'/api/customers/{self.cust_b_id}/documents/{doc_id}/download')
            self.assertEqual(resp.status_code, 401)

            # 4. محاولة التنزيل بمستخدم فرع A (فرع آخر) -> 403
            self.clear_session()
            self.authenticate_user_a()
            resp = self.client.get(f'/api/customers/{self.cust_b_id}/documents/{doc_id}/download')
            self.assertEqual(resp.status_code, 403)

            # 5. التنزيل بمستخدم فرع B (مصرح له) -> 200
            self.clear_session()
            self.authenticate_user_b()
            resp = self.client.get(f'/api/customers/{self.cust_b_id}/documents/{doc_id}/download')
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate, max-age=0')
            resp.close()

            # تنظيف ملف الحذف
            headers = self.get_csrf_headers()
            resp = self.client.delete(f'/api/customers/{self.cust_b_id}/documents/{doc_id}', headers=headers)
            self.assertEqual(resp.status_code, 200)
            self.assertFalse(os.path.exists(private_file_path))

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    # ==========================================
    # 6. Backup Hardening & Zip Bomb Protection
    # ==========================================

    def test_backup_restore_zip_bomb_blocked(self):
        self.authenticate_user_a()
        # إنشاء ملف ZIP مفخخ (Zip Bomb) - ملف يحتوي على نسبة ضغط وهمية أو حجم غير مضغوط ضخم
        zip_path = os.path.join(Config.BACKUP_FOLDER, 'zip_bomb.zip')
        os.makedirs(Config.BACKUP_FOLDER, exist_ok=True)

        with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            # ملف metadata.json
            metadata = {'created_at': '2026-06-10T20:00:00', 'created_by': 'tester', 'reason': 'test'}
            zf.writestr('metadata.json', json.dumps(metadata))
            # كتابة محتوى ضخم مضغوط للغاية (Zip Bomb)
            # سنقوم بكتابة 12 ميجابايت من الأصفار، والتي تضغط لحوالي بضعة كيلوبايتات (مما يتجاوز نسبة 10x)
            zf.writestr('database/data.json', '0' * (12 * 1024 * 1024))

        try:
            from backend.backup_utils import restore_backup_archive
            with self.assertRaises(ValueError) as ctx:
                restore_backup_archive(zip_path)
            self.assertIn('نسبة الضغط', str(ctx.exception))
        finally:
            if os.path.exists(zip_path):
                os.remove(zip_path)

    def test_backup_restore_transactional_rollback_on_failure(self):
        # التقاط عدد العملاء الحالي
        with self.app.app_context():
            cust_count_before = Customer.query.count()

        # إنشاء ملف ZIP صالح شكلياً ولكنه يحتوي على JSON مالي تالف يسبب فشل إدخال البيانات في المنتصف
        # (مثال: محاولة إدخال قيمة نصية في حقل رقمي أو قيمة فارغة في حقل مطلوب)
        bad_zip_path = os.path.join(Config.BACKUP_FOLDER, 'bad_data.zip')
        os.makedirs(Config.BACKUP_FOLDER, exist_ok=True)

        bad_db_data = {
            # إدراج عميل قيمته الهاتف فارغة أو خاطئة البنية بشكل يسبب فشل SQLAlchemy
            'customer': [
                {'id': 9999, 'name': 'Bad Customer', 'phone': None, 'id_number': 'BAD-ID', 'customer_type': 'Buyer'}
            ]
        }

        metadata = {'created_at': '2026-06-10T20:00:00', 'created_by': 'tester', 'reason': 'test'}

        with zipfile.ZipFile(bad_zip_path, 'w') as zf:
            zf.writestr('metadata.json', json.dumps(metadata))
            zf.writestr('database/data.json', json.dumps(bad_db_data))

        try:
            from backend.backup_utils import restore_backup_archive
            # نتوقع حدوث استثناء ValueError بسبب فشل الإدخال في قاعدة البيانات
            with self.assertRaises(ValueError) as ctx:
                restore_backup_archive(bad_zip_path)
            
            # التأكد من حدوث التراجع (Rollback) وبقاء البيانات القديمة كما هي دون تصفير أو حذف!
            with self.app.app_context():
                cust_count_after = Customer.query.count()
                self.assertEqual(cust_count_before, cust_count_after)
                # التأكد من وجود العميل B الذي أنشأناه في SetupClass
                c = Customer.query.get(self.cust_b_id)
                self.assertIsNotNone(c)
                self.assertEqual(c.name, 'Customer B')
        finally:
            if os.path.exists(bad_zip_path):
                os.remove(bad_zip_path)


if __name__ == '__main__':
    unittest.main()
