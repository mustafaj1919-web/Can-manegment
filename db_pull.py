"""
Pull latest DB dump from GitHub and restore locally.
Run this on the second device.
"""
import subprocess, os, sys, logging
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR  = Path(__file__).parent
DUMP_FILE = BASE_DIR / "database" / "shared_db.dump"
PG_BIN    = r"C:\Program Files\PostgreSQL\18\bin"
LOG_FILE  = BASE_DIR / "logs" / "db_sync.log"

load_dotenv(BASE_DIR / ".env")
LOCAL_DB = os.environ["DATABASE_URL"]

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=LOG_FILE, level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S", encoding="utf-8",
)

def run(cmd, env=None):
    return subprocess.run(cmd, capture_output=True, text=True, env=env or os.environ.copy())

def main():
    psql       = os.path.join(PG_BIN, "psql.exe")
    pg_restore = os.path.join(PG_BIN, "pg_restore.exe")

    print("[1/2] Pulling from GitHub...")
    logging.info("Starting pull")
    r = run(["git", "pull", "origin", "master"])
    if r.returncode != 0:
        print(f"ERROR - Git pull failed:\n{r.stderr}")
        logging.error(f"Git pull failed: {r.stderr}")
        sys.exit(1)
    print("[1/2] Pull OK")

    if not DUMP_FILE.exists():
        print("ERROR - shared_db.dump not found. Run db_push.py on the other device first.")
        sys.exit(1)

    env = os.environ.copy()
    env["PGPASSWORD"] = "Aldulimi99"

    print("[2/2] Restoring database...")
    logging.info("Starting restore")
    r = run([psql, LOCAL_DB, "-c",
             "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"], env=env)
    if r.returncode != 0:
        print(f"ERROR - Clean failed:\n{r.stderr}")
        logging.error(f"Clean failed: {r.stderr}")
        sys.exit(1)

    r = run([pg_restore, "--no-owner", "--no-acl",
             "-d", LOCAL_DB, str(DUMP_FILE)], env=env)
    if r.returncode != 0:
        print(f"ERROR - Restore failed:\n{r.stderr}")
        logging.error(f"Restore failed: {r.stderr}")
        sys.exit(1)

    print("[2/2] Restore OK - done!")
    logging.info("Restore OK")

if __name__ == "__main__":
    main()
