"""
سليف — يسحب البيانات من Neon إلى قاعدة البيانات المحلية
يُشغَّل كل دقيقة عبر Windows Task Scheduler
"""
import subprocess
import os
import sys
import logging
from pathlib import Path

BASE_DIR = Path(__file__).parent
LOG_FILE = BASE_DIR / "logs" / "neon_sync.log"
DUMP_FILE = BASE_DIR / "data" / "backups" / "neon_pull_dump.sql"
PG_BIN    = r"C:\Program Files\PostgreSQL\18\bin"

NEON_DB  = "postgresql://neondb_owner:npg_ncPfpva6W2dy@ep-aged-frog-abjxb0tn.eu-west-2.aws.neon.tech/neondb?sslmode=require"
LOCAL_DB = "postgresql://showroom_user:Aldulimi99@localhost:5432/showroom_db"

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    encoding="utf-8",
)

def run(cmd, env=None):
    return subprocess.run(cmd, capture_output=True, text=True, env=env or os.environ.copy())

def sync():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    DUMP_FILE.parent.mkdir(parents=True, exist_ok=True)

    pg_dump = os.path.join(PG_BIN, "pg_dump.exe")
    psql    = os.path.join(PG_BIN, "psql.exe")

    # 1) تصدير من Neon
    logging.info("سليف: سحب البيانات من Neon...")
    r = run([pg_dump, NEON_DB, "--no-owner", "--no-acl", "-f", str(DUMP_FILE)])
    if r.returncode != 0:
        logging.error(f"فشل سحب Neon: {r.stderr}")
        return False

    # 2) تنظيف القاعدة المحلية وإعادة الاستعادة
    env = os.environ.copy()
    env["PGPASSWORD"] = "Aldulimi99"

    r = run([psql, "-U", "showroom_user", "-h", "localhost", "-d", "showroom_db",
             "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO showroom_user;"], env=env)
    if r.returncode != 0:
        logging.error(f"فشل تنظيف القاعدة: {r.stderr}")
        return False

    r = run([psql, "-U", "showroom_user", "-h", "localhost", "-d", "showroom_db",
             "-f", str(DUMP_FILE)], env=env)
    if r.returncode != 0:
        logging.error(f"فشل الاستعادة المحلية: {r.stderr}")
        return False

    logging.info("سليف: تمت المزامنة بنجاح")
    return True

if __name__ == "__main__":
    ok = sync()
    sys.exit(0 if ok else 1)
