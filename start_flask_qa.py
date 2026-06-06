"""Starts Flask with the correct environment (mirrors fixed desktop_app.py) for QA."""
import os
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
env_file = PROJECT / '.env'

if env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(env_file, override=False)

db_path = PROJECT / 'database' / 'showroom.db'
secret_file = PROJECT / '.secret_key'
secret = secret_file.read_text(encoding='utf-8').strip() if secret_file.exists() else 'qa-secret-key-dev'

os.environ.setdefault('CAR_SHOWROOM_DATA_DIR', str(PROJECT))
os.environ.setdefault('DATABASE_URL', 'sqlite:///' + db_path.as_posix())
os.environ.setdefault('UPLOAD_FOLDER', str(PROJECT / 'static' / 'uploads'))
os.environ.setdefault('BACKUP_FOLDER', str(PROJECT / 'data' / 'backups'))
os.environ.setdefault('SECRET_KEY', secret)
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:5000')

sys.path.insert(0, str(PROJECT))
from backend import create_app

app = create_app()

print(f"[Flask] DATA_DIR   = {os.environ.get('CAR_SHOWROOM_DATA_DIR')}")
print(f"[Flask] DB URL     = {os.environ.get('DATABASE_URL','?').split('@')[-1] if '@' in os.environ.get('DATABASE_URL','') else os.environ.get('DATABASE_URL','?')}")
print(f"[Flask] UPLOAD     = {os.environ.get('UPLOAD_FOLDER')}")
print(f"[Flask] BACKUP     = {os.environ.get('BACKUP_FOLDER')}")
print(f"[Flask] static_folder = {app.static_folder}")
print("[Flask] Starting waitress on 127.0.0.1:5000 ...")

from waitress import serve
serve(app, host='127.0.0.1', port=5000, threads=8)
