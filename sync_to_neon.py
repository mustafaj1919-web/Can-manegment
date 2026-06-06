"""
مزامنة تلقائية من قاعدة البيانات المحلية إلى Neon
يُشغَّل كل 10 دقائق عبر Windows Task Scheduler
"""
import subprocess
import sys
import os
import logging
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
LOG_FILE = BASE_DIR / "logs" / "neon_sync.log"
DUMP_FILE = BASE_DIR / "data" / "backups" / "neon_sync_dump.sql"
PG_BIN = r"C:\Program Files\PostgreSQL\18\bin"

LOCAL_DB = "postgresql://showroom_user:Aldulimi99@localhost:5432/showroom_db"
NEON_DB  = "postgresql://neondb_owner:npg_ncPfpva6W2dy@ep-aged-frog-abjxb0tn.eu-west-2.aws.neon.tech/neondb?sslmode=require"

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    encoding="utf-8",
)

def run(cmd, **kwargs):
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)

def sync():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    DUMP_FILE.parent.mkdir(parents=True, exist_ok=True)

    pg_dump = os.path.join(PG_BIN, "pg_dump.exe")
    psql    = os.path.join(PG_BIN, "psql.exe")

    # 1) dump local
    logging.info("بدء المزامنة — تصدير القاعدة المحلية...")
    env = os.environ.copy()
    env["PGPASSWORD"] = "Aldulimi99"
    r = run([pg_dump, "-U", "showroom_user", "-h", "localhost", "-d", "showroom_db",
             "--no-owner", "--no-acl", "-f", str(DUMP_FILE)], env=env)
    if r.returncode != 0:
        logging.error(f"فشل التصدير: {r.stderr}")
        return False

    # 2) restore to Neon (drop & recreate tables)
    logging.info("رفع البيانات إلى Neon...")
    # clean target first
    clean_sql = "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    r = run([psql, NEON_DB, "-c", clean_sql])
    if r.returncode != 0:
        logging.error(f"فشل تنظيف Neon: {r.stderr}")
        return False

    r = run([psql, NEON_DB, "-f", str(DUMP_FILE)])
    if r.returncode != 0:
        logging.error(f"فشل الاستعادة: {r.stderr}")
        return False

    logging.info("تمت المزامنة بنجاح")
    return True

if __name__ == "__main__":
    ok = sync()
    sys.exit(0 if ok else 1)
