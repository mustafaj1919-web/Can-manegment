import atexit
import contextlib
import logging
import os
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import traceback
from datetime import datetime
from pathlib import Path


APP_NAME = 'CarShowroomManagement'
FLASK_HOST = '127.0.0.1'
FLASK_PORT = 5000
NEXT_HOST = '127.0.0.1'
NEXT_PORT = 3000
FLASK_ERRORS = []


def is_frozen():
    return bool(getattr(sys, 'frozen', False))


def bundle_dir():
    return Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))


def app_dir():
    if is_frozen():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def data_dir():
    # Frozen (packaged): isolate user data in exe_dir/data/
    # Development: use project root directly so paths match run.py
    if is_frozen():
        return app_dir() / 'data'
    return app_dir()


def logs_dir():
    path = app_dir() / 'logs'
    path.mkdir(parents=True, exist_ok=True)
    return path


def log_path(name):
    return logs_dir() / name


def write_log(name, message):
    path = log_path(name)
    timestamp = datetime.now().isoformat(timespec='seconds')
    with path.open('a', encoding='utf-8') as handle:
        handle.write(f'[{timestamp}] {message}\n')
    return path


def configure_backend_file_logging():
    path = log_path('flask.log')
    formatter = logging.Formatter('[%(asctime)s] %(levelname)s %(name)s: %(message)s')
    handler = logging.FileHandler(path, encoding='utf-8')
    handler.setFormatter(formatter)
    handler.setLevel(logging.INFO)

    for logger_name in ['', 'flask.app', 'waitress', 'waitress.queue', 'waitress.server', 'werkzeug']:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.INFO)
        existing = [
            current for current in logger.handlers
            if getattr(current, 'baseFilename', None) == str(path)
        ]
        if not existing:
            logger.addHandler(handler)
        if logger_name:
            logger.propagate = False

    return handler


def copy_seed_file(source, target):
    if not source.exists() or target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def copy_seed_dir(source, target):
    if not source.exists() or target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target)


def prepare_data_folder():
    root = data_dir()
    root.mkdir(parents=True, exist_ok=True)

    seed_root = bundle_dir()
    copy_seed_file(seed_root / 'database' / 'showroom.db', root / 'database' / 'showroom.db')
    copy_seed_dir(seed_root / 'static', root / 'static')
    (root / 'database').mkdir(parents=True, exist_ok=True)
    (root / 'static' / 'uploads').mkdir(parents=True, exist_ok=True)
    (root / 'static' / 'images').mkdir(parents=True, exist_ok=True)
    (app_dir() / 'data' / 'backups').mkdir(parents=True, exist_ok=True)
    return root


def _get_or_create_secret_key():
    """Return a stable per-installation secret key, creating one on first run."""
    key_file = app_dir() / '.secret_key'
    if key_file.exists():
        key = key_file.read_text(encoding='utf-8').strip()
        if len(key) >= 32:
            return key
    key = secrets.token_hex(32)
    key_file.write_text(key, encoding='utf-8')
    return key


def configure_environment(root):
    # تحميل .env إن وُجد (يسمح بتخصيص DATABASE_URL و غيرها)
    env_file = app_dir() / '.env'
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file, override=False)   # override=False: المتغيرات الموجودة تأخذ الأولوية
            write_log('desktop.log', f'.env loaded from: {env_file}')
        except ImportError:
            pass  # python-dotenv غير مثبت — تجاهل

    db_path = root / 'database' / 'showroom.db'
    # Backups always live in app_dir()/data/backups regardless of frozen state
    # so existing backup files are never orphaned when data_dir() changes.
    backup_dir = app_dir() / 'data' / 'backups'
    os.environ.setdefault('CAR_SHOWROOM_DATA_DIR', str(root))
    os.environ.setdefault('DATABASE_URL', 'sqlite:///' + db_path.as_posix())
    os.environ.setdefault('UPLOAD_FOLDER', str(root / 'static' / 'uploads'))
    os.environ.setdefault('BACKUP_FOLDER', str(backup_dir))
    os.environ.setdefault('SECRET_KEY', _get_or_create_secret_key())
    os.environ.setdefault('FLASK_ENV', 'production')
    os.environ.setdefault('NEXT_PUBLIC_API_URL', f'http://{FLASK_HOST}:{FLASK_PORT}')
    write_log('desktop.log', f'Working directory: {Path.cwd()}')
    write_log('desktop.log', f'Bundle directory: {bundle_dir()}')
    write_log('desktop.log', f'App directory: {app_dir()}')
    write_log('desktop.log', f'DATABASE_URL: {os.environ.get("DATABASE_URL", "").split("@")[-1] if "@" in os.environ.get("DATABASE_URL","") else os.environ.get("DATABASE_URL","?")}')
    write_log('desktop.log', f'Uploads path: {root / "static" / "uploads"}')
    write_log('desktop.log', f'Backups path: {backup_dir}')


def port_is_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((host, port)) == 0


