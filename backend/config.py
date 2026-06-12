import os
import secrets
from datetime import timedelta
from pathlib import Path

# ── Load .env before class body reads os.environ ───────────────────────────
# This must happen at module level (before the Config class is defined)
# because Python evaluates class bodies at import time, not at instantiation.
# Any entry point that imports this module (run.py, CLI, tests, etc.) will
# automatically pick up DATABASE_URL and other vars from .env.
_env_file = Path(__file__).parent.parent / '.env'
if _env_file.exists():
    try:
        from dotenv import load_dotenv as _load_dotenv
        _load_dotenv(_env_file, override=False)  # existing env vars take priority
    except ImportError:
        pass  # python-dotenv not installed — env vars must be set externally

basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.environ.get('CAR_SHOWROOM_DATA_DIR', basedir)
DATABASE_PATH = os.path.join(DATA_DIR, 'database', 'showroom.db')
STATIC_FOLDER = os.path.join(DATA_DIR, 'static')
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(STATIC_FOLDER, 'uploads'))
STATIC_IMAGES_FOLDER = os.path.join(STATIC_FOLDER, 'images')
PRIVATE_STORAGE_FOLDER = os.environ.get('PRIVATE_STORAGE_FOLDER', os.path.join(DATA_DIR, 'storage', 'private'))
BACKUP_FOLDER = os.environ.get('BACKUP_FOLDER', os.path.join(basedir, 'data', 'backups'))

# ── Cloud / Cloudflare Tunnel mode ─────────────────────────────────────────
_CLOUD_MODE = os.environ.get('CLOUD_MODE', '0').strip() == '1'
_ALLOWED_ORIGINS_RAW = os.environ.get('ALLOWED_ORIGINS', '')
ALLOWED_ORIGINS_EXTRA: set = {
    o.strip().rstrip('/')
    for o in _ALLOWED_ORIGINS_RAW.split(',')
    if o.strip()
}

# ── Resolve DATABASE_URL — fail fast if missing ─────────────────────────────
# desktop_app.py sets os.environ['DATABASE_URL'] via configure_environment()
# before importing backend, so it can still use SQLite by setting the var
# explicitly. The silent fallback (writing to SQLite when DATABASE_URL is
# simply absent) is intentionally removed: it caused data to silently go to
# the wrong database when .env was not loaded.
_db_url = os.environ.get('DATABASE_URL')
if not _db_url:
    raise RuntimeError(
        "\n\nDATABASE_URL is not set.\n"
        "Create a .env file in the project root with:\n"
        "  DATABASE_URL=postgresql://user:pass@host:5432/dbname\n"
        "Or for local development:\n"
        f"  DATABASE_URL=sqlite:///{DATABASE_PATH}\n"
        "Then restart the application.\n"
    )
if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)


def _resolve_secret_key() -> str:
    """Return a stable SECRET_KEY.

    Priority:
      1. SECRET_KEY env var / .env entry  — always wins
      2. Cloud mode without env var       — fail fast (random key would invalidate sessions on restart)
      3. Desktop mode without env var     — read/write .secret_key file so sessions survive restarts
    """
    key = os.environ.get('SECRET_KEY', '').strip()
    if key:
        return key

    if _CLOUD_MODE:
        raise RuntimeError(
            "\n\nSECRET_KEY is not set in cloud mode.\n"
            "Generate one and add to .env:\n"
            "  python -c \"import secrets; print(secrets.token_hex(32))\"\n"
            "Then add:  SECRET_KEY=<output>\n"
        )

    # Desktop mode: persist the key so sessions survive app restarts
    key_file = Path(DATA_DIR) / '.secret_key'
    if key_file.exists():
        stored = key_file.read_text().strip()
        if stored:
            return stored

    key = secrets.token_hex(32)
    try:
        key_file.parent.mkdir(parents=True, exist_ok=True)
        key_file.write_text(key)
    except OSError:
        pass  # Best effort — key is valid this session
    return key


class Config:
    SECRET_KEY = _resolve_secret_key()

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE   = _CLOUD_MODE          # True in cloud/HTTPS, False in desktop HTTP
    SESSION_COOKIE_SAMESITE = 'Strict' if _CLOUD_MODE else 'Lax'  # Strict in cloud for stronger CSRF protection
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

    MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    SQLALCHEMY_DATABASE_URI       = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,
        'max_overflow': 10,
        'pool_timeout': 30,
        'pool_pre_ping': True,
        'pool_recycle': 1800,
    }

    PROXY_FIX_X_FOR   = int(os.environ.get('PROXY_FIX_X_FOR',   1 if _CLOUD_MODE else 0))
    PROXY_FIX_X_PROTO = int(os.environ.get('PROXY_FIX_X_PROTO', 1 if _CLOUD_MODE else 0))
    PROXY_FIX_X_HOST  = int(os.environ.get('PROXY_FIX_X_HOST',  1 if _CLOUD_MODE else 0))

    DATA_DIR             = DATA_DIR
    DATABASE_PATH        = DATABASE_PATH
    STATIC_FOLDER        = STATIC_FOLDER
    UPLOAD_FOLDER        = UPLOAD_FOLDER
    STATIC_IMAGES_FOLDER = STATIC_IMAGES_FOLDER
    PRIVATE_STORAGE_FOLDER = PRIVATE_STORAGE_FOLDER
    BACKUP_FOLDER        = BACKUP_FOLDER
    ALLOWED_ORIGINS_EXTRA = ALLOWED_ORIGINS_EXTRA
    CLOUD_MODE           = _CLOUD_MODE
