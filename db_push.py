"""
Export local DB and push to GitHub.
Run this on the device that has the latest data.
"""
import subprocess, os, sys, logging
from datetime import datetime
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
    pg_dump = os.path.join(PG_BIN, "pg_dump.exe")
    env = os.environ.copy()
    env["PGPASSWORD"] = "Aldulimi99"

    print("[1/2] Exporting database...")
    logging.info("Starting export")
    r = run([pg_dump, LOCAL_DB, "--no-owner", "--no-acl",
             "-Fc", "-f", str(DUMP_FILE)], env=env)
    if r.returncode != 0:
        print(f"ERROR - Export failed:\n{r.stderr}")
        logging.error(f"Export failed: {r.stderr}")
        sys.exit(1)

    size_kb = DUMP_FILE.stat().st_size // 1024
    print(f"[1/2] Export OK ({size_kb} KB)")
    logging.info(f"Export OK - size: {size_kb} KB")

    print("[2/2] Pushing to GitHub...")
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    subprocess.run(["git", "add", str(DUMP_FILE)], cwd=BASE_DIR)
    subprocess.run(["git", "commit", "-m", f"db: sync {ts}"], cwd=BASE_DIR)
    r = run(["git", "push", "origin", "master"])
    if r.returncode != 0:
        print(f"ERROR - Push failed:\n{r.stderr}")
        logging.error(f"Push failed: {r.stderr}")
        sys.exit(1)

    print("[2/2] Push OK - done!")
    logging.info("Push OK")

if __name__ == "__main__":
    main()
