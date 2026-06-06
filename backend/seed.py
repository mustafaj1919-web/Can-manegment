import os
import secrets

from . import create_app
from .database import db
from .models import Car, Customer, User, Transaction


def seed_data():
    app = create_app()

    with app.app_context():
        db.create_all()

        if Car.query.first() or Customer.query.first() or User.query.first():
            print('Seed data already exists. Skipping.')
            return

        cars = [
            Car(
                brand='Toyota',
                model='Camry',
                manufacturing_year=2020,
                color='أبيض',
                vin='JT123456789012345',
                plate_number='1234-AB',
                mileage=35000,
                purchase_price=65000.0,
                selling_price=75000.0,
                status='Available',
                notes='سيارة حالة ممتازة'
            ),
            Car(
                brand='Honda',
                model='Civic',
                manufacturing_year=2019,
                color='أسود',
                vin='HN987654321098765',
                plate_number='5678-CD',
                mileage=42000,
                purchase_price=60000.0,
                selling_price=68000.0,
                status='Reserved',
                notes='محجوزة للعميل'
            )
        ]

        customers = [
            Customer(
                name='محمد علي',
                phone='0501234567',
                address='الرياض',
                id_number='1234567890',
                customer_type='Buyer',
                notes='عميل مهتم بسيارات عائلية'
            ),
            Customer(
                name='أحمد عبدالله',
                phone='0557654321',
                address='جدة',
                id_number='0987654321',
                customer_type='Seller',
                notes='يبيع سيارة ملكية خاصة'
            )
        ]

        admin_password = os.environ.get('SEED_ADMIN_PASSWORD') or secrets.token_urlsafe(18)
        admin_user = User(username='admin', role='Admin')
        admin_user.set_password(admin_password)

        transactions = [
            Transaction(transaction_type='Income', amount=0.0, description='افتتاح قاعدة البيانات')
        ]

        db.session.add_all(cars + customers + [admin_user] + transactions)
        db.session.commit()
        print('Seed data inserted successfully.')
        print(f'Temporary admin password: {admin_password}')


if __name__ == '__main__':
    seed_data()
