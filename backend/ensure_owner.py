import argparse
import os
import secrets
import sys
from pathlib import Path


DEFAULT_USERNAME = 'owner'
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def configure_database(database_path):
    if not database_path:
        return
    path = Path(database_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    os.environ['DATABASE_URL'] = 'sqlite:///' + path.as_posix()


def generate_temporary_password():
    return secrets.token_urlsafe(18)


def ensure_owner(username=DEFAULT_USERNAME, password=None):
    from backend import create_app
    from backend.database import db
    from backend.models import Branch, User

    app = create_app()
    with app.app_context():
        existing_owner = User.query.filter_by(role='Owner').first()
        if existing_owner:
            print(f'Owner user already exists: {existing_owner.username}')
            return False

        existing_username = User.query.filter(db.func.lower(User.username) == username.lower()).first()
        if existing_username:
            raise RuntimeError(
                f'Cannot create Owner user because username "{username}" already exists.'
            )
        if not password:
            password = generate_temporary_password()

        main_branch = Branch.query.filter_by(is_main=True).first() or Branch.query.order_by(Branch.id.asc()).first()
        owner = User(
            username=username,
            role='Owner',
            branch_id=main_branch.id if main_branch else None,
            can_access_all_branches=True,
            is_active_user=True,
        )
        owner.set_password(password)
        db.session.add(owner)
        db.session.commit()
        print(f'Created Owner user: {username}')
        print(f'Temporary password: {password}')
        print('Temporary password must be changed immediately after delivery.')
        return True


def main():
    parser = argparse.ArgumentParser(description='Create an Owner user only if no Owner user exists.')
    parser.add_argument('--database', help='Optional SQLite database path to update.')
    parser.add_argument('--username', default=DEFAULT_USERNAME)
    parser.add_argument('--password', default=os.environ.get('OWNER_TEMP_PASSWORD'))
    args = parser.parse_args()

    configure_database(args.database)
    ensure_owner(username=args.username, password=args.password)


if __name__ == '__main__':
    main()
