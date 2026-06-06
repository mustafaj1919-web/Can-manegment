"""
setup_new_machine.py
====================
سكريبت الإعداد على الحاسبة الجديدة.
شغّله مرة واحدة فقط بعد نسخ المشروع.

الاستخدام:
    python setup_new_machine.py

ما يفعله:
  1. يثبّت حزم Python
  2. يثبّت حزم Node.js ويبني الـ Frontend
  3. يُنشئ قاعدة بيانات PostgreSQL
  4. يُنشئ ملف .env
  5. ينشئ secret key
  6. يُنشئ مجلدات البيانات
"""

import os
import sys
import subprocess
import secrets
import platform
from pathlib import Path
from getpass import getpass

PROJECT = Path(__file__).resolve().parent

# ── ألوان Terminal ────────────────────────────────────────────────────────────
def ok(msg):   print(f"  [OK]   {msg}")
def err(msg):  print(f"  [ERR]  {msg}")
def step(msg): print(f"\n{'='*60}\n  {msg}\n{'='*60}")
def info(msg): print(f"  -->  {msg}")

def run(cmd, cwd=None, capture=False):
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd,
            capture_output=capture, text=True, encoding='utf-8'
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, '', str(e)

# ─────────────────────────────────────────────────────────────────────────────

def check_prerequisites():
    step("1 — فحص المتطلبات")
    all_ok = True

    # Python
    ver = sys.version_info
    if ver.major == 3 and ver.minor >= 10:
        ok(f"Python {ver.major}.{ver.minor}.{ver.micro}")
    else:
        err(f"Python 3.10+ مطلوب، الحالي: {ver.major}.{ver.minor}")
        all_ok = False

    # Node.js
    ok_node, out, _ = run("node --version", capture=True)
    if ok_node:
        ok(f"Node.js {out.strip()}")
    else:
        err("Node.js غير مثبت — نزّله من nodejs.org")
        all_ok = False

    # npm
    ok_npm, out, _ = run("npm --version", capture=True)
    if ok_npm:
        ok(f"npm {out.strip()}")
    else:
        err("npm غير موجود")
        all_ok = False

    # psql
    ok_pg, out, _ = run("psql --version", capture=True)
    if ok_pg:
        ok(f"PostgreSQL {out.strip()}")
    else:
        err("PostgreSQL غير مثبت — نزّله من postgresql.org")
        all_ok = False

    return all_ok


def install_python_packages():
    step("2 — تثبيت حزم Python")
    req = PROJECT / 'requirements.txt'
    if not req.exists():
        err("requirements.txt غير موجود")
        return False

    ok_r, _, e = run(f'pip install -r "{req}"')
    if ok_r:
        ok("تم تثبيت كل حزم Python")
        return True
    else:
        err(f"فشل تثبيت الحزم: {e[:100]}")
        return False


def build_frontend():
    step("3 — بناء Frontend (Next.js)")
    fe = PROJECT / 'frontend'
    if not fe.exists():
        err("مجلد frontend غير موجود")
        return False

    # npm install
    info("جاري npm install...")
    ok_i, _, e = run("npm install", cwd=str(fe))
    if not ok_i:
        err(f"npm install فشل: {e[:100]}")
        return False
    ok("npm install تم")

    # npm run build
    info("جاري npm run build (قد يأخذ دقيقتين)...")
    ok_b, _, e = run("npm run build", cwd=str(fe))
    if not ok_b:
        err(f"npm build فشل: {e[:100]}")
        return False
    ok("Frontend تم بناؤه")
    return True


def setup_postgresql():
    step("4 — إعداد PostgreSQL")

    print("\n  أدخل معلومات اتصال PostgreSQL على الحاسبة الجديدة:")
    pg_host    = input("  Host     [localhost]: ").strip() or "localhost"
    pg_port    = input("  Port     [5432]:      ").strip() or "5432"
    pg_admin   = input("  Admin    [postgres]:  ").strip() or "postgres"
    pg_pass    = getpass("  كلمة مرور admin postgres: ")
    db_name    = input("  اسم DB   [showroom_db]: ").strip() or "showroom_db"
    db_user    = input("  اسم User [showroom_user]: ").strip() or "showroom_user"
    db_user_pw = getpass("  كلمة مرور المستخدم الجديد: ")

    # إنشاء المستخدم والـ DB
    sql = f"""
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='{db_user}') THEN
      CREATE USER {db_user} WITH PASSWORD '{db_user_pw}';
   END IF;
END$$;

SELECT 'CREATE DATABASE {db_name} OWNER {db_user}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='{db_name}')\\gexec

GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};
""".strip()

    env_pg = os.environ.copy()
    env_pg['PGPASSWORD'] = pg_pass

    ok_r, out, e = run(
        f'psql -h {pg_host} -p {pg_port} -U {pg_admin} -c '
        f'"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname=\'{db_user}\') '
        f'THEN CREATE USER {db_user} WITH PASSWORD \'{db_user_pw}\'; END IF; END$$;"',
        capture=True
    )

    # أبسط طريقة — نكتب SQL لملف مؤقت ثم ننفذه
    sql_file = PROJECT / '_setup_db.sql'
    sql_file.write_text(
        f"DO $$ BEGIN\n"
        f"  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='{db_user}') THEN\n"
        f"    CREATE USER {db_user} WITH PASSWORD '{db_user_pw}';\n"
        f"  END IF;\n"
        f"END$$;\n\n"
        f"SELECT 'CREATE DATABASE {db_name} OWNER {db_user}'\n"
        f"WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='{db_name}')\\gexec\n\n"
        f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};\n",
        encoding='utf-8'
    )

    cmd = f'psql -h {pg_host} -p {pg_port} -U {pg_admin} -f "{sql_file}"'
    env_save = os.environ.get('PGPASSWORD', '')
    os.environ['PGPASSWORD'] = pg_pass
    ok_r, out, e = run(cmd, capture=True)
    os.environ['PGPASSWORD'] = env_save
    sql_file.unlink(missing_ok=True)

    if ok_r or 'already exists' in (out + e):
        ok(f"Database '{db_name}' و User '{db_user}' جاهزان")
    else:
        err(f"مشكلة في إنشاء DB: {e[:150]}")
        info("يمكنك إنشاءها يدوياً من pgAdmin")

    return pg_host, pg_port, db_name, db_user, db_user_pw


