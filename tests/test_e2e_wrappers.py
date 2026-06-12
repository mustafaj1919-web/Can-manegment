import atexit
import os
import shutil
import tempfile
import unittest

# تهيئة بيئة اختبار مؤقتة ومعزولة لمنع التأثير على قاعدة بيانات الإنتاج
_TEST_DIR = tempfile.mkdtemp(prefix='e2e_wrapper_test_')
os.makedirs(os.path.join(_TEST_DIR, 'database'), exist_ok=True)
os.makedirs(os.path.join(_TEST_DIR, 'static'), exist_ok=True)

# تعيين متغيرات البيئة قبل استيراد أي مكونات من backend
os.environ['CAR_SHOWROOM_DATA_DIR'] = _TEST_DIR
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_TEST_DIR, 'database', 'showroom_e2e_wrapper.db')
os.environ['BACKUP_FOLDER'] = os.path.join(_TEST_DIR, 'data', 'backups')
os.environ['PRIVATE_STORAGE_FOLDER'] = os.path.join(_TEST_DIR, 'storage', 'private')
os.environ['SECRET_KEY'] = 'e2e-wrapper-test-secret'

atexit.register(lambda: shutil.rmtree(_TEST_DIR, ignore_errors=True))

from backend.app import create_app, ensure_branches, ensure_role_permissions
from backend.database import db
from backend.seed_chart_of_accounts import seed_chart_of_accounts
from backend.models import User
from backend.full_e2e_test import run as run_full_e2e
from backend.run_e2e_test import run as run_accounting_e2e


class E2EWrappersTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True

        with cls.app.app_context():
            db.create_all()
            ensure_branches()           # زراعة الفروع الثلاثة الافتراضية
            ensure_role_permissions()   # زراعة صلاحيات الأدوار الافتراضية
            seed_chart_of_accounts()    # زراعة دليل الحسابات

            # زراعة أو تحديث المستخدم المالك الافتراضي الذي يتوقعه اختبار E2E
            owner = User.query.filter_by(username='owner').first()
            if not owner:
                owner = User(
                    username='owner',
                    role='Owner',
                    can_access_all_branches=True,
                    is_active_user=True
                )
                db.session.add(owner)
            
            # تعيين الخصائص وكلمة المرور دائماً لضمان المزامنة
            owner.role = 'Owner'
            owner.can_access_all_branches = True
            owner.is_active_user = True
            owner.set_password('TestPass2024!')
            db.session.commit()

            print("\n" + "="*40)
            print("DIAGNOSTIC SETUP INFO:")
            print(f"ENV DATABASE_URL: {os.environ.get('DATABASE_URL')}")
            print(f"SQLALCHEMY_DATABASE_URI: {cls.app.config.get('SQLALCHEMY_DATABASE_URI')}")
            users = User.query.all()
            print(f"Users in DB: {[u.username for u in users]}")
            owner_db = User.query.filter_by(username='owner').first()
            if owner_db:
                print(f"Owner exists. Active: {owner_db.is_active_user}. Role: {owner_db.role}")
                print(f"Password 'TestPass2024!' checks out: {owner_db.check_password('TestPass2024!')}")
            print("="*40 + "\n")

    def test_run_full_e2e_suite(self):
        """تشغيل اختبارات النهاية إلى النهاية الشاملة لجميع المسارات والميزات"""
        success = run_full_e2e()
        self.assertTrue(success, "فشلت اختبارات الـ Full E2E للمشروع!")

    def test_run_accounting_e2e_suite(self):
        """تشغيل اختبارات الدورة المحاسبية الكاملة والميزانية ومطابقة الحسابات"""
        success = run_accounting_e2e()
        self.assertTrue(success, "فشلت اختبارات الـ Accounting E2E للمشروع!")


if __name__ == '__main__':
    unittest.main()
