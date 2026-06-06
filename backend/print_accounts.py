from flask import Flask
from .config import Config
from .database import db
from .models import Account

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)


def print_tree(parent_id=None, level=0):
    if parent_id:
        children = Account.query.filter_by(parent_id=parent_id).order_by(Account.code).all()
    else:
        children = Account.query.filter_by(parent_id=None).order_by(Account.code).all()
    for c in children:
        print('  ' * level + f'{c.code} {c.name} ({c.type})')
        print_tree(c.id, level + 1)


if __name__ == '__main__':
    with app.app_context():
        print('Chart of Accounts:')
        print_tree()