def create_env_file(pg_host, pg_port, db_name, db_user, db_user_pw):
    step("5 — إنشاء ملف .env")
    env_path = PROJECT / '.env'

    db_url = f"postgresql://{db_user}:{db_user_pw}@{pg_host}:{pg_port}/{db_name}"
    secret = secrets.token_hex(32)

    # حفظ secret key
    key_file = PROJECT / '.secret_key'
    key_file.write_text(secret, encoding='utf-8')

    content = f"""# Auto-generated by setup_new_machine.py
DATABASE_URL={db_url}
SECRET_KEY={secret}
FLASK_ENV=production
"""
    if not env_path.exists():
        env_path.write_text(content, encoding='utf-8')
        ok(f".env تم إنشاؤه")
    else:
        ok(f".env موجود مسبقاً — لم يُعدَّل")
        info("إذا أردت تحديث بيانات DB، عدّل .env يدوياً")

    return db_url


def create_folders():
    step("6 — إنشاء المجلدات")
    folders = [
        PROJECT / 'static' / 'uploads' / 'customers',
        PROJECT / 'static' / 'uploads' / 'vehicles',
        PROJECT / 'static' / 'images',
        PROJECT / 'data' / 'backups',
        PROJECT / 'logs',
        PROJECT / 'database' / 'old_sqlite_backup',
    ]
    for f in folders:
        f.mkdir(parents=True, exist_ok=True)
        ok(f"{f.relative_to(PROJECT)}")


def init_database():
    step("7 — تهيئة جداول قاعدة البيانات")
    info("جاري تهيئة الجداول...")

    script = PROJECT / '_init_db.py'
    script.write_text(
        "import sys, os\n"
        "from pathlib import Path\n"
        "sys.path.insert(0, str(Path(r'" + str(PROJECT) + "')))\n"
        "from dotenv import load_dotenv\n"
        "load_dotenv(Path(r'" + str(PROJECT / '.env') + "'), override=True)\n"
        "from backend import create_app\n"
        "app = create_app()\n"
        "with app.app_context():\n"
        "    from backend.models import db\n"
        "    db.create_all()\n"
        "    print('Tables created OK')\n",
        encoding='utf-8'
    )
    ok_r, out, e = run(f'python "{script}"', capture=True)
    script.unlink(missing_ok=True)

    if ok_r and 'OK' in out:
        ok("الجداول جاهزة")
        return True
    else:
        err(f"فشل تهيئة الجداول: {e[:150] or out[:150]}")
        info("جرّب تشغيل start_flask_qa.py وسيتم التهيئة تلقائياً")
        return False


def print_final_instructions(db_url):
    step("الإعداد اكتمل!")

    print("""
  الخطوات التالية:
  ────────────────────────────────────────────────────
  1. شغّل السيرفر:
       python start_flask_qa.py

  2. افتح المتصفح:
       http://localhost:5000

  3. سجّل دخول (owner / TestPass2024!)

  4. اذهب لـ Settings → Backup → Restore
     واستعد من ملف backup_*.zip الذي نقلته
     (هذا سيُستعيد كل البيانات والصور)

  ────────────────────────────────────────────────────
  أو لتشغيل التطبيق كـ Desktop App:
       python desktop_app.py
  ────────────────────────────────────────────────────
""")


def main():
    print('\n' + '='*60)
    print('  إعداد Car Showroom Management — حاسبة جديدة')
    print('='*60)

    if not check_prerequisites():
        print("\n  [STOP] ثبّت المتطلبات المذكورة أعلاه ثم أعد التشغيل.")
        return

    install_python_packages()
    build_frontend()
    pg_host, pg_port, db_name, db_user, db_user_pw = setup_postgresql()
    db_url = create_env_file(pg_host, pg_port, db_name, db_user, db_user_pw)
    create_folders()
    init_database()
    print_final_instructions(db_url)


if __name__ == '__main__':
    main()