def wait_for_port(host, port, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if port_is_open(host, port):
            return True
        time.sleep(0.25)
    return False


def start_flask():
    path = log_path('flask.log')
    with path.open('a', encoding='utf-8') as handle:
        with contextlib.redirect_stdout(handle), contextlib.redirect_stderr(handle):
            try:
                backend_log_handler = configure_backend_file_logging()
                logging.getLogger(__name__).info('Flask backend startup initiated')
                print(f'[{datetime.now().isoformat(timespec="seconds")}] Flask startup command: backend.create_app + waitress/app.run')
                print(f'Working directory: {Path.cwd()}')
                print(f'Bundle directory: {bundle_dir()}')
                print(f'App directory: {app_dir()}')
                print(f'Database URL: {os.environ.get("DATABASE_URL")}')
                print(f'Uploads path: {os.environ.get("UPLOAD_FOLDER")}')
                print(f'Listening on: http://{FLASK_HOST}:{FLASK_PORT}')
                from backend import create_app

                app = create_app()
                app.logger.setLevel(logging.INFO)
                app.logger.info('Flask app created successfully')
                try:
                    from waitress import serve
                    app.logger.info('Server: waitress on http://%s:%s', FLASK_HOST, FLASK_PORT)
                    print('Server: waitress')
                    serve(app, host=FLASK_HOST, port=FLASK_PORT, threads=8)
                except ImportError:
                    app.logger.info('Server: Flask built-in on http://%s:%s', FLASK_HOST, FLASK_PORT)
                    print('Server: Flask built-in')
                    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False, use_reloader=False)
            except Exception:
                logging.getLogger(__name__).exception('Flask backend failed during startup')
                traceback.print_exc()
                FLASK_ERRORS.append(traceback.format_exc())


def find_node_exe():
    candidates = [
        app_dir() / 'node' / 'node.exe',
        bundle_dir() / 'node' / 'node.exe',
        bundle_dir() / 'runtime' / 'node' / 'node.exe',
        # Common Windows installation paths — checked explicitly because the
        # Python process may not inherit the full user/system PATH (especially
        # when launched via a file-manager double-click or pywebview).
        Path(r'C:\Program Files\nodejs\node.exe'),
        Path(r'C:\Program Files (x86)\nodejs\node.exe'),
        Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'nodejs' / 'node.exe',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'nodejs' / 'node.exe',
        Path(os.environ.get('APPDATA', '')) / 'nvm' / 'current' / 'node.exe',
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    # shutil.which searches os.environ['PATH'] — works when PATH is properly set
    found = shutil.which('node.exe') or shutil.which('node')
    if found:
        return found
    raise RuntimeError('node.exe was not found. Bundle portable Node in the node folder beside the exe.')


def find_next_server():
    roots = [bundle_dir(), app_dir()]
    candidates = []
    for root in roots:
        candidates.extend([
            root / 'frontend' / '.next' / 'standalone' / 'frontend' / 'server.js',
            root / 'frontend' / '.next' / 'standalone' / 'server.js',
            root / '.next' / 'standalone' / 'frontend' / 'server.js',
            root / '.next' / 'standalone' / 'server.js',
        ])
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise RuntimeError('Next standalone server.js was not found. Run npm run build before packaging.')


def start_next():
    server_js = find_next_server()
    node_exe = find_node_exe()
    next_log_path = log_path('next.log')
    write_log('desktop.log', f'Next startup command: {node_exe} {server_js}')
    write_log('desktop.log', f'Next working directory: {server_js.parent}')
    env = os.environ.copy()
    env['HOSTNAME'] = NEXT_HOST
    env['PORT'] = str(NEXT_PORT)
    env['NODE_ENV'] = 'production'
    next_log = next_log_path.open('a', encoding='utf-8')
    next_log.write(f'[{datetime.now().isoformat(timespec="seconds")}] Starting Next standalone\n')
    next_log.write(f'Command: {node_exe} {server_js}\n')
    next_log.write(f'Working directory: {server_js.parent}\n')
    next_log.flush()
    process = subprocess.Popen(
        [node_exe, str(server_js)],
        cwd=str(server_js.parent),
        env=env,
        stdout=next_log,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
    )
    atexit.register(lambda: process.poll() is None and process.terminate())
    atexit.register(next_log.close)
    return process


def main():
    write_log('desktop.log', 'Desktop launcher starting')
    root = prepare_data_folder()
    configure_environment(root)
    if port_is_open(FLASK_HOST, FLASK_PORT):
        write_log('desktop.log', f'Port {FLASK_PORT} was already in use before Flask startup')
    if port_is_open(NEXT_HOST, NEXT_PORT):
        write_log('desktop.log', f'Port {NEXT_PORT} was already in use before Next startup')

    # Non-daemon: Flask stays alive even if this main thread crashes during
    # Next.js startup, so login/API requests continue to work in a browser.
    flask_thread = threading.Thread(target=start_flask, daemon=False)
    flask_thread.start()
    if not wait_for_port(FLASK_HOST, FLASK_PORT, timeout=60):
        error = FLASK_ERRORS[-1].splitlines()[-1] if FLASK_ERRORS else 'No Python exception captured. See logs/flask.log.'
        write_log('desktop.log', f'Flask backend did not start: {error}')
        raise RuntimeError(f'Flask backend did not start. See {log_path("flask.log")}')
    write_log('desktop.log', f'Flask started on http://{FLASK_HOST}:{FLASK_PORT}')

    next_process = start_next()
    if not wait_for_port(NEXT_HOST, NEXT_PORT):
        if next_process.poll() is not None:
            write_log('desktop.log', f'Next standalone exited with code {next_process.returncode}')
            raise RuntimeError('Next standalone server exited during startup.')
        write_log('desktop.log', 'Next standalone did not start before timeout')
        raise RuntimeError('Next standalone server did not start.')
    write_log('desktop.log', f'Next started on http://{NEXT_HOST}:{NEXT_PORT}')

    import webview

    webview.create_window(
        APP_NAME,
        f'http://{NEXT_HOST}:{NEXT_PORT}',
        width=1280,
        height=820,
        min_size=(1100, 700),
    )
    webview.start()


if __name__ == '__main__':
    main()
