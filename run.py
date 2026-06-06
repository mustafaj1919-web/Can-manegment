import os
from pathlib import Path

# Load .env before importing backend.
# config.py also calls load_dotenv() at module level, but doing it here
# as well is belt-and-suspenders: guarantees DATABASE_URL is in os.environ
# before any module in the backend package is imported.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env', override=False)
except ImportError:
    pass

from backend import create_app

app = create_app()

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '').lower() in {'1', 'true', 'yes'}
    app.run(debug=debug)
