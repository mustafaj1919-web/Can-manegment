from flask import Flask
from .config import Config
from .database import db
from .accounting import get_trial_balance

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)


if __name__ == '__main__':
    with app.app_context():
        lines, totals = get_trial_balance()
        print('ميزان المراجعة (الترميز السداسي)')
        print('-' * 72)
        print(f"{'الكود':<10} {'الحساب':<38} {'النوع':<10} {'مدين':>14} {'دائن':>14}")
        print('-' * 72)
        for l in lines:
            if l['debit'] == 0 and l['credit'] == 0:
                continue
            print(
                f"{l['code']:<10} {l['name']:<38} {l['type']:<10}"
                f" {l['debit']:14,.2f} {l['credit']:14,.2f}"
            )
        print('-' * 72)
        balanced = abs(totals['total_debit'] - totals['total_credit']) < 0.01
        status = 'متوازن' if balanced else 'غير متوازن!'
        print(f"{'الاجمالي':<50} {totals['total_debit']:14,.2f} {totals['total_credit']:14,.2f}")
        print(f"الحالة: {status}")
