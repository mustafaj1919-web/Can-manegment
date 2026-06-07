"""Restore a specific backup archive"""
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)
sys.path.insert(0, str(BASE_DIR))

from backend.backup_utils import restore_backup_archive, get_backup_path

backup_file = "backup_20260607_001928.zip"
path = get_backup_path(backup_file)

if not path:
    print(f"ERROR: Backup not found: {backup_file}")
    sys.exit(1)

print(f"Restoring: {backup_file} ...")
restore_backup_archive(path)
print("Done!")
