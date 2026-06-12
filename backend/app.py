import hmac
import logging
import logging.handlers
import os
import calendar
import hashlib
import json
import secrets
import subprocess
import sys
import threading
import time
import urllib.request
from collections import defaultdict, deque
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4

APP_VERSION  = '1.0.0'
APP_NAME     = 'Car Showroom Management'
# In-memory ring-buffer for the last 50 application errors (thread-safe append).
_error_log_buffer: deque = deque(maxlen=50)
from flask import Flask, request, redirect, url_for, flash, session, send_from_directory, jsonify, send_file
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from datetime import datetime, timedelta
from sqlalchemy import func, inspect as sa_inspect, or_, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql.sqltypes import Boolean, Date, DateTime as SQLDateTime, Float, Integer, Numeric
from werkzeug.utils import secure_filename
from functools import wraps
from .config import Config
from .database import db
from .backup_utils import BACKUP_FOLDER, create_backup_archive, ensure_backup_folder, ensure_daily_backup, get_backup_path, list_backup_archives, restore_backup_archive
from .models import (
    Account,
    AccountingPeriod,
    AuditLog,
    Branch,
    LoginAttempt,
    Car,
    CarPhoto,
    Customer,
    CustomerDocument,
    CustomerInteraction,
    Employee,
    EmployeeCommission,
    EmployeeTarget,
    Expense,
    ExchangeRate,
    InstallmentPlan,
    InstallmentSchedule,
    JournalEntry,
    JournalEntryLine,
    Payment,
    Purchase,
    RolePermission,
    Sale,
    SalePipeline,
    Transaction,
    User,
    ShowroomInfo,
    CostCenter,
    VehicleCost,
    Voucher,
    CashboxClose,
)
from .accounting import check_period_lock, get_trial_balance
from .account_map import (
    AR_ACCOUNT, AP_ACCOUNT, CASH_ACCOUNT, BANK_ACCOUNT,
    INVENTORY_NEW, REVENUE_NEW_CAR, COGS_ACCOUNT,
    EXPENSE_SHIPPING, EXPENSE_MISC,
    acct_cash, acct_sale_revenue, acct_sale_cogs, acct_inventory,
    acct_expense_category, acct_vehicle_cost,
)


ALLOWED_PHOTO_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
ALLOWED_UPLOAD_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'pdf'}
DEFAULT_BRANCHES = [
    ('الرئيسي', True),
    ('الأصدقاء', False),
    ('الأصدقاء 2', False),
]
PERMISSIONS = [
    'view_dashboard',
    'manage_cars',
    'manage_customers',
    'manage_sales',
    'manage_purchases',
    'manage_accounting',
    'manage_installments',
    'manage_reports',
    'manage_backups',
    'manage_backup',
    'manage_database',
    'manage_users',
    'manage_roles',
    'delete_records',
    'export_reports',
    'manage_cashbox',
    'manage_bank',
    'manage_vouchers',
]

CLASSIFICATION_LABELS = {
    'current_asset':       'الأصول المتداولة',
    'fixed_asset':         'الأصول الثابتة',
    'current_liability':   'المطلوبات المتداولة',
    'long_term_liability': 'المطلوبات طويلة الأجل',
    'equity':              'حقوق الملكية',
    'operating_revenue':   'الإيرادات التشغيلية',
    'other_revenue':       'الإيرادات الأخرى',
    'cogs':                'تكلفة البضاعة المباعة',
    'operating_expense':   'المصاريف التشغيلية',
    'admin_expense':       'المصاريف الإدارية',
}

MONEY_QUANTUM = Decimal('0.01')
RATE_QUANTUM = Decimal('0.000001')
ZERO_MONEY = Decimal('0.00')


def decimal_value(value, default=ZERO_MONEY):
    if value is None or value == '':
        return default
    result = value if isinstance(value, Decimal) else Decimal(str(value))
    if not result.is_finite():
        raise InvalidOperation('non-finite decimal value')
    return result


def money_value(value, default=ZERO_MONEY):
    return decimal_value(value, default).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def rate_decimal(value):
    return decimal_value(value).quantize(RATE_QUANTUM, rounding=ROUND_HALF_UP)

ROLE_LABELS = {
    'Owner':      'مالك المعرض',
    'Admin':      'مدير النظام',
    'Accountant': 'محاسب',
    'Sales':      'موظف مبيعات',
    'Viewer':     'مشاهد',
}

DEFAULT_ROLE_PERMISSIONS = {
    'Owner': PERMISSIONS,
    'Admin': [
        'view_dashboard', 'manage_cars', 'manage_customers', 'manage_sales',
        'manage_purchases', 'manage_accounting', 'manage_installments', 'manage_reports',
        'manage_backups', 'manage_backup', 'manage_database', 'manage_users', 'manage_roles',
        'delete_records', 'export_reports',
        'manage_cashbox', 'manage_bank', 'manage_vouchers',
    ],
    'Accountant': [
        'view_dashboard', 'manage_accounting', 'manage_installments', 'manage_reports', 'export_reports',
        'manage_cashbox', 'manage_bank', 'manage_vouchers',
    ],
    'Sales': [
        'view_dashboard', 'manage_cars', 'manage_customers',
        'manage_sales', 'manage_purchases', 'manage_installments'
    ],
    'Viewer': ['view_dashboard', 'manage_reports', 'export_reports'],
}


PERMISSION_LABELS = {
    'view_dashboard': 'عرض لوحة التحكم',
    'manage_cars': 'إدارة السيارات',
    'manage_customers': 'إدارة العملاء',
    'manage_sales': 'إدارة المبيعات',
    'manage_purchases': 'إدارة المشتريات',
    'manage_accounting': 'إدارة المحاسبة',
    'manage_installments': 'إدارة الأقساط',
    'manage_reports': 'إدارة التقارير',
    'manage_backups': 'إدارة النسخ الاحتياطي',
    'manage_backup': 'إدارة النسخ الاحتياطي',
    'manage_database': 'إدارة قاعدة البيانات',
    'manage_users': 'إدارة المستخدمين',
    'manage_roles': 'إدارة الصلاحيات',
    'delete_records':   'حذف السجلات',
    'export_reports':   'تصدير التقارير',
    'manage_cashbox':   'إدارة الصندوق',
    'manage_bank':      'إدارة البنوك',
    'manage_vouchers':  'إدارة السندات',
}

UI_TRANSLATIONS = {
    'Owner': 'مالك المعرض',
    'Admin': 'مدير النظام',
    'Accountant': 'محاسب',
    'Sales': 'موظف مبيعات',
    'Cash': 'نقداً',
    'Installment': 'أقساط',
    'Bank transfer': 'حوالة مصرفية',
    'Available': 'متاحة',
    'Reserved': 'محجوزة',
    'Sold': 'مباعة',
    'All': 'الكل',
    'Active': 'نشطة',
    'Cancelled': 'ملغاة',
    'Pending': 'بانتظار الدفع',
    'Paid': 'مدفوعة',
    'Overdue': 'متأخرة',
    'Partial': 'مدفوعة جزئياً',
    'New': 'جديدة',
    'Used': 'مستعملة',
    'Damaged': 'متضررة',
    'Salvage': 'سكراب',
    'Automatic': 'أوتوماتيك',
    'Manual': 'يدوي',
    'CVT': 'CVT',
    'DCT': 'DCT',
    'Gasoline': 'بنزين',
    'Diesel': 'ديزل',
    'Hybrid': 'هايبرد',
    'Electric': 'كهرباء',
    'No Plate': 'بدون لوحة',
    'Temporary': 'مؤقتة',
    'Registered': 'مسجلة',
    'Export': 'تصدير',
    'Fabric': 'قماش',
    'Leather': 'جلد',
    'Synthetic Leather': 'جلد صناعي',
    'Suede': 'سويد',
    'Buyer': 'مشتري',
    'Seller': 'بائع',
    'National ID': 'البطاقة الوطنية',
    'Passport': 'جواز السفر',
    'Residence Card': 'بطاقة السكن',
    'sale': 'بيع',
    'purchase': 'شراء',
    'installment': 'قسط',
    'expense': 'مصروف',
    'income': 'إيراد',
    'Income': 'إيراد',
    'Expense': 'مصروف',
    'USD': 'الدولار',
    'IQD': 'الدينار العراقي',
    'online': 'تحديث إلكتروني',
    'manual': 'يدوي',
    'pre_restore_safety': 'نسخة أمان قبل الاستعادة',
    'pre_reset_safety': 'نسخة أمان قبل التهيئة',
    'login': 'تسجيل دخول',
    'logout': 'تسجيل خروج',
    'delete backup': 'حذف نسخة احتياطية',
    'create backup': 'إنشاء نسخة احتياطية',
    'create safety backup before restore': 'إنشاء نسخة أمان قبل الاستعادة',
    'restore backup': 'استعادة نسخة احتياطية',
    'database add': 'إضافة سجل من إدارة قاعدة البيانات',
    'database edit': 'تعديل سجل من إدارة قاعدة البيانات',
    'database delete': 'حذف سجل من إدارة قاعدة البيانات',
    'add installment payment': 'تسجيل دفعة قسط',
    'mark installment paid': 'تعليم القسط كمدفوع',
    'add sale': 'إضافة فاتورة بيع',
    'create sale': 'إنشاء فاتورة بيع',
    'edit sale': 'تعديل فاتورة بيع',
    'cancel sale': 'إلغاء فاتورة بيع',
    'add purchase': 'إضافة فاتورة شراء',
    'create purchase': 'إنشاء فاتورة شراء',
    'edit purchase': 'تعديل فاتورة شراء',
    'cancel purchase': 'إلغاء فاتورة شراء',
    'add sale payment': 'تسجيل دفعة بيع',
    'add purchase payment': 'تسجيل دفعة شراء',
    'add car': 'إضافة سيارة',
    'edit car': 'تعديل سيارة',
    'delete car': 'حذف سيارة',
    'add customer': 'إضافة عميل',
    'create customer': 'إنشاء عميل',
    'edit customer': 'تعديل عميل',
    'delete customer': 'حذف عميل',
    'add expense': 'إضافة مصروف',
    'add employee': 'إضافة موظف',
    'update employee': 'تعديل موظف',
    'toggle employee': 'تغيير حالة موظف',
    'delete employee': 'حذف موظف',
    'update showroom info': 'تحديث معلومات المعرض',
    'add user': 'إضافة مستخدم',
    'edit user': 'تعديل مستخدم',
    'enable user': 'تفعيل مستخدم',
    'disable user': 'تعطيل مستخدم',
    'reset password': 'إعادة تعيين كلمة المرور',
    'delete user': 'حذف مستخدم',
    'change permissions': 'تعديل الصلاحيات',
    'reset permissions': 'إعادة ضبط الصلاحيات',
    'update exchange rate': 'تحديث سعر الصرف',
    'Backup': 'نسخة احتياطية',
    'Car': 'سيارة',
    'Customer': 'عميل',
    'Sale': 'بيع',
    'Purchase': 'شراء',
    'InstallmentPlan': 'خطة أقساط',
    'InstallmentSchedule': 'جدول أقساط',
    'Payment': 'دفعة',
    'Expense': 'مصروف',
    'Transaction': 'حركة صندوق',
    'User': 'مستخدم',
    'Employee': 'موظف',
    'ShowroomInfo': 'معلومات المعرض',
    'RolePermission': 'صلاحية دور',
    'AuditLog': 'سجل تدقيق',
    'backup': 'نسخة احتياطية',
    'car': 'سيارة',
    'customer': 'عميل',
    'installmentplan': 'خطة أقساط',
    'installmentschedule': 'جدول أقساط',
    'payment': 'دفعة',
    'transaction': 'حركة صندوق',
    'user': 'مستخدم',
    'rolepermission': 'صلاحية دور',
    'auditlog': 'سجل تدقيق',
}

DATABASE_MODEL_LABELS = {
    'audit_log': 'سجل التدقيق',
    'branch': 'الفروع',
    'exchange_rate': 'أسعار الصرف',
    'car': 'السيارات',
    'car_photo': 'صور السيارات',
    'customer': 'العملاء',
    'customer_document': 'مستندات العملاء',
    'expense': 'المصروفات',
    'installment_plan': 'خطط الأقساط',
    'installment_schedule': 'جدول الأقساط',
    'payment': 'الدفعات',
    'purchase': 'المشتريات',
    'role_permission': 'صلاحيات الأدوار',
    'sale': 'المبيعات',
    'transaction': 'حركات الصندوق',
    'user': 'المستخدمون',
}

DATABASE_COLUMN_LABELS = {
    'id': 'المعرف',
    'branch_id': 'الفرع',
    'name': 'الاسم',
    'is_main': 'فرع رئيسي',
    'created_at': 'تاريخ الإنشاء',
    'rate': 'سعر الصرف',
    'source': 'المصدر',
    'updated_at': 'آخر تحديث',
    'updated_by': 'حدث بواسطة',
    'brand': 'الماركة',
    'model': 'الموديل',
    'manufacturing_year': 'سنة الصنع',
    'trim': 'الفئة',
    'condition': 'الحالة',
    'color': 'اللون',
    'vin': 'رقم الشاصي',
    'plate_number': 'رقم اللوحة',
    'plate_status': 'حالة اللوحة',
    'mileage': 'المسافة',
    'engine_size': 'رقم/حجم المحرك',
    'cylinders': 'عدد السلندرات',
    'transmission': 'ناقل الحركة',
    'fuel_type': 'نوع الوقود',
    'import_country': 'بلد الاستيراد',
    'seat_count': 'عدد المقاعد',
    'seat_material': 'مادة المقاعد',
    'purchase_price': 'سعر الشراء',
    'selling_price': 'سعر البيع',
    'currency': 'العملة',
    'status': 'الحالة',
    'notes': 'ملاحظات',
    'car_id': 'السيارة',
    'filename': 'اسم الملف',
    'uploaded_at': 'تاريخ الرفع',
    'full_name': 'الاسم الكامل',
    'phone': 'رقم الهاتف',
    'address': 'العنوان',
    'id_type': 'نوع الهوية',
    'id_number': 'رقم الهوية',
    'id_issue_date': 'تاريخ الإصدار',
    'id_expiry_date': 'تاريخ الانتهاء',
    'nationality': 'الجنسية',
    'date_of_birth': 'تاريخ الميلاد',
    'customer_type': 'نوع العميل',
    'customer_id': 'العميل',
    'document_type': 'نوع المستند',
    'original_filename': 'اسم الملف الأصلي',
    'invoice_number': 'رقم الفاتورة',
    'buyer_id': 'المشتري',
    'seller_id': 'البائع',
    'discount': 'الخصم',
    'paid_amount': 'المبلغ المدفوع',
    'remaining_amount': 'المبلغ المتبقي',
    'payment_method': 'طريقة الدفع',
    'cancel_reason': 'سبب الإلغاء',
    'cancelled_at': 'تاريخ الإلغاء',
    'sale_date': 'تاريخ البيع',
    'purchase_date': 'تاريخ الشراء',
    'sale_id': 'عملية البيع',
    'purchase_id': 'عملية الشراء',
    'total_amount': 'المبلغ الكلي',
    'number_of_months': 'عدد الأشهر',
    'installment_start_date': 'بداية الأقساط',
    'installment_due_day': 'يوم الاستحقاق',
    'installment_amount': 'قيمة القسط',
    'installment_plan_id': 'خطة الأقساط',
    'installment_number': 'رقم القسط',
    'due_date': 'تاريخ الاستحقاق',
    'amount': 'المبلغ',
    'payment_date': 'تاريخ الدفع',
    'installment_schedule_id': 'القسط',
    'payment_type': 'نوع الدفعة',
    'title': 'العنوان',
    'category': 'التصنيف',
    'expense_date': 'تاريخ المصروف',
    'transaction_type': 'نوع الحركة',
    'description': 'الوصف',
    'role': 'الدور',
    'permission': 'الصلاحية',
    'user_id': 'المستخدم',
    'action': 'الإجراء',
    'entity_type': 'نوع السجل',
    'entity_id': 'معرف السجل',
    'details': 'التفاصيل',
    'username': 'اسم المستخدم',
    'password_hash': 'كلمة المرور المشفرة',
    'can_access_all_branches': 'الوصول لكل الفروع',
    'is_active_user': 'مستخدم نشط',
}


def translate_ui(value):
    if value is None:
        return ''
    return PERMISSION_LABELS.get(value) or UI_TRANSLATIONS.get(value) or DATABASE_MODEL_LABELS.get(value) or DATABASE_COLUMN_LABELS.get(value) or value


def normalize_currency(currency):
    currency = (currency or 'USD').upper()
    return currency if currency in ['USD', 'IQD'] else 'USD'


def currency_label(currency):
    return 'الدينار العراقي' if normalize_currency(currency) == 'IQD' else 'الدولار'


def format_money(value):
    if value is None or value == '':
        return '0'
    try:
        number = decimal_value(value)
    except (InvalidOperation, TypeError, ValueError):
        return str(value)
    if number == number.to_integral_value():
        return f'{int(number):,}'
    return f'{number:,.2f}'.rstrip('0').rstrip('.')


def format_currency_amount(value, currency=None):
    if currency:
        return f'{format_money(value)} {currency_label(currency)}'
    return format_money(value)


def get_current_exchange_rate():
    return ExchangeRate.query.order_by(ExchangeRate.updated_at.desc(), ExchangeRate.id.desc()).first()


def exchange_rate_value():
    current_rate = get_current_exchange_rate()
    return rate_decimal(current_rate.rate) if current_rate else None


def convert_money(amount, from_currency, to_currency, rate=None):
    from_currency = normalize_currency(from_currency)
    to_currency = normalize_currency(to_currency)
    if amount is None:
        return ZERO_MONEY
    if from_currency == to_currency:
        return money_value(amount)
    rate = rate if rate is not None else exchange_rate_value()
    if not rate:
        return None
    amount_decimal = decimal_value(amount)
    rate_value = rate_decimal(rate)
    converted = (
        amount_decimal * rate_value
        if from_currency == 'USD' and to_currency == 'IQD'
        else amount_decimal / rate_value
    )
    return converted.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def format_currency_pair(amount, currency='USD', rate=None):
    currency = normalize_currency(currency)
    main_value = format_currency_amount(amount, currency)
    other_currency = 'IQD' if currency == 'USD' else 'USD'
    converted = convert_money(amount, currency, other_currency, rate)
    if converted is None:
        return main_value
    return f'{main_value} / {format_currency_amount(converted, other_currency)}'


def to_iqd(amount, currency='USD'):
    converted = convert_money(amount, currency, 'IQD')
    return converted if converted is not None else money_value(amount or 0)


def record_amount_iqd(record, field_name):
    return to_iqd(getattr(record, field_name, 0) or 0, getattr(record, 'currency', 'USD'))


def fetch_online_exchange_rate():
    with urllib.request.urlopen('https://open.er-api.com/v6/latest/USD', timeout=8) as response:
        payload = json.loads(response.read().decode('utf-8'))
    rate = payload.get('rates', {}).get('IQD')
    if not rate:
        raise ValueError('IQD rate is not available from the online source')
    return rate_decimal(rate)


def allowed_photo(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PHOTO_EXTENSIONS


def allowed_upload(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_UPLOAD_EXTENSIONS


def _check_file_magic(file_storage, allowed_ext_set: set) -> bool:
    """Validate actual file content via magic bytes; rewinds stream afterwards.

    Supported signatures:
      JPEG  : FF D8 FF
      PNG   : 89 50 4E 47 0D 0A 1A 0A
      WebP  : RIFF....WEBP
      PDF   : 25 50 44 46
    """
    header = file_storage.stream.read(12)
    file_storage.stream.seek(0)

    if len(header) >= 3 and header[:3] == b'\xff\xd8\xff':
        return bool({'jpeg', 'jpg'} & allowed_ext_set)
    if len(header) >= 8 and header[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png' in allowed_ext_set
    if len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return 'webp' in allowed_ext_set
    if len(header) >= 4 and header[:4] == b'%PDF':
        return 'pdf' in allowed_ext_set
    return False


def save_car_photos(car):
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    for photo in request.files.getlist('photos'):
        if not photo or not photo.filename or not allowed_photo(photo.filename):
            continue

        original_name = secure_filename(photo.filename)
        extension = original_name.rsplit('.', 1)[1].lower()
        filename = f'{uuid4().hex}.{extension}'
        photo.save(os.path.join(Config.UPLOAD_FOLDER, filename))
        db.session.add(CarPhoto(car_id=car.id, filename=filename))


def parse_optional_date(value):
    if not value:
        return None
    return datetime.strptime(value, '%Y-%m-%d')


def add_months(value, months):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def due_date_for_month(start_date, due_day, month_offset):
    target = add_months(start_date, month_offset)
    safe_day = min(due_day, calendar.monthrange(target.year, target.month)[1])
    return target.replace(day=safe_day)


def refresh_installment_status(schedule):
    if schedule.status == 'Cancelled':
        return  # حالة الإلغاء لا تُعدَّل تلقائياً
    if schedule.remaining_amount <= 0:
        schedule.remaining_amount = ZERO_MONEY
        schedule.status = 'Paid'
        if not schedule.payment_date:
            schedule.payment_date = datetime.utcnow()
    elif schedule.paid_amount > 0:
        schedule.status = 'Partial'
    elif schedule.due_date.date() < datetime.utcnow().date():
        schedule.status = 'Overdue'
    else:
        schedule.status = 'Pending'


def refresh_installment_plan(plan):
    for schedule in plan.schedules:
        refresh_installment_status(schedule)
    plan.paid_amount = sum((decimal_value(item.paid_amount) for item in plan.schedules), ZERO_MONEY)
    plan.remaining_amount = max(decimal_value(plan.total_amount) - plan.paid_amount, ZERO_MONEY)
    plan.status = 'Paid' if plan.remaining_amount <= 0 else 'Active'


def user_can_manage_installments():
    return current_user.is_authenticated and current_user.role in ['Owner', 'Admin', 'Accountant']


def user_can_view_installments():
    return current_user.is_authenticated and current_user.role in ['Owner', 'Admin', 'Accountant', 'Sales']




def save_customer_file(customer, file_storage, document_type):
    if not file_storage or not file_storage.filename:
        return
    if not allowed_photo(file_storage.filename):
        flash('يمكن رفع الصور فقط بصيغة png أو jpg أو jpeg أو webp.', 'warning')
        return

    upload_folder = os.path.join(Config.UPLOAD_FOLDER, 'customers')
    os.makedirs(upload_folder, exist_ok=True)
    original_name = secure_filename(file_storage.filename)
    extension = original_name.rsplit('.', 1)[1].lower()
    filename = f'{uuid4().hex}.{extension}'
    file_storage.save(os.path.join(upload_folder, filename))
    db.session.add(CustomerDocument(
        customer_id=customer.id,
        document_type=document_type,
        filename=filename,
        original_filename=original_name
    ))


def save_customer_documents(customer):
    save_customer_file(customer, request.files.get('id_front_image'), 'id_front')
    save_customer_file(customer, request.files.get('id_back_image'), 'id_back')
    for file_storage in request.files.getlist('document_photos'):
        save_customer_file(customer, file_storage, 'document_photo')


def customer_uploads_are_images():
    files = [
        request.files.get('id_front_image'),
        request.files.get('id_back_image'),
        *request.files.getlist('document_photos'),
    ]
    return all(not file_storage or not file_storage.filename or allowed_photo(file_storage.filename) for file_storage in files)


def ensure_branches():
    for name, is_main in DEFAULT_BRANCHES:
        branch = Branch.query.filter_by(name=name).first()
        if not branch:
            branch = Branch(name=name, is_main=is_main)
            db.session.add(branch)
        else:
            branch.is_main = is_main
    db.session.commit()
    main_branch = Branch.query.filter_by(is_main=True).first()
    if main_branch:
        for model in [Car, Customer, Sale, Purchase, Expense, InstallmentPlan, InstallmentSchedule, Payment, Transaction, User]:
            if hasattr(model, 'branch_id'):
                model.query.filter(model.branch_id.is_(None)).update({'branch_id': main_branch.id}, synchronize_session=False)
        User.query.filter(User.role == 'Owner').update({'can_access_all_branches': True}, synchronize_session=False)
        db.session.commit()


def _is_postgres() -> bool:
    url = str(db.engine.url)
    return url.startswith('postgresql') or url.startswith('postgres')


def _existing_columns(table_name: str) -> set:
    """يرجع أسماء أعمدة الجدول — يدعم SQLite وPostgreSQL."""
    if _is_postgres():
        rows = db.session.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t"
        ), {'t': table_name}).fetchall()
        return {r[0] for r in rows}
    else:
        rows = db.session.execute(text(f'PRAGMA table_info("{table_name}")'))
        return {row[1] for row in rows}


def ensure_table_columns(table_name, columns):
    """يضيف الأعمدة الناقصة فقط — يتجاهل الموجودة بصمت."""
    existing = _existing_columns(table_name)
    for column_name, sqlite_stmt in columns.items():
        if column_name not in existing:
            # تحويل SQLite ALTER إلى PostgreSQL إذا لزم
            stmt = sqlite_stmt
            try:
                db.session.execute(text(stmt))
                db.session.commit()
            except Exception:
                db.session.rollback()


def ensure_role_permissions():
    for role, permissions in DEFAULT_ROLE_PERMISSIONS.items():
        for permission in permissions:
            exists = RolePermission.query.filter_by(role=role, permission=permission).first()
            if not exists:
                db.session.add(RolePermission(role=role, permission=permission))
    db.session.commit()


def _default_data_seeding_enabled():
    marker = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        '.preserve_empty_database',
    )
    return not os.path.exists(marker)


def ensure_database_schema():
    seed_defaults = _default_data_seeding_enabled()
    db.create_all()
    ensure_table_columns('car', {
        'branch_id': "ALTER TABLE car ADD COLUMN branch_id INTEGER",
        'trim': "ALTER TABLE car ADD COLUMN trim VARCHAR(128)",
        'condition': "ALTER TABLE car ADD COLUMN condition VARCHAR(32) NOT NULL DEFAULT 'New'",
        'plate_status': "ALTER TABLE car ADD COLUMN plate_status VARCHAR(64)",
        'engine_size': "ALTER TABLE car ADD COLUMN engine_size VARCHAR(32)",
        'cylinders': "ALTER TABLE car ADD COLUMN cylinders INTEGER",
        'transmission': "ALTER TABLE car ADD COLUMN transmission VARCHAR(64)",
        'fuel_type': "ALTER TABLE car ADD COLUMN fuel_type VARCHAR(64)",
        'import_country': "ALTER TABLE car ADD COLUMN import_country VARCHAR(128)",
        'seat_count': "ALTER TABLE car ADD COLUMN seat_count INTEGER",
        'seat_material': "ALTER TABLE car ADD COLUMN seat_material VARCHAR(64)",
        'currency': "ALTER TABLE car ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
    })
    ensure_table_columns('sale', {
        'branch_id': "ALTER TABLE sale ADD COLUMN branch_id INTEGER",
        'currency': "ALTER TABLE sale ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
        'status': "ALTER TABLE sale ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Active'",
        'cancel_reason': "ALTER TABLE sale ADD COLUMN cancel_reason TEXT",
        'cancelled_at': "ALTER TABLE sale ADD COLUMN cancelled_at DATETIME",
        'sales_rep_id': "ALTER TABLE sale ADD COLUMN sales_rep_id INTEGER",
        'sales_rep_name': "ALTER TABLE sale ADD COLUMN sales_rep_name VARCHAR(128)",
        'sales_rep_phone': "ALTER TABLE sale ADD COLUMN sales_rep_phone VARCHAR(32)",
        'sales_rep_id_number': "ALTER TABLE sale ADD COLUMN sales_rep_id_number VARCHAR(64)",
        'sales_rep_title': "ALTER TABLE sale ADD COLUMN sales_rep_title VARCHAR(128)",
        'sales_rep_address': "ALTER TABLE sale ADD COLUMN sales_rep_address VARCHAR(256)",
    })
    # Ensure showroom info exists with default values
    try:
        if seed_defaults and not ShowroomInfo.query.first():
            db.session.add(ShowroomInfo(
                name='معرض الأصدقاء لتجارة السيارات الحديثة',
                address='بغداد / الكريعات / شارع الوقت السني / قرب كلية القانون',
                phone_numbers='07719681434;07718752333;07852525256'
            ))
            db.session.commit()
    except Exception:
        db.session.rollback()
    ensure_table_columns('purchase', {
        'branch_id': "ALTER TABLE purchase ADD COLUMN branch_id INTEGER",
        'currency': "ALTER TABLE purchase ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
        'status': "ALTER TABLE purchase ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Active'",
        'cancel_reason': "ALTER TABLE purchase ADD COLUMN cancel_reason TEXT",
        'cancelled_at': "ALTER TABLE purchase ADD COLUMN cancelled_at DATETIME",
    })
    ensure_table_columns('payment', {
        'branch_id': "ALTER TABLE payment ADD COLUMN branch_id INTEGER",
        'currency': "ALTER TABLE payment ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
        'installment_schedule_id': "ALTER TABLE payment ADD COLUMN installment_schedule_id INTEGER",
    })
    ensure_table_columns('user', {
        'branch_id':              'ALTER TABLE "user" ADD COLUMN "branch_id" INTEGER',
        'can_access_all_branches':'ALTER TABLE "user" ADD COLUMN "can_access_all_branches" BOOLEAN NOT NULL DEFAULT false',
        'is_active_user':         'ALTER TABLE "user" ADD COLUMN "is_active_user" BOOLEAN NOT NULL DEFAULT true',
    })
    ensure_table_columns('customer', {
        'branch_id': "ALTER TABLE customer ADD COLUMN branch_id INTEGER",
        'full_name': "ALTER TABLE customer ADD COLUMN full_name VARCHAR(128)",
        'id_type': "ALTER TABLE customer ADD COLUMN id_type VARCHAR(64)",
        'id_issue_date': "ALTER TABLE customer ADD COLUMN id_issue_date DATETIME",
        'id_expiry_date': "ALTER TABLE customer ADD COLUMN id_expiry_date DATETIME",
        'nationality': "ALTER TABLE customer ADD COLUMN nationality VARCHAR(64)",
        'date_of_birth': "ALTER TABLE customer ADD COLUMN date_of_birth DATETIME",
    })
    ensure_table_columns('expense', {
        'branch_id': "ALTER TABLE expense ADD COLUMN branch_id INTEGER",
        'currency': "ALTER TABLE expense ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
    })
    ensure_table_columns('transaction', {
        'branch_id': 'ALTER TABLE "transaction" ADD COLUMN branch_id INTEGER',
        'currency': "ALTER TABLE \"transaction\" ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
    })
    ensure_table_columns('installment_plan', {
        'branch_id': "ALTER TABLE installment_plan ADD COLUMN branch_id INTEGER",
        'currency': "ALTER TABLE installment_plan ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
    })
    ensure_table_columns('installment_schedule', {
        'branch_id': "ALTER TABLE installment_schedule ADD COLUMN branch_id INTEGER",
        'currency': "ALTER TABLE installment_schedule ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'",
    })
    db.session.execute(text("UPDATE car SET condition = 'New' WHERE condition IS NULL OR condition = ''"))
    db.session.execute(text("UPDATE car SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE customer SET full_name = name WHERE full_name IS NULL OR full_name = ''"))
    db.session.execute(text("UPDATE sale SET status = 'Active' WHERE status IS NULL OR status = ''"))
    db.session.execute(text("UPDATE sale SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE purchase SET status = 'Active' WHERE status IS NULL OR status = ''"))
    db.session.execute(text("UPDATE purchase SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE payment SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE expense SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE \"transaction\" SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE installment_plan SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text("UPDATE installment_schedule SET currency = 'USD' WHERE currency IS NULL OR currency = ''"))
    db.session.execute(text('UPDATE "user" SET is_active_user = TRUE WHERE is_active_user IS NULL'))
    ensure_table_columns('account', {
        'classification': "ALTER TABLE account ADD COLUMN classification VARCHAR(64)",
        'is_active': "ALTER TABLE account ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true",
    })
    db.session.execute(text("UPDATE account SET is_active = TRUE WHERE is_active IS NULL"))
    db.session.commit()
    if seed_defaults:
        ensure_branches()
    ensure_role_permissions()
    try:
        from .seed_chart_of_accounts import seed_chart_of_accounts, assign_classifications
        if seed_defaults:
            seed_chart_of_accounts()
            assign_classifications()
    except Exception:
        db.session.rollback()
    _apply_migrations()
    _run_startup_checks()


def _apply_migrations() -> None:
    """Add new columns / alter types — SQLite و PostgreSQL."""
    from sqlalchemy import text

    # ── أعمدة جديدة (تعمل على SQLite وPostgreSQL) ─────────────────────
    _new_cols = [
        ('journal_entry',      'reference_number', 'VARCHAR(32)'),
        ('journal_entry',      'status',           "VARCHAR(16) NOT NULL DEFAULT 'posted'"),
        ('journal_entry',      'reversal_of_id',   'INTEGER'),
        ('journal_entry',      'posted_by_id',     'INTEGER'),
        ('journal_entry',      'posted_at',        'TIMESTAMP'),
        ('journal_entry',      'cost_center_id',   'INTEGER'),
        ('journal_entry',      'branch_id',        'INTEGER'),
        ('journal_entry_line', 'description',      'TEXT'),
        ('account',            'branch_id',        'INTEGER'),
        ('voucher',            'branch_id',        'INTEGER'),
        ('voucher',            'reversal_of_id',   'INTEGER'),
        ('cashbox_close',      'branch_id',        'INTEGER'),
        ('cashbox_close',      'closed_by_id',     'INTEGER'),
    ]
    for tbl, col, col_type in _new_cols:
        if col not in _existing_columns(tbl):
            try:
                db.session.execute(text(f'ALTER TABLE "{tbl}" ADD COLUMN "{col}" {col_type}'))
                db.session.commit()
            except Exception:
                db.session.rollback()

    # ── تعديل أنواع (PostgreSQL فقط) ─────────────────────────────────
    if _is_postgres():
        for tbl, col, new_type in [('user', 'password_hash', 'VARCHAR(512)')]:
            try:
                db.session.execute(text(f'ALTER TABLE "{tbl}" ALTER COLUMN "{col}" TYPE {new_type}'))
                db.session.commit()
            except Exception:
                db.session.rollback()


_DEFAULT_COST_CENTERS = [
    ('المعرض الرئيسي', 'MAIN'),
    ('معرض الأصدقاء',  'AL-ASQ1'),
    ('معرض الأصدقاء 2', 'AL-ASQ2'),
    ('التسويق',        'MKT'),
    ('الإدارة',        'ADMIN'),
]


def _seed_cost_centers() -> None:
    """Create default cost centers if none exist."""
    if CostCenter.query.count() == 0:
        for name, code in _DEFAULT_COST_CENTERS:
            db.session.add(CostCenter(name=name, code=code))
        db.session.commit()


def _run_startup_checks() -> None:
    """Log diagnostic warnings at startup. Does NOT block startup on failure."""
    import logging as _logging
    logger = _logging.getLogger('startup_checks')

    # 1. Chart of accounts populated?
    acct_count = Account.query.count()
    if acct_count < 50:
        logger.warning('STARTUP: Chart of accounts may be incomplete (%d accounts found, expected ≥50).', acct_count)

    # 2. Unbalanced journal entries?
    tolerance = 0.01
    unbalanced = []
    for je in JournalEntry.query.all():
        debit = sum((decimal_value(line.debit) for line in je.lines), ZERO_MONEY)
        credit = sum((decimal_value(line.credit) for line in je.lines), ZERO_MONEY)
        if abs(debit - credit) > tolerance:
            unbalanced.append(je.id)
    if unbalanced:
        logger.warning(
            'STARTUP: %d unbalanced journal entr%s found: %s',
            len(unbalanced), 'y' if len(unbalanced) == 1 else 'ies', unbalanced[:10]
        )
    else:
        logger.info('STARTUP: All journal entries are balanced.')

    # 3. Trial balance balanced?
    try:
        from .accounting import get_trial_balance
        _, totals = get_trial_balance()
        td = decimal_value(totals.get('total_debit', 0))
        tc = decimal_value(totals.get('total_credit', 0))
        if abs(td - tc) > tolerance:
            logger.warning('STARTUP: Trial balance is UNBALANCED (Δ %.2f IQD).', td - tc)
        else:
            logger.info('STARTUP: Trial balance is balanced.')
    except Exception as exc:
        logger.warning('STARTUP: Could not verify trial balance: %s', exc)


def get_role_permissions(role):
    permissions = RolePermission.query.filter_by(role=role).all()
    if permissions:
        return {item.permission for item in permissions}
    return set(DEFAULT_ROLE_PERMISSIONS.get(role, []))


def has_permission(permission):
    if not current_user.is_authenticated:
        return False
    if current_user.role == 'Owner':
        return True
    role_permissions = get_role_permissions(current_user.role)
    if permission == 'manage_backups':
        return 'manage_backups' in role_permissions or 'manage_backup' in role_permissions
    if permission == 'manage_backup':
        return 'manage_backup' in role_permissions or 'manage_backups' in role_permissions
    return permission in role_permissions


def get_main_branch():
    return Branch.query.filter_by(is_main=True).first()


def can_access_all_branches():
    if not current_user.is_authenticated:
        return False
    return current_user.role == 'Owner' or bool(getattr(current_user, 'can_access_all_branches', False))


def get_accessible_branches():
    if not current_user.is_authenticated:
        return []
    if can_access_all_branches():
        return Branch.query.order_by(Branch.id.asc()).all()
    if current_user.branch_id:
        branch = Branch.query.get(current_user.branch_id)
        return [branch] if branch else []
    main_branch = get_main_branch()
    return [main_branch] if main_branch else []


def get_selected_branch():
    branches = get_accessible_branches()
    if not branches:
        return None
    selected_id = session.get('branch_id')
    selected = next((branch for branch in branches if branch.id == selected_id), None)
    if selected:
        return selected
    fallback = get_main_branch() if can_access_all_branches() else branches[0]
    if fallback and fallback in branches:
        session['branch_id'] = fallback.id
        return fallback
    session['branch_id'] = branches[0].id
    return branches[0]


def active_branch_id():
    branch = get_selected_branch()
    if not branch:
        return None
    if branch.is_main and can_access_all_branches():
        return None
    return branch.id


def record_branch_id():
    branch = get_selected_branch() or get_main_branch()
    if not branch:
        return None
    if not branch.is_main:
        return branch.id
    if current_user.is_authenticated and current_user.role in ('Owner', 'Admin'):
        return branch.id
    assigned = Branch.query.get(current_user.branch_id) if current_user.is_authenticated and current_user.branch_id else None
    if assigned and not assigned.is_main:
        return assigned.id
    return None


def branch_json(branch):
    if not branch:
        return None
    return {
        'id': branch.id,
        'name': branch.name,
        'is_main': branch.is_main,
        'created_at': branch.created_at.isoformat() if branch.created_at else '',
    }


def selected_branch_scope_id():
    branch = get_selected_branch()
    if not branch:
        return record_branch_id()
    if branch.is_main and can_access_all_branches():
        return None
    return branch.id


def scoped_branch_query(query, model, requested_branch_id=None):
    if not hasattr(model, 'branch_id'):
        return query
    selected = get_selected_branch()
    if selected and selected.is_main and can_access_all_branches():
        if requested_branch_id:
            requested = Branch.query.get(requested_branch_id)
            if requested and not requested.is_main:
                return query.filter(model.branch_id == requested.id)
        return query
    branch_id = selected_branch_scope_id()
    if branch_id is None:
        return query.filter(model.branch_id == -1)
    return query.filter(model.branch_id == branch_id)


def require_creation_branch_id():
    branch_id = record_branch_id()
    if branch_id is None:
        return None, (jsonify({'error': 'يجب اختيار فرع غير رئيسي لإنشاء البيانات، أو استخدام حساب مدير لإنشاء بيانات في الرئيسي'}), 403)
    return branch_id, None


def branch_filter(query, model):
    branch_id = active_branch_id()
    if branch_id is not None and hasattr(model, 'branch_id'):
        query = query.filter(model.branch_id == branch_id)
    elif not can_access_all_branches() and current_user.is_authenticated and hasattr(model, 'branch_id'):
        query = query.filter(model.branch_id == record_branch_id())
    return query


def scoped_query(model):
    return branch_filter(model.query, model)


def branch_allowed(entity):
    if not hasattr(entity, 'branch_id'):
        return True
    selected = get_selected_branch()
    if selected and selected.is_main and can_access_all_branches():
        return True
    branch_id = selected.id if selected else record_branch_id()
    return entity.branch_id == branch_id


    if not branch_allowed(entity):
        flash('لا يمكنك الوصول إلى بيانات فرع آخر.', 'danger')
        return False
    return True


def _parse_money(value, field_name='القيمة'):
    """Parse and quantize a monetary input; return (Decimal, None) or an error response."""
    try:
        return money_value(value), None
    except (InvalidOperation, TypeError, ValueError):
        return None, (jsonify({'error': f'{field_name}: قيمة رقمية غير صحيحة'}), 400)


def _parse_int(value, field_name='القيمة'):
    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, (jsonify({'error': f'{field_name}: قيمة صحيحة غير صحيحة'}), 400)


CURRENT_YEAR = datetime.utcnow().year


def _validate_year(year_val):
    """Return (int, None) or (None, error_response)."""
    parsed, err = _parse_int(year_val, 'سنة الصنع')
    if err:
        return None, err
    if parsed < 1900 or parsed > CURRENT_YEAR + 2:
        return None, (jsonify({'error': f'سنة الصنع يجب أن تكون بين 1900 و{CURRENT_YEAR + 2}'}), 400)
    return parsed, None


def log_action(action, entity_type=None, entity_id=None, details=None):
    user_id = current_user.id if current_user.is_authenticated else None
    db.session.add(AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    ))


def password_hash_fingerprint(password_hash):
    return hashlib.sha256((password_hash or '').encode('utf-8')).hexdigest()


def api_login_required(f):
    """Returns 401 JSON for /api/* routes instead of redirecting to /login."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'غير مصرح', 'message': 'يجب تسجيل الدخول أولاً'}), 401
        expected_fingerprint = password_hash_fingerprint(current_user.password_hash)
        if session.get('password_fingerprint') != expected_fingerprint:
            logout_user()
            session.clear()
            return jsonify({'error': 'Session expired', 'message': 'Password was changed. Please login again.'}), 401
        if not current_user.is_active_user:
            logout_user()
            session.clear()
            return jsonify({'error': 'Account disabled', 'message': 'This account has been disabled.'}), 401
        return f(*args, **kwargs)
    return decorated_function


def api_permission_required(permission):
    """Returns 401/403 JSON for /api/* routes instead of redirecting."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'غير مصرح', 'message': 'يجب تسجيل الدخول أولاً'}), 401
            if not has_permission(permission):
                return jsonify({'error': 'ممنوع', 'message': 'ليس لديك صلاحية للوصول'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ── دوال مساعدة لاختيار حسابات القيود المحاسبية ──────────────────────────

def permission_required(permission):
    """Redirecting permission decorator for regular HTML routes."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('login'))
            if not has_permission(permission):
                flash('ليس لديك صلاحية للوصول إلى هذه الصفحة.', 'danger')
                return redirect(url_for('index'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# تم نقل دوال _acct_* إلى backend/account_map.py — استخدم acct_* من هناك مباشرة.


def _post_sale_journal_entries(sale, car, initial_payment=None) -> None:
    """ينشر قيدي الإيراد + تكلفة البضاعة المباعة لفاتورة بيع (بالدينار العراقي)."""
    from .accounting import create_journal_entry
    revenue_iqd = to_iqd(
        decimal_value(sale.selling_price) - decimal_value(sale.discount),
        sale.currency,
    )
    je_lines: list = []
    if revenue_iqd > 0:
        je_lines.append({'account_code': AR_ACCOUNT, 'debit': revenue_iqd, 'credit': 0})
        je_lines.append({'account_code': acct_sale_revenue(car), 'debit': 0, 'credit': revenue_iqd})
    if je_lines:
        create_journal_entry(entry_date=sale.sale_date, description=f'بيع سيارة #{sale.id} — {sale.invoice_number}',
                             branch_id=sale.branch_id, reference_type='Sale', reference_id=sale.id, lines=je_lines)
    if initial_payment and decimal_value(initial_payment.amount) > 0:
        paid_iqd = to_iqd(initial_payment.amount, initial_payment.currency)
        if paid_iqd > 0:
            create_journal_entry(entry_date=initial_payment.payment_date, description=f'قبض دفعة بيع #{sale.id}',
                                 branch_id=initial_payment.branch_id, reference_type='Payment', reference_id=initial_payment.id, lines=[
                                     {'account_code': acct_cash(initial_payment.payment_method), 'debit': paid_iqd, 'credit': 0},
                                     {'account_code': AR_ACCOUNT, 'debit': 0, 'credit': paid_iqd},
                                 ])
    cost_iqd = to_iqd(car.purchase_price, car.currency)
    if cost_iqd > 0:
        create_journal_entry(entry_date=sale.sale_date, description=f'تكلفة بيع سيارة #{sale.id}',
                             branch_id=sale.branch_id, reference_type='Sale', reference_id=sale.id, lines=[
                                 {'account_code': acct_sale_cogs(car),  'debit': cost_iqd, 'credit': 0},
                                 {'account_code': acct_inventory(car),  'debit': 0,        'credit': cost_iqd},
                             ])


def _post_purchase_journal_entries(purchase, car, initial_payment=None) -> None:
    """ينشر قيد شراء السيارة (مخزون + ذمم دائنة + دفعة) بالدينار العراقي."""
    from .accounting import create_journal_entry
    price_iqd = to_iqd(purchase.purchase_price, purchase.currency)
    if price_iqd <= 0:
        return
    inv_code = acct_inventory(car)
    create_journal_entry(
        entry_date=purchase.purchase_date,
        description=f'شراء سيارة #{purchase.id} — {purchase.invoice_number}',
        branch_id=purchase.branch_id, reference_type='Purchase', reference_id=purchase.id,
        lines=[
            {'account_code': inv_code,   'debit': price_iqd, 'credit': 0},
            {'account_code': AP_ACCOUNT, 'debit': 0,         'credit': price_iqd},
        ],
    )
    if initial_payment and decimal_value(initial_payment.amount) > 0:
        paid_iqd = to_iqd(initial_payment.amount, initial_payment.currency)
        if paid_iqd > 0:
            create_journal_entry(
                entry_date=initial_payment.payment_date,
                description=f'دفع مستحقات شراء #{purchase.id}',
                branch_id=initial_payment.branch_id, reference_type='Payment', reference_id=initial_payment.id,
                lines=[
                    {'account_code': AP_ACCOUNT,                              'debit': paid_iqd, 'credit': 0},
                    {'account_code': acct_cash(initial_payment.payment_method), 'debit': 0,      'credit': paid_iqd},
                ],
            )


def _post_expense_journal_entry(expense, payment_method: str | None = None) -> None:
    """ينشر قيد مصروف."""
    from .accounting import create_journal_entry
    amount_iqd = to_iqd(expense.amount, expense.currency)
    if amount_iqd <= 0:
        return
    acct_code = acct_expense_category(expense.category)
    create_journal_entry(
        entry_date=expense.expense_date,
        description=f'مصروف: {expense.title}',
        branch_id=expense.branch_id, reference_type='Expense', reference_id=expense.id,
        lines=[
            {'account_code': acct_code,               'debit': amount_iqd, 'credit': 0},
            {'account_code': acct_cash(payment_method), 'debit': 0,        'credit': amount_iqd},
        ],
    )


def _post_installment_payment_journal_entry(payment, schedule, plan) -> None:
    """ينشر قيد استلام دفعة قسط."""
    from .accounting import create_journal_entry
    amount_iqd = to_iqd(payment.amount, payment.currency)
    if amount_iqd <= 0:
        return
    create_journal_entry(
        entry_date=payment.payment_date,
        description=f'استلام قسط #{schedule.installment_number} — {plan.sale.invoice_number}',
        branch_id=payment.branch_id, reference_type='Payment', reference_id=payment.id,
        lines=[
            {'account_code': acct_cash(payment.payment_method), 'debit': amount_iqd, 'credit': 0},
            {'account_code': AR_ACCOUNT,                        'debit': 0,           'credit': amount_iqd},
        ],
    )


ACCOUNTING_PROTECTED_REFERENCES = {
    'Sale': Sale,
    'Purchase': Purchase,
    'Payment': Payment,
    'Expense': Expense,
    'Transaction': Transaction,
}


def journal_entries_for_reference(reference_type, reference_id):
    return JournalEntry.query.filter_by(
        reference_type=reference_type,
        reference_id=reference_id,
    ).order_by(JournalEntry.id.asc())


def has_journal_entry(reference_type, reference_id):
    return journal_entries_for_reference(reference_type, reference_id).first() is not None


def protected_accounting_record_label(reference_type, record):
    identifier = getattr(record, 'invoice_number', None) or getattr(record, 'title', None) or getattr(record, 'id', None)
    return f'{reference_type} #{identifier}'


def accounting_protection_message(reference_type, record):
    return (
        f'لا يمكن تعديل أو حذف {protected_accounting_record_label(reference_type, record)} '
        'لأنه مرتبط بقيد محاسبي. استخدم قيداً عكسياً لمعالجة الأثر المحاسبي.'
    )


def accounting_record_is_protected(reference_type, record_id):
    return reference_type in ACCOUNTING_PROTECTED_REFERENCES and has_journal_entry(reference_type, record_id)


def accounting_reference_type_for_model(model):
    for reference_type, protected_model in ACCOUNTING_PROTECTED_REFERENCES.items():
        if model is protected_model:
            return reference_type
    return None


def database_accounting_lock_message(model, record):
    if model in (JournalEntry, JournalEntryLine):
        return 'لا يمكن تعديل أو حذف القيود المحاسبية أو سطورها مباشرة. استخدم قيداً عكسياً.'
    if model is Account and JournalEntryLine.query.filter_by(account_id=record.id).first():
        return 'لا يمكن تعديل أو حذف حساب مستخدم في القيود المحاسبية.'
    reference_type = accounting_reference_type_for_model(model)
    if reference_type and has_journal_entry(reference_type, record.id):
        return accounting_protection_message(reference_type, record)
    return None


def _auto_sync_exchange_rate(app):
    """جلب سعر الصرف تلقائياً إذا كان آخر تحديث قبل أكثر من 24 ساعة."""
    with app.app_context():
        try:
            current = ExchangeRate.query.order_by(
                ExchangeRate.updated_at.desc(), ExchangeRate.id.desc()
            ).first()
            if current and current.updated_at:
                age_hours = (datetime.utcnow() - current.updated_at).total_seconds() / 3600
                if age_hours < 24:
                    return
            rate_value = fetch_online_exchange_rate()
            db.session.add(ExchangeRate(
                rate=rate_value,
                source='online',
                updated_at=datetime.utcnow(),
                updated_by='نظام',
            ))
            db.session.commit()
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass


def _auto_refresh_installments(app):
    with app.app_context():
        try:
            plans = InstallmentPlan.query.filter_by(status='Active').all()
            for plan in plans:
                refresh_installment_plan(plan)
            if plans:
                db.session.commit()
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass


def _cleanup_old_logs(_app):
    logs_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    cutoff = datetime.utcnow() - timedelta(days=30)
    try:
        for entry in os.scandir(logs_dir):
            if entry.is_file() and entry.name.endswith('.log'):
                try:
                    mtime = datetime.utcfromtimestamp(entry.stat().st_mtime)
                    if mtime < cutoff:
                        os.remove(entry.path)
                except Exception:
                    pass
    except Exception:
        pass


def _scheduled_integrity_check(app):
    with app.app_context():
        try:
            report = build_accounting_integrity_report()
            total_issues = sum(len(v) for v in report.values())
            app.logger.info('[integrity] daily check: %d issue(s) found', total_issues)
        except Exception:
            pass


def _auto_calculate_monthly_commissions(app):
    with app.app_context():
        try:
            today = datetime.utcnow().date()
            first_this_month = today.replace(day=1)
            prev_month_end = first_this_month - timedelta(days=1)
            prev_month_start = prev_month_end.replace(day=1)
            start_dt = datetime(prev_month_start.year, prev_month_start.month, prev_month_start.day)
            end_dt = datetime(first_this_month.year, first_this_month.month, first_this_month.day)
            sales = Sale.query.filter(
                Sale.sales_rep_id.isnot(None),
                Sale.sale_date >= start_dt,
                Sale.sale_date < end_dt,
                Sale.status != 'Cancelled',
            ).all()
            created = 0
            for sale in sales:
                exists = EmployeeCommission.query.filter_by(
                    sale_id=sale.id, employee_id=sale.sales_rep_id
                ).first()
                if not exists:
                    db.session.add(EmployeeCommission(
                        employee_id=sale.sales_rep_id,
                        sale_id=sale.id,
                        branch_id=sale.branch_id,
                        commission_rate=0.0,
                        commission_amount=0.0,
                        currency=sale.currency,
                        is_paid=False,
                    ))
                    created += 1
            if created:
                db.session.commit()
                app.logger.info(
                    '[commissions] created %d record(s) for %s',
                    created, prev_month_start.strftime('%Y-%m')
                )
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass


def start_daily_backup_scheduler(app):
    if app.config.get('_DAILY_BACKUP_SCHEDULER_STARTED'):
        return
    app.config['_DAILY_BACKUP_SCHEDULER_STARTED'] = True

    def worker():
        last_daily_run = None
        last_monthly_run = None
        while True:
            try:
                with app.app_context():
                    ensure_daily_backup(created_by='system')
            except Exception:
                try:
                    db.session.rollback()
                except Exception:
                    pass
            _auto_sync_exchange_rate(app)
            _auto_refresh_installments(app)
            today = datetime.utcnow().date()
            if last_daily_run != today:
                _cleanup_old_logs(app)
                _scheduled_integrity_check(app)
                last_daily_run = today
            if today.day == 1 and last_monthly_run != (today.year, today.month):
                _auto_calculate_monthly_commissions(app)
                last_monthly_run = (today.year, today.month)
            time.sleep(3600)

    thread = threading.Thread(target=worker, name='daily-backup-scheduler', daemon=True)
    thread.start()


def build_accounting_integrity_report():
    tolerance = 0.01
    issues = {
        'unbalanced_journal_entries': [],
        'journal_lines_missing_accounts': [],
        'operations_missing_journal_entries': [],
    }

    entries = JournalEntry.query.order_by(JournalEntry.id.asc()).all()
    for entry in entries:
        total_debit = money_value(sum((decimal_value(line.debit) for line in entry.lines), ZERO_MONEY))
        total_credit = money_value(sum((decimal_value(line.credit) for line in entry.lines), ZERO_MONEY))
        difference = money_value(total_debit - total_credit)
        if abs(difference) > tolerance:
            issues['unbalanced_journal_entries'].append({
                'id': entry.id,
                'entry_date': entry.entry_date.isoformat() if entry.entry_date else None,
                'description': entry.description,
                'reference_type': entry.reference_type,
                'reference_id': entry.reference_id,
                'total_debit': total_debit,
                'total_credit': total_credit,
                'difference': difference,
            })

    missing_account_lines = (
        db.session.query(JournalEntryLine)
        .outerjoin(Account, JournalEntryLine.account_id == Account.id)
        .filter(Account.id.is_(None))
        .order_by(JournalEntryLine.id.asc())
        .all()
    )
    for line in missing_account_lines:
        issues['journal_lines_missing_accounts'].append({
            'line_id': line.id,
            'journal_entry_id': line.journal_entry_id,
            'account_id': line.account_id,
            'debit': float(line.debit or 0),
            'credit': float(line.credit or 0),
        })

    def add_missing(reference_type, record, label):
        if not has_journal_entry(reference_type, record.id):
            issues['operations_missing_journal_entries'].append({
                'reference_type': reference_type,
                'id': record.id,
                'label': label,
                'branch_id': getattr(record, 'branch_id', None),
                'created_at': record.created_at.isoformat() if getattr(record, 'created_at', None) else None,
                'status': getattr(record, 'status', None),
            })

    for sale in Sale.query.filter(Sale.status != 'Cancelled').order_by(Sale.id.asc()).all():
        add_missing('Sale', sale, sale.invoice_number)
    for purchase in Purchase.query.filter(Purchase.status != 'Cancelled').order_by(Purchase.id.asc()).all():
        add_missing('Purchase', purchase, purchase.invoice_number)
    for payment in Payment.query.order_by(Payment.id.asc()).all():
        add_missing('Payment', payment, f'{payment.payment_type} payment #{payment.id}')
    for expense in Expense.query.order_by(Expense.id.asc()).all():
        add_missing('Expense', expense, expense.title)

    issue_counts = {key: len(value) for key, value in issues.items()}
    total_issues = sum(issue_counts.values())
    return {
        'checked_at': datetime.utcnow().isoformat(timespec='seconds'),
        'status': 'ok' if total_issues == 0 else 'attention',
        'issue_counts': issue_counts,
        'total_issues': total_issues,
        'issues': issues,
    }




def get_database_models():
    models = {}
    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        table_name = getattr(model, '__tablename__', None)
        if table_name:
            models[table_name] = model
    return dict(sorted(models.items()))


def get_database_model(table_name):
    return get_database_models().get(table_name)


def get_model_columns(model):
    return list(sa_inspect(model).columns)


def get_primary_key_column(model):
    primary_key = sa_inspect(model).primary_key
    return primary_key[0] if primary_key else None


def database_table_label(table_name):
    return DATABASE_MODEL_LABELS.get(table_name, table_name)


def database_column_label(column_name):
    return DATABASE_COLUMN_LABELS.get(column_name, column_name)


def is_string_column(column):
    try:
        return column.type.python_type is str
    except NotImplementedError:
        return False


def database_input_type(column):
    if isinstance(column.type, Boolean):
        return 'checkbox'
    if isinstance(column.type, SQLDateTime):
        return 'datetime-local'
    if isinstance(column.type, Date):
        return 'date'
    if isinstance(column.type, (Integer, Float, Numeric)):
        return 'number'
    if getattr(column.type, 'length', 0) and column.type.length and column.type.length > 180:
        return 'textarea'
    if column.name in ['notes', 'details', 'description', 'cancel_reason', 'password_hash']:
        return 'textarea'
    return 'text'


def format_database_value(value, for_form=False):
    if value is None:
        return ''
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%dT%H:%M') if for_form else value.strftime('%Y-%m-%d %H:%M')
    if hasattr(value, 'strftime'):
        return value.strftime('%Y-%m-%d')
    if isinstance(value, bool):
        return '1' if value else '0'
    return str(value)


def database_form_value(record, column):
    if record is None:
        if column.name == 'branch_id':
            return record_branch_id() or ''
        return ''
    return format_database_value(getattr(record, column.name), for_form=True)


def parse_database_value(column, value):
    if isinstance(column.type, Boolean):
        return str(value).lower() in ['1', 'true', 'on', 'yes', 'نعم']

    if value == '':
        return None

    if isinstance(column.type, Integer):
        return int(value)
    if isinstance(column.type, (Float, Numeric)):
        return float(value)
    if isinstance(column.type, SQLDateTime):
        for date_format in ['%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d']:
            try:
                parsed = datetime.strptime(value, date_format)
                if date_format == '%Y-%m-%d':
                    return parsed.replace(hour=0, minute=0, second=0)
                return parsed
            except ValueError:
                continue
        return datetime.fromisoformat(value)
    if isinstance(column.type, Date):
        return datetime.strptime(value, '%Y-%m-%d').date()
    return value



def apply_database_form(record, model):
    columns = get_model_columns(model)
    changed_fields = []
    for column in columns:
        if column.primary_key:
            continue
        if column.name in _DB_FORM_PROTECTED_COLUMNS:
            continue
        raw_value = request.form.get(column.name, '')
        old_value = getattr(record, column.name, None)
        new_value = parse_database_value(column, raw_value)
        if old_value != new_value:
            setattr(record, column.name, new_value)
            changed_fields.append(column.name)
    return changed_fields


def database_search_filter(query, model, search, filter_column, filter_value):
    columns = {column.name: column for column in get_model_columns(model)}
    if search:
        expressions = []
        for column in columns.values():
            model_column = getattr(model, column.name)
            if is_string_column(column):
                expressions.append(model_column.ilike(f'%{search}%'))
        if expressions:
            query = query.filter(or_(*expressions))

    if filter_column and filter_value and filter_column in columns:
        column = columns[filter_column]
        model_column = getattr(model, column.name)
        if is_string_column(column):
            query = query.filter(model_column.ilike(f'%{filter_value}%'))
        else:
            try:
                query = query.filter(model_column == parse_database_value(column, filter_value))
            except (ValueError, TypeError):
                query = query.filter(text('1 = 0'))
    return query


# ── Rate limiting (in-memory, no external dependency) ─────────────────────
_rl_lock     = threading.Lock()
_rl_window   = 60        # seconds
_rl_max      = 10        # attempts per window per IP
_rl_buckets: dict = defaultdict(list)   # ip → [datetime, ...]

def _check_rate_limit(ip: str) -> bool:
    """Return True if the request is allowed, False if the IP is over the limit."""
    now    = datetime.utcnow()
    cutoff = now - timedelta(seconds=_rl_window)
    with _rl_lock:
        _rl_buckets[ip] = [t for t in _rl_buckets[ip] if t > cutoff]
        if len(_rl_buckets[ip]) >= _rl_max:
            return False
        _rl_buckets[ip].append(now)
        return True


# ── Account lockout (in-memory) ────────────────────────────────────────────
_lo_lock         = threading.Lock()
_lo_max_failures = 5
_lo_ban_minutes  = 15
_lo_state: dict  = {}   # username → {'count': int, 'locked_until': datetime|None}

def _is_locked_out(username: str):
    """Return (locked: bool, seconds_remaining: int).

    Checks in-memory state first (fast path), then falls back to the DB
    so lockouts survive server restarts.
    """
    now = datetime.utcnow()
    with _lo_lock:
        s = _lo_state.get(username)
        if s:
            until = s.get('locked_until')
            if until and now < until:
                return True, int((until - now).total_seconds())
            return False, 0
    # In-memory has no record — check DB for recent failures (post-restart recovery)
    try:
        window = now - timedelta(minutes=_lo_ban_minutes)
        recent_failures = LoginAttempt.query.filter(
            LoginAttempt.username == username,
            LoginAttempt.success.is_(False),
            LoginAttempt.attempted_at >= window,
        ).count()
        if recent_failures >= _lo_max_failures:
            # Find the most recent failure to compute remaining lockout time
            latest = LoginAttempt.query.filter(
                LoginAttempt.username == username,
                LoginAttempt.success.is_(False),
            ).order_by(LoginAttempt.attempted_at.desc()).first()
            if latest:
                lock_until = latest.attempted_at + timedelta(minutes=_lo_ban_minutes)
                if now < lock_until:
                    secs = int((lock_until - now).total_seconds())
                    # Restore in-memory state so subsequent calls are fast
                    with _lo_lock:
                        _lo_state[username] = {'count': recent_failures, 'locked_until': lock_until}
                    return True, secs
    except Exception:
        pass
    return False, 0

def _record_failure(username: str):
    now = datetime.utcnow()
    with _lo_lock:
        s = _lo_state.setdefault(username, {'count': 0, 'locked_until': None})
        until = s.get('locked_until')
        if until and now >= until:          # expired ban — reset counter
            s['count'] = 0
            s['locked_until'] = None
        s['count'] += 1
        if s['count'] >= _lo_max_failures:
            s['locked_until'] = now + timedelta(minutes=_lo_ban_minutes)
    # Persist to DB so lockout state survives server restarts
    try:
        from flask import request as _req
        ip = (_req.remote_addr or '127.0.0.1') if _req else '127.0.0.1'
        db.session.add(LoginAttempt(ip_address=ip, username=username, success=False))
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass

def _record_success(username: str):
    with _lo_lock:
        _lo_state.pop(username, None)
    # Mark success in DB and clean old failures for this username
    try:
        from flask import request as _req
        ip = (_req.remote_addr or '127.0.0.1') if _req else '127.0.0.1'
        db.session.add(LoginAttempt(ip_address=ip, username=username, success=True))
        cutoff = datetime.utcnow() - timedelta(hours=24)
        LoginAttempt.query.filter(
            LoginAttempt.username == username,
            LoginAttempt.attempted_at < cutoff,
        ).delete()
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass


def _configure_file_logging(app: 'Flask') -> None:
    """Attach a rotating file handler (ERROR level) to the Flask app logger.
    Also installs a BufferingHandler that feeds _error_log_buffer so the last
    50 errors are accessible without reading the log file.
    """
    log_dir = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, 'app.log')

    # Custom JSON formatter for Cloud / Production mode
    class _JSONFormatter(logging.Formatter):
        def format(self, record):
            log_record = {
                'timestamp': self.formatTime(record, '%Y-%m-%d %H:%M:%S'),
                'level':     record.levelname,
                'logger':    record.name,
                'message':   record.getMessage(),
                'filename':  record.filename,
                'line':      record.lineno,
            }
            if record.exc_info:
                log_record['exception'] = self.formatException(record.exc_info)
            return json.dumps(log_record, ensure_ascii=False)

    if Config.CLOUD_MODE:
        fmt = _JSONFormatter()
    else:
        fmt = logging.Formatter('[%(asctime)s] %(levelname)s %(name)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

    # Rotating file handler — max 1 MB, keep 3 backups
    file_handler = logging.handlers.RotatingFileHandler(
        log_path, maxBytes=1_048_576, backupCount=3, encoding='utf-8'
    )
    file_handler.setLevel(logging.ERROR)
    file_handler.setFormatter(fmt)

    # In-memory buffer handler (ERROR+)
    class _BufferHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            _error_log_buffer.append({
                'timestamp': (self.formatter or logging.Formatter()).formatTime(record, '%Y-%m-%d %H:%M:%S'),
                'level':     record.levelname,
                'logger':    record.name,
                'message':   record.getMessage(),
            })

    buffer_handler = _BufferHandler(logging.ERROR)
    buffer_handler.setFormatter(fmt)

    app.logger.setLevel(logging.WARNING)
    app.logger.addHandler(file_handler)
    app.logger.addHandler(buffer_handler)


def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder=Config.STATIC_FOLDER)
    app.config.from_object(Config)

    # Serialize Decimal values (from NUMERIC columns) as floats in JSON responses.
    from flask.json.provider import DefaultJSONProvider

    class _DecimalJSONProvider(DefaultJSONProvider):
        def default(self, o):
            if isinstance(o, Decimal):
                return float(o)
            return super().default(o)

    app.json_provider_class = _DecimalJSONProvider
    app.json = _DecimalJSONProvider(app)

    db.init_app(app)
    _configure_file_logging(app)

    # ── Reverse-proxy support (Cloudflare Tunnel / Nginx) ─────────────────────
    if Config.PROXY_FIX_X_FOR or Config.PROXY_FIX_X_PROTO:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=Config.PROXY_FIX_X_FOR,
            x_proto=Config.PROXY_FIX_X_PROTO,
            x_host=Config.PROXY_FIX_X_HOST,
        )

    @app.errorhandler(413)
    def request_too_large(_e):
        return jsonify({'error': 'حجم الملف تجاوز الحد المسموح به (10 ميغابايت)'}), 413

    # ── CSRF protection ───────────────────────────────────────────────────────
    # Paths that must be reachable before a CSRF token can exist in the session.
    _CSRF_EXEMPT = frozenset({'/api/auth/login'})

    @app.before_request
    def _csrf_ensure_token():
        """Seed a CSRF token into every new session on GET requests."""
        if request.method == 'GET' and 'csrf_token' not in session:
            session['csrf_token'] = secrets.token_hex(32)

    @app.before_request
    def _csrf_validate():
        """Reject state-changing requests whose CSRF token doesn't match the session."""
        if app.config.get('TESTING'):
            return
        if request.method not in ('POST', 'PUT', 'DELETE', 'PATCH'):
            return
        if request.path in _CSRF_EXEMPT:
            return
        session_token = session.get('csrf_token', '')
        if not session_token:
            # No session yet — auth layer will return 401; don't double-error here.
            return
        submitted = request.headers.get('X-XSRF-TOKEN', '')
        if not submitted or not hmac.compare_digest(session_token, submitted):
            return jsonify({'error': 'طلب غير مصرح به'}), 403

    @app.after_request
    def add_local_cors_headers(response):
        origin = request.headers.get('Origin')
        allowed_origins = {
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
        } | Config.ALLOWED_ORIGINS_EXTRA          # ← Cloudflare / custom origins
        if origin and origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = (
                'Content-Type, Authorization, X-XSRF-TOKEN'
            )
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'

        # Security hardening headers
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-XSS-Protection', '1; mode=block')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=()',
        )
        response.headers.setdefault(
            'Content-Security-Policy',
            "default-src 'none'; frame-ancestors 'none'",
        )
        if Config.CLOUD_MODE:
            response.headers.setdefault(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains',
            )

        # Set XSRF-TOKEN cookie so the frontend (Axios) can read and echo it back
        csrf_token = session.get('csrf_token')
        if csrf_token:
            response.set_cookie(
                'XSRF-TOKEN',
                csrf_token,
                httponly=False,      # JS must be able to read this cookie
                samesite='Lax',
                secure=Config.CLOUD_MODE,
                path='/',
            )
        return response

    @app.route('/__cors/<path:_cors_path>', methods=['OPTIONS'])
    def api_options(_cors_path):
        return ('', 204)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    with app.app_context():
        db.create_all()
        ensure_database_schema()
        if _default_data_seeding_enabled():
            _seed_cost_centers()
        ensure_daily_backup(created_by='system')
    start_daily_backup_scheduler(app)



    @app.route('/branch/switch', methods=['POST'])
    @api_login_required
    def switch_branch():
        branch_id = request.form.get('branch_id', type=int)
        branch = Branch.query.get(branch_id)
        wants_json = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.accept_mimetypes.accept_json
        if not branch or branch not in get_accessible_branches():
            if wants_json:
                return jsonify({'error': 'لا يمكنك اختيار هذا الفرع'}), 403
            flash('لا يمكنك اختيار هذا الفرع.', 'danger')
            return redirect(request.referrer or '/')
        session['branch_id'] = branch.id
        if wants_json:
            return jsonify({'active_branch': branch_json(branch)})
        flash(f'تم التبديل إلى فرع {branch.name}.', 'success')
        return redirect(request.referrer or '/')


    # --- JSON API endpoints (read-only, enforce permissions and branch filtering) ---
    @app.route('/api/dashboard')
    @api_login_required
    @api_permission_required('view_dashboard')
    def api_dashboard():
        from sqlalchemy.orm import joinedload as _joinedload

        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)
        after_2_days = today + timedelta(days=2)
        after_7_days = today + timedelta(days=7)
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        # سعر الصرف مرة واحدة فقط
        rate = exchange_rate_value() or Decimal('1')

        def _iqd(amount, currency):
            if not amount:
                return ZERO_MONEY
            return (
                money_value(amount)
                if (currency or 'USD') == 'IQD'
                else money_value(decimal_value(amount) * rate)
            )

        def _sum_rows(rows):
            return sum(_iqd(amt, cur) for cur, amt in rows)

        # ── مبيعات ────────────────────────────────────────────────────
        active_sales_q = scoped_query(Sale).filter(Sale.status != 'Cancelled')

        sales_total_rows = active_sales_q.with_entities(
            Sale.currency, func.sum(Sale.paid_amount)
        ).group_by(Sale.currency).all()
        total_sales_paid = _sum_rows(sales_total_rows)

        sales_count_rows = active_sales_q.with_entities(func.count(Sale.id)).scalar() or 0

        monthly_sales_rows = active_sales_q.filter(Sale.sale_date >= month_start).with_entities(
            Sale.currency, func.sum(Sale.paid_amount)
        ).group_by(Sale.currency).all()
        monthly_sales_paid = _sum_rows(monthly_sales_rows)

        cars_sold_month = active_sales_q.filter(Sale.sale_date >= month_start).with_entities(
            func.count(Sale.id)
        ).scalar() or 0

        annual_sales_rows = active_sales_q.filter(Sale.sale_date >= year_start).with_entities(
            Sale.currency, func.sum(Sale.paid_amount)
        ).group_by(Sale.currency).all()
        annual_sales_paid = _sum_rows(annual_sales_rows)

        # ── مشتريات ───────────────────────────────────────────────────
        active_purchases_q = scoped_query(Purchase).filter(Purchase.status != 'Cancelled')

        purch_total_rows = active_purchases_q.with_entities(
            Purchase.currency, func.sum(Purchase.paid_amount), func.sum(Purchase.remaining_amount)
        ).group_by(Purchase.currency).all()
        total_purchases_paid = sum(_iqd(r[1], r[0]) for r in purch_total_rows)
        payables = sum(_iqd(r[2], r[0]) for r in purch_total_rows)
        purchases_count = active_purchases_q.with_entities(func.count(Purchase.id)).scalar() or 0

        monthly_purch_rows = active_purchases_q.filter(Purchase.purchase_date >= month_start).with_entities(
            Purchase.currency, func.sum(Purchase.paid_amount)
        ).group_by(Purchase.currency).all()
        monthly_purchases_paid = _sum_rows(monthly_purch_rows)

        annual_purch_rows = active_purchases_q.filter(Purchase.purchase_date >= year_start).with_entities(
            Purchase.currency, func.sum(Purchase.paid_amount)
        ).group_by(Purchase.currency).all()
        annual_purchases_paid = _sum_rows(annual_purch_rows)

        # ── مصروفات ───────────────────────────────────────────────────
        expense_rows = scoped_query(Expense).with_entities(
            Expense.currency, func.sum(Expense.amount)
        ).group_by(Expense.currency).all()
        total_expenses = _sum_rows(expense_rows)

        # ── سيارات ───────────────────────────────────────────────────
        available_cars_count = scoped_query(Car).filter_by(status='Available').count()
        sold_cars_count = scoped_query(Car).filter_by(status='Sold').count()

        inv_rows = scoped_query(Car).filter_by(status='Available').with_entities(
            Car.currency, func.sum(Car.purchase_price)
        ).group_by(Car.currency).all()
        inventory_value = _sum_rows(inv_rows)

        # ── أقساط — تحديث الحالات ثم استعلام SQL ─────────────────────
        installment_plans = scoped_query(InstallmentPlan).options(
            _joinedload(InstallmentPlan.schedules)
        ).all()
        for plan in installment_plans:
            refresh_installment_plan(plan)
        db.session.commit()

        # إحصائيات الأقساط بـ SQL بعد التحديث
        today_dt = datetime.combine(today, datetime.min.time())
        tomorrow_dt = datetime.combine(tomorrow, datetime.min.time())
        after_2_dt = datetime.combine(after_2_days, datetime.min.time())
        after_7_dt = datetime.combine(after_7_days + timedelta(days=1), datetime.min.time())

        sched_base = scoped_query(InstallmentSchedule).filter(
            InstallmentSchedule.remaining_amount > 0
        )

        def _sched_stats(q):
            rows = q.with_entities(
                InstallmentSchedule.currency,
                func.sum(InstallmentSchedule.remaining_amount),
                func.count(InstallmentSchedule.id)
            ).group_by(InstallmentSchedule.currency).all()
            return sum(r[2] for r in rows), sum(_iqd(r[1], r[0]) for r in rows)

        recv_rows = scoped_query(InstallmentPlan).filter(
            InstallmentPlan.remaining_amount > 0
        ).with_entities(
            InstallmentPlan.currency, func.sum(InstallmentPlan.remaining_amount)
        ).group_by(InstallmentPlan.currency).all()
        total_receivables = _sum_rows(recv_rows)

        overdue_count, overdue_amount = _sched_stats(
            sched_base.filter(InstallmentSchedule.due_date < today_dt)
        )
        due_today_count, due_today_amount = _sched_stats(
            sched_base.filter(InstallmentSchedule.due_date >= today_dt,
                              InstallmentSchedule.due_date < tomorrow_dt)
        )
        due_tomorrow_count, due_tomorrow_amount = _sched_stats(
            sched_base.filter(InstallmentSchedule.due_date >= tomorrow_dt,
                              InstallmentSchedule.due_date < after_2_dt)
        )
        due_2_count, due_2_amount = _sched_stats(
            sched_base.filter(InstallmentSchedule.due_date >= after_2_dt,
                              InstallmentSchedule.due_date < datetime.combine(
                                  after_2_days + timedelta(days=1), datetime.min.time()))
        )
        due_7_count, due_7_amount = _sched_stats(
            sched_base.filter(InstallmentSchedule.due_date >= today_dt,
                              InstallmentSchedule.due_date < after_7_dt)
        )

        # ── مدفوعات اليوم ────────────────────────────────────────────
        today_pay_rows = branch_filter(Payment.query, Payment).filter(
            Payment.payment_type == 'installment',
            func.date(Payment.payment_date) == today.isoformat()
        ).with_entities(
            Payment.currency, func.sum(Payment.amount)
        ).group_by(Payment.currency).all()
        today_payments = _sum_rows(today_pay_rows)

        customers_count = scoped_query(Customer).count()

        installment_summary = {
            'total_receivables': round(total_receivables, 2),
            'overdue_amount': round(overdue_amount, 2),
            'due_today_amount': round(due_today_amount, 2),
            'due_tomorrow_amount': round(due_tomorrow_amount, 2),
            'due_in_2_days_amount': round(due_2_amount, 2),
            'overdue_count': overdue_count,
            'due_today_count': due_today_count,
            'due_tomorrow_count': due_tomorrow_count,
            'due_in_2_days_count': due_2_count,
            'due_in_7_days_count': due_7_count,
            'due_in_7_days_amount': round(due_7_amount, 2),
        }

        monthly_profit = monthly_sales_paid - monthly_purchases_paid
        annual_profit = annual_sales_paid - annual_purchases_paid

        stats = {
            'cars_count': available_cars_count,
            'available_cars_count': available_cars_count,
            'sold_cars_count': sold_cars_count,
            'sales_count': sales_count_rows,
            'purchases_count': purchases_count,
            'customers_count': customers_count,
            'installments': len(installment_plans),
            'cashbox_balance': total_sales_paid - total_purchases_paid - total_expenses,
            'total_revenue': total_sales_paid,
            'total_purchases_paid': total_purchases_paid,
            'total_expenses': total_expenses,
            'overdue_installments': overdue_count,
            'overdue_amount': round(overdue_amount, 2),
            'receivables': round(total_receivables, 2),
            'today_payments': round(today_payments, 2),
            'monthly_sales_paid': round(monthly_sales_paid, 2),
            'monthly_purchases_paid': round(monthly_purchases_paid, 2),
            'monthly_profit': round(monthly_profit, 2),
            'annual_profit': round(annual_profit, 2),
            'cars_sold_month': cars_sold_month,
            'inventory_value': round(inventory_value, 2),
            'payables': round(payables, 2),
        }
        labels = {
            'available_cars': 'السيارات المتاحة',
            'sold_cars': 'السيارات المباعة',
            'customers': 'العملاء',
            'sales': 'فواتير البيع',
            'purchases': 'فواتير الشراء',
            'installments': 'خطط الأقساط',
            'cashbox_balance': 'رصيد الخزنة',
        }
        return jsonify({
            'stats': stats,
            'labels': labels,
            'installment_summary': installment_summary,
            'monthly_summary': {
                'sales_paid': monthly_sales_paid,
                'purchases_paid': monthly_purchases_paid,
                'profit': monthly_profit,
            },
        })

    @app.route('/api/inventory')
    @api_login_required
    @api_permission_required('manage_cars')
    def api_inventory():
        # pagination
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)
        status = request.args.get('status')
        search = request.args.get('search')

        query = scoped_query(Car)
        if status:
            query = query.filter_by(status=status)
        if search:
            q = f"%{search}%"
            query = query.filter(or_(Car.brand.ilike(q), Car.model.ilike(q), Car.vin.ilike(q), Car.plate_number.ilike(q)))

        from sqlalchemy.orm import joinedload as _jl, subqueryload as _sl
        total = query.count()
        items = query.options(
            _sl(Car.photos), _jl(Car.branch)
        ).order_by(Car.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
        results = []
        for c in items:
            results.append({
                'id': c.id,
                'brand': c.brand,
                'model': c.model,
                'manufacturing_year': c.manufacturing_year,
                'trim': c.trim,
                'color': c.color,
                'vin': c.vin,
                'plate_number': c.plate_number,
                'status': c.status,
                'purchase_price': c.purchase_price,
                'selling_price': c.selling_price,
                'currency': c.currency,
                'branch_id': c.branch_id,
                'branch': branch_json(c.branch),
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'cover_photo': (
                    {'id': c.photos[0].id, 'filename': c.photos[0].filename, 'subfolder': CAR_PHOTO_SUBFOLDER}
                    if c.photos else None
                ),
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': results})

    @app.route('/api/customers')
    @api_login_required
    @api_permission_required('manage_customers')
    def api_customers():
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)
        search = request.args.get('search')
        customer_type = request.args.get('customer_type')

        query = scoped_query(Customer)
        if customer_type:
            query = query.filter_by(customer_type=customer_type)
        if search:
            q = f"%{search}%"
            query = query.filter(or_(Customer.name.ilike(q), Customer.full_name.ilike(q), Customer.phone.ilike(q), Customer.id_number.ilike(q)))

        from sqlalchemy.orm import joinedload as _jl, subqueryload as _sl
        total = query.count()
        items = query.options(
            _sl(Customer.documents), _jl(Customer.branch)
        ).order_by(Customer.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
        results = []
        for c in items:
            results.append({
                'id': c.id,
                'name': c.name,
                'full_name': c.full_name,
                'phone': c.phone,
                'address': c.address,
                'id_type': c.id_type,
                'id_number': c.id_number,
                'customer_type': c.customer_type,
                'branch_id': c.branch_id,
                'branch': branch_json(c.branch),
                'documents_count': len(c.documents) if c.documents else 0,
                'created_at': c.created_at.isoformat() if c.created_at else None,
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': results})

    @app.route('/api/sales')
    @api_login_required
    @api_permission_required('manage_sales')
    def api_sales():
        page      = int(request.args.get('page', 1))
        per_page  = min(int(request.args.get('per_page', 25)), 100)
        status    = request.args.get('status')
        search    = request.args.get('search')
        date_from = request.args.get('date_from')
        date_to   = request.args.get('date_to')
        method    = request.args.get('method')

        query = scoped_query(Sale)
        if status:
            query = query.filter(Sale.status == status)
        if method:
            query = query.filter(Sale.payment_method == method)
        if date_from:
            query = query.filter(Sale.sale_date >= date_from)
        if date_to:
            query = query.filter(Sale.sale_date <= date_to)
        if search:
            q = f'%{search}%'
            buyer_ids = db.session.query(Customer.id).filter(
                or_(Customer.name.ilike(q), Customer.full_name.ilike(q))
            )
            car_ids = db.session.query(Car.id).filter(
                or_(Car.brand.ilike(q), Car.model.ilike(q), Car.vin.ilike(q))
            )
            query = query.filter(or_(
                Sale.invoice_number.ilike(q),
                Sale.buyer_id.in_(buyer_ids),
                Sale.car_id.in_(car_ids),
            ))

        from sqlalchemy.orm import joinedload as _jl
        total = query.count()
        items = query.options(
            _jl(Sale.car), _jl(Sale.buyer), _jl(Sale.installment_plan), _jl(Sale.branch)
        ).order_by(Sale.sale_date.desc(), Sale.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
        results = []
        for s in items:
            car   = s.car
            buyer = s.buyer
            results.append({
                'id':               s.id,
                'invoice_number':   s.invoice_number,
                'car_id':           s.car_id,
                'buyer_id':         s.buyer_id,
                'branch_id':        s.branch_id,
                'branch':           branch_json(s.branch),
                'car_name':         f'{car.brand} {car.model} {car.manufacturing_year}' if car else None,
                'car_vin':          car.vin if car else None,
                'buyer_name':       buyer.full_name or buyer.name if buyer else None,
                'buyer_phone':      buyer.phone if buyer else None,
                'selling_price':    s.selling_price,
                'discount':         s.discount,
                'paid_amount':      s.paid_amount,
                'remaining_amount': s.remaining_amount,
                'currency':         s.currency,
                'payment_method':   s.payment_method,
                'status':           s.status,
                'has_installment':  s.installment_plan is not None,
                'sale_date':        s.sale_date.isoformat() if s.sale_date else None,
                'created_at':       s.created_at.isoformat() if s.created_at else None,
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': results})

    @app.route('/api/purchases')
    @api_login_required
    @api_permission_required('manage_purchases')
    def api_purchases():
        page      = int(request.args.get('page', 1))
        per_page  = min(int(request.args.get('per_page', 25)), 100)
        search    = request.args.get('search')
        status    = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to   = request.args.get('date_to')
        method    = request.args.get('method')

        query = scoped_query(Purchase)
        if status:
            query = query.filter(Purchase.status == status)
        if method:
            query = query.filter(Purchase.payment_method == method)
        if date_from:
            query = query.filter(Purchase.purchase_date >= date_from)
        if date_to:
            query = query.filter(Purchase.purchase_date <= date_to)
        if search:
            q = f'%{search}%'
            seller_ids = db.session.query(Customer.id).filter(
                or_(Customer.name.ilike(q), Customer.full_name.ilike(q))
            )
            car_ids = db.session.query(Car.id).filter(
                or_(Car.brand.ilike(q), Car.model.ilike(q), Car.vin.ilike(q))
            )
            query = query.filter(or_(
                Purchase.invoice_number.ilike(q),
                Purchase.seller_id.in_(seller_ids),
                Purchase.car_id.in_(car_ids),
            ))

        total = query.count()
        items = query.order_by(Purchase.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
        results = []
        for p in items:
            car    = p.car
            seller = p.seller
            results.append({
                'id':               p.id,
                'invoice_number':   p.invoice_number,
                'car_id':           p.car_id,
                'seller_id':        p.seller_id,
                'branch_id':        p.branch_id,
                'branch':           branch_json(p.branch),
                'car_name':         f'{car.brand} {car.model} {car.manufacturing_year}' if car else None,
                'seller_name':      (seller.full_name or seller.name) if seller else None,
                'purchase_price':   p.purchase_price,
                'paid_amount':      p.paid_amount,
                'remaining_amount': p.remaining_amount,
                'currency':         p.currency,
                'payment_method':   p.payment_method,
                'status':           p.status,
                'purchase_date':    p.purchase_date.isoformat() if p.purchase_date else None,
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': results})

    def _purchase_payload(p):
        car = p.car
        seller = p.seller
        return {
            'id': p.id,
            'invoice_number': p.invoice_number,
            'car_id': p.car_id,
            'seller_id': p.seller_id,
            'branch_id': p.branch_id,
            'branch': branch_json(p.branch),
            'purchase_price': p.purchase_price,
            'paid_amount': p.paid_amount,
            'remaining_amount': p.remaining_amount,
            'currency': p.currency,
            'payment_method': p.payment_method,
            'status': p.status,
            'cancel_reason': p.cancel_reason,
            'cancelled_at': p.cancelled_at.isoformat() if p.cancelled_at else None,
            'purchase_date': p.purchase_date.isoformat() if p.purchase_date else None,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'car': {
                'id': car.id,
                'brand': car.brand,
                'model': car.model,
                'manufacturing_year': car.manufacturing_year,
                'trim': car.trim,
                'color': car.color,
                'vin': car.vin,
                'plate_number': car.plate_number,
                'mileage': car.mileage,
                'status': car.status,
            } if car else None,
            'seller': {
                'id': seller.id,
                'name': seller.name,
                'full_name': seller.full_name,
                'phone': seller.phone,
                'address': seller.address,
                'id_type': seller.id_type,
                'id_number': seller.id_number,
            } if seller else None,
            'payments': [{
                'id': payment.id,
                'amount': payment.amount,
                'currency': payment.currency,
                'payment_method': payment.payment_method,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                'notes': payment.notes,
            } for payment in (p.payments or [])],
        }

    @app.route('/api/purchases/<int:purchase_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_purchases')
    def api_purchase_detail(purchase_id):
        purchase = Purchase.query.get_or_404(purchase_id)
        if not branch_allowed(purchase):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403
        return jsonify(_purchase_payload(purchase))

    @app.route('/api/purchases/<int:purchase_id>/cancel', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_purchases')
    def api_cancel_purchase(purchase_id):
        """إلغاء فاتورة شراء مع عكس جميع قيودها المحاسبية تلقائياً."""
        from .accounting import create_journal_entry
        purchase = Purchase.query.get_or_404(purchase_id)
        if not branch_allowed(purchase):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403
        if purchase.status == 'Cancelled':
            return jsonify({'error': 'الفاتورة ملغاة بالفعل'}), 400
        data = request.get_json(silent=True) or {}
        cancel_reason = (data.get('cancel_reason') or '').strip() or 'Cancelled by user'
        # عكس جميع القيود المرتبطة بهذه الفاتورة ومدفوعاتها
        refs_to_reverse = [('Purchase', purchase.id)] + [('Payment', p.id) for p in purchase.payments]
        for ref_type, ref_id in refs_to_reverse:
            for je in JournalEntry.query.filter_by(
                reference_type=ref_type, reference_id=ref_id, status='posted'
            ).all():
                try:
                    rev_lines = [
                        {'account_code': l.account.code, 'debit': decimal_value(l.credit), 'credit': decimal_value(l.debit)}
                        for l in je.lines if l.account
                    ]
                    if rev_lines:
                        rev = create_journal_entry(
                            entry_date=datetime.utcnow(),
                            description=f'إلغاء: {je.description or ""} (#{je.id})',
                            branch_id=je.branch_id,
                            reference_type=f'{ref_type}Cancel',
                            reference_id=ref_id,
                            lines=rev_lines,
                            auto_post=True,
                            posted_by_id=current_user.id,
                            allow_inactive_accounts=True,
                        )
                        rev.reversal_of_id = je.id
                        je.status = 'reversed'
                except Exception as _rev_err:
                    app.logger.warning('Purchase cancel JE reversal failed je=%s: %s', je.id, _rev_err)
        purchase.status = 'Cancelled'
        purchase.cancelled_at = datetime.utcnow()
        purchase.cancel_reason = cancel_reason
        # إرجاع السيارة للمخزون إذا لم تُباع بعد
        car = purchase.car
        if car and not Sale.query.filter_by(car_id=car.id, status='Active').first():
            car.status = 'Available'
        log_action('cancel purchase', 'Purchase', purchase.id, purchase.invoice_number)
        db.session.commit()
        return jsonify({'id': purchase.id, 'status': purchase.status, 'cancel_reason': purchase.cancel_reason})

    @app.route('/api/purchases/<int:purchase_id>/payments', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_purchases')
    def api_add_purchase_payment(purchase_id):
        """إضافة دفعة إضافية لفاتورة شراء مع قيد محاسبي تلقائي."""
        from .accounting import create_journal_entry
        purchase = Purchase.query.get_or_404(purchase_id)
        if not branch_allowed(purchase):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403
        if purchase.status == 'Cancelled':
            return jsonify({'error': 'لا يمكن إضافة دفعة لفاتورة ملغاة'}), 400
        data = request.get_json(silent=True) or {}
        amount, amount_err = _parse_money(data.get('amount') or 0, 'المبلغ')
        if amount_err:
            return amount_err
        payment_method = (data.get('payment_method') or 'Cash').strip()
        notes = (data.get('notes') or '').strip() or None
        if amount <= 0:
            return jsonify({'error': 'المبلغ يجب أن يكون أكبر من صفر'}), 400
        if amount > decimal_value(purchase.remaining_amount):
            return jsonify({'error': f'المبلغ ({amount}) يتجاوز المتبقي ({purchase.remaining_amount})'}), 400
        payment = Payment(
            payment_type='purchase', branch_id=purchase.branch_id, purchase_id=purchase.id,
            amount=amount, currency=purchase.currency,
            payment_method=payment_method, notes=notes,
            payment_date=datetime.utcnow(),
        )
        purchase.paid_amount = money_value(decimal_value(purchase.paid_amount) + amount)
        purchase.remaining_amount = max(
            money_value(decimal_value(purchase.purchase_price) - purchase.paid_amount),
            ZERO_MONEY,
        )
        db.session.add(payment)
        db.session.flush()
        try:
            paid_iqd = to_iqd(amount, purchase.currency)
            if paid_iqd > 0:
                create_journal_entry(
                    entry_date=payment.payment_date,
                    description=f'دفع مستحقات شراء #{purchase.id} — {purchase.invoice_number}',
                    branch_id=payment.branch_id,
                    reference_type='Payment', reference_id=payment.id,
                    lines=[
                        {'account_code': AP_ACCOUNT,              'debit': paid_iqd, 'credit': 0},
                        {'account_code': acct_cash(payment_method), 'debit': 0,      'credit': paid_iqd},
                    ],
                )
        except Exception as _je_err:
            db.session.rollback()
            app.logger.warning('Purchase payment JE failed: %s', _je_err)
            return jsonify({'error': 'فشل إنشاء القيد المحاسبي للدفعة، لم يتم حفظ العملية'}), 500
        log_action('add purchase payment', 'Purchase', purchase.id, purchase.invoice_number)
        db.session.commit()
        return jsonify({
            'payment_id': payment.id,
            'paid_amount': purchase.paid_amount,
            'remaining_amount': purchase.remaining_amount,
        }), 201

    @app.route('/api/purchases', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_purchases')
    def api_create_purchase():
        data = request.get_json(silent=True) or {}
        required_fields = [
            'brand', 'model', 'manufacturing_year', 'color', 'vin',
            'plate_number', 'mileage', 'seller_id', 'purchase_price',
            'payment_method', 'purchase_date'
        ]
        if not all(data.get(field) not in [None, ''] for field in required_fields):
            return jsonify({'error': 'الحقول المطلوبة: السيارة، البائع، السعر، طريقة الدفع، تاريخ الشراء'}), 400

        seller = Customer.query.get(int(data.get('seller_id')))
        if not seller or seller.customer_type != 'Seller' or not branch_allowed(seller):
            return jsonify({'error': 'البائع غير موجود أو لا يمكن الوصول إليه'}), 404

        vin = str(data.get('vin')).strip()
        plate_number = str(data.get('plate_number')).strip()
        if Car.query.filter_by(vin=vin).first():
            return jsonify({'error': 'رقم الشاصي مستخدم بالفعل'}), 409
        if Car.query.filter_by(plate_number=plate_number).first():
            return jsonify({'error': 'رقم اللوحة مستخدم بالفعل'}), 409

        year_val, year_err = _validate_year(data.get('manufacturing_year'))
        if year_err:
            return year_err
        purchase_price, pp_err = _parse_money(data.get('purchase_price'), 'سعر الشراء')
        if pp_err:
            return pp_err
        if purchase_price <= 0:
            return jsonify({'error': 'سعر الشراء يجب أن يكون أكبر من صفر'}), 400
        paid_amount_raw, pa_err = _parse_money(data.get('paid_amount') or 0, 'المبلغ المدفوع')
        if pa_err:
            return pa_err
        paid_amount = max(paid_amount_raw, ZERO_MONEY)
        if paid_amount > purchase_price:
            return jsonify({'error': 'المبلغ المدفوع لا يمكن أن يتجاوز سعر الشراء'}), 400
        remaining_amount = money_value(purchase_price - paid_amount)
        currency = normalize_currency(data.get('currency'))
        try:
            purchase_date = datetime.strptime(data.get('purchase_date'), '%Y-%m-%d')
        except (TypeError, ValueError):
            return jsonify({'error': 'صيغة تاريخ الشراء غير صحيحة (YYYY-MM-DD)'}), 400

        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error
        if seller.branch_id != creation_branch_id:
            return jsonify({'error': 'لا يمكن إنشاء فاتورة شراء بفرع مختلف عن فرع البائع'}), 409

        car = Car(
            branch_id=creation_branch_id,
            brand=str(data.get('brand')).strip(),
            model=str(data.get('model')).strip(),
            manufacturing_year=year_val,
            color=str(data.get('color')).strip(),
            vin=vin,
            plate_number=plate_number,
            mileage=int(data.get('mileage') or 0),
            purchase_price=purchase_price,
            currency=currency,
            status='Available',
        )
        db.session.add(car)
        db.session.flush()

        purchase = Purchase(
            branch_id=creation_branch_id,
            invoice_number=f'PURCHASE-{datetime.utcnow().strftime("%Y%m%d")}-{uuid4().hex[:8].upper()}',
            car_id=car.id,
            seller_id=seller.id,
            purchase_price=purchase_price,
            paid_amount=paid_amount,
            remaining_amount=remaining_amount,
            currency=currency,
            payment_method=data.get('payment_method'),
            purchase_date=purchase_date,
        )
        db.session.add(purchase)
        db.session.flush()
        initial_payment = None
        if paid_amount > 0:
            initial_payment = Payment(
                payment_type='purchase',
                branch_id=creation_branch_id,
                purchase_id=purchase.id,
                amount=paid_amount,
                currency=currency,
                payment_method=data.get('payment_method'),
                payment_date=purchase.purchase_date,
            )
            db.session.add(initial_payment)
            db.session.flush()
        # ── قيود محاسبية تلقائية ──────────────────────────────────────────
        try:
            _post_purchase_journal_entries(purchase, car, initial_payment)
        except Exception as _je_err:
            db.session.rollback()
            app.logger.warning('Purchase JE failed (purchase=%s): %s', purchase.id, _je_err)
            return jsonify({'error': 'فشل إنشاء القيد المحاسبي للشراء، لم يتم حفظ العملية'}), 500

        log_action('create purchase', 'Purchase', purchase.id, purchase.invoice_number)
        db.session.commit()
        return jsonify({'id': purchase.id, 'invoice_number': purchase.invoice_number}), 201

    @app.route('/api/installments')
    @api_login_required
    @api_permission_required('manage_installments')
    def api_installments():
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)
        filter_param = request.args.get('filter', 'all')

        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)
        after_two_days = today + timedelta(days=2)
        after_three_days = today + timedelta(days=3)
        after_7_days = today + timedelta(days=7)

        # Load ALL branch-scoped plans to refresh statuses and build the global summary.
        # Summary always reflects all plans regardless of the active filter.
        all_plans = scoped_query(InstallmentPlan).all()
        summary = {
            'total_plans': len(all_plans),
            'active_plans': 0,
            'paid_plans': 0,
            'total_receivables': Decimal('0.0'),
            'total_paid_amount': Decimal('0.0'),
            'overdue_amount': Decimal('0.0'),
            'due_today_amount': Decimal('0.0'),
            'due_tomorrow_amount': Decimal('0.0'),
            'due_in_2_days_amount': Decimal('0.0'),
            'due_in_7_days_amount': Decimal('0.0'),
            'overdue_count': 0,
            'due_today_count': 0,
            'due_tomorrow_count': 0,
            'due_in_2_days_count': 0,
            'due_in_7_days_count': 0,
            'partial_count': 0,
            'unpaid_count': 0,
            'paid_schedule_count': 0,
        }
        for plan in all_plans:
            refresh_installment_plan(plan)
            if plan.status == 'Paid':
                summary['paid_plans'] += 1
            else:
                summary['active_plans'] += 1
            summary['total_receivables'] += plan.remaining_amount or 0
            summary['total_paid_amount'] += plan.paid_amount or 0
            for schedule in plan.schedules:
                refresh_installment_status(schedule)
                if schedule.status == 'Paid':
                    summary['paid_schedule_count'] += 1
                elif schedule.status == 'Partial':
                    summary['partial_count'] += 1
                else:
                    summary['unpaid_count'] += 1
                if schedule.remaining_amount > 0 and schedule.due_date:
                    due_date = schedule.due_date.date()
                    if due_date < today:
                        summary['overdue_count'] += 1
                        summary['overdue_amount'] += schedule.remaining_amount
                    elif due_date == today:
                        summary['due_today_count'] += 1
                        summary['due_today_amount'] += schedule.remaining_amount
                    elif due_date == tomorrow:
                        summary['due_tomorrow_count'] += 1
                        summary['due_tomorrow_amount'] += schedule.remaining_amount
                    elif due_date == after_two_days:
                        summary['due_in_2_days_count'] += 1
                        summary['due_in_2_days_amount'] += schedule.remaining_amount
                    if today <= due_date <= after_7_days:
                        summary['due_in_7_days_count'] += 1
                        summary['due_in_7_days_amount'] += schedule.remaining_amount
        # Flush refreshed statuses so the filter subqueries below see current data.
        db.session.commit()

        # Build the filtered query. Subqueries run against InstallmentSchedule
        # so filtering is done in the database, not in Python.
        filtered_query = scoped_query(InstallmentPlan)

        if filter_param == 'paid':
            filtered_query = filtered_query.filter(InstallmentPlan.status == 'Paid')
        elif filter_param == 'unpaid':
            filtered_query = filtered_query.filter(InstallmentPlan.status == 'Active')
        elif filter_param == 'overdue':
            sub = db.session.query(InstallmentSchedule.installment_plan_id).filter(
                InstallmentSchedule.remaining_amount > 0,
                InstallmentSchedule.due_date < datetime(today.year, today.month, today.day),
            ).distinct()
            filtered_query = filtered_query.filter(InstallmentPlan.id.in_(sub))
        elif filter_param == 'due_today':
            sub = db.session.query(InstallmentSchedule.installment_plan_id).filter(
                InstallmentSchedule.remaining_amount > 0,
                InstallmentSchedule.due_date >= datetime(today.year, today.month, today.day),
                InstallmentSchedule.due_date < datetime(tomorrow.year, tomorrow.month, tomorrow.day),
            ).distinct()
            filtered_query = filtered_query.filter(InstallmentPlan.id.in_(sub))
        elif filter_param == 'due_tomorrow':
            sub = db.session.query(InstallmentSchedule.installment_plan_id).filter(
                InstallmentSchedule.remaining_amount > 0,
                InstallmentSchedule.due_date >= datetime(tomorrow.year, tomorrow.month, tomorrow.day),
                InstallmentSchedule.due_date < datetime(after_two_days.year, after_two_days.month, after_two_days.day),
            ).distinct()
            filtered_query = filtered_query.filter(InstallmentPlan.id.in_(sub))
        elif filter_param == 'due_in_2_days':
            sub = db.session.query(InstallmentSchedule.installment_plan_id).filter(
                InstallmentSchedule.remaining_amount > 0,
                InstallmentSchedule.due_date >= datetime(after_two_days.year, after_two_days.month, after_two_days.day),
                InstallmentSchedule.due_date < datetime(after_three_days.year, after_three_days.month, after_three_days.day),
            ).distinct()
            filtered_query = filtered_query.filter(InstallmentPlan.id.in_(sub))
        elif filter_param == 'due_in_7_days':
            sub = db.session.query(InstallmentSchedule.installment_plan_id).filter(
                InstallmentSchedule.remaining_amount > 0,
                InstallmentSchedule.due_date >= datetime(today.year, today.month, today.day),
                InstallmentSchedule.due_date <= datetime(after_7_days.year, after_7_days.month, after_7_days.day),
            ).distinct()
            filtered_query = filtered_query.filter(InstallmentPlan.id.in_(sub))
        elif filter_param == 'partial':
            sub = db.session.query(InstallmentSchedule.installment_plan_id).filter(
                InstallmentSchedule.status == 'Partial',
            ).distinct()
            filtered_query = filtered_query.filter(InstallmentPlan.id.in_(sub))
        # 'all' — no additional filter applied

        total = filtered_query.count()
        items = filtered_query.order_by(InstallmentPlan.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

        results = []
        for ip in items:
            sale = ip.sale
            car = sale.car if sale else None
            buyer = sale.buyer if sale else None
            pending_schedules = sorted(
                [schedule for schedule in ip.schedules if schedule.remaining_amount > 0],
                key=lambda schedule: schedule.due_date or datetime.max
            )
            next_schedule = pending_schedules[0] if pending_schedules else None
            overdue_count = 0
            due_today_count = 0
            due_tomorrow_count = 0
            due_in_2_days_count = 0
            partial_count = 0
            paid_schedule_count = 0
            unpaid_count = 0
            for schedule in ip.schedules:
                if schedule.status == 'Paid':
                    paid_schedule_count += 1
                elif schedule.status == 'Partial':
                    partial_count += 1
                else:
                    unpaid_count += 1
                if schedule.remaining_amount > 0 and schedule.due_date:
                    due_date = schedule.due_date.date()
                    if due_date < today:
                        overdue_count += 1
                    elif due_date == today:
                        due_today_count += 1
                    elif due_date == tomorrow:
                        due_tomorrow_count += 1
                    elif due_date == after_two_days:
                        due_in_2_days_count += 1
            results.append({
                'id': ip.id,
                'sale_id': ip.sale_id,
                'branch_id': ip.branch_id,
                'branch': branch_json(ip.branch),
                'invoice_number': sale.invoice_number if sale else None,
                'car_name': f'{car.brand} {car.model} {car.manufacturing_year}' if car else None,
                'buyer_id': buyer.id if buyer else None,
                'buyer_name': (buyer.full_name or buyer.name) if buyer else None,
                'buyer_phone': buyer.phone if buyer else None,
                'total_amount': ip.total_amount,
                'paid_amount': ip.paid_amount,
                'remaining_amount': ip.remaining_amount,
                'currency': ip.currency,
                'number_of_months': ip.number_of_months,
                'installment_amount': ip.installment_amount,
                'installment_due_day': ip.installment_due_day,
                'next_due_date': next_schedule.due_date.isoformat() if next_schedule and next_schedule.due_date else None,
                'next_due_amount': next_schedule.remaining_amount if next_schedule else 0,
                'schedule_count': len(ip.schedules),
                'paid_schedule_count': paid_schedule_count,
                'partial_count': partial_count,
                'unpaid_count': unpaid_count,
                'overdue_count': overdue_count,
                'due_today_count': due_today_count,
                'due_tomorrow_count': due_tomorrow_count,
                'due_in_2_days_count': due_in_2_days_count,
                'status': ip.status,
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'summary': summary, 'items': results})

    @app.route('/api/accounting')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting():
        active_sales = scoped_query(Sale).filter(Sale.status != 'Cancelled').all()
        active_purchases = scoped_query(Purchase).filter(Purchase.status != 'Cancelled').all()
        total_sales_paid = sum(record_amount_iqd(s, 'paid_amount') for s in active_sales)
        total_purchases_paid = sum(record_amount_iqd(p, 'paid_amount') for p in active_purchases)
        total_expenses = sum(record_amount_iqd(e, 'amount') for e in scoped_query(Expense).all())
        cashbox_balance = total_sales_paid - total_purchases_paid - total_expenses
        return jsonify({
            'cashbox_balance': cashbox_balance,
            'total_sales_paid': total_sales_paid,
            'total_purchases_paid': total_purchases_paid,
            'total_expenses': total_expenses,
        })

    @app.route('/api/chart-of-accounts')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_chart_of_accounts():
        accounts = [
            account for account in Account.query.order_by(Account.code.asc()).all()
            if account.code and account.code.isdigit() and len(account.code) == 6
        ]
        trial_rows, _trial_totals = get_trial_balance(selected_branch_scope_id())
        trial_by_code = {row['code']: row for row in trial_rows}

        children_by_parent = defaultdict(list)
        for account in accounts:
            children_by_parent[account.parent_id].append(account)

        def level_for(account):
            if account.parent_id is None:
                return 'رئيسي'
            if children_by_parent.get(account.id):
                return 'فرعي'
            return 'تفصيلي'

        def type_label(account_type):
            return {
                'Asset': 'موجودات',
                'Liability': 'مطلوبات',
                'Equity': 'حقوق ملكية',
                'Income': 'إيرادات',
                'Expense': 'مصروفات',
            }.get(account_type, account_type)

        def node(account, depth=0):
            trial = trial_by_code.get(account.code or '', {})
            children = [node(child, depth + 1) for child in children_by_parent.get(account.id, [])]
            own_debit = money_value(trial.get('debit', 0))
            own_credit = money_value(trial.get('credit', 0))
            own_balance = money_value(trial.get('balance', 0))
            subtree_debit = money_value(
                own_debit + sum((child['subtree_debit'] for child in children), ZERO_MONEY)
            )
            subtree_credit = money_value(
                own_credit + sum((child['subtree_credit'] for child in children), ZERO_MONEY)
            )
            subtree_balance = money_value(
                own_balance + sum((child['subtree_balance'] for child in children), ZERO_MONEY)
            )
            clf = account.classification or ''
            return {
                'id': account.id,
                'code': account.code,
                'name': account.name,
                'type': account.type,
                'type_label': type_label(account.type),
                'classification': clf,
                'classification_label': CLASSIFICATION_LABELS.get(clf, ''),
                'is_active': bool(account.is_active),
                'level': level_for(account),
                'depth': depth,
                'parent_id': account.parent_id,
                'parent_code': account.parent.code if account.parent else None,
                'debit': own_debit,
                'credit': own_credit,
                'balance': own_balance,
                'own_debit': own_debit,
                'own_credit': own_credit,
                'own_balance': own_balance,
                'subtree_debit': subtree_debit,
                'subtree_credit': subtree_credit,
                'subtree_balance': subtree_balance,
                'children_count': len(children),
                'children': children,
            }

        roots = [node(account) for account in children_by_parent.get(None, [])]
        flat = []

        def flatten(items):
            for item in items:
                flat.append({k: v for k, v in item.items() if k != 'children'})
                flatten(item['children'])

        flatten(roots)
        type_summary = {}
        classification_summary = {}
        for item in flat:
            # Group by type
            bucket = type_summary.setdefault(item['type'], {
                'label': item['type_label'],
                'count': 0,
                'debit': ZERO_MONEY,
                'credit': ZERO_MONEY,
                'balance': ZERO_MONEY,
            })
            bucket['count'] += 1
            bucket['debit'] = round(bucket['debit'] + item['own_debit'], 2)
            bucket['credit'] = round(bucket['credit'] + item['own_credit'], 2)
            bucket['balance'] = round(bucket['balance'] + item['own_balance'], 2)
            # Group by classification
            clf = item['classification']
            if clf:
                cbucket = classification_summary.setdefault(clf, {
                    'label': CLASSIFICATION_LABELS.get(clf, clf),
                    'type': item['type'],
                    'count': 0,
                    'debit': ZERO_MONEY,
                    'credit': ZERO_MONEY,
                    'balance': ZERO_MONEY,
                })
                cbucket['count'] += 1
                cbucket['debit'] = round(cbucket['debit'] + item['own_debit'], 2)
                cbucket['credit'] = round(cbucket['credit'] + item['own_credit'], 2)
                cbucket['balance'] = round(cbucket['balance'] + item['own_balance'], 2)

        total_debit = money_value(sum((item['own_debit'] for item in flat), ZERO_MONEY))
        total_credit = money_value(sum((item['own_credit'] for item in flat), ZERO_MONEY))
        difference = money_value(total_debit - total_credit)

        return jsonify({
            'total': len(flat),
            'summary': {
                'main': sum(1 for item in flat if item['level'] == 'رئيسي'),
                'branch': sum(1 for item in flat if item['level'] == 'فرعي'),
                'detail': sum(1 for item in flat if item['level'] == 'تفصيلي'),
            },
            'totals': {
                'total_debit': total_debit,
                'total_credit': total_credit,
                'difference': difference,
                'status': 'balanced' if difference == 0 else 'unbalanced',
            },
            'type_summary': type_summary,
            'classification_summary': classification_summary,
            'items': roots,
            'flat': flat,
        })

    # ── Chart of accounts — CRUD ─────────────────────────────────────────────

    @app.route('/chart-of-accounts')
    @login_required
    @permission_required('manage_accounting')
    def chart_of_accounts():
        return (
            '<!doctype html><html lang="ar" dir="rtl"><head>'
            '<meta charset="utf-8"><title>دليل الحسابات</title></head>'
            '<body><h1>دليل الحسابات</h1>'
            '<p>هذه صفحة توافق قديمة. استخدم واجهة النظام الحديثة لعرض دليل الحسابات.</p>'
            '</body></html>'
        )

    VALID_ACCOUNT_TYPES = {'Asset', 'Liability', 'Equity', 'Income', 'Expense'}
    VALID_CLASSIFICATIONS = {
        'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability',
        'equity', 'operating_revenue', 'other_revenue', 'cogs', 'operating_expense',
        'admin_expense',
    }

    def _account_to_dict(account):
        return {
            'id':                   account.id,
            'code':                 account.code,
            'name':                 account.name,
            'type':                 account.type,
            'classification':       account.classification or '',
            'parent_id':            account.parent_id,
            'parent_code':          account.parent.code if account.parent else None,
            'balance':              float(account.balance or 0),
            'is_active':            bool(account.is_active),
            'children_count':       Account.query.filter_by(parent_id=account.id).count(),
        }

    @app.route('/api/accounts', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_create_account():
        data = request.get_json(silent=True) or {}
        code = (data.get('code') or '').strip()
        name = (data.get('name') or '').strip()
        acct_type = (data.get('type') or '').strip()
        classification = (data.get('classification') or '').strip() or None
        parent_id = data.get('parent_id') or None

        if not code:
            return jsonify({'error': 'رمز الحساب مطلوب'}), 400
        if not name:
            return jsonify({'error': 'اسم الحساب مطلوب'}), 400
        if acct_type not in VALID_ACCOUNT_TYPES:
            return jsonify({'error': f'نوع الحساب غير صحيح — المسموح: {", ".join(VALID_ACCOUNT_TYPES)}'}), 400
        if classification and classification not in VALID_CLASSIFICATIONS:
            return jsonify({'error': 'التصنيف غير صحيح'}), 400
        if Account.query.filter_by(code=code).first():
            return jsonify({'error': f'رمز الحساب {code} مستخدم بالفعل'}), 409

        parent = None
        if parent_id:
            parent = Account.query.get(int(parent_id))
            if not parent:
                return jsonify({'error': 'الحساب الأب غير موجود'}), 400
            if not parent.is_active:
                return jsonify({'error': 'لا يمكن إضافة حساب فرعي تحت حساب مؤرشف'}), 409

        acct = Account(code=code, name=name, type=acct_type, classification=classification,
                       parent_id=parent.id if parent else None, balance=0.0)
        db.session.add(acct)
        db.session.commit()
        log_action('add account', 'Account', acct.id, f'{code} — {name}')
        return jsonify(_account_to_dict(acct)), 201

    @app.route('/api/accounts/<int:account_id>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_update_account(account_id):
        acct = Account.query.get_or_404(account_id)
        data = request.get_json(silent=True) or {}
        requested_active = data.get('is_active') if 'is_active' in data else None
        structural_fields = {'code', 'name', 'type', 'classification', 'parent_id'}
        if requested_active is not None and not isinstance(requested_active, bool):
            return jsonify({'error': 'حالة الحساب يجب أن تكون true أو false'}), 400
        if requested_active is False and Account.query.filter_by(parent_id=acct.id).first():
            return jsonify({'error': 'لا يمكن أرشفة حساب له حسابات فرعية'}), 409
        if requested_active is True and acct.parent and not acct.parent.is_active:
            return jsonify({'error': 'لا يمكن تفعيل حساب أبوه مؤرشف'}), 409

        if structural_fields.intersection(data) and JournalEntryLine.query.filter_by(account_id=acct.id).first():
            return jsonify({'error': 'لا يمكن تعديل حساب مستخدم في القيود المحاسبية'}), 409

        new_code = (data.get('code') or '').strip() or acct.code
        new_name = (data.get('name') or '').strip() or acct.name
        new_type = (data.get('type') or '').strip() or acct.type
        new_clf = (
            (data.get('classification') or '').strip() or None
            if 'classification' in data
            else acct.classification
        )
        new_parent_id = data.get('parent_id')

        if new_type not in VALID_ACCOUNT_TYPES:
            return jsonify({'error': 'نوع الحساب غير صحيح'}), 400
        if new_clf and new_clf not in VALID_CLASSIFICATIONS:
            return jsonify({'error': 'التصنيف غير صحيح'}), 400
        if new_code != acct.code and Account.query.filter_by(code=new_code).first():
            return jsonify({'error': f'رمز الحساب {new_code} مستخدم بالفعل'}), 409

        acct.code = new_code
        acct.name = new_name
        acct.type = new_type
        acct.classification = new_clf
        if new_parent_id is not None:
            parent = Account.query.get(int(new_parent_id)) if new_parent_id else None
            if parent and not parent.is_active:
                return jsonify({'error': 'لا يمكن نقل الحساب تحت حساب مؤرشف'}), 409
            acct.parent_id = parent.id if parent else None
        if requested_active is not None:
            acct.is_active = bool(requested_active)

        action = 'enable account' if requested_active is True else 'disable account' if requested_active is False else 'edit account'
        log_action(action, 'Account', acct.id, f'{new_code} — {new_name}')
        db.session.commit()
        return jsonify(_account_to_dict(acct))

    @app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_delete_account(account_id):
        acct = Account.query.get_or_404(account_id)

        if Account.query.filter_by(parent_id=acct.id).first():
            return jsonify({'error': 'لا يمكن أرشفة حساب له حسابات فرعية'}), 409

        acct.is_active = False
        log_action('archive account', 'Account', acct.id, f'{acct.code} — {acct.name}')
        db.session.commit()
        return jsonify({'success': True, 'is_active': False})

    @app.route('/api/accounts/recompute-balances', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_recompute_account_balances():
        from .accounting import recompute_all_account_balances
        recompute_all_account_balances()
        return jsonify({'success': True, 'message': 'تم إعادة حساب أرصدة جميع الحسابات بنجاح'})

    @app.route('/api/reports/balance-sheet')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_balance_sheet():
        """الميزانية العمومية — الأصول = المطلوبات + حقوق الملكية."""
        _, trial_totals_raw = get_trial_balance(selected_branch_scope_id())
        trial_rows, _ = get_trial_balance(selected_branch_scope_id())
        trial_by_code = {r['code']: r for r in trial_rows}

        def _subtree_balance(account):
            direct = money_value(trial_by_code.get(account.code or '', {}).get('balance', 0))
            return money_value(
                direct + sum((_subtree_balance(child) for child in account.children), ZERO_MONEY)
            )

        def _section(type_filter, negate=False):
            query = Account.query.filter(Account.type == type_filter, Account.parent_id.is_(None))
            accounts = query.all()
            groups = []
            for root in accounts:
                children_data = []
                for child in root.children:
                    bal = _subtree_balance(child)
                    if negate:
                        bal = -bal
                    children_data.append({'id': child.id, 'code': child.code, 'name': child.name, 'balance': bal, 'classification': child.classification or ''})
                root_bal = _subtree_balance(root)
                if negate:
                    root_bal = -root_bal
                groups.append({'id': root.id, 'code': root.code, 'name': root.name, 'balance': root_bal, 'children': children_data})
            return groups

        # نعكس إشارة المطلوبات وحقوق الملكية: هي حسابات دائنة فرصيدها (مدين-دائن) سالب،
        # لكنها تُعرض دائماً بقيمة موجبة في الميزانية العمومية.
        assets      = _section('Asset',     negate=False)
        liabilities = _section('Liability', negate=True)
        equity      = _section('Equity',    negate=True)

        total_assets      = round(sum(g['balance'] for g in assets), 2)
        total_liabilities = round(sum(g['balance'] for g in liabilities), 2)
        total_equity      = round(sum(g['balance'] for g in equity), 2)

        # صافي الدخل = الإيرادات − المصاريف (من ميزان المراجعة مباشرةً).
        # حسابات الإيرادات رصيدها دائن (سالب في نظام Dr-Cr)، والمصاريف مدين (موجب).
        revenue  = round(sum(-r['balance'] for r in trial_rows if r['type'] == 'Income'),  2)
        expenses = round(sum( r['balance'] for r in trial_rows if r['type'] == 'Expense'), 2)
        net_income = round(revenue - expenses, 2)

        # صافي الدخل يُضاف إلى حقوق الملكية لإغلاق المعادلة:
        # الأصول = المطلوبات + حقوق الملكية + صافي الدخل
        total_equity_with_ni = round(total_equity + decimal_value(net_income), 2)
        difference = round(total_assets - (total_liabilities + total_equity_with_ni), 2)

        return jsonify({
            'assets':            assets,
            'liabilities':       liabilities,
            'equity':            equity,
            'total_assets':      total_assets,
            'total_liabilities': total_liabilities,
            'total_equity':      total_equity,
            'net_income':        net_income,
            'revenue':           revenue,
            'expenses':          expenses,
            'total_equity_with_net_income': total_equity_with_ni,
            'total_liabilities_equity': round(total_liabilities + total_equity_with_ni, 2),
            'difference':        difference,
            'is_balanced':       abs(difference) < 0.01,
        })

    # ── Smart Alerts ──────────────────────────────────────────────────────

    @app.route('/api/smart-alerts')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_smart_alerts():
        """مركز التنبيهات الذكية — يجمع كل تنبيهات النظام في طلب واحد."""
        today     = datetime.utcnow().date()
        tomorrow  = today + timedelta(days=1)
        in_3_days = today + timedelta(days=3)
        in_7_days = today + timedelta(days=7)
        alerts: list = []

        # 1. أقساط متأخرة
        overdue_qs = (
            InstallmentSchedule.query
            .join(InstallmentPlan).join(Sale)
            .filter(Sale.status != 'Cancelled',
                    InstallmentSchedule.remaining_amount > 0,
                    InstallmentSchedule.status == 'Overdue')
        )
        if not can_access_all_branches():
            bid = active_branch_id()
            if bid:
                overdue_qs = overdue_qs.filter(InstallmentSchedule.branch_id == bid)
        overdue_schedules = overdue_qs.order_by(InstallmentSchedule.due_date.asc()).all()
        for sc in overdue_schedules[:20]:
            days_late = (today - sc.due_date.date()).days if sc.due_date else 0
            alerts.append({
                'type': 'overdue_installment',
                'severity': 'critical' if days_late > 30 else 'high',
                'title': f'قسط متأخر {days_late} يوم',
                'body': f'{sc.plan.sale.buyer.name} — قسط #{sc.installment_number} بمبلغ {format_money(sc.remaining_amount)} {sc.currency}',
                'link': f'/installments/{sc.plan.sale.installment_plan.id}',
                'date': sc.due_date.isoformat() if sc.due_date else None,
                'days_overdue': days_late,
                'amount': float(sc.remaining_amount),
                'currency': sc.currency,
            })

        # 2. أقساط تستحق خلال 3 أيام
        due_soon_qs = (
            InstallmentSchedule.query
            .join(InstallmentPlan).join(Sale)
            .filter(Sale.status != 'Cancelled',
                    InstallmentSchedule.remaining_amount > 0,
                    InstallmentSchedule.status.in_(['Pending', 'Partial']),
                    func.date(InstallmentSchedule.due_date) <= in_3_days.isoformat(),
                    func.date(InstallmentSchedule.due_date) >= today.isoformat())
        )
        if not can_access_all_branches():
            bid = active_branch_id()
            if bid:
                due_soon_qs = due_soon_qs.filter(InstallmentSchedule.branch_id == bid)
        for sc in due_soon_qs.order_by(InstallmentSchedule.due_date.asc()).all()[:20]:
            days_until = (sc.due_date.date() - today).days if sc.due_date else 0
            label = 'اليوم' if days_until == 0 else f'خلال {days_until} يوم'
            alerts.append({
                'type': 'installment_due_soon',
                'severity': 'warning' if days_until > 0 else 'high',
                'title': f'قسط مستحق {label}',
                'body': f'{sc.plan.sale.buyer.name} — {format_money(sc.remaining_amount)} {sc.currency}',
                'link': f'/installments/{sc.plan.sale.installment_plan.id}',
                'date': sc.due_date.isoformat() if sc.due_date else None,
                'days_until': days_until,
                'amount': float(sc.remaining_amount),
                'currency': sc.currency,
            })

        # 3. مبيعات بدون قيد محاسبي
        missing_je_sales = Sale.query.filter(Sale.status != 'Cancelled').all()
        missing_count = sum(1 for s in missing_je_sales if not has_journal_entry('Sale', s.id))
        if missing_count > 0:
            alerts.append({
                'type': 'missing_journal_entry',
                'severity': 'warning',
                'title': f'{missing_count} فاتورة بيع بدون قيد محاسبي',
                'body': 'يُنصح بتشغيل إعادة الحساب من صفحة سلامة المحاسبة',
                'link': '/reports/accounting-rules',
                'count': missing_count,
            })

        # 4. قيود غير متوازنة
        unbalanced = []
        for je in scoped_query(JournalEntry).all():
            td = sum((decimal_value(line.debit) for line in je.lines), ZERO_MONEY)
            tc = sum((decimal_value(line.credit) for line in je.lines), ZERO_MONEY)
            if abs(td - tc) > 0.01:
                unbalanced.append(je.id)
        if unbalanced:
            alerts.append({
                'type': 'unbalanced_journal_entries',
                'severity': 'critical',
                'title': f'{len(unbalanced)} قيد محاسبي غير متوازن',
                'body': f'القيود: {unbalanced[:5]}{"..." if len(unbalanced) > 5 else ""}',
                'link': '/reports/accounting-rules',
                'count': len(unbalanced),
            })

        # 5. ميزانية غير متوازنة
        try:
            _, trial_totals = get_trial_balance(selected_branch_scope_id())
            td = decimal_value(trial_totals.get('total_debit', 0))
            tc = decimal_value(trial_totals.get('total_credit', 0))
            if abs(td - tc) > 0.01:
                alerts.append({
                    'type': 'unbalanced_trial_balance',
                    'severity': 'critical',
                    'title': 'ميزان المراجعة غير متوازن',
                    'body': f'الفرق: {format_money(abs(td - tc))} — راجع القيود المحاسبية',
                    'link': '/trial-balance',
                    'difference': round(td - tc, 2),
                })
        except Exception:
            pass

        # 6. مخزون منخفض (أقل من 3 سيارات)
        available_count = Car.query.filter_by(status='Available').count()
        if available_count < 3:
            alerts.append({
                'type': 'low_inventory',
                'severity': 'warning',
                'title': f'مخزون منخفض — {available_count} سيارة متاحة فقط',
                'body': 'يُنصح بإضافة سيارات للمخزون',
                'link': '/inventory',
                'count': available_count,
            })

        # 6b. انتهاء صلاحية هوية العملاء خلال 30 يوم
        expiry_threshold = today + timedelta(days=30)
        expiring_customers = Customer.query.filter(
            Customer.id_expiry_date.isnot(None),
            func.date(Customer.id_expiry_date) <= expiry_threshold.isoformat(),
            func.date(Customer.id_expiry_date) >= today.isoformat(),
        ).limit(10).all()
        for c in expiring_customers:
            days_left = (c.id_expiry_date.date() - today).days
            alerts.append({
                'type': 'id_expiry',
                'severity': 'high' if days_left <= 7 else 'warning',
                'title': f'هوية تنتهي خلال {days_left} يوم',
                'body': f'{c.full_name or c.name} — {c.id_type or "هوية"} رقم {c.id_number}',
                'link': f'/customers/{c.id}',
                'days_left': days_left,
            })

        expired_customers = Customer.query.filter(
            Customer.id_expiry_date.isnot(None),
            func.date(Customer.id_expiry_date) < today.isoformat(),
        ).limit(5).all()
        if expired_customers:
            alerts.append({
                'type': 'id_expired',
                'severity': 'high',
                'title': f'{len(expired_customers)} عميل هويته منتهية الصلاحية',
                'body': '، '.join(c.full_name or c.name for c in expired_customers[:3]),
                'link': '/customers',
                'count': len(expired_customers),
            })

        # 7. مصاريف كبيرة هذا الشهر
        month_start = today.replace(day=1)
        big_expenses = (
            Expense.query
            .filter(Expense.expense_date >= month_start.isoformat())
            .all()
        )
        total_expenses_iqd = sum(to_iqd(e.amount, e.currency) or 0 for e in big_expenses)
        if total_expenses_iqd > 5_000_000:
            alerts.append({
                'type': 'high_monthly_expenses',
                'severity': 'info',
                'title': f'مصاريف مرتفعة هذا الشهر',
                'body': f'إجمالي المصاريف: {format_money(total_expenses_iqd)} دينار',
                'link': '/expenses',
                'amount_iqd': round(total_expenses_iqd, 2),
            })

        severity_order = {'critical': 0, 'high': 1, 'warning': 2, 'info': 3}
        alerts.sort(key=lambda a: severity_order.get(a.get('severity', 'info'), 9))

        counts = {
            'total':    len(alerts),
            'critical': sum(1 for a in alerts if a['severity'] == 'critical'),
            'high':     sum(1 for a in alerts if a['severity'] == 'high'),
            'warning':  sum(1 for a in alerts if a['severity'] == 'warning'),
            'info':     sum(1 for a in alerts if a['severity'] == 'info'),
        }
        return jsonify({'alerts': alerts, 'counts': counts})

    # ── Smart Daily Summary ────────────────────────────────────────────────

    @app.route('/api/reports/smart-summary')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_smart_summary():
        """ملخص ذكي يومي — ما الذي حصل اليوم؟ وما الذي يحتاج انتباهاً؟"""
        today      = datetime.utcnow().date()
        week_ago   = today - timedelta(days=7)
        month_ago  = today - timedelta(days=30)

        # مبيعات اليوم
        today_sales = Sale.query.filter(
            func.date(Sale.sale_date) == today.isoformat(),
            Sale.status != 'Cancelled'
        ).all()
        today_revenue_iqd = sum(
            to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0
            for s in today_sales
        )

        # مبيعات هذا الأسبوع
        week_sales = Sale.query.filter(
            func.date(Sale.sale_date) >= week_ago.isoformat(),
            Sale.status != 'Cancelled'
        ).count()

        # أقساط تستحق اليوم
        due_today = InstallmentSchedule.query.filter(
            func.date(InstallmentSchedule.due_date) == today.isoformat(),
            InstallmentSchedule.remaining_amount > 0
        ).count()

        # أقساط متأخرة
        overdue_count = InstallmentSchedule.query.filter(
            InstallmentSchedule.status == 'Overdue',
            InstallmentSchedule.remaining_amount > 0
        ).count()
        overdue_amount = db.session.query(
            func.sum(InstallmentSchedule.remaining_amount)
        ).filter(
            InstallmentSchedule.status == 'Overdue',
            InstallmentSchedule.remaining_amount > 0
        ).scalar() or 0

        # إجمالي نقد اليوم
        today_payments = Payment.query.filter(
            func.date(Payment.payment_date) == today.isoformat()
        ).all()
        today_cash_iqd = sum(to_iqd(p.amount, p.currency) or 0 for p in today_payments)

        # مصاريف اليوم
        today_expenses = Expense.query.filter(
            func.date(Expense.expense_date) == today.isoformat()
        ).all()
        today_exp_iqd = sum(to_iqd(e.amount, e.currency) or 0 for e in today_expenses)

        # سيارات متاحة
        available_cars = Car.query.filter_by(status='Available').count()

        # حالة الميزان
        try:
            _, trial_totals = get_trial_balance(selected_branch_scope_id())
            td = decimal_value(trial_totals.get('total_debit', 0))
            tc = decimal_value(trial_totals.get('total_credit', 0))
            trial_balanced = abs(td - tc) < 0.01
        except Exception:
            trial_balanced = None

        # صياغة الملخص النصي
        lines = []
        if today_sales:
            lines.append(f'تم إتمام {len(today_sales)} عملية بيع اليوم بإجمالي إيرادات {format_money(today_revenue_iqd)} دينار.')
        else:
            lines.append('لا توجد مبيعات اليوم بعد.')
        if today_cash_iqd > 0:
            lines.append(f'تم استلام {format_money(today_cash_iqd)} دينار نقداً.')
        if today_exp_iqd > 0:
            lines.append(f'تم تسجيل مصاريف بقيمة {format_money(today_exp_iqd)} دينار.')
        if due_today > 0:
            lines.append(f'يوجد {due_today} قسط مستحق اليوم يحتاج متابعة.')
        if overdue_count > 0:
            lines.append(f'تنبيه: {overdue_count} قسط متأخر بإجمالي {format_money(overdue_amount)} دينار.')
        if available_cars < 5:
            lines.append(f'تحذير: المخزون منخفض — {available_cars} سيارة متاحة فقط.')
        if trial_balanced is False:
            lines.append('تحذير محاسبي: ميزان المراجعة غير متوازن.')
        elif trial_balanced is True:
            lines.append('الحسابات متوازنة — لا مشاكل محاسبية.')

        return jsonify({
            'date': today.isoformat(),
            'summary_text': ' '.join(lines),
            'kpis': {
                'today_sales_count':   len(today_sales),
                'today_revenue_iqd':   round(today_revenue_iqd, 2),
                'today_cash_iqd':      round(today_cash_iqd, 2),
                'today_expenses_iqd':  round(today_exp_iqd, 2),
                'week_sales_count':    week_sales,
                'due_today_count':     due_today,
                'overdue_count':       overdue_count,
                'overdue_amount_iqd':  round(float(overdue_amount), 2),
                'available_cars':      available_cars,
                'trial_balanced':      trial_balanced,
            },
        })

    # ── Cash Flow Forecast ────────────────────────────────────────────────

    @app.route('/api/reports/cash-flow-forecast')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_cash_flow_forecast():
        """توقع التدفق النقدي للـ 60 يوم القادمة أسبوعياً."""
        today = datetime.utcnow().date()
        weeks = 8  # 8 أسابيع = ~60 يوم

        # متوسط المصاريف الأسبوعية من آخر 12 أسبوع
        twelve_weeks_ago = today - timedelta(weeks=12)
        past_expenses = Expense.query.filter(
            Expense.expense_date >= twelve_weeks_ago.isoformat()
        ).all()
        avg_weekly_expense = sum(to_iqd(e.amount, e.currency) or 0 for e in past_expenses) / max(12, 1)

        result = []
        for w in range(weeks):
            week_start = today + timedelta(weeks=w)
            week_end   = week_start + timedelta(days=6)

            # أقساط مستحقة هذا الأسبوع
            due_qs = InstallmentSchedule.query.filter(
                func.date(InstallmentSchedule.due_date) >= week_start.isoformat(),
                func.date(InstallmentSchedule.due_date) <= week_end.isoformat(),
                InstallmentSchedule.remaining_amount > 0,
                InstallmentSchedule.status.in_(['Pending', 'Partial', 'Overdue']),
            )
            expected_inflow = sum(
                to_iqd(sc.remaining_amount, sc.currency) or 0
                for sc in due_qs.all()
            )

            # مدفوعات شراء متبقية (قرّب بالمتوسط التاريخي)
            purchase_payments_this_week = Payment.query.filter(
                func.date(Payment.payment_date) >= (week_start - timedelta(weeks=12)).isoformat(),
                func.date(Payment.payment_date) <= (week_start - timedelta(weeks=12) + timedelta(days=6)).isoformat(),
                Payment.payment_type == 'purchase',
            ).all()
            expected_outflow_purchases = sum(to_iqd(p.amount, p.currency) or 0 for p in purchase_payments_this_week)

            expected_outflow = round(avg_weekly_expense + expected_outflow_purchases, 2)
            net = round(expected_inflow - expected_outflow, 2)

            risk = 'low'
            if net < 0:
                risk = 'critical'
            elif net < avg_weekly_expense * 0.3:
                risk = 'warning'

            result.append({
                'week':             w + 1,
                'week_start':       week_start.isoformat(),
                'week_end':         week_end.isoformat(),
                'expected_inflow':  round(expected_inflow, 2),
                'expected_outflow': expected_outflow,
                'net':              net,
                'risk':             risk,
                'installments_due': due_qs.count(),
            })

        total_inflow  = round(sum(r['expected_inflow']  for r in result), 2)
        total_outflow = round(sum(r['expected_outflow'] for r in result), 2)
        critical_weeks = [r['week'] for r in result if r['risk'] == 'critical']

        return jsonify({
            'weeks':           result,
            'total_inflow':    total_inflow,
            'total_outflow':   total_outflow,
            'net_60_days':     round(total_inflow - total_outflow, 2),
            'critical_weeks':  critical_weeks,
            'avg_weekly_expense': round(avg_weekly_expense, 2),
        })

    # ── Month-over-Month Comparison ───────────────────────────────────────

    @app.route('/api/reports/mom-comparison')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_mom_comparison():
        """مقارنة الشهر الحالي بالشهر الماضي — مبيعات، مصاريف، ربح."""
        today       = datetime.utcnow().date()
        this_month  = today.replace(day=1)
        last_month  = (this_month - timedelta(days=1)).replace(day=1)

        def month_stats(start: 'date', end: 'date') -> dict:
            sales = Sale.query.filter(
                func.date(Sale.sale_date) >= start.isoformat(),
                func.date(Sale.sale_date) <= end.isoformat(),
                Sale.status != 'Cancelled',
            ).all()
            purchases = Purchase.query.filter(
                func.date(Purchase.purchase_date) >= start.isoformat(),
                func.date(Purchase.purchase_date) <= end.isoformat(),
                Purchase.status != 'Cancelled',
            ).all()
            expenses = Expense.query.filter(
                func.date(Expense.expense_date) >= start.isoformat(),
                func.date(Expense.expense_date) <= end.isoformat(),
            ).all()
            payments = Payment.query.filter(
                func.date(Payment.payment_date) >= start.isoformat(),
                func.date(Payment.payment_date) <= end.isoformat(),
            ).all()

            revenue   = sum(to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0 for s in sales)
            cost      = sum(to_iqd(p.purchase_price, p.currency) or 0 for p in purchases)
            exp_total = sum(to_iqd(e.amount, e.currency) or 0 for e in expenses)
            cash_in   = sum(to_iqd(p.amount, p.currency) or 0 for p in payments if p.payment_type in ('sale', 'installment'))
            return {
                'sales_count':    len(sales),
                'revenue':        round(revenue, 2),
                'cost':           round(cost, 2),
                'expenses':       round(exp_total, 2),
                'gross_profit':   round(revenue - cost, 2),
                'net_profit':     round(revenue - cost - exp_total, 2),
                'cash_in':        round(cash_in, 2),
            }

        import calendar as _cal
        last_day_this = today
        last_day_last = (_cal.monthrange(last_month.year, last_month.month)[1])
        last_month_end = last_month.replace(day=last_day_last)

        this = month_stats(this_month, today)
        last = month_stats(last_month, last_month_end)

        def pct_change(now, prev):
            if prev == 0:
                return None
            return round((now - prev) / prev * 100, 1)

        return jsonify({
            'this_month': {'label': this_month.strftime('%B %Y'), **this},
            'last_month': {'label': last_month.strftime('%B %Y'), **last},
            'changes': {
                'sales_count':  pct_change(this['sales_count'],  last['sales_count']),
                'revenue':      pct_change(this['revenue'],      last['revenue']),
                'expenses':     pct_change(this['expenses'],     last['expenses']),
                'gross_profit': pct_change(this['gross_profit'], last['gross_profit']),
                'net_profit':   pct_change(this['net_profit'],   last['net_profit']),
                'cash_in':      pct_change(this['cash_in'],      last['cash_in']),
            },
        })

    # ── Monthly Profit Report ─────────────────────────────────────────────

    @app.route('/api/reports/monthly-profit')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_monthly_profit():
        """تقرير الأرباح الشهرية — آخر N شهر."""
        import calendar as _cal
        months_count = min(int(request.args.get('months', 12)), 24)
        today = datetime.utcnow().date()
        rows = []
        ARABIC_MONTHS = [
            '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
        ]
        for i in range(months_count - 1, -1, -1):
            # احسب بداية الشهر
            year  = today.year
            month = today.month - i
            while month <= 0:
                month += 12
                year  -= 1
            start = datetime(year, month, 1).date()
            end   = datetime(year, month, _cal.monthrange(year, month)[1]).date()

            sales = Sale.query.filter(
                func.date(Sale.sale_date) >= start.isoformat(),
                func.date(Sale.sale_date) <= end.isoformat(),
                Sale.status != 'Cancelled',
            ).all()
            purchases = Purchase.query.filter(
                func.date(Purchase.purchase_date) >= start.isoformat(),
                func.date(Purchase.purchase_date) <= end.isoformat(),
                Purchase.status != 'Cancelled',
            ).all()
            expenses = Expense.query.filter(
                func.date(Expense.expense_date) >= start.isoformat(),
                func.date(Expense.expense_date) <= end.isoformat(),
            ).all()

            revenue   = sum(to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0 for s in sales)
            cost      = sum(to_iqd(p.purchase_price, p.currency) or 0 for p in purchases)
            exp_total = sum(to_iqd(e.amount, e.currency) or 0 for e in expenses)

            rows.append({
                'month':        f'{year:04d}-{month:02d}',
                'label':        f'{ARABIC_MONTHS[month]} {year}',
                'sales_count':  len(sales),
                'revenue':      round(revenue, 2),
                'cost':         round(cost, 2),
                'expenses':     round(exp_total, 2),
                'gross_profit': round(revenue - cost, 2),
                'net_profit':   round(revenue - cost - exp_total, 2),
            })

        totals = {
            'revenue':      round(sum(r['revenue']      for r in rows), 2),
            'cost':         round(sum(r['cost']         for r in rows), 2),
            'expenses':     round(sum(r['expenses']     for r in rows), 2),
            'gross_profit': round(sum(r['gross_profit'] for r in rows), 2),
            'net_profit':   round(sum(r['net_profit']   for r in rows), 2),
            'sales_count':  sum(r['sales_count']        for r in rows),
        }
        return jsonify({'months': rows, 'totals': totals})

    # ── Anomaly Detection ─────────────────────────────────────────────────

    @app.route('/api/reports/anomalies')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_anomalies():
        """كشف الشذوذ في المعاملات — مبيعات منخفضة الثمن، مصاريف مرتفعة، أخطاء."""
        today      = datetime.utcnow().date()
        month_ago  = today - timedelta(days=90)
        anomalies: list = []

        # ── 1. مبيعات بسعر أقل من متوسط نوع السيارة ─────────────────────
        recent_sales = Sale.query.filter(
            func.date(Sale.sale_date) >= month_ago.isoformat(),
            Sale.status != 'Cancelled',
        ).all()
        if len(recent_sales) >= 3:
            avg_price_iqd = sum(to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0 for s in recent_sales) / len(recent_sales)
            for s in recent_sales:
                net = to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0
                if avg_price_iqd > 0 and net < avg_price_iqd * 0.65:
                    anomalies.append({
                        'type':     'low_price_sale',
                        'severity': 'warning',
                        'title':    f'بيع بسعر منخفض جداً',
                        'body':     f'فاتورة {s.invoice_number}: {format_money(net)} دينار (المتوسط {format_money(avg_price_iqd)})',
                        'link':     f'/sales/{s.id}',
                        'date':     s.sale_date.isoformat() if s.sale_date else None,
                        'value':    round(net, 2),
                        'avg':      round(avg_price_iqd, 2),
                    })

        # ── 2. بيع بأقل من سعر الشراء ──────────────────────────────────
        for s in recent_sales:
            car = s.car
            if not car:
                continue
            cost = to_iqd(car.purchase_price, car.currency) or 0
            net  = to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0
            if cost > 0 and net < cost * 0.97:
                anomalies.append({
                    'type':     'sale_below_cost',
                    'severity': 'high',
                    'title':    f'بيع بخسارة',
                    'body':     f'فاتورة {s.invoice_number} — بيع بـ {format_money(net)} والتكلفة {format_money(cost)} دينار',
                    'link':     f'/sales/{s.id}',
                    'date':     s.sale_date.isoformat() if s.sale_date else None,
                    'loss':     round(cost - net, 2),
                })

        # ── 3. مصاريف مرتفعة بشكل غير معتاد ───────────────────────────
        past_expenses = Expense.query.filter(
            func.date(Expense.expense_date) >= month_ago.isoformat()
        ).all()
        if len(past_expenses) >= 5:
            exp_amounts = sorted([to_iqd(e.amount, e.currency) or 0 for e in past_expenses])
            p75 = exp_amounts[int(len(exp_amounts) * 0.75)]
            threshold = max(p75 * 3, 500_000)
            for e in past_expenses:
                amt = to_iqd(e.amount, e.currency) or 0
                if amt >= threshold:
                    anomalies.append({
                        'type':     'high_expense',
                        'severity': 'warning',
                        'title':    f'مصروف مرتفع بشكل غير معتاد',
                        'body':     f'{e.title}: {format_money(amt)} دينار (العتبة الطبيعية {format_money(threshold)})',
                        'link':     '/expenses',
                        'date':     e.expense_date.isoformat() if e.expense_date else None,
                        'amount':   round(amt, 2),
                        'threshold': round(threshold, 2),
                    })

        # ── 4. دفعة قسط تتجاوز المبلغ المتبقي ─────────────────────────
        recent_payments = Payment.query.filter(
            func.date(Payment.payment_date) >= month_ago.isoformat(),
            Payment.payment_type == 'installment',
        ).all()
        for p in recent_payments:
            if p.installment_schedule and p.amount > (p.installment_schedule.amount * Decimal('1.05')):
                anomalies.append({
                    'type':     'overpayment',
                    'severity': 'info',
                    'title':    'دفعة تتجاوز قيمة القسط',
                    'body':     f'دفعة #{p.id}: {format_money(p.amount)} والقسط {format_money(p.installment_schedule.amount)} {p.currency}',
                    'link':     f'/installments/{p.installment_schedule.installment_plan_id}',
                    'date':     p.payment_date.isoformat() if p.payment_date else None,
                })

        # ── 5. مبيعات بدون مشتري موثق ─────────────────────────────────
        for s in recent_sales:
            if not s.buyer:
                anomalies.append({
                    'type':     'sale_no_buyer',
                    'severity': 'high',
                    'title':    'فاتورة بيع بدون مشتري',
                    'body':     f'فاتورة {s.invoice_number}',
                    'link':     f'/sales/{s.id}',
                    'date':     s.sale_date.isoformat() if s.sale_date else None,
                })

        severity_order = {'high': 0, 'warning': 1, 'info': 2}
        anomalies.sort(key=lambda a: severity_order.get(a.get('severity', 'info'), 9))

        return jsonify({
            'anomalies': anomalies,
            'count':     len(anomalies),
            'by_type': {t: sum(1 for a in anomalies if a['type'] == t) for t in {a['type'] for a in anomalies}},
        })

    # ── Global Smart Search ───────────────────────────────────────────────

    @app.route('/api/search')
    @api_login_required
    @api_permission_required('manage_customers')
    def api_global_search():
        """بحث شامل في كل السجلات — عملاء، سيارات، مبيعات، أقساط."""
        q = (request.args.get('q') or '').strip()
        if len(q) < 2:
            return jsonify({'results': [], 'total': 0, 'query': q})

        like = f'%{q}%'
        results: list = []

        # عملاء
        customers = Customer.query.filter(
            or_(Customer.name.ilike(like), Customer.full_name.ilike(like),
                Customer.phone.ilike(like), Customer.id_number.ilike(like))
        ).limit(8).all()
        for c in customers:
            results.append({
                'type': 'customer', 'type_label': 'عميل',
                'id': c.id, 'title': c.full_name or c.name,
                'sub': c.phone, 'link': f'/customers/{c.id}',
            })

        # سيارات
        cars = Car.query.filter(
            or_(Car.brand.ilike(like), Car.model.ilike(like),
                Car.vin.ilike(like), Car.plate_number.ilike(like),
                Car.color.ilike(like))
        ).limit(8).all()
        for c in cars:
            results.append({
                'type': 'car', 'type_label': 'سيارة',
                'id': c.id,
                'title': f'{c.brand} {c.model} {c.manufacturing_year}',
                'sub': f'{c.plate_number} — {c.status}',
                'link': f'/inventory/{c.id}',
            })

        # مبيعات
        sales = Sale.query.filter(
            or_(Sale.invoice_number.ilike(like))
        ).limit(5).all()
        for s in sales:
            buyer_name = (s.buyer.full_name or s.buyer.name) if s.buyer else '—'
            results.append({
                'type': 'sale', 'type_label': 'فاتورة بيع',
                'id': s.id, 'title': s.invoice_number,
                'sub': buyer_name, 'link': f'/sales/{s.id}',
            })

        # مشتريات
        purchases = Purchase.query.filter(
            Purchase.invoice_number.ilike(like)
        ).limit(5).all()
        for p in purchases:
            seller_name = (p.seller.full_name or p.seller.name) if p.seller else '—'
            results.append({
                'type': 'purchase', 'type_label': 'فاتورة شراء',
                'id': p.id, 'title': p.invoice_number,
                'sub': seller_name, 'link': f'/purchases/{p.id}',
            })

        # بحث بالاسم في المبيعات
        if customers:
            buyer_ids = [c.id for c in customers]
            extra_sales = Sale.query.filter(
                Sale.buyer_id.in_(buyer_ids),
                Sale.status != 'Cancelled',
            ).limit(5).all()
            for s in extra_sales:
                if not any(r['type'] == 'sale' and r['id'] == s.id for r in results):
                    buyer_name = (s.buyer.full_name or s.buyer.name) if s.buyer else '—'
                    results.append({
                        'type': 'sale', 'type_label': 'فاتورة بيع',
                        'id': s.id, 'title': s.invoice_number,
                        'sub': f'{buyer_name} — بيع',
                        'link': f'/sales/{s.id}',
                    })

        return jsonify({'results': results[:20], 'total': len(results), 'query': q})

    # ══════════════════════════════════════════════════════════════════════
    #  CRM — Customer Relationship Management
    # ══════════════════════════════════════════════════════════════════════

    INTERACTION_TYPES = ['call', 'whatsapp', 'visit', 'test_drive', 'email', 'other']
    INTERACTION_LABELS = {
        'call': 'مكالمة هاتفية', 'whatsapp': 'واتساب', 'visit': 'زيارة للمعرض',
        'test_drive': 'تجربة قيادة', 'email': 'بريد إلكتروني', 'other': 'أخرى',
    }
    OUTCOME_LABELS = {
        'interested': 'مهتم', 'not_interested': 'غير مهتم',
        'follow_up': 'متابعة لاحقة', 'closed': 'أُغلق',
    }

    def _interaction_dict(i):
        return {
            'id':               i.id,
            'customer_id':      i.customer_id,
            'customer_name':    (i.customer.full_name or i.customer.name) if i.customer else None,
            'employee_id':      i.employee_id,
            'employee_name':    i.employee.full_name if i.employee else None,
            'interaction_type': i.interaction_type,
            'type_label':       INTERACTION_LABELS.get(i.interaction_type, i.interaction_type),
            'notes':            i.notes,
            'outcome':          i.outcome,
            'outcome_label':    OUTCOME_LABELS.get(i.outcome or '', i.outcome or ''),
            'follow_up_date':   i.follow_up_date.isoformat() if i.follow_up_date else None,
            'interaction_date': i.interaction_date.isoformat() if i.interaction_date else None,
            'created_at':       i.created_at.isoformat() if i.created_at else None,
        }

    @app.route('/api/crm/interactions')
    @api_login_required
    @api_permission_required('manage_customers')
    def api_crm_interactions():
        customer_id = request.args.get('customer_id', type=int)
        page        = int(request.args.get('page', 1))
        per_page    = min(int(request.args.get('per_page', 30)), 100)
        itype       = request.args.get('type')
        outcome     = request.args.get('outcome')

        q = CustomerInteraction.query.join(Customer).order_by(CustomerInteraction.interaction_date.desc())
        if customer_id:
            q = q.filter(CustomerInteraction.customer_id == customer_id)
        if itype:
            q = q.filter(CustomerInteraction.interaction_type == itype)
        if outcome:
            q = q.filter(CustomerInteraction.outcome == outcome)

        # فلترة الفرع
        if not can_access_all_branches():
            bid = active_branch_id()
            if bid:
                q = q.filter(CustomerInteraction.branch_id == bid)

        total = q.count()
        items = q.offset((page - 1) * per_page).limit(per_page).all()

        # أقرب متابعات
        today = datetime.utcnow().date()
        due_soon_q = CustomerInteraction.query.filter(
            CustomerInteraction.follow_up_date.isnot(None),
            func.date(CustomerInteraction.follow_up_date) >= today.isoformat(),
            func.date(CustomerInteraction.follow_up_date) <= (today + timedelta(days=3)).isoformat(),
        )
        if not can_access_all_branches():
            bid = active_branch_id()
            if bid:
                due_soon_q = due_soon_q.filter(CustomerInteraction.branch_id == bid)
        due_soon = due_soon_q.order_by(CustomerInteraction.follow_up_date.asc()).limit(10).all()

        return jsonify({
            'total':    total,
            'page':     page,
            'per_page': per_page,
            'items':    [_interaction_dict(i) for i in items],
            'due_soon': [_interaction_dict(i) for i in due_soon],
            'type_labels':    INTERACTION_LABELS,
            'outcome_labels': OUTCOME_LABELS,
        })

    @app.route('/api/crm/interactions', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_crm_create_interaction():
        data = request.get_json(silent=True) or {}
        customer_id = data.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'customer_id مطلوب'}), 400
        customer = Customer.query.get_or_404(int(customer_id))
        if not branch_allowed(customer):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل في فرع آخر'}), 403

        itype = (data.get('interaction_type') or 'call').strip()
        if itype not in INTERACTION_TYPES:
            return jsonify({'error': 'نوع التفاعل غير صحيح'}), 400

        follow_up = None
        if data.get('follow_up_date'):
            try:
                follow_up = datetime.strptime(data['follow_up_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'صيغة تاريخ المتابعة غير صحيحة'}), 400

        inter = CustomerInteraction(
            branch_id        = customer.branch_id,
            customer_id      = customer.id,
            employee_id      = int(data['employee_id']) if data.get('employee_id') else None,
            created_by_id    = current_user.id if current_user.is_authenticated else None,
            interaction_type = itype,
            notes            = (data.get('notes') or '').strip() or None,
            outcome          = (data.get('outcome') or '').strip() or None,
            follow_up_date   = follow_up,
            interaction_date = datetime.strptime(data['interaction_date'], '%Y-%m-%d') if data.get('interaction_date') else datetime.utcnow(),
        )
        db.session.add(inter)
        log_action('add_interaction', 'CustomerInteraction', None, f'customer={customer.id} type={itype}')
        db.session.commit()
        return jsonify(_interaction_dict(inter)), 201

    @app.route('/api/crm/interactions/<int:iid>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_crm_update_interaction(iid):
        inter = CustomerInteraction.query.get_or_404(iid)
        if not branch_allowed(inter):
            return jsonify({'error': 'لا يمكنك الوصول إلى تفاعلات فرع آخر'}), 403
        data  = request.get_json(silent=True) or {}
        if 'interaction_type' in data and data['interaction_type'] in INTERACTION_TYPES:
            inter.interaction_type = data['interaction_type']
        if 'notes' in data:
            inter.notes = (data['notes'] or '').strip() or None
        if 'outcome' in data:
            inter.outcome = (data['outcome'] or '').strip() or None
        if 'follow_up_date' in data:
            inter.follow_up_date = datetime.strptime(data['follow_up_date'], '%Y-%m-%d') if data['follow_up_date'] else None
        db.session.commit()
        return jsonify(_interaction_dict(inter))

    @app.route('/api/crm/interactions/<int:iid>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_crm_delete_interaction(iid):
        inter = CustomerInteraction.query.get_or_404(iid)
        if not branch_allowed(inter):
            return jsonify({'error': 'لا يمكنك الوصول إلى تفاعلات فرع آخر'}), 403
        db.session.delete(inter)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/crm/summary')
    @api_login_required
    @api_permission_required('manage_customers')
    def api_crm_summary():
        """إحصائيات CRM السريعة."""
        today     = datetime.utcnow().date()
        week_ago  = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        total_customers   = scoped_query(Customer).count()
        new_this_month    = scoped_query(Customer).filter(func.date(Customer.created_at) >= month_ago.isoformat()).count()
        interactions_week = scoped_query(CustomerInteraction).filter(func.date(CustomerInteraction.interaction_date) >= week_ago.isoformat()).count()
        follow_ups_due_q  = scoped_query(CustomerInteraction).filter(
            CustomerInteraction.follow_up_date.isnot(None),
            func.date(CustomerInteraction.follow_up_date) <= today.isoformat(),
            CustomerInteraction.outcome.in_([None, 'follow_up']),
        )
        follow_ups_due    = follow_ups_due_q.count()

        by_type = {}
        by_type_q = db.session.query(CustomerInteraction.interaction_type, func.count())
        by_type_q = branch_filter(by_type_q, CustomerInteraction)
        for row in by_type_q.group_by(CustomerInteraction.interaction_type).all():
            by_type[row[0]] = {'count': row[1], 'label': INTERACTION_LABELS.get(row[0], row[0])}

        by_outcome = {}
        for row in db.session.query(CustomerInteraction.outcome, func.count()).filter(CustomerInteraction.outcome.isnot(None)).group_by(CustomerInteraction.outcome).all():
            by_outcome[row[0]] = {'count': row[1], 'label': OUTCOME_LABELS.get(row[0], row[0])}

        return jsonify({
            'total_customers':   total_customers,
            'new_this_month':    new_this_month,
            'interactions_week': interactions_week,
            'follow_ups_due':    follow_ups_due,
            'by_type':           by_type,
            'by_outcome':        by_outcome,
        })

    # ══════════════════════════════════════════════════════════════════════
    #  Sales Pipeline
    # ══════════════════════════════════════════════════════════════════════

    PIPELINE_STAGES = ['lead', 'contacted', 'test_drive', 'negotiating', 'reserved', 'won', 'lost']
    PIPELINE_STAGE_LABELS = {
        'lead':        'مهتم',
        'contacted':   'تم التواصل',
        'test_drive':  'تجربة قيادة',
        'negotiating': 'تفاوض',
        'reserved':    'محجوز',
        'won':         'مكتمل ✅',
        'lost':        'خسر ❌',
    }
    PIPELINE_STAGE_COLORS = {
        'lead':        'slate',
        'contacted':   'cyan',
        'test_drive':  'violet',
        'negotiating': 'amber',
        'reserved':    'orange',
        'won':         'emerald',
        'lost':        'rose',
    }

    def _deal_dict(d):
        return {
            'id':             d.id,
            'customer_id':    d.customer_id,
            'customer_name':  (d.customer.full_name or d.customer.name) if d.customer else None,
            'customer_phone': d.customer.phone if d.customer else None,
            'car_id':         d.car_id,
            'car_name':       f'{d.car.brand} {d.car.model} {d.car.manufacturing_year}' if d.car else None,
            'assigned_to_id': d.assigned_to_id,
            'assigned_name':  d.assigned_to.full_name if d.assigned_to else None,
            'sale_id':        d.sale_id,
            'stage':          d.stage,
            'stage_label':    PIPELINE_STAGE_LABELS.get(d.stage, d.stage),
            'stage_color':    PIPELINE_STAGE_COLORS.get(d.stage, 'slate'),
            'expected_price': d.expected_price,
            'currency':       d.currency,
            'notes':          d.notes,
            'lost_reason':    d.lost_reason,
            'stage_changed_at': d.stage_changed_at.isoformat() if d.stage_changed_at else None,
            'created_at':     d.created_at.isoformat() if d.created_at else None,
            'days_in_stage':  (datetime.utcnow() - d.stage_changed_at).days if d.stage_changed_at else 0,
        }

    @app.route('/api/pipeline')
    @api_login_required
    @api_permission_required('manage_sales')
    def api_pipeline():
        """عرض Pipeline مجمّع حسب المراحل."""
        stage_filter    = request.args.get('stage')
        employee_filter = request.args.get('employee_id', type=int)

        q = SalePipeline.query.order_by(SalePipeline.stage_changed_at.desc())
        if stage_filter:
            q = q.filter(SalePipeline.stage == stage_filter)
        if employee_filter:
            q = q.filter(SalePipeline.assigned_to_id == employee_filter)
        if not can_access_all_branches():
            bid = active_branch_id()
            if bid:
                q = q.filter(SalePipeline.branch_id == bid)

        deals = q.all()

        # تجميع حسب المراحل
        by_stage: dict = {s: [] for s in PIPELINE_STAGES}
        for d in deals:
            if d.stage in by_stage:
                by_stage[d.stage].append(_deal_dict(d))

        # إحصائيات
        active_deals = [d for d in deals if d.stage not in ('won', 'lost')]
        total_expected = sum(to_iqd(d.expected_price or 0, d.currency) or 0 for d in active_deals)
        conversion_rate = 0.0
        non_lead = [d for d in deals if d.stage != 'lead']
        if non_lead:
            won = sum(1 for d in deals if d.stage == 'won')
            conversion_rate = round(won / len(non_lead) * 100, 1)

        return jsonify({
            'by_stage':       by_stage,
            'stage_labels':   PIPELINE_STAGE_LABELS,
            'stage_colors':   PIPELINE_STAGE_COLORS,
            'total_deals':    len(deals),
            'active_deals':   len(active_deals),
            'total_expected_iqd': round(total_expected, 2),
            'conversion_rate':    conversion_rate,
            'won_count':      sum(1 for d in deals if d.stage == 'won'),
            'lost_count':     sum(1 for d in deals if d.stage == 'lost'),
        })

    @app.route('/api/pipeline', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_pipeline_create():
        data = request.get_json(silent=True) or {}
        customer_id = data.get('customer_id')
        if not customer_id:
            return jsonify({'error': 'customer_id مطلوب'}), 400
        customer = Customer.query.get_or_404(int(customer_id))
        if not branch_allowed(customer):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل في فرع آخر'}), 403

        car_id = data.get('car_id')
        if car_id:
            car = Car.query.get_or_404(int(car_id))
            if not branch_allowed(car):
                return jsonify({'error': 'السيارة المحددة تابعة لفرع آخر'}), 403

        emp_id = data.get('assigned_to_id')
        if emp_id:
            emp = Employee.query.get_or_404(int(emp_id))
            if not branch_allowed(emp):
                return jsonify({'error': 'الموظف المحدد تابع لفرع آخر'}), 403

        stage = (data.get('stage') or 'lead').strip()
        if stage not in PIPELINE_STAGES:
            return jsonify({'error': 'مرحلة غير صحيحة'}), 400

        deal = SalePipeline(
            branch_id      = customer.branch_id,
            customer_id    = customer.id,
            car_id         = int(car_id) if car_id else None,
            assigned_to_id = int(emp_id) if emp_id else None,
            created_by_id  = current_user.id if current_user.is_authenticated else None,
            stage          = stage,
            expected_price = money_value(data['expected_price']) if data.get('expected_price') else None,
            currency       = normalize_currency(data.get('currency')),
            notes          = (data.get('notes') or '').strip() or None,
        )
        db.session.add(deal)
        log_action('create_deal', 'SalePipeline', None, f'customer={customer.id} stage={stage}')
        db.session.commit()
        return jsonify(_deal_dict(deal)), 201

    @app.route('/api/pipeline/<int:deal_id>/stage', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_pipeline_move_stage(deal_id):
        """تحريك الصفقة إلى مرحلة أخرى."""
        deal  = SalePipeline.query.get_or_404(deal_id)
        if not branch_allowed(deal):
            return jsonify({'error': 'لا يمكنك الوصول إلى صفقات فرع آخر'}), 403
        data  = request.get_json(silent=True) or {}
        stage = (data.get('stage') or '').strip()
        if stage not in PIPELINE_STAGES:
            return jsonify({'error': 'مرحلة غير صحيحة'}), 400

        old_stage        = deal.stage
        deal.stage       = stage
        deal.stage_changed_at = datetime.utcnow()
        if stage == 'lost':
            deal.lost_reason = (data.get('lost_reason') or '').strip() or None
        if data.get('notes'):
            deal.notes = data['notes']

        log_action('move_deal_stage', 'SalePipeline', deal.id, f'{old_stage}→{stage}')
        db.session.commit()
        return jsonify(_deal_dict(deal))

    @app.route('/api/pipeline/<int:deal_id>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_pipeline_update(deal_id):
        deal = SalePipeline.query.get_or_404(deal_id)
        if not branch_allowed(deal):
            return jsonify({'error': 'لا يمكنك الوصول إلى صفقات فرع آخر'}), 403
        data = request.get_json(silent=True) or {}
        if 'car_id' in data:
            car_id = int(data['car_id']) if data['car_id'] else None
            if car_id:
                car = Car.query.get_or_404(car_id)
                if not branch_allowed(car):
                    return jsonify({'error': 'السيارة المحددة تابعة لفرع آخر'}), 403
            deal.car_id = car_id
        if 'assigned_to_id' in data:
            emp_id = int(data['assigned_to_id']) if data['assigned_to_id'] else None
            if emp_id:
                emp = Employee.query.get_or_404(emp_id)
                if not branch_allowed(emp):
                    return jsonify({'error': 'الموظف المحدد تابع لفرع آخر'}), 403
            deal.assigned_to_id = emp_id
        if 'expected_price' in data:
            deal.expected_price = money_value(data['expected_price']) if data['expected_price'] else None
        if 'notes' in data:
            deal.notes = (data['notes'] or '').strip() or None
        if 'currency' in data:
            deal.currency = normalize_currency(data['currency'])
        db.session.commit()
        return jsonify(_deal_dict(deal))

    @app.route('/api/pipeline/<int:deal_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_pipeline_delete(deal_id):
        deal = SalePipeline.query.get_or_404(deal_id)
        if not branch_allowed(deal):
            return jsonify({'error': 'لا يمكنك الوصول إلى صفقات فرع آخر'}), 403
        db.session.delete(deal)
        db.session.commit()
        return jsonify({'success': True})

    # ══════════════════════════════════════════════════════════════════════
    #  Employee Performance + Commissions
    # ══════════════════════════════════════════════════════════════════════

    @app.route('/api/employees/performance')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_employee_performance():
        """أداء الموظفين — مبيعات، إيرادات، عمولات، تقييم."""
        period   = request.args.get('period')    # YYYY-MM  اختياري
        emp_id   = request.args.get('employee_id', type=int)

        today      = datetime.utcnow().date()
        if period:
            try:
                period_start = datetime.strptime(period, '%Y-%m').date()
                import calendar as _cal
                period_end = period_start.replace(
                    day=_cal.monthrange(period_start.year, period_start.month)[1]
                )
            except ValueError:
                return jsonify({'error': 'صيغة الفترة يجب أن تكون YYYY-MM'}), 400
        else:
            period_start = today.replace(day=1)
            period_end   = today
            period       = today.strftime('%Y-%m')

        employees = Employee.query.filter_by(is_active=True).order_by(Employee.full_name).all()
        if emp_id:
            employees = [e for e in employees if e.id == emp_id]

        result = []
        for emp in employees:
            # مبيعاتي عبر sales_rep_id
            emp_sales = Sale.query.filter(
                Sale.sales_rep_id == emp.id,
                Sale.status != 'Cancelled',
                func.date(Sale.sale_date) >= period_start.isoformat(),
                func.date(Sale.sale_date) <= period_end.isoformat(),
            ).all()

            sales_count = len(emp_sales)
            revenue_iqd = sum(to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0 for s in emp_sales)
            cost_iqd    = sum(to_iqd(s.car.purchase_price, s.car.currency) or 0 for s in emp_sales if s.car)
            profit_iqd  = round(revenue_iqd - cost_iqd, 2)

            # عمولات
            commissions = EmployeeCommission.query.filter(
                EmployeeCommission.employee_id == emp.id,
                EmployeeCommission.sale_id.in_([s.id for s in emp_sales]) if emp_sales else db.false(),
            ).all()
            total_commission = sum(to_iqd(c.commission_amount, c.currency) or 0 for c in commissions)

            # الهدف الشهري
            target = EmployeeTarget.query.filter_by(employee_id=emp.id, period=period).first()
            target_sales   = target.target_sales_count if target else 0
            target_revenue = to_iqd(target.target_revenue, target.currency) if target else 0
            target_profit  = to_iqd(target.target_profit, target.currency) if target else 0

            # إنجاز الهدف %
            sales_pct   = round(sales_count   / target_sales   * 100, 1) if target_sales   > 0 else None
            revenue_pct = round(revenue_iqd   / target_revenue * 100, 1) if target_revenue > 0 else None
            profit_pct  = round(profit_iqd    / target_profit  * 100, 1) if target_profit  > 0 else None

            # تفاعلات CRM
            crm_count = CustomerInteraction.query.filter_by(employee_id=emp.id).filter(
                func.date(CustomerInteraction.interaction_date) >= period_start.isoformat(),
                func.date(CustomerInteraction.interaction_date) <= period_end.isoformat(),
            ).count()

            # Pipeline deals assigned
            pipeline_active = SalePipeline.query.filter_by(assigned_to_id=emp.id).filter(
                SalePipeline.stage.notin_(['won', 'lost'])
            ).count()

            # نقاط الأداء (0-100)
            score_parts = []
            if sales_pct  is not None: score_parts.append(min(sales_pct,   100))
            if revenue_pct is not None: score_parts.append(min(revenue_pct, 100))
            if profit_pct  is not None: score_parts.append(min(profit_pct,  100))
            perf_score = round(sum(score_parts) / len(score_parts), 1) if score_parts else None

            result.append({
                'employee_id':       emp.id,
                'employee_name':     emp.full_name,
                'employee_phone':    emp.phone,
                'title':             emp.title,
                'sales_count':       sales_count,
                'revenue_iqd':       round(revenue_iqd, 2),
                'profit_iqd':        round(profit_iqd, 2),
                'total_commission_iqd': round(total_commission, 2),
                'crm_interactions':  crm_count,
                'pipeline_active':   pipeline_active,
                'target': {
                    'sales':    target_sales,
                    'revenue':  round(float(target_revenue or 0), 2),
                    'profit':   round(float(target_profit or 0), 2),
                },
                'achievement': {
                    'sales_pct':   sales_pct,
                    'revenue_pct': revenue_pct,
                    'profit_pct':  profit_pct,
                },
                'performance_score': perf_score,
                'period': period,
            })

        # ترتيب حسب الإيراد
        result.sort(key=lambda x: x['revenue_iqd'], reverse=True)
        for i, r in enumerate(result):
            r['rank'] = i + 1

        return jsonify({
            'period': period,
            'employees': result,
            'summary': {
                'total_sales':    sum(r['sales_count'] for r in result),
                'total_revenue':  round(sum(r['revenue_iqd'] for r in result), 2),
                'total_profit':   round(sum(r['profit_iqd'] for r in result), 2),
                'best_employee':  result[0]['employee_name'] if result else None,
            },
        })

    @app.route('/api/employees/targets', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_reports')
    def api_employee_targets_list():
        period = request.args.get('period', datetime.utcnow().strftime('%Y-%m'))
        targets = EmployeeTarget.query.filter_by(period=period).all()
        return jsonify({'period': period, 'targets': [
            {'id': t.id, 'employee_id': t.employee_id,
             'employee_name': t.employee.full_name if t.employee else None,
             'target_sales_count': t.target_sales_count,
             'target_revenue': t.target_revenue, 'target_profit': t.target_profit,
             'currency': t.currency}
            for t in targets
        ]})

    @app.route('/api/employees/targets', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_employee_target_set():
        data = request.get_json(silent=True) or {}
        emp_id = data.get('employee_id')
        period = data.get('period', datetime.utcnow().strftime('%Y-%m'))
        if not emp_id:
            return jsonify({'error': 'employee_id مطلوب'}), 400
        emp = Employee.query.get_or_404(int(emp_id))

        target = EmployeeTarget.query.filter_by(employee_id=emp.id, period=period).first()
        if not target:
            target = EmployeeTarget(employee_id=emp.id, period=period, branch_id=emp.branch_id)
            db.session.add(target)

        target.target_sales_count = int(data.get('target_sales_count', 0))
        target.target_revenue = money_value(data.get('target_revenue', 0))
        target.target_profit = money_value(data.get('target_profit', 0))
        target.currency           = normalize_currency(data.get('currency'))
        db.session.commit()
        return jsonify({'success': True, 'period': period, 'employee_id': emp.id})

    @app.route('/api/employees/<int:emp_id>/commissions')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_employee_commissions(emp_id):
        emp  = Employee.query.get_or_404(emp_id)
        page = int(request.args.get('page', 1))
        per_page = 30
        q    = EmployeeCommission.query.filter_by(employee_id=emp_id).order_by(EmployeeCommission.created_at.desc())
        total = q.count()
        items = q.offset((page-1)*per_page).limit(per_page).all()
        return jsonify({
            'employee_name': emp.full_name,
            'total': total,
            'items': [{
                'id':               c.id,
                'sale_id':          c.sale_id,
                'invoice_number':   c.sale.invoice_number if c.sale else None,
                'commission_rate':  c.commission_rate,
                'commission_amount': c.commission_amount,
                'currency':         c.currency,
                'is_paid':          c.is_paid,
                'paid_at':          c.paid_at.isoformat() if c.paid_at else None,
                'created_at':       c.created_at.isoformat() if c.created_at else None,
            } for c in items],
            'total_unpaid': sum(
                to_iqd(c.commission_amount, c.currency) or 0
                for c in EmployeeCommission.query.filter_by(employee_id=emp_id, is_paid=False).all()
            ),
        })

    @app.route('/api/employees/commissions', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_reports')
    def api_employee_commission_add():
        data    = request.get_json(silent=True) or {}
        emp_id  = data.get('employee_id')
        sale_id = data.get('sale_id')
        if not emp_id or not sale_id:
            return jsonify({'error': 'employee_id و sale_id مطلوبان'}), 400
        emp  = Employee.query.get_or_404(int(emp_id))
        sale = Sale.query.get_or_404(int(sale_id))

        try:
            rate = decimal_value(data.get('commission_rate', 0))
        except (InvalidOperation, TypeError, ValueError):
            return jsonify({'error': 'نسبة العمولة غير صحيحة'}), 400
        amount, amount_err = _parse_money(data.get('commission_amount', 0), 'مبلغ العمولة')
        if amount_err:
            return amount_err
        if amount <= 0 and rate > 0:
            net = decimal_value(sale.selling_price) - decimal_value(sale.discount)
            amount = money_value(net * rate / Decimal('100'))

        commission = EmployeeCommission(
            employee_id=emp.id, sale_id=sale.id, branch_id=sale.branch_id,
            commission_rate=rate, commission_amount=amount,
            currency=normalize_currency(data.get('currency') or sale.currency),
        )
        db.session.add(commission)
        db.session.commit()
        return jsonify({'success': True, 'id': commission.id, 'amount': amount}), 201

    @app.route('/api/employees/commissions/<int:cid>/mark-paid', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_reports')
    def api_commission_mark_paid(cid):
        c = EmployeeCommission.query.get_or_404(cid)
        c.is_paid = True
        c.paid_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True})

    # ── Per-Car Full P&L ──────────────────────────────────────────────────

    @app.route('/api/vehicles/<int:car_id>/full-pnl')
    @api_login_required
    @api_permission_required('manage_cars')
    def api_vehicle_full_pnl(car_id):
        """P&L كاملة لسيارة واحدة تشمل سعر الشراء + تكاليف + سعر البيع."""
        car = Car.query.get_or_404(car_id)
        rate = exchange_rate_value()

        purchase_price_iqd = to_iqd(car.purchase_price, car.currency) or 0

        # تكاليف إضافية (VehicleCost)
        extra_costs = []
        extra_total_iqd = ZERO_MONEY
        for vc in car.costs:
            amt_iqd = to_iqd(vc.amount, vc.currency) or 0
            extra_costs.append({
                'cost_type':    vc.cost_type,
                'amount':       vc.amount,
                'currency':     vc.currency,
                'amount_iqd':   round(amt_iqd, 2),
                'description':  vc.description,
            })
            extra_total_iqd += amt_iqd

        total_cost_iqd = purchase_price_iqd + extra_total_iqd

        # مبيعات
        active_sales = [s for s in car.sales if s.status != 'Cancelled']
        revenue_iqd = ZERO_MONEY
        sale_info = None
        if active_sales:
            s = active_sales[0]
            revenue_iqd = to_iqd(s.selling_price - (s.discount or 0), s.currency) or 0
            sale_info = {
                'id': s.id, 'invoice_number': s.invoice_number,
                'selling_price': s.selling_price, 'discount': s.discount or 0,
                'currency': s.currency, 'revenue_iqd': round(revenue_iqd, 2),
                'sale_date': s.sale_date.isoformat() if s.sale_date else None,
            }

        profit_iqd  = revenue_iqd - total_cost_iqd
        margin_pct  = round((profit_iqd / total_cost_iqd * 100) if total_cost_iqd > 0 else 0, 2)
        roi_pct     = round((profit_iqd / purchase_price_iqd * 100) if purchase_price_iqd > 0 else 0, 2)

        return jsonify({
            'car_id':              car.id,
            'car_name':            f'{car.brand} {car.model} {car.manufacturing_year}',
            'status':              car.status,
            'purchase_price':      car.purchase_price,
            'purchase_currency':   car.currency,
            'purchase_price_iqd':  round(purchase_price_iqd, 2),
            'extra_costs':         extra_costs,
            'extra_total_iqd':     round(extra_total_iqd, 2),
            'total_cost_iqd':      round(total_cost_iqd, 2),
            'sale':                sale_info,
            'revenue_iqd':         round(revenue_iqd, 2),
            'profit_iqd':          round(profit_iqd, 2),
            'margin_pct':          margin_pct,
            'roi_pct':             roi_pct,
            'is_profitable':       profit_iqd >= 0,
            'exchange_rate':       rate,
        })

    # ── Expense Category Analysis ─────────────────────────────────────────

    @app.route('/api/reports/expense-analysis')
    @api_login_required
    def api_expense_analysis():
        """تحليل المصاريف بالفئات مع مقارنة شهرية."""
        today      = datetime.utcnow().date()
        this_month = today.replace(day=1)
        last_month = (this_month - timedelta(days=1)).replace(day=1)
        import calendar as _cal
        last_month_end = last_month.replace(
            day=_cal.monthrange(last_month.year, last_month.month)[1]
        )

        def categorize(expenses: list) -> dict:
            cats: dict = {}
            for e in expenses:
                cat = e.category or 'other'
                amt = to_iqd(e.amount, e.currency) or 0
                cats.setdefault(cat, {'count': 0, 'total': Decimal('0.0'), 'items': []})
                cats[cat]['count']  += 1
                cats[cat]['total']  = round(cats[cat]['total'] + amt, 2)
                cats[cat]['items'].append({'id': e.id, 'title': e.title, 'amount_iqd': round(amt, 2)})
            return cats

        this_exps = Expense.query.filter(
            func.date(Expense.expense_date) >= this_month.isoformat(),
            func.date(Expense.expense_date) <= today.isoformat(),
        ).all()
        last_exps = Expense.query.filter(
            func.date(Expense.expense_date) >= last_month.isoformat(),
            func.date(Expense.expense_date) <= last_month_end.isoformat(),
        ).all()

        this_cats = categorize(this_exps)
        last_cats = categorize(last_exps)

        this_total = round(sum(v['total'] for v in this_cats.values()), 2)
        last_total = round(sum(v['total'] for v in last_cats.values()), 2)

        cat_labels = {
            'salary': 'رواتب', 'rent': 'إيجار', 'electricity': 'كهرباء',
            'fuel': 'وقود', 'advertising': 'إعلانات', 'maintenance': 'صيانة',
            'banking': 'مصاريف بنكية', 'government': 'رسوم حكومية',
            'stationery': 'قرطاسية', 'hosting': 'ضيافة', 'commission': 'عمولات',
            'other': 'متنوعة',
        }

        breakdown = []
        all_cats = set(this_cats) | set(last_cats)
        for cat in sorted(all_cats, key=lambda c: this_cats.get(c, {}).get('total', 0), reverse=True):
            this_v = this_cats.get(cat, {}).get('total', 0)
            last_v = last_cats.get(cat, {}).get('total', 0)
            pct_of_total = round((this_v / this_total * 100) if this_total > 0 else 0, 1)
            change = round(((this_v - last_v) / last_v * 100) if last_v > 0 else 0, 1)
            breakdown.append({
                'category':      cat,
                'label':         cat_labels.get(cat, cat),
                'this_month':    round(this_v, 2),
                'last_month':    round(last_v, 2),
                'pct_of_total':  pct_of_total,
                'change_pct':    change,
                'count':         this_cats.get(cat, {}).get('count', 0),
            })

        # أعلى 3 مصاريف هذا الشهر
        top_items = sorted(this_exps, key=lambda e: to_iqd(e.amount, e.currency) or 0, reverse=True)[:5]

        return jsonify({
            'this_month_total': this_total,
            'last_month_total': last_total,
            'change_pct':       round(((this_total - last_total) / last_total * 100) if last_total > 0 else 0, 1),
            'breakdown':        breakdown,
            'top_expenses':     [{'id': e.id, 'title': e.title, 'amount_iqd': round(to_iqd(e.amount, e.currency) or 0, 2), 'category': e.category or 'other'} for e in top_items],
        })

    @app.route('/api/trial-balance')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_trial_balance():
        accounts, totals = get_trial_balance(selected_branch_scope_id())
        total_debit = decimal_value(totals.get('total_debit', 0))
        total_credit = decimal_value(totals.get('total_credit', 0))
        difference = round(total_debit - total_credit, 2)
        return jsonify({
            'accounts': accounts,
            'total_debit': total_debit,
            'total_credit': total_credit,
            'difference': difference,
            'status': 'balanced' if difference == 0 else 'unbalanced',
        })

    @app.route('/trial-balance')
    @login_required
    @permission_required('manage_accounting')
    def trial_balance():
        return (
            '<!doctype html><html lang="ar" dir="rtl"><head>'
            '<meta charset="utf-8"><title>ميزان المراجعة</title></head>'
            '<body><h1>ميزان المراجعة</h1>'
            '<p>هذه صفحة توافق قديمة. استخدم واجهة النظام الحديثة لعرض ميزان المراجعة.</p>'
            '</body></html>'
        )

    @app.route('/api/journal-entries')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_journal_entries():
        page      = int(request.args.get('page', 1))
        per_page  = min(int(request.args.get('per_page', 30)), 100)
        date_from = request.args.get('date_from')
        date_to   = request.args.get('date_to')
        ref_type  = request.args.get('ref_type')
        search    = request.args.get('search')
        account_code = request.args.get('account_code')

        query = scoped_query(JournalEntry).order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())
        if date_from:
            query = query.filter(JournalEntry.entry_date >= date_from)
        if date_to:
            query = query.filter(JournalEntry.entry_date <= date_to)
        if ref_type:
            query = query.filter(JournalEntry.reference_type == ref_type)
        if search:
            q = f'%{search}%'
            query = query.filter(JournalEntry.description.ilike(q))
        if account_code:
            acct = Account.query.filter_by(code=account_code).first()
            if acct:
                entry_ids = db.session.query(JournalEntryLine.journal_entry_id).filter(
                    JournalEntryLine.account_id == acct.id
                )
                query = query.filter(JournalEntry.id.in_(entry_ids))

        total = query.count()
        entries = query.offset((page - 1) * per_page).limit(per_page).all()
        results = []
        for e in entries:
            total_debit = sum((decimal_value(line.debit) for line in e.lines), ZERO_MONEY)
            total_credit = sum((decimal_value(line.credit) for line in e.lines), ZERO_MONEY)
            results.append({
                'id':               e.id,
                'reference_number': e.reference_number,
                'status':           e.status if hasattr(e, 'status') else 'posted',
                'reversal_of_id':   e.reversal_of_id if hasattr(e, 'reversal_of_id') else None,
                'entry_date':       e.entry_date.strftime('%Y-%m-%d') if e.entry_date else None,
                'description':      e.description,
                'reference_type':   e.reference_type,
                'reference_id':     e.reference_id,
                'branch_id':        e.branch_id,
                'line_count':       len(e.lines),
                'total_debit':      round(total_debit, 2),
                'total_credit':     round(total_credit, 2),
                'is_balanced':    round(total_debit - total_credit, 2) == 0,
                'lines': [
                    {
                        'account_code':  l.account.code if l.account else None,
                        'account_name':  l.account.name if l.account else None,
                        'debit':         float(l.debit or 0),
                        'credit':        float(l.credit or 0),
                        'description':   getattr(l, 'description', None),
                    }
                    for l in e.lines
                ],
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': results})

    @app.route('/api/journal-entries', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_journal_entries_create():
        """إنشاء قيد يدوي — يبدأ بحالة draft."""
        data = request.get_json(force=True) or {}
        lines = data.get('lines', [])
        if not lines:
            return jsonify({'error': 'يجب إضافة سطر واحد على الأقل'}), 400
        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error
        try:
            from .accounting import create_journal_entry
            entry_date_str = data.get('entry_date')
            entry_date = datetime.strptime(entry_date_str, '%Y-%m-%d') if entry_date_str else None
            je = create_journal_entry(
                entry_date=entry_date,
                description=data.get('description'),
                branch_id=creation_branch_id,
                lines=lines,
                auto_post=False,
            )
            db.session.commit()
            log_action('create_journal_entry_draft', 'journal_entry', je.id,
                       details=f'ref={je.reference_number}')
            db.session.commit()
            return jsonify({'id': je.id, 'reference_number': je.reference_number, 'status': je.status}), 201
        except ValueError as exc:
            db.session.rollback()
            return jsonify({'error': str(exc)}), 400

    @app.route('/api/journal-entries/<int:entry_id>/post', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_journal_entry_post(entry_id):
        """نشر قيد draft → posted."""
        from .accounting import _update_account_balances_for_entry
        je = JournalEntry.query.get_or_404(entry_id)
        if not branch_allowed(je):
            return jsonify({'error': 'لا يمكنك الوصول إلى بيانات فرع آخر'}), 403
        if je.status != 'draft':
            return jsonify({'error': 'القيد ليس في حالة مسودة'}), 400
        try:
            check_period_lock(je.entry_date)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        je.status = 'posted'
        je.posted_by_id = current_user.id
        je.posted_at = datetime.utcnow()
        _update_account_balances_for_entry(je)
        log_action('post_journal_entry', 'journal_entry', je.id,
                   details=f'ref={je.reference_number}')
        db.session.commit()
        return jsonify({'id': je.id, 'status': je.status})

    @app.route('/api/journal-entries/<int:entry_id>/reverse', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_journal_entry_reverse(entry_id):
        """إنشاء قيد عكسي لقيد posted."""
        je = JournalEntry.query.get_or_404(entry_id)
        if not branch_allowed(je):
            return jsonify({'error': 'لا يمكنك الوصول إلى بيانات فرع آخر'}), 403
        if je.status != 'posted':
            return jsonify({'error': 'يمكن عكس القيود المنشورة فقط'}), 400
        already = JournalEntry.query.filter_by(reversal_of_id=je.id).first()
        if already:
            return jsonify({'error': 'تم عكس هذا القيد مسبقاً'}), 400
        try:
            from .accounting import create_journal_entry
            rev_lines = [
                {'account_code': l.account.code, 'debit': decimal_value(l.credit), 'credit': decimal_value(l.debit)}
                for l in je.lines if l.account
            ]
            rev = create_journal_entry(
                entry_date=datetime.utcnow(),
                description=f'عكس: {je.description or ""} (#{je.id})',
                branch_id=je.branch_id,
                reference_type=je.reference_type,
                reference_id=je.reference_id,
                lines=rev_lines,
                auto_post=True,
                posted_by_id=current_user.id,
                allow_inactive_accounts=True,
            )
            rev.reversal_of_id = je.id
            je.status = 'reversed'
            db.session.flush()
            log_action('reverse_journal_entry', 'journal_entry', je.id,
                       details=f'reversed_by={rev.id} ref={rev.reference_number}')
            db.session.commit()
            return jsonify({'id': rev.id, 'reference_number': rev.reference_number, 'original_id': je.id})
        except ValueError as exc:
            db.session.rollback()
            return jsonify({'error': str(exc)}), 400

    @app.route('/api/reports/accounting-rules-check')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting_rules_check():
        """فحص مخالفات قواعد المحاسبة."""
        parent_ids = {a.id for a in Account.query.all() if Account.query.filter_by(parent_id=a.id).first()}

        parent_violations = []
        unbalanced = []
        missing_ref = []

        for je in JournalEntry.query.order_by(JournalEntry.id.desc()).limit(500).all():
            total_d = sum((decimal_value(line.debit) for line in je.lines), ZERO_MONEY)
            total_c = sum((decimal_value(line.credit) for line in je.lines), ZERO_MONEY)
            if abs(total_d - total_c) > 0.01:
                unbalanced.append({'id': je.id, 'ref': je.reference_number, 'description': je.description,
                                   'debit': round(total_d, 2), 'credit': round(total_c, 2)})
            if not je.reference_number:
                missing_ref.append({'id': je.id, 'description': je.description})
            for l in je.lines:
                if l.account_id in parent_ids:
                    parent_violations.append({
                        'entry_id': je.id, 'ref': je.reference_number,
                        'account_code': l.account.code if l.account else None,
                        'account_name': l.account.name if l.account else None,
                    })

        return jsonify({
            'parent_account_violations': parent_violations,
            'unbalanced_entries': unbalanced,
            'missing_reference_number': missing_ref,
        })

    # ─── Accounting Periods ───────────────────────────────────────────────────

    def _period_to_dict(period):
        return {
            'id':           period.id,
            'name':         period.name,
            'start_date':   period.start_date.isoformat() if period.start_date else None,
            'end_date':     period.end_date.isoformat() if period.end_date else None,
            'status':       period.status,
            'closed_at':    period.closed_at.isoformat() if period.closed_at else None,
            'closed_by_id': period.closed_by_id,
        }

    @app.route('/api/accounting-periods')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting_periods():
        periods = AccountingPeriod.query.order_by(AccountingPeriod.start_date.desc()).all()
        return jsonify([_period_to_dict(p) for p in periods])

    @app.route('/api/accounting-periods', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting_periods_create():
        data = request.get_json(force=True) or {}
        name = (data.get('name') or '').strip()
        start_str = (data.get('start_date') or '').strip()
        end_str   = (data.get('end_date')   or '').strip()
        if not name:
            return jsonify({'error': 'اسم الفترة مطلوب'}), 400
        if not start_str or not end_str:
            return jsonify({'error': 'تاريخ البداية والنهاية مطلوبان'}), 400
        try:
            from datetime import date as _date
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
            end_date   = datetime.strptime(end_str,   '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)'}), 400
        if start_date > end_date:
            return jsonify({'error': 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'}), 400
        overlap = AccountingPeriod.query.filter(
            AccountingPeriod.start_date <= end_date,
            AccountingPeriod.end_date   >= start_date,
        ).first()
        if overlap:
            return jsonify({'error': f'الفترة تتداخل مع فترة موجودة: {overlap.name}'}), 400
        period = AccountingPeriod(name=name, start_date=start_date, end_date=end_date, status='open')
        db.session.add(period)
        db.session.commit()
        log_action('create_accounting_period', 'accounting_period', period.id,
                   details=f'name={name} {start_date}→{end_date}')
        db.session.commit()
        return jsonify(_period_to_dict(period)), 201

    @app.route('/api/accounting-periods/<int:period_id>/close', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting_period_close(period_id):
        period = AccountingPeriod.query.get_or_404(period_id)
        if period.status == 'closed':
            return jsonify({'error': 'الفترة مغلقة مسبقاً'}), 400
        period.status     = 'closed'
        period.closed_at  = datetime.utcnow()
        period.closed_by_id = current_user.id
        log_action('close_accounting_period', 'accounting_period', period.id,
                   details=f'name={period.name}')
        db.session.commit()
        return jsonify(_period_to_dict(period))

    @app.route('/api/accounting-periods/<int:period_id>/reopen', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting_period_reopen(period_id):
        period = AccountingPeriod.query.get_or_404(period_id)
        if period.status == 'open':
            return jsonify({'error': 'الفترة مفتوحة مسبقاً'}), 400
        period.status       = 'open'
        period.closed_at    = None
        period.closed_by_id = None
        log_action('reopen_accounting_period', 'accounting_period', period.id,
                   details=f'name={period.name}')
        db.session.commit()
        return jsonify(_period_to_dict(period))

    # ─── Cost Centers ─────────────────────────────────────────────────────────

    @app.route('/api/cost-centers')
    @api_login_required
    def api_cost_centers():
        centers = CostCenter.query.filter_by(is_active=True).order_by(CostCenter.id).all()
        return jsonify([{'id': c.id, 'name': c.name, 'code': c.code} for c in centers])

    @app.route('/api/cost-centers', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_cost_centers_create():
        data = request.get_json(force=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'الاسم مطلوب'}), 400
        if CostCenter.query.filter_by(name=name).first():
            return jsonify({'error': 'مركز التكلفة موجود مسبقاً'}), 400
        cc = CostCenter(name=name, code=(data.get('code') or '').strip() or None)
        db.session.add(cc)
        db.session.commit()
        return jsonify({'id': cc.id, 'name': cc.name, 'code': cc.code}), 201

    # ─── Vehicle Costs & Profitability ────────────────────────────────────────

    def _car_profitability(car, rate=None):
        """احسب ربحية سيارة واحدة بالدينار العراقي."""
        if rate is None:
            rate = exchange_rate_value() or Decimal('1300')
        purchase = Purchase.query.filter_by(car_id=car.id, status='Active').first()
        sale = Sale.query.filter_by(car_id=car.id, status='Active').first()
        purchase_price_iqd = to_iqd(purchase.purchase_price, purchase.currency) if purchase else to_iqd(car.purchase_price, car.currency)
        costs_breakdown = {}
        costs_total_iqd = ZERO_MONEY
        for vc in car.costs:
            vc_iqd = to_iqd(vc.amount, vc.currency)
            costs_breakdown[vc.cost_type] = costs_breakdown.get(vc.cost_type, ZERO_MONEY) + vc_iqd
            costs_total_iqd += vc_iqd
        total_cost_iqd = purchase_price_iqd + costs_total_iqd
        selling_price_iqd = to_iqd(sale.selling_price, sale.currency) if sale else None
        net_profit_iqd = (selling_price_iqd - total_cost_iqd) if selling_price_iqd is not None else None
        profit_pct = ((net_profit_iqd / total_cost_iqd * 100) if total_cost_iqd > 0 and net_profit_iqd is not None else None)
        return {
            'car_id': car.id, 'brand': car.brand, 'model': car.model,
            'year': car.manufacturing_year, 'vin': car.vin, 'status': car.status,
            'purchase_price_iqd': round(purchase_price_iqd, 2),
            'costs_total_iqd': round(costs_total_iqd, 2),
            'total_cost_iqd': round(total_cost_iqd, 2),
            'selling_price_iqd': round(selling_price_iqd, 2) if selling_price_iqd is not None else None,
            'net_profit_iqd': round(net_profit_iqd, 2) if net_profit_iqd is not None else None,
            'profit_pct': round(profit_pct, 2) if profit_pct is not None else None,
            'cost_breakdown': {k: round(v, 2) for k, v in costs_breakdown.items()},
            'costs': [{'id': vc.id, 'cost_type': vc.cost_type, 'amount': vc.amount,
                       'currency': vc.currency, 'description': vc.description,
                       'created_at': vc.created_at.isoformat() if vc.created_at else None}
                      for vc in car.costs],
        }

    @app.route('/api/vehicles/<int:car_id>/costs')
    @api_login_required
    @api_permission_required('manage_cars')
    def api_vehicle_costs(car_id):
        car = Car.query.get_or_404(car_id)
        rate = exchange_rate_value()
        return jsonify(_car_profitability(car, rate))

    @app.route('/api/vehicles/<int:car_id>/costs', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_vehicle_costs_add(car_id):
        from .accounting import create_journal_entry
        car = Car.query.get_or_404(car_id)
        data = request.get_json(force=True) or {}
        cost_type  = (data.get('cost_type') or '').strip()
        amount, amount_err = _parse_money(data.get('amount') or 0, 'المبلغ')
        if amount_err:
            return amount_err
        currency   = (data.get('currency') or 'USD').upper()
        description = (data.get('description') or '').strip() or None
        if not cost_type or amount <= 0:
            return jsonify({'error': 'نوع التكلفة والمبلغ مطلوبان'}), 400

        amount_iqd = to_iqd(amount, currency)

        vc = VehicleCost(
            car_id=car.id, cost_type=cost_type, amount=amount,
            currency=currency, description=description,
        )
        db.session.add(vc)
        db.session.flush()

        # قيد محاسبي تلقائي: مصروف تكلفة السيارة
        expense_code = acct_vehicle_cost(cost_type)
        expense_acct = Account.query.filter_by(code=expense_code).first()
        cashbox_acct = Account.query.filter_by(code=CASH_ACCOUNT).first()

        if expense_acct and cashbox_acct and amount_iqd:
            try:
                je_desc = f'تكلفة سيارة: {car.brand} {car.model} {car.manufacturing_year} — {cost_type}'
                if description:
                    je_desc += f' ({description})'
                create_journal_entry(
                    description=je_desc,
                    branch_id=car.branch_id,
                    reference_type='VehicleCost',
                    reference_id=vc.id,
                    lines=[
                        {'account_code': expense_code, 'debit': amount_iqd, 'credit': 0},
                        {'account_code': CASH_ACCOUNT, 'debit': 0,          'credit': amount_iqd},
                    ],
                    auto_post=True,
                )
            except Exception as je_err:
                db.session.rollback()
                app.logger.warning('VehicleCost JE failed: %s', je_err)
                return jsonify({'error': 'فشل إنشاء القيد المحاسبي لتكلفة السيارة، لم يتم حفظ العملية'}), 500

        log_action('add_vehicle_cost', 'vehicle_cost', vc.id,
                   details=f'car={car_id} type={cost_type} amount={amount}{currency}')
        db.session.commit()
        return jsonify({'id': vc.id, 'cost_type': vc.cost_type, 'amount': vc.amount, 'currency': vc.currency}), 201

    @app.route('/api/vehicles/<int:car_id>/costs/<int:cost_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_vehicle_costs_delete(car_id, cost_id):
        from .accounting import create_journal_entry
        vc = VehicleCost.query.filter_by(id=cost_id, car_id=car_id).first_or_404()
        # عكس القيد المحاسبي المرتبط إن وُجد
        orig_je = JournalEntry.query.filter_by(
            reference_type='VehicleCost', reference_id=vc.id, status='posted'
        ).first()
        if orig_je:
            try:
                rev_lines = [
                    {'account_code': l.account.code, 'debit': decimal_value(l.credit), 'credit': decimal_value(l.debit)}
                    for l in orig_je.lines if l.account
                ]
                if rev_lines:
                    rev = create_journal_entry(
                        entry_date=datetime.utcnow(),
                        description=f'إلغاء تكلفة سيارة: {orig_je.description or ""}',
                        branch_id=orig_je.branch_id,
                        reference_type='VehicleCostCancel',
                        reference_id=vc.id,
                        lines=rev_lines,
                        auto_post=True,
                        posted_by_id=current_user.id,
                        allow_inactive_accounts=True,
                    )
                    rev.reversal_of_id = orig_je.id
                    orig_je.status = 'reversed'
            except Exception as _rev_err:
                app.logger.warning('VehicleCost delete JE reversal failed: %s', _rev_err)
        log_action('delete_vehicle_cost', 'vehicle_cost', cost_id,
                   details=f'car={car_id} type={vc.cost_type}')
        db.session.delete(vc)
        db.session.commit()
        return jsonify({'ok': True})

    @app.route('/api/reports/vehicle-profitability')
    @api_login_required
    @api_permission_required('manage_cars')
    def api_vehicle_profitability():
        only_sold = request.args.get('only_sold', 'false').lower() == 'true'
        query = scoped_query(Car)
        if only_sold:
            query = query.filter(Car.status == 'Sold')
        cars_list = query.all()
        rate = exchange_rate_value()
        results = [_car_profitability(c, rate) for c in cars_list]
        # فقط السيارات المباعة لترتيب الربحية
        sold = [r for r in results if r['net_profit_iqd'] is not None]
        sold_sorted = sorted(sold, key=lambda x: x['net_profit_iqd'], reverse=True)
        losing = [r for r in sold if (r['net_profit_iqd'] or 0) < 0]
        avg_profit = (sum(r['net_profit_iqd'] for r in sold) / len(sold)) if sold else 0
        avg_pct = (sum(r['profit_pct'] for r in sold if r['profit_pct'] is not None) / len(sold)) if sold else 0
        return jsonify({
            'cars': results,
            'summary': {
                'most_profitable': sold_sorted[:5],
                'least_profitable': sold_sorted[-5:][::-1] if len(sold_sorted) >= 5 else sorted(sold, key=lambda x: x['net_profit_iqd'])[:5],
                'losing': losing,
                'avg_profit_iqd': round(avg_profit, 2),
                'avg_profit_pct': round(avg_pct, 2),
                'total_cars': len(results),
                'sold_cars': len(sold),
            },
        })

    @app.route('/api/reports/cost-center')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_cost_center_report():
        start_date = request.args.get('start_date')
        end_date   = request.args.get('end_date')
        query = JournalEntry.query
        if start_date:
            query = query.filter(JournalEntry.entry_date >= start_date)
        if end_date:
            query = query.filter(JournalEntry.entry_date <= end_date + ' 23:59:59')
        entries = query.all()
        centers = {cc.id: {'id': cc.id, 'name': cc.name, 'code': cc.code,
                            'revenue_iqd': Decimal('0.0'), 'expense_iqd': Decimal('0.0'), 'entry_count': 0}
                   for cc in CostCenter.query.all()}
        unassigned = {'id': None, 'name': 'غير مُعيَّن', 'code': None,
                      'revenue_iqd': Decimal('0.0'), 'expense_iqd': Decimal('0.0'), 'entry_count': 0}
        income_types = {'Income', 'Equity'}
        for je in entries:
            bucket = centers.get(je.cost_center_id, unassigned) if je.cost_center_id else unassigned
            bucket['entry_count'] += 1
            for line in je.lines:
                if not line.account:
                    continue
                acct_type = line.account.type
                credit_iqd = decimal_value(line.credit)
                debit_iqd = decimal_value(line.debit)
                if acct_type in income_types:
                    bucket['revenue_iqd'] += credit_iqd - debit_iqd
                elif acct_type == 'Expense':
                    bucket['expense_iqd'] += debit_iqd - credit_iqd
        all_centers = list(centers.values()) + [unassigned]
        for c in all_centers:
            c['net_profit_iqd'] = round(c['revenue_iqd'] - c['expense_iqd'], 2)
            c['revenue_iqd'] = round(c['revenue_iqd'], 2)
            c['expense_iqd'] = round(c['expense_iqd'], 2)
        return jsonify({'centers': all_centers})

    # ─── Vouchers (سندات القبض/الصرف/التحويل) ────────────────────────────────

    def _next_voucher_number(voucher_type: str) -> str:
        prefix = {'receipt': 'RV', 'payment': 'PV', 'transfer': 'TR'}.get(voucher_type, 'XX')
        last = Voucher.query.filter_by(voucher_type=voucher_type).order_by(Voucher.id.desc()).first()
        seq = 1
        if last and last.voucher_number:
            try:
                seq = int(last.voucher_number.split('-')[1]) + 1
            except Exception:
                pass
        return f'{prefix}-{seq:06d}'

    def _account_balance_from_journal(account_ids, branch_id=None) -> float:
        """رصيد الحساب = مجموع المدين - مجموع الدائن من القيود المنشورة فقط."""
        from sqlalchemy import func as sqlfunc
        if not account_ids:
            return 0.0
        debit_query = (
            db.session.query(sqlfunc.sum(JournalEntryLine.debit))
            .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .filter(
                JournalEntryLine.account_id.in_(account_ids),
                JournalEntry.status.in_(('posted', 'reversed')),
            )
        )
        credit_query = (
            db.session.query(sqlfunc.sum(JournalEntryLine.credit))
            .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .filter(
                JournalEntryLine.account_id.in_(account_ids),
                JournalEntry.status.in_(('posted', 'reversed')),
            )
        )
        if branch_id is not None:
            debit_query = debit_query.filter(JournalEntry.branch_id == branch_id)
            credit_query = credit_query.filter(JournalEntry.branch_id == branch_id)
        total_debit = decimal_value(debit_query.scalar())
        total_credit = decimal_value(credit_query.scalar())
        return money_value(total_debit - total_credit)

    def _voucher_to_dict(v: Voucher) -> dict:
        return {
            'id':                v.id,
            'voucher_type':      v.voucher_type,
            'voucher_number':    v.voucher_number,
            'voucher_date':      v.voucher_date.strftime('%Y-%m-%d') if v.voucher_date else None,
            'debit_account_code':  v.debit_account.code  if v.debit_account  else None,
            'debit_account_name':  v.debit_account.name  if v.debit_account  else None,
            'credit_account_code': v.credit_account.code if v.credit_account else None,
            'credit_account_name': v.credit_account.name if v.credit_account else None,
            'amount':            v.amount,
            'currency':          v.currency,
            'description':       v.description,
            'status':            v.status,
            'journal_entry_id':  v.journal_entry_id,
            'reversal_of_id':    v.reversal_of_id,
            'created_by':        v.created_by.username if v.created_by else None,
            'created_at':        v.created_at.isoformat() if v.created_at else None,
        }

    @app.route('/api/vouchers')
    @api_login_required
    @api_permission_required('manage_vouchers')
    def api_vouchers():
        voucher_type = request.args.get('type')
        page     = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 30)), 100)
        query = scoped_query(Voucher).order_by(Voucher.voucher_date.desc(), Voucher.id.desc())
        if voucher_type:
            query = query.filter(Voucher.voucher_type == voucher_type)
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return jsonify({'total': total, 'page': page, 'per_page': per_page,
                        'items': [_voucher_to_dict(v) for v in items]})

    @app.route('/api/vouchers/<int:vid>')
    @api_login_required
    @api_permission_required('manage_vouchers')
    def api_voucher_detail(vid):
        v = Voucher.query.get_or_404(vid)
        if not branch_allowed(v):
            return jsonify({'error': 'لا يمكنك الوصول إلى بيانات فرع آخر'}), 403
        return jsonify(_voucher_to_dict(v))

    @app.route('/api/vouchers', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_vouchers')
    def api_vouchers_create():
        data = request.get_json(force=True) or {}
        voucher_type = data.get('voucher_type', '')
        if voucher_type not in ('receipt', 'payment', 'transfer'):
            return jsonify({'error': 'نوع السند غير صحيح'}), 400
        amount, amount_err = _parse_money(data.get('amount') or 0, 'المبلغ')
        if amount_err:
            return amount_err
        if amount <= 0:
            return jsonify({'error': 'المبلغ يجب أن يكون أكبر من الصفر'}), 400
        currency = (data.get('currency') or 'IQD').upper()
        debit_code  = str(data.get('debit_account_code')  or '').strip()
        credit_code = str(data.get('credit_account_code') or '').strip()
        if not debit_code or not credit_code:
            return jsonify({'error': 'حساب المدين والدائن مطلوبان'}), 400
        if debit_code == credit_code:
            return jsonify({'error': 'لا يمكن أن يكون حساب المدين والدائن نفس الحساب'}), 400
        debit_acct  = Account.query.filter_by(code=debit_code).first()
        credit_acct = Account.query.filter_by(code=credit_code).first()
        if not debit_acct:
            return jsonify({'error': f'الحساب المدين غير موجود: {debit_code}'}), 400
        if not credit_acct:
            return jsonify({'error': f'الحساب الدائن غير موجود: {credit_code}'}), 400
        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error
        date_str = data.get('voucher_date')
        try:
            voucher_date = datetime.strptime(date_str, '%Y-%m-%d') if date_str else datetime.utcnow()
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة'}), 400
        try:
            from .accounting import create_journal_entry
            je = create_journal_entry(
                entry_date=voucher_date,
                description=data.get('description') or f'سند {voucher_type} {_next_voucher_number(voucher_type)}',
                branch_id=creation_branch_id,
                reference_type=f'voucher_{voucher_type}',
                lines=[
                    {'account_code': debit_code,  'debit': amount, 'credit': 0},
                    {'account_code': credit_code, 'debit': 0, 'credit': amount},
                ],
                auto_post=True,
                posted_by_id=current_user.id,
            )
            db.session.flush()
            v = Voucher(
                voucher_type=voucher_type,
                voucher_number=_next_voucher_number(voucher_type),
                voucher_date=voucher_date,
                debit_account_id=debit_acct.id,
                credit_account_id=credit_acct.id,
                amount=amount,
                currency=currency,
                description=data.get('description'),
                status='posted',
                journal_entry_id=je.id,
                branch_id=creation_branch_id,
                created_by_id=current_user.id,
            )
            # Update JE description with voucher number
            je.description = data.get('description') or f'سند {v.voucher_number}'
            db.session.add(v)
            db.session.flush()
            log_action(f'create_voucher_{voucher_type}', 'voucher', v.id,
                       details=f'num={v.voucher_number} amount={amount}{currency}')
            db.session.commit()
            return jsonify(_voucher_to_dict(v)), 201
        except ValueError as exc:
            db.session.rollback()
            return jsonify({'error': str(exc)}), 400

    @app.route('/api/vouchers/<int:vid>/cancel', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_vouchers')
    def api_voucher_cancel(vid):
        v = Voucher.query.get_or_404(vid)
        if not branch_allowed(v):
            return jsonify({'error': 'لا يمكنك الوصول إلى بيانات فرع آخر'}), 403
        if v.status != 'posted':
            return jsonify({'error': 'السند ليس في حالة منشور'}), 400
        if Voucher.query.filter_by(reversal_of_id=v.id).first():
            return jsonify({'error': 'تم إلغاء هذا السند مسبقاً'}), 400
        try:
            from .accounting import create_journal_entry
            rev_je = create_journal_entry(
                entry_date=datetime.utcnow(),
                description=f'إلغاء سند: {v.voucher_number}',
                branch_id=v.branch_id,
                reference_type=f'voucher_{v.voucher_type}_cancel',
                lines=[
                    {'account_code': v.debit_account.code,  'debit': 0,        'credit': v.amount},
                    {'account_code': v.credit_account.code, 'debit': v.amount, 'credit': 0},
                ],
                auto_post=True,
                posted_by_id=current_user.id,
                allow_inactive_accounts=True,
            )
            db.session.flush()
            cancel_v = Voucher(
                voucher_type=v.voucher_type,
                voucher_number=_next_voucher_number(v.voucher_type),
                voucher_date=datetime.utcnow(),
                debit_account_id=v.credit_account_id,
                credit_account_id=v.debit_account_id,
                amount=v.amount,
                currency=v.currency,
                description=f'إلغاء: {v.voucher_number}',
                status='posted',
                journal_entry_id=rev_je.id,
                reversal_of_id=v.id,
                branch_id=v.branch_id,
                created_by_id=current_user.id,
            )
            v.status = 'cancelled'
            db.session.add(cancel_v)
            db.session.flush()
            log_action('cancel_voucher', 'voucher', v.id,
                       details=f'cancelled_by={cancel_v.voucher_number}')
            db.session.commit()
            return jsonify({'cancelled': _voucher_to_dict(v), 'reversal': _voucher_to_dict(cancel_v)})
        except ValueError as exc:
            db.session.rollback()
            return jsonify({'error': str(exc)}), 400

    # ─── Cashbox & Bank Movement Report ──────────────────────────────────────

    @app.route('/api/reports/cashbox-movement')
    @api_login_required
    @api_permission_required('manage_cashbox')
    def api_cashbox_movement():
        account_code = request.args.get('account_code', CASH_ACCOUNT)
        start_date   = request.args.get('start_date')
        end_date     = request.args.get('end_date')
        return _movement_report(account_code, start_date, end_date)

    @app.route('/api/reports/bank-movement')
    @api_login_required
    @api_permission_required('manage_bank')
    def api_bank_movement():
        account_code = request.args.get('account_code', BANK_ACCOUNT)
        start_date   = request.args.get('start_date')
        end_date     = request.args.get('end_date')
        return _movement_report(account_code, start_date, end_date)

    def _movement_report(account_code: str, start_date=None, end_date=None):
        acct = Account.query.filter_by(code=account_code).first()
        if not acct:
            return jsonify({'error': f'الحساب {account_code} غير موجود'}), 404
        query = (
            db.session.query(JournalEntryLine, JournalEntry)
            .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .filter(JournalEntryLine.account_id == acct.id)
            .filter(JournalEntry.status.in_(('posted', 'reversed')))
        )
        branch_id = selected_branch_scope_id()
        if branch_id is not None:
            query = query.filter(JournalEntry.branch_id == branch_id)
        if start_date:
            query = query.filter(JournalEntry.entry_date >= start_date)
        if end_date:
            query = query.filter(JournalEntry.entry_date <= end_date + ' 23:59:59')
        query = query.order_by(JournalEntry.entry_date.asc(), JournalEntry.id.asc())
        voucher_query = scoped_query(Voucher).filter(Voucher.journal_entry_id.isnot(None))
        voucher_map = {
            v.journal_entry_id: v.voucher_number
            for v in voucher_query.all()
        }
        balance = ZERO_MONEY
        rows = []
        total_inflow = ZERO_MONEY
        total_outflow = ZERO_MONEY
        for line, je in query.all():
            inflow = decimal_value(line.debit)
            outflow = decimal_value(line.credit)
            balance += inflow - outflow
            total_inflow  += inflow
            total_outflow += outflow
            rows.append({
                'date':             je.entry_date.strftime('%Y-%m-%d') if je.entry_date else None,
                'journal_ref':      je.reference_number,
                'voucher_number':   voucher_map.get(je.id),
                'description':      je.description,
                'inflow':           round(inflow, 2),
                'outflow':          round(outflow, 2),
                'balance':          round(balance, 2),
            })
        return jsonify({
            'account_code': acct.code,
            'account_name': acct.name,
            'rows': rows,
            'total_inflow':  round(total_inflow,  2),
            'total_outflow': round(total_outflow, 2),
            'final_balance': round(balance, 2),
        })

    # ─── Cashbox Close ────────────────────────────────────────────────────────

    @app.route('/api/cashbox-closes/current-balance')
    @api_login_required
    @api_permission_required('manage_cashbox')
    def api_cashbox_current_balance():
        account_code = request.args.get('account_code', CASH_ACCOUNT)
        acct = Account.query.filter_by(code=account_code).first()
        if not acct:
            return jsonify({'error': 'الحساب غير موجود'}), 404
        balance = _account_balance_from_journal([acct.id], selected_branch_scope_id())
        return jsonify({'account_code': acct.code, 'account_name': acct.name, 'balance': balance})

    @app.route('/api/cashbox-closes')
    @api_login_required
    @api_permission_required('manage_cashbox')
    def api_cashbox_closes():
        account_code = request.args.get('account_code')
        query = scoped_query(CashboxClose).order_by(CashboxClose.close_date.desc(), CashboxClose.id.desc())
        if account_code:
            acct = Account.query.filter_by(code=account_code).first()
            if acct:
                query = query.filter(CashboxClose.account_id == acct.id)
        closes = query.limit(50).all()
        return jsonify([{
            'id':             c.id,
            'close_date':     c.close_date.isoformat() if c.close_date else None,
            'account_code':   c.account.code if c.account else None,
            'account_name':   c.account.name if c.account else None,
            'system_balance': c.system_balance,
            'actual_balance': c.actual_balance,
            'difference':     c.difference,
            'note':           c.note,
            'closed_by':      c.closed_by.username if c.closed_by else None,
            'created_at':     c.created_at.isoformat() if c.created_at else None,
        } for c in closes])

    @app.route('/api/cashbox-closes', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_cashbox')
    def api_cashbox_closes_create():
        data = request.get_json(force=True) or {}
        account_code   = str(data.get('account_code') or CASH_ACCOUNT).strip()
        actual_balance, balance_err = _parse_money(data.get('actual_balance') or 0, 'الرصيد الفعلي')
        if balance_err:
            return balance_err
        note           = (data.get('note') or '').strip() or None
        acct = Account.query.filter_by(code=account_code).first()
        if not acct:
            return jsonify({'error': f'الحساب {account_code} غير موجود'}), 404
        if not acct.is_active:
            return jsonify({'error': 'لا يمكن استخدام حساب مؤرشف في إغلاق صندوق جديد'}), 409
        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error
        system_balance = _account_balance_from_journal([acct.id], creation_branch_id)
        difference = round(actual_balance - system_balance, 2)
        from datetime import date as date_cls
        cc = CashboxClose(
            close_date=date_cls.today(),
            branch_id=creation_branch_id,
            account_id=acct.id,
            system_balance=system_balance,
            actual_balance=actual_balance,
            difference=difference,
            note=note,
            closed_by_id=current_user.id,
        )
        db.session.add(cc)
        log_action('cashbox_close', 'cashbox_close', None,
                   details=f'account={account_code} diff={difference}')
        db.session.commit()
        return jsonify({
            'id': cc.id, 'close_date': cc.close_date.isoformat(),
            'system_balance': cc.system_balance, 'actual_balance': cc.actual_balance,
            'difference': cc.difference, 'note': cc.note,
        }), 201

    # ─── Cash Dashboard ───────────────────────────────────────────────────────

    @app.route('/api/cash-dashboard')
    @api_login_required
    @api_permission_required('manage_cashbox')
    def api_cash_dashboard():
        today_str = datetime.utcnow().date().isoformat()
        # حسابات الصندوق والبنك
        cash_accounts = Account.query.filter(Account.code.like('111%'), Account.is_active.is_(True)).filter(
            ~Account.children.any()).all()
        bank_accounts = Account.query.filter(Account.code.like('112%'), Account.is_active.is_(True)).filter(
            ~Account.children.any()).all()
        cash_ids = [a.id for a in cash_accounts]
        bank_ids = [a.id for a in bank_accounts]
        all_cash_bank_ids = cash_ids + bank_ids
        branch_id = selected_branch_scope_id()
        cashbox_balance = _account_balance_from_journal(cash_ids, branch_id)
        bank_balance    = _account_balance_from_journal(bank_ids, branch_id)
        # وارد وصادر اليوم (لحسابات الصندوق فقط)
        today_lines = (
            db.session.query(JournalEntryLine)
            .join(JournalEntry)
            .filter(
                JournalEntryLine.account_id.in_(cash_ids),
                func.date(JournalEntry.entry_date) == today_str,
            )
        )
        if branch_id is not None:
            today_lines = today_lines.filter(JournalEntry.branch_id == branch_id)
        today_lines = today_lines.all()
        today_inflow = sum((decimal_value(line.debit) for line in today_lines), ZERO_MONEY)
        today_outflow = sum((decimal_value(line.credit) for line in today_lines), ZERO_MONEY)
        # آخر إقفال
        last_close = scoped_query(CashboxClose).order_by(CashboxClose.id.desc()).first()
        last_close_data = None
        if last_close:
            last_close_data = {
                'date':       last_close.close_date.isoformat(),
                'difference': last_close.difference,
                'note':       last_close.note,
            }
        # تفاصيل الحسابات
        def accounts_detail(accts):
            return [{'code': a.code, 'name': a.name,
                     'balance': _account_balance_from_journal([a.id], branch_id)} for a in accts]
        return jsonify({
            'cashbox_balance_iqd': cashbox_balance,
            'bank_balance_iqd':    bank_balance,
            'today_inflow_iqd':    round(today_inflow,  2),
            'today_outflow_iqd':   round(today_outflow, 2),
            'last_close':          last_close_data,
            'cash_accounts':       accounts_detail(cash_accounts),
            'bank_accounts':       accounts_detail(bank_accounts),
        })

    # ─── Installment Aging Report ─────────────────────────────────────────────

    @app.route('/api/reports/ar-aging')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_ar_aging():
        as_of = datetime.utcnow().date()
        bucket_defs = [
            ('current', 'غير مستحق', None, 0),
            ('1_30', '1-30 يوم', 1, 30),
            ('31_60', '31-60 يوم', 31, 60),
            ('61_90', '61-90 يوم', 61, 90),
            ('90_plus', '90+ يوم', 91, None),
        ]
        buckets = {
            key: {'bucket': key, 'label': label, 'count': 0, 'total_iqd': ZERO_MONEY, 'customers': set(), 'items': []}
            for key, label, _min_days, _max_days in bucket_defs
        }
        customer_totals = {}

        def bucket_key(days_past_due):
            if days_past_due <= 0:
                return 'current'
            if days_past_due <= 30:
                return '1_30'
            if days_past_due <= 60:
                return '31_60'
            if days_past_due <= 90:
                return '61_90'
            return '90_plus'

        def add_item(*, customer, sale, due_date, amount, currency, source, schedule=None):
            amount_iqd = to_iqd(amount, currency) or ZERO_MONEY
            if amount_iqd <= 0:
                return
            due = due_date.date() if hasattr(due_date, 'date') else due_date
            days = (as_of - due).days if due else 0
            key = bucket_key(days)
            customer_id = customer.id if customer else None
            customer_name = (customer.full_name or customer.name) if customer else '—'
            car = sale.car if sale else None
            row = {
                'customer_id': customer_id,
                'customer_name': customer_name,
                'sale_id': sale.id if sale else None,
                'invoice_number': sale.invoice_number if sale else None,
                'schedule_id': schedule.id if schedule else None,
                'installment_number': schedule.installment_number if schedule else None,
                'due_date': due.isoformat() if due else None,
                'days_past_due': max(days, 0),
                'amount_iqd': round(amount_iqd, 2),
                'currency': currency,
                'source': source,
                'car': f'{car.brand} {car.model} {car.manufacturing_year}' if car else None,
                'branch_id': sale.branch_id if sale else None,
                'branch': branch_json(sale.branch) if sale else None,
            }
            bucket = buckets[key]
            bucket['count'] += 1
            bucket['total_iqd'] = round(bucket['total_iqd'] + amount_iqd, 2)
            if customer_id:
                bucket['customers'].add(customer_id)
                agg = customer_totals.setdefault(customer_id, {
                    'customer_id': customer_id,
                    'customer_name': customer_name,
                    'total_iqd': 0.0,
                    'oldest_days_past_due': 0,
                    'items_count': 0,
                })
                agg['total_iqd'] = round(agg['total_iqd'] + amount_iqd, 2)
                agg['oldest_days_past_due'] = max(agg['oldest_days_past_due'], max(days, 0))
                agg['items_count'] += 1
            bucket['items'].append(row)

        schedules = (
            scoped_query(InstallmentSchedule)
            .join(InstallmentPlan)
            .join(Sale, InstallmentPlan.sale_id == Sale.id)
            .filter(
                Sale.status != 'Cancelled',
                InstallmentSchedule.status != 'Cancelled',
                InstallmentSchedule.remaining_amount > 0,
            )
            .order_by(InstallmentSchedule.due_date.asc())
            .all()
        )
        for schedule in schedules:
            plan = schedule.plan
            sale = plan.sale if plan else None
            add_item(
                customer=sale.buyer if sale else None,
                sale=sale,
                due_date=schedule.due_date,
                amount=schedule.remaining_amount,
                currency=schedule.currency,
                source='installment_schedule',
                schedule=schedule,
            )

        installment_sale_ids = {
            plan.sale_id
            for plan in scoped_query(InstallmentPlan).filter(InstallmentPlan.sale_id.isnot(None)).all()
        }
        direct_sales = (
            scoped_query(Sale)
            .filter(Sale.status != 'Cancelled', Sale.remaining_amount > 0)
            .order_by(Sale.sale_date.asc())
            .all()
        )
        for sale in direct_sales:
            if sale.id in installment_sale_ids:
                continue
            add_item(
                customer=sale.buyer,
                sale=sale,
                due_date=sale.sale_date,
                amount=sale.remaining_amount,
                currency=sale.currency,
                source='sale_balance',
            )

        result_buckets = []
        for key, label, min_days, max_days in bucket_defs:
            bucket = buckets[key]
            items = sorted(bucket['items'], key=lambda item: item['days_past_due'], reverse=True)
            result_buckets.append({
                'bucket': key,
                'label': label,
                'min_days': min_days,
                'max_days': max_days,
                'count': bucket['count'],
                'customer_count': len(bucket['customers']),
                'total_iqd': round(bucket['total_iqd'], 2),
                'items': items[:50],
            })

        total_iqd = round(sum(bucket['total_iqd'] for bucket in result_buckets), 2)
        return jsonify({
            'as_of': as_of.isoformat(),
            'total_iqd': total_iqd,
            'total_count': sum(bucket['count'] for bucket in result_buckets),
            'buckets': result_buckets,
            'customers': sorted(customer_totals.values(), key=lambda item: item['total_iqd'], reverse=True)[:50],
        })

    @app.route('/api/reports/branch-comparison')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_branch_comparison():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.utcnow() - timedelta(days=30)
            end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.utcnow()
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة'}), 400
        end = end.replace(hour=23, minute=59, second=59)

        rows = []
        for branch in get_accessible_branches():
            sales = Sale.query.filter(
                Sale.branch_id == branch.id,
                Sale.status != 'Cancelled',
                Sale.sale_date.between(start, end),
            ).all()
            purchases = Purchase.query.filter(
                Purchase.branch_id == branch.id,
                Purchase.status != 'Cancelled',
                Purchase.purchase_date.between(start, end),
            ).all()
            expenses = Expense.query.filter(
                Expense.branch_id == branch.id,
                Expense.expense_date.between(start, end),
            ).all()
            installment_payments = Payment.query.filter(
                Payment.branch_id == branch.id,
                Payment.payment_type == 'installment',
                Payment.payment_date.between(start, end),
            ).all()
            transactions = Transaction.query.filter(
                Transaction.branch_id == branch.id,
                Transaction.created_at.between(start, end),
            ).all()

            sales_total = sum(record_amount_iqd(s, 'selling_price') for s in sales)
            sales_discount = sum(record_amount_iqd(s, 'discount') for s in sales)
            sales_paid = sum(record_amount_iqd(s, 'paid_amount') for s in sales)
            sales_remaining = sum(record_amount_iqd(s, 'remaining_amount') for s in sales)
            purchase_paid = sum(record_amount_iqd(p, 'paid_amount') for p in purchases)
            installment_income = sum(record_amount_iqd(p, 'amount') for p in installment_payments)
            transaction_income = sum(record_amount_iqd(t, 'amount') for t in transactions if t.transaction_type == 'Income')
            transaction_expense = sum(record_amount_iqd(t, 'amount') for t in transactions if t.transaction_type == 'Expense')
            expenses_total = sum(record_amount_iqd(e, 'amount') for e in expenses) + transaction_expense
            gross_profit = sum(
                record_amount_iqd(s, 'selling_price') -
                record_amount_iqd(s, 'discount') -
                to_iqd(s.car.purchase_price, getattr(s.car, 'currency', s.currency))
                for s in sales if s.car
            )
            net_profit = gross_profit + transaction_income - expenses_total
            cashbox_balance = sales_paid + installment_income + transaction_income - purchase_paid - expenses_total

            rows.append({
                'branch': branch_json(branch),
                'sales_count': len(sales),
                'purchases_count': len(purchases),
                'customers_count': Customer.query.filter(Customer.branch_id == branch.id).count(),
                'available_cars_count': Car.query.filter_by(branch_id=branch.id, status='Available').count(),
                'sold_cars_count': Car.query.filter_by(branch_id=branch.id, status='Sold').count(),
                'sales_total_iqd': round(sales_total, 2),
                'sales_discount_iqd': round(sales_discount, 2),
                'sales_paid_iqd': round(sales_paid, 2),
                'sales_remaining_iqd': round(sales_remaining, 2),
                'installment_income_iqd': round(installment_income, 2),
                'purchase_paid_iqd': round(purchase_paid, 2),
                'expenses_iqd': round(expenses_total, 2),
                'gross_profit_iqd': round(gross_profit, 2),
                'net_profit_iqd': round(net_profit, 2),
                'cashbox_balance_iqd': round(cashbox_balance, 2),
            })

        totals = {
            'sales_count': sum(row['sales_count'] for row in rows),
            'purchases_count': sum(row['purchases_count'] for row in rows),
            'sales_total_iqd': round(sum(row['sales_total_iqd'] for row in rows), 2),
            'sales_paid_iqd': round(sum(row['sales_paid_iqd'] for row in rows), 2),
            'sales_remaining_iqd': round(sum(row['sales_remaining_iqd'] for row in rows), 2),
            'expenses_iqd': round(sum(row['expenses_iqd'] for row in rows), 2),
            'gross_profit_iqd': round(sum(row['gross_profit_iqd'] for row in rows), 2),
            'net_profit_iqd': round(sum(row['net_profit_iqd'] for row in rows), 2),
            'cashbox_balance_iqd': round(sum(row['cashbox_balance_iqd'] for row in rows), 2),
        }
        return jsonify({
            'filters': {
                'start_date': start.strftime('%Y-%m-%d'),
                'end_date': end.strftime('%Y-%m-%d'),
            },
            'branches': rows,
            'totals': totals,
        })

    @app.route('/api/reports/installment-aging')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_installment_aging():
        today = datetime.utcnow().date()
        # جلب الأقساط المتأخرة (Overdue أو Pending مع due_date < today)
        overdue_schedules = (
            InstallmentSchedule.query
            .join(InstallmentPlan)
            .join(Sale, InstallmentPlan.sale_id == Sale.id)
            .filter(Sale.status != 'Cancelled')
            .filter(InstallmentSchedule.remaining_amount > 0)
            .filter(InstallmentSchedule.status != 'Cancelled')
            .filter(InstallmentSchedule.due_date < datetime.utcnow())
            .all()
        )
        buckets = {
            '1_30':  {'label': '1-30 يوم',  'min': 1,  'max': 30,  'schedules': [], 'count': 0, 'total': Decimal('0.0'), 'customers': set()},
            '31_60': {'label': '31-60 يوم', 'min': 31, 'max': 60,  'schedules': [], 'count': 0, 'total': Decimal('0.0'), 'customers': set()},
            '61_90': {'label': '61-90 يوم', 'min': 61, 'max': 90,  'schedules': [], 'count': 0, 'total': Decimal('0.0'), 'customers': set()},
            '90p':   {'label': '90+ يوم',   'min': 91, 'max': None,'schedules': [], 'count': 0, 'total': Decimal('0.0'), 'customers': set()},
        }
        for sch in overdue_schedules:
            days = (today - sch.due_date.date()).days
            if days < 1:
                continue
            if days <= 30:    bk = '1_30'
            elif days <= 60:  bk = '31_60'
            elif days <= 90:  bk = '61_90'
            else:             bk = '90p'
            plan    = sch.plan
            sale    = plan.sale if plan else None
            buyer   = sale.buyer if sale else None
            car     = sale.car   if sale else None
            amount_iqd = to_iqd(sch.remaining_amount, sch.currency)
            buckets[bk]['count']   += 1
            buckets[bk]['total']   += amount_iqd
            if buyer:
                buckets[bk]['customers'].add(buyer.id)
            buckets[bk]['schedules'].append({
                'schedule_id':    sch.id,
                'plan_id':        plan.id if plan else None,
                'installment_no': sch.installment_number,
                'due_date':       sch.due_date.strftime('%Y-%m-%d') if sch.due_date else None,
                'days_overdue':   days,
                'remaining_iqd':  round(amount_iqd, 2),
                'customer_name':  buyer.name if buyer else '—',
                'customer_id':    buyer.id if buyer else None,
                'car':            f'{car.brand} {car.model}' if car else '—',
            })
        result = []
        for key in ('1_30', '31_60', '61_90', '90p'):
            b = buckets[key]
            result.append({
                'bucket':         key,
                'label':          b['label'],
                'count':          b['count'],
                'total_iqd':      round(b['total'], 2),
                'customer_count': len(b['customers']),
                'schedules':      sorted(b['schedules'], key=lambda x: x['days_overdue'], reverse=True)[:20],
            })
        return jsonify({'buckets': result, 'generated_at': today.isoformat()})

    @app.route('/api/reports')
    @api_login_required
    @api_permission_required('manage_reports')
    def api_reports():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        report_branch_id = request.args.get('branch_id', type=int)

        try:
            start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.utcnow() - timedelta(days=30)
            end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.utcnow()
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة'}), 400

        end = end.replace(hour=23, minute=59, second=59)
        today = datetime.utcnow().date()

        def report_query(model):
            return scoped_branch_query(model.query, model, report_branch_id)

        sales_data = report_query(Sale).filter(
            Sale.sale_date.between(start, end),
            Sale.status != 'Cancelled'
        ).order_by(Sale.sale_date.desc()).all()
        purchases_data = report_query(Purchase).filter(
            Purchase.purchase_date.between(start, end),
            Purchase.status != 'Cancelled'
        ).order_by(Purchase.purchase_date.desc()).all()
        installment_plans = report_query(InstallmentPlan).filter(
            InstallmentPlan.created_at.between(start, end)
        ).order_by(InstallmentPlan.created_at.desc()).all()
        installment_schedules = report_query(InstallmentSchedule).filter(
            InstallmentSchedule.due_date.between(start, end)
        ).order_by(InstallmentSchedule.due_date.asc()).all()
        overdue_schedules = [
            schedule for schedule in installment_schedules
            if schedule.remaining_amount > 0 and schedule.due_date and schedule.due_date.date() < today
        ]
        installment_payments = report_query(Payment).filter(
            Payment.payment_type == 'installment',
            Payment.payment_date.between(start, end)
        ).order_by(Payment.payment_date.desc()).all()
        expenses_data = report_query(Expense).filter(
            Expense.expense_date.between(start, end)
        ).order_by(Expense.expense_date.desc()).all()
        transactions = report_query(Transaction).filter(
            Transaction.created_at.between(start, end)
        ).order_by(Transaction.created_at.desc()).all()
        buyer_balances = report_query(Customer).filter_by(customer_type='Buyer').order_by(Customer.name.asc()).all()
        seller_balances = report_query(Customer).filter_by(customer_type='Seller').order_by(Customer.name.asc()).all()

        sales_paid = sum(record_amount_iqd(s, 'paid_amount') for s in sales_data)
        purchases_paid = sum(record_amount_iqd(p, 'paid_amount') for p in purchases_data)
        sales_total = sum(record_amount_iqd(s, 'selling_price') for s in sales_data)
        sales_discount = sum(record_amount_iqd(s, 'discount') for s in sales_data)
        sales_remaining = sum(record_amount_iqd(s, 'remaining_amount') for s in sales_data)
        purchases_total = sum(record_amount_iqd(p, 'purchase_price') for p in purchases_data)
        purchases_remaining = sum(record_amount_iqd(p, 'remaining_amount') for p in purchases_data)
        installment_income = sum(record_amount_iqd(p, 'amount') for p in installment_payments)
        transaction_income = sum(record_amount_iqd(t, 'amount') for t in transactions if t.transaction_type == 'Income')
        transaction_expenses = sum(record_amount_iqd(t, 'amount') for t in transactions if t.transaction_type == 'Expense')
        expenses_total = sum(record_amount_iqd(e, 'amount') for e in expenses_data) + transaction_expenses
        gross_profit = sum(
            record_amount_iqd(s, 'selling_price') -
            record_amount_iqd(s, 'discount') -
            to_iqd(s.car.purchase_price, getattr(s.car, 'currency', s.currency))
            for s in sales_data if s.car
        )
        net_profit = gross_profit + transaction_income - expenses_total
        cashbox_balance = sales_paid + installment_income + transaction_income - purchases_paid - expenses_total

        def customer_name(customer):
            return customer.full_name or customer.name

        return jsonify({
            'filters': {
                'start_date': start.strftime('%Y-%m-%d'),
                'end_date': end.strftime('%Y-%m-%d'),
                'branch_id': report_branch_id,
            },
            'branches': [
                {'id': branch.id, 'name': branch.name, 'is_main': branch.is_main}
                for branch in get_accessible_branches()
            ],
            'summary': {
                'sales_count': len(sales_data),
                'purchases_count': len(purchases_data),
                'installment_plans_count': len(installment_plans),
                'overdue_installments_count': len(overdue_schedules),
                'sales_total': sales_total,
                'sales_discount': sales_discount,
                'sales_paid': sales_paid,
                'sales_remaining': sales_remaining,
                'purchases_total': purchases_total,
                'purchases_paid': purchases_paid,
                'purchases_remaining': purchases_remaining,
                'installment_income': installment_income,
                'expenses': expenses_total,
                'gross_profit': gross_profit,
                'net_profit': net_profit,
                'cashbox_balance': cashbox_balance,
            },
            'sales': [{
                'id': sale.id,
                'invoice_number': sale.invoice_number,
                'date': sale.sale_date.isoformat() if sale.sale_date else None,
                'customer': customer_name(sale.buyer) if sale.buyer else None,
                'car': f'{sale.car.brand} {sale.car.model} {sale.car.manufacturing_year}' if sale.car else None,
                'total_iqd': record_amount_iqd(sale, 'selling_price'),
                'discount_iqd': record_amount_iqd(sale, 'discount'),
                'paid_iqd': record_amount_iqd(sale, 'paid_amount'),
                'remaining_iqd': record_amount_iqd(sale, 'remaining_amount'),
                'payment_method': sale.payment_method,
                'status': sale.status,
            } for sale in sales_data],
            'purchases': [{
                'id': purchase.id,
                'invoice_number': purchase.invoice_number,
                'date': purchase.purchase_date.isoformat() if purchase.purchase_date else None,
                'customer': customer_name(purchase.seller) if purchase.seller else None,
                'car': f'{purchase.car.brand} {purchase.car.model} {purchase.car.manufacturing_year}' if purchase.car else None,
                'total_iqd': record_amount_iqd(purchase, 'purchase_price'),
                'paid_iqd': record_amount_iqd(purchase, 'paid_amount'),
                'remaining_iqd': record_amount_iqd(purchase, 'remaining_amount'),
                'payment_method': purchase.payment_method,
                'status': purchase.status,
            } for purchase in purchases_data],
            'installments': [{
                'id': plan.id,
                'invoice_number': plan.sale.invoice_number if plan.sale else None,
                'date': plan.created_at.isoformat() if plan.created_at else None,
                'customer': customer_name(plan.sale.buyer) if plan.sale and plan.sale.buyer else None,
                'car': f'{plan.sale.car.brand} {plan.sale.car.model} {plan.sale.car.manufacturing_year}' if plan.sale and plan.sale.car else None,
                'total_iqd': to_iqd(plan.total_amount, plan.currency),
                'paid_iqd': to_iqd(plan.paid_amount, plan.currency),
                'remaining_iqd': to_iqd(plan.remaining_amount, plan.currency),
                'months': plan.number_of_months,
                'status': plan.status,
            } for plan in installment_plans],
            'overdue_installments': [{
                'id': schedule.id,
                'plan_id': schedule.installment_plan_id,
                'invoice_number': schedule.plan.sale.invoice_number if schedule.plan and schedule.plan.sale else None,
                'due_date': schedule.due_date.isoformat() if schedule.due_date else None,
                'customer': customer_name(schedule.plan.sale.buyer) if schedule.plan and schedule.plan.sale and schedule.plan.sale.buyer else None,
                'amount_iqd': to_iqd(schedule.amount, schedule.currency),
                'paid_iqd': to_iqd(schedule.paid_amount, schedule.currency),
                'remaining_iqd': to_iqd(schedule.remaining_amount, schedule.currency),
                'status': schedule.status,
            } for schedule in overdue_schedules],
            'customer_balances': [
                {
                    'id': customer.id,
                    'name': customer_name(customer),
                    'type': customer.customer_type,
                    'balance_iqd': sum(record_amount_iqd(s, 'remaining_amount') for s in customer.sales if s.status != 'Cancelled'),
                }
                for customer in buyer_balances
            ] + [
                {
                    'id': customer.id,
                    'name': customer_name(customer),
                    'type': customer.customer_type,
                    'balance_iqd': sum(record_amount_iqd(p, 'remaining_amount') for p in customer.purchases if p.status != 'Cancelled'),
                }
                for customer in seller_balances
            ],
            'cashbox': {
                'sales_paid': sales_paid,
                'installment_income': installment_income,
                'other_income': transaction_income,
                'purchases_paid': purchases_paid,
                'expenses': expenses_total,
                'balance': cashbox_balance,
            },
            'profit_loss': {
                'sales_total': sales_total,
                'sales_discount': sales_discount,
                'cost_of_cars': purchases_total,
                'gross_profit': gross_profit,
                'other_income': transaction_income,
                'expenses': expenses_total,
                'net_profit': net_profit,
            },
        })

    @app.route('/api/expenses', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_expenses():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        report_branch_id = request.args.get('branch_id', type=int)

        try:
            start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.utcnow() - timedelta(days=30)
            end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.utcnow()
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة'}), 400

        end = end.replace(hour=23, minute=59, second=59)
        query = scoped_branch_query(Expense.query, Expense, report_branch_id)

        expenses = query.filter(Expense.expense_date.between(start, end)).order_by(Expense.expense_date.desc()).all()

        return jsonify({
            'filters': {
                'start_date': start.strftime('%Y-%m-%d'),
                'end_date': end.strftime('%Y-%m-%d'),
                'branch_id': report_branch_id,
            },
            'branches': [
                {'id': branch.id, 'name': branch.name, 'is_main': branch.is_main}
                for branch in get_accessible_branches()
            ],
            'total': len(expenses),
            'total_iqd': sum(record_amount_iqd(expense, 'amount') for expense in expenses),
            'items': [{
                'id': expense.id,
                'title': expense.title,
                'amount': expense.amount,
                'amount_iqd': record_amount_iqd(expense, 'amount'),
                'currency': expense.currency,
                'category': expense.category,
                'notes': expense.notes,
                'expense_date': expense.expense_date.isoformat() if expense.expense_date else None,
                'created_at': expense.created_at.isoformat() if expense.created_at else None,
                'branch_id': expense.branch_id,
            } for expense in expenses],
        })

    @app.route('/api/expenses', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_create_expense():
        data = request.get_json(silent=True) or {}
        title = str(data.get('title') or '').strip()
        amount, amount_err = _parse_money(data.get('amount') or 0, 'المبلغ')
        if amount_err:
            return amount_err
        currency = normalize_currency(data.get('currency'))
        category = str(data.get('category') or '').strip() or None
        notes = str(data.get('notes') or '').strip() or None
        expense_date = data.get('expense_date')

        if not title or amount <= 0 or not expense_date:
            return jsonify({'error': 'عنوان المصروف والمبلغ والتاريخ مطلوبة'}), 400

        try:
            parsed_date = datetime.strptime(expense_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة'}), 400

        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error

        expense = Expense(
            branch_id=creation_branch_id,
            title=title,
            amount=amount,
            currency=currency,
            category=category,
            notes=notes,
            expense_date=parsed_date,
        )
        db.session.add(expense)
        db.session.flush()

        # ── قيود محاسبية تلقائية ──────────────────────────────────────────
        payment_method = data.get('payment_method') or 'Cash'
        try:
            _post_expense_journal_entry(expense, payment_method)
        except Exception as _je_err:
            db.session.rollback()
            app.logger.warning('Expense JE failed (expense=%s): %s', expense.id, _je_err)
            return jsonify({'error': 'فشل إنشاء القيد المحاسبي للمصروف، لم يتم حفظ العملية'}), 500

        log_action('add expense', 'Expense', expense.id, title)
        db.session.commit()

        return jsonify({
            'id': expense.id,
            'title': expense.title,
            'amount': expense.amount,
            'amount_iqd': record_amount_iqd(expense, 'amount'),
            'currency': expense.currency,
            'category': expense.category,
            'notes': expense.notes,
            'expense_date': expense.expense_date.isoformat() if expense.expense_date else None,
            'created_at': expense.created_at.isoformat() if expense.created_at else None,
        }), 201

    @app.route('/api/cashbox')
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_cashbox():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        report_branch_id = request.args.get('branch_id', type=int)

        try:
            start = datetime.strptime(start_date, '%Y-%m-%d') if start_date else datetime.utcnow() - timedelta(days=30)
            end = datetime.strptime(end_date, '%Y-%m-%d') if end_date else datetime.utcnow()
        except ValueError:
            return jsonify({'error': 'صيغة التاريخ غير صحيحة'}), 400

        end = end.replace(hour=23, minute=59, second=59)

        def cashbox_query(model):
            return scoped_branch_query(model.query, model, report_branch_id)

        payments = cashbox_query(Payment).filter(Payment.payment_date.between(start, end)).order_by(Payment.payment_date.desc()).all()
        expenses = cashbox_query(Expense).filter(Expense.expense_date.between(start, end)).order_by(Expense.expense_date.desc()).all()
        transactions = cashbox_query(Transaction).filter(Transaction.created_at.between(start, end)).order_by(Transaction.created_at.desc()).all()

        sales_paid = sum(record_amount_iqd(payment, 'amount') for payment in payments if payment.payment_type == 'sale')
        purchase_paid = sum(record_amount_iqd(payment, 'amount') for payment in payments if payment.payment_type == 'purchase')
        installment_paid = sum(record_amount_iqd(payment, 'amount') for payment in payments if payment.payment_type == 'installment')
        other_income = sum(record_amount_iqd(transaction, 'amount') for transaction in transactions if transaction.transaction_type == 'Income')
        transaction_expenses = sum(record_amount_iqd(transaction, 'amount') for transaction in transactions if transaction.transaction_type == 'Expense')
        expenses_total = sum(record_amount_iqd(expense, 'amount') for expense in expenses) + transaction_expenses
        balance = sales_paid + installment_paid + other_income - purchase_paid - expenses_total

        movements = []
        for payment in payments:
            amount_iqd = record_amount_iqd(payment, 'amount')
            is_out = payment.payment_type == 'purchase'
            movements.append({
                'id': f'payment-{payment.id}',
                'date': payment.payment_date.isoformat() if payment.payment_date else None,
                'type': payment.payment_type,
                'description': payment.notes or payment.payment_method or payment.payment_type,
                'inflow_iqd': 0 if is_out else amount_iqd,
                'outflow_iqd': amount_iqd if is_out else 0,
                'source_id': payment.id,
            })
        for expense in expenses:
            movements.append({
                'id': f'expense-{expense.id}',
                'date': expense.expense_date.isoformat() if expense.expense_date else None,
                'type': 'expense',
                'description': expense.title,
                'inflow_iqd': 0,
                'outflow_iqd': record_amount_iqd(expense, 'amount'),
                'source_id': expense.id,
            })
        for transaction in transactions:
            amount_iqd = record_amount_iqd(transaction, 'amount')
            is_income = transaction.transaction_type == 'Income'
            movements.append({
                'id': f'transaction-{transaction.id}',
                'date': transaction.created_at.isoformat() if transaction.created_at else None,
                'type': transaction.transaction_type,
                'description': transaction.description,
                'inflow_iqd': amount_iqd if is_income else 0,
                'outflow_iqd': 0 if is_income else amount_iqd,
                'source_id': transaction.id,
            })

        movements.sort(key=lambda item: item['date'] or '', reverse=True)

        return jsonify({
            'filters': {
                'start_date': start.strftime('%Y-%m-%d'),
                'end_date': end.strftime('%Y-%m-%d'),
                'branch_id': report_branch_id,
            },
            'branches': [
                {'id': branch.id, 'name': branch.name, 'is_main': branch.is_main}
                for branch in get_accessible_branches()
            ],
            'summary': {
                'sales_paid': sales_paid,
                'purchase_paid': purchase_paid,
                'installment_paid': installment_paid,
                'other_income': other_income,
                'expenses': expenses_total,
                'balance': balance,
            },
            'movements': movements,
        })

    @app.route('/api/notifications')
    @api_login_required
    def api_notifications():
        today = datetime.utcnow().date()
        soon  = today + timedelta(days=2)

        schedules = InstallmentSchedule.query.join(InstallmentPlan).join(Sale).filter(
            Sale.status != 'Cancelled',
            InstallmentSchedule.remaining_amount > 0,
            func.date(InstallmentSchedule.due_date) <= soon.isoformat()
        )
        schedules = branch_filter(schedules, InstallmentSchedule)
        notifications = []
        for s in schedules.limit(25).all():
            plan = s.plan
            sale = plan.sale if plan else None
            buyer = sale.buyer if sale else None
            car   = sale.car   if sale else None
            notifications.append({
                'type':           'installment_due',
                'installment_id': s.id,
                'plan_id':        s.installment_plan_id,
                'sale_id':        plan.sale_id if plan else None,
                'due_date':       s.due_date.isoformat() if s.due_date else None,
                'amount':         float(s.amount or 0),
                'currency':       s.currency,
                'status':         s.status,
                'customer_name':  (buyer.full_name or buyer.name) if buyer else None,
                'car_name':       f'{car.brand} {car.model}' if car else None,
                'invoice_number': sale.invoice_number if sale else None,
            })

        # العملاء المتعثرون: 2+ أقساط متأخرة
        from collections import defaultdict as _dd
        overdue_by_customer: dict = _dd(list)
        overdue_scheds = InstallmentSchedule.query.join(InstallmentPlan).join(Sale).filter(
            Sale.status != 'Cancelled',
            InstallmentSchedule.status == 'Overdue',
            InstallmentSchedule.remaining_amount > 0,
        )
        overdue_scheds = branch_filter(overdue_scheds, InstallmentSchedule)
        for s in overdue_scheds.all():
            plan  = s.plan
            sale  = plan.sale if plan else None
            buyer = sale.buyer if sale else None
            if buyer:
                overdue_by_customer[buyer.id].append(s)

        for customer_id, scheds in overdue_by_customer.items():
            if len(scheds) >= 2:
                buyer = Customer.query.get(customer_id)
                if not buyer:
                    continue
                total_overdue = sum(to_iqd(s.remaining_amount, s.currency) for s in scheds)
                notifications.append({
                    'type':            'defaulting_customer',
                    'customer_id':     customer_id,
                    'customer_name':   buyer.full_name or buyer.name,
                    'customer_phone':  buyer.phone,
                    'overdue_count':   len(scheds),
                    'overdue_amount':  round(total_overdue, 2),
                    'currency':        'IQD',
                })

        # recent audit logs
        logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
        for l in logs:
            notifications.append({
                'type':        'audit',
                'id':          l.id,
                'user_id':     l.user_id,
                'action':      l.action,
                'entity_type': l.entity_type,
                'details':     l.details,
                'created_at':  l.created_at.isoformat() if l.created_at else None,
            })
        return jsonify({'notifications': notifications})

    # --- Backup JSON API ---

    @app.route('/api/backups', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_backups')
    def api_list_backups():
        return jsonify({'backups': list_backup_archives()})

    @app.route('/api/backups', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_backups')
    def api_create_backup():
        reason = (request.get_json(silent=True) or {}).get('reason', 'manual')
        backup = create_backup_archive(current_user.username, str(reason))
        log_action('create backup', 'Backup', None, backup['filename'])
        db.session.commit()
        return jsonify(backup), 201

    @app.route('/api/backups/<path:filename>/download', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_backups')
    def api_download_backup(filename):
        safe_name = os.path.basename(filename)
        backup_path = get_backup_path(safe_name)
        if not backup_path:
            return jsonify({'error': 'النسخة الاحتياطية غير موجودة'}), 404
        return send_from_directory(BACKUP_FOLDER, os.path.basename(backup_path), as_attachment=True)

    @app.route('/api/backups/<path:filename>/restore', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_backups')
    def api_restore_backup(filename):
        safe_name = os.path.basename(filename)
        backup_path = get_backup_path(safe_name)
        if not backup_path:
            return jsonify({'error': 'النسخة الاحتياطية غير موجودة'}), 404
        safety_backup = create_backup_archive(current_user.username, 'pre_restore_safety')
        log_action('create safety backup before restore', 'Backup', None, safety_backup['filename'])
        db.session.commit()
        db.session.remove()
        db.engine.dispose()
        try:
            restore_backup_archive(backup_path)
            db.session.remove()
            db.engine.dispose()
            ensure_database_schema()
            log_action('restore backup', 'Backup', None,
                       f"restored={os.path.basename(backup_path)} safety={safety_backup['filename']}")
            db.session.commit()
            return jsonify({'success': True, 'message': 'تمت استعادة النسخة الاحتياطية بنجاح'})
        except Exception:
            db.session.rollback()
            return jsonify({'error': 'فشلت عملية الاستعادة. يرجى التحقق من ملف النسخة الاحتياطية والمحاولة مجدداً.'}), 500

    @app.route('/api/backups/upload', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_backups')
    def api_upload_backup():
        f = request.files.get('file')
        if not f or not f.filename:
            return jsonify({'error': 'لم يتم إرفاق ملف'}), 400
        name = secure_filename(f.filename)
        if not name.endswith('.zip'):
            return jsonify({'error': 'يجب أن يكون الملف بصيغة .zip'}), 400
        ensure_backup_folder()
        dest = os.path.join(BACKUP_FOLDER, name)
        # avoid overwrite — append microseconds if name already exists
        if os.path.exists(dest):
            ts = datetime.utcnow().strftime('%f')
            name = name[:-4] + f'_{ts}.zip'
            dest = os.path.join(BACKUP_FOLDER, name)
        f.save(dest)
        log_action('upload backup', 'Backup', None, name)
        db.session.commit()
        return jsonify({'filename': name, 'size': os.path.getsize(dest)}), 201

    @app.route('/api/backups/<path:filename>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_backups')
    def api_delete_backup(filename):
        _ = os.path.basename(filename)  # sanitize — delete is disabled anyway
        return jsonify({'error': 'حذف النسخ الاحتياطية معطل حالياً'}), 405

    @app.route('/api/admin/financial-consistency', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_reports')
    def api_financial_consistency():
        """Check that stored paid_amount/remaining_amount match sums from Payment records."""
        TOLERANCE = Decimal('0.02')  # accept up to 2 fils/cents drift

        issues = []

        # Check sales — sum ALL payment types linked to this sale
        for sale in Sale.query.filter(Sale.status != 'Cancelled').all():
            actual_paid = db.session.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
                Payment.sale_id == sale.id,
            ).scalar()
            expected_remaining = max(sale.selling_price - sale.discount - actual_paid, 0)
            if abs(sale.paid_amount - actual_paid) > TOLERANCE:
                issues.append({
                    'type': 'sale',
                    'id': sale.id,
                    'invoice_number': sale.invoice_number,
                    'field': 'paid_amount',
                    'stored': round(sale.paid_amount, 4),
                    'actual': round(actual_paid, 4),
                    'diff': round(sale.paid_amount - actual_paid, 4),
                })
            if abs(sale.remaining_amount - expected_remaining) > TOLERANCE:
                issues.append({
                    'type': 'sale',
                    'id': sale.id,
                    'invoice_number': sale.invoice_number,
                    'field': 'remaining_amount',
                    'stored': round(sale.remaining_amount, 4),
                    'actual': round(expected_remaining, 4),
                    'diff': round(sale.remaining_amount - expected_remaining, 4),
                })

        # Check purchases — sum ALL payment types linked to this purchase
        for purchase in Purchase.query.filter(Purchase.status != 'Cancelled').all():
            actual_paid = db.session.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
                Payment.purchase_id == purchase.id,
            ).scalar()
            expected_remaining = max(purchase.purchase_price - actual_paid, 0)
            if abs(purchase.paid_amount - actual_paid) > TOLERANCE:
                issues.append({
                    'type': 'purchase',
                    'id': purchase.id,
                    'invoice_number': purchase.invoice_number,
                    'field': 'paid_amount',
                    'stored': round(purchase.paid_amount, 4),
                    'actual': round(actual_paid, 4),
                    'diff': round(purchase.paid_amount - actual_paid, 4),
                })
            if abs(purchase.remaining_amount - expected_remaining) > TOLERANCE:
                issues.append({
                    'type': 'purchase',
                    'id': purchase.id,
                    'invoice_number': purchase.invoice_number,
                    'field': 'remaining_amount',
                    'stored': round(purchase.remaining_amount, 4),
                    'actual': round(expected_remaining, 4),
                    'diff': round(purchase.remaining_amount - expected_remaining, 4),
                })

        # Check installment plan totals
        for plan in InstallmentPlan.query.filter(InstallmentPlan.status != 'Cancelled').all():
            actual_paid = db.session.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
                Payment.installment_schedule_id.in_(
                    db.session.query(InstallmentSchedule.id).filter_by(installment_plan_id=plan.id)
                )
            ).scalar()
            if abs(plan.paid_amount - actual_paid) > TOLERANCE:
                issues.append({
                    'type': 'installment_plan',
                    'id': plan.id,
                    'field': 'paid_amount',
                    'stored': round(plan.paid_amount, 4),
                    'actual': round(actual_paid, 4),
                    'diff': round(plan.paid_amount - actual_paid, 4),
                })

        return jsonify({
            'checked_at': datetime.utcnow().isoformat(timespec='seconds'),
            'issues_count': len(issues),
            'issues': issues,
        })

    @app.route('/api/admin/accounting-integrity', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_accounting_integrity():
        return jsonify(build_accounting_integrity_report())


    # ── Quick Accounting Test ─────────────────────────────────────────────

    @app.route('/api/accounting/quick-test', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_quick_accounting_test():
        """
        اختبار محاسبي سريع معزول تماماً.

        يُنشئ قيوداً محاسبية تجريبية داخل SAVEPOINT ثم يُقارن
        الأرصدة المحسوبة بالأرصدة المتوقعة رياضياً.
        لا يُغيّر أي بيانات حقيقية — يُعاد ضبط كل شيء بعد الاختبار.

        السيناريو:
          1. شراء سيارة     10,000
          2. دفع للمورد      4,000
          3. تكلفة سيارة       500  (شحن)
          4. بيع السيارة    13,000  (قبض 5,000 نقداً + ذمم 8,000)
          5. تحصيل قسط       1,000
          6. مصروف عام         200

        المتوقع:
          الصندوق (111001)  = +1,300   (5000+1000−4000−500−200)
          الذمم  (113002)  = +7,000   (8000−1000)
          المخزون (115001) =     0    (دخل 10000 وخرج بالبيع)
          الموردون(211001) = −6,000   (Cr10000 − Dr4000)  ← قيمة سالبة = دائن
          الإيرادات(410001)= −13,000  (دائن)
          COGS  (360001)  = +10,000
          تكلفة سيارة(330003)= +500
          مصاريف(350009)  =   +200
          صافي الربح       =  +2,300
          ميزان المراجعة   = متوازن
        """
        from .accounting import create_journal_entry

        # ── ثوابت الاختبار ───────────────────────────────────────────────
        PURCHASE_PRICE = Decimal('10000.00')
        SUPPLIER_PAID = Decimal('4000.00')
        VEHICLE_COST = Decimal('500.00')
        SELLING_PRICE = Decimal('13000.00')
        CASH_COLLECTED = Decimal('5000.00')
        AR_AMOUNT       = SELLING_PRICE - CASH_COLLECTED       # 8,000
        INSTALLMENT_PAY = Decimal('1000.00')
        EXPENSE_AMOUNT = Decimal('200.00')

        EXPECTED = {
            CASH_ACCOUNT:    CASH_COLLECTED + INSTALLMENT_PAY - SUPPLIER_PAID - VEHICLE_COST - EXPENSE_AMOUNT,  # +1,300
            AR_ACCOUNT:      AR_AMOUNT - INSTALLMENT_PAY,                                                        # +7,000
            INVENTORY_NEW:   0.0,                                                                                 # ∅ (خرج بالبيع)
            AP_ACCOUNT:      SUPPLIER_PAID - PURCHASE_PRICE,                                                     # −6,000 (دائن)
            REVENUE_NEW_CAR: -SELLING_PRICE,                                                                     # −13,000 (دائن)
            COGS_ACCOUNT:    PURCHASE_PRICE,                                                                     # +10,000
            EXPENSE_SHIPPING: VEHICLE_COST,                                                                      # +500
            EXPENSE_MISC:    EXPENSE_AMOUNT,                                                                     # +200
        }
        LABELS = {
            CASH_ACCOUNT:    'الصندوق الرئيسي',
            AR_ACCOUNT:      'الذمم المدينة (تقسيط)',
            INVENTORY_NEW:   'مخزون سيارات جديدة',
            AP_ACCOUNT:      'موردو السيارات',
            REVENUE_NEW_CAR: 'إيرادات بيع سيارات',
            COGS_ACCOUNT:    'تكلفة سيارات مباعة (COGS)',
            EXPENSE_SHIPPING: 'تكلفة شحن السيارات',
            EXPENSE_MISC:    'مصاريف متنوعة',
        }
        TYPES = {
            CASH_ACCOUNT: 'asset', AR_ACCOUNT: 'asset', INVENTORY_NEW: 'asset',
            AP_ACCOUNT: 'liability',
            REVENUE_NEW_CAR: 'revenue',
            COGS_ACCOUNT: 'expense', EXPENSE_SHIPPING: 'expense', EXPENSE_MISC: 'expense',
        }

        test_je_ids: list[int] = []

        try:
            sp = db.session.begin_nested()

            # ── قيد 1: شراء السيارة ────────────────────────────────────
            je1 = create_journal_entry(
                description='[TEST] شراء سيارة تجريبي',
                lines=[
                    {'account_code': INVENTORY_NEW, 'debit': PURCHASE_PRICE, 'credit': 0},
                    {'account_code': AP_ACCOUNT,    'debit': 0, 'credit': PURCHASE_PRICE},
                ],
            )
            test_je_ids.append(je1.id)

            # ── قيد 2: دفع للمورد ──────────────────────────────────────
            je2 = create_journal_entry(
                description='[TEST] دفع للمورد',
                lines=[
                    {'account_code': AP_ACCOUNT,   'debit': SUPPLIER_PAID, 'credit': 0},
                    {'account_code': CASH_ACCOUNT, 'debit': 0, 'credit': SUPPLIER_PAID},
                ],
            )
            test_je_ids.append(je2.id)

            # ── قيد 3: تكلفة شحن السيارة ───────────────────────────────
            je3 = create_journal_entry(
                description='[TEST] تكلفة شحن السيارة',
                lines=[
                    {'account_code': EXPENSE_SHIPPING, 'debit': VEHICLE_COST, 'credit': 0},
                    {'account_code': CASH_ACCOUNT,     'debit': 0, 'credit': VEHICLE_COST},
                ],
            )
            test_je_ids.append(je3.id)

            # ── قيد 4: إيراد البيع ────────────────────────────────────
            je4 = create_journal_entry(
                description='[TEST] إيراد بيع السيارة',
                lines=[
                    {'account_code': CASH_ACCOUNT,   'debit': CASH_COLLECTED, 'credit': 0},
                    {'account_code': AR_ACCOUNT,     'debit': AR_AMOUNT,      'credit': 0},
                    {'account_code': REVENUE_NEW_CAR,'debit': 0, 'credit': SELLING_PRICE},
                ],
            )
            test_je_ids.append(je4.id)

            # ── قيد 5: تكلفة البضاعة المباعة (COGS) ───────────────────
            je5 = create_journal_entry(
                description='[TEST] تكلفة البضاعة المباعة',
                lines=[
                    {'account_code': COGS_ACCOUNT, 'debit': PURCHASE_PRICE,  'credit': 0},
                    {'account_code': INVENTORY_NEW,'debit': 0, 'credit': PURCHASE_PRICE},
                ],
            )
            test_je_ids.append(je5.id)

            # ── قيد 6: استلام قسط ─────────────────────────────────────
            je6 = create_journal_entry(
                description='[TEST] استلام دفعة قسط',
                lines=[
                    {'account_code': CASH_ACCOUNT, 'debit': INSTALLMENT_PAY, 'credit': 0},
                    {'account_code': AR_ACCOUNT,   'debit': 0, 'credit': INSTALLMENT_PAY},
                ],
            )
            test_je_ids.append(je6.id)

            # ── قيد 7: مصروف عام ──────────────────────────────────────
            je7 = create_journal_entry(
                description='[TEST] مصروف عام',
                lines=[
                    {'account_code': EXPENSE_MISC, 'debit': EXPENSE_AMOUNT, 'credit': 0},
                    {'account_code': CASH_ACCOUNT, 'debit': 0, 'credit': EXPENSE_AMOUNT},
                ],
            )
            test_je_ids.append(je7.id)

            # ── حساب الأرصدة الفعلية من القيود التجريبية فقط ──────────
            actual: dict[str, Decimal] = {}
            for je_id in test_je_ids:
                lines_q = JournalEntryLine.query.filter_by(journal_entry_id=je_id).all()
                for ln in lines_q:
                    code = ln.account.code if ln.account else None
                    if code:
                        actual[code] = (
                            actual.get(code, ZERO_MONEY)
                            + decimal_value(ln.debit)
                            - decimal_value(ln.credit)
                        )

            # ── ميزان المراجعة للقيود التجريبية ────────────────────────
            total_d = total_c = ZERO_MONEY
            for je_id in test_je_ids:
                for ln in JournalEntryLine.query.filter_by(journal_entry_id=je_id).all():
                    total_d += decimal_value(ln.debit)
                    total_c += decimal_value(ln.credit)
            trial_diff = money_value(total_d - total_c)
            trial_balanced = abs(trial_diff) < MONEY_QUANTUM

            # ── بناء نتائج المقارنة ─────────────────────────────────────
            checks: list[dict] = []
            all_pass = True

            for code, exp_val in EXPECTED.items():
                act_val = money_value(actual.get(code, ZERO_MONEY))
                exp_val = money_value(exp_val)
                passed = abs(act_val - exp_val) < MONEY_QUANTUM
                if not passed:
                    all_pass = False

                acct_type  = TYPES.get(code, '')
                # عرض القيم بطريقة مفهومة:
                # أصول ومصاريف → موجبة = مدين (صحيح)
                # خصوم وإيرادات → سالبة = دائن (صحيح)
                if acct_type in ('liability', 'revenue'):
                    display_exp = abs(exp_val)
                    display_act = abs(act_val)
                    direction_label = 'دائن'
                else:
                    display_exp = exp_val
                    display_act = act_val
                    direction_label = 'مدين'

                checks.append({
                    'code':           code,
                    'label':          LABELS.get(code, code),
                    'type':           acct_type,
                    'direction':      direction_label,
                    'expected':       display_exp,
                    'actual':         display_act,
                    'passed':         passed,
                    'diff':           round(act_val - exp_val, 2),
                })

            # ── فحص صافي الربح ─────────────────────────────────────────
            exp_profit = SELLING_PRICE - PURCHASE_PRICE - VEHICLE_COST - EXPENSE_AMOUNT  # 2,300
            act_revenue = abs(actual.get(REVENUE_NEW_CAR, ZERO_MONEY))
            act_cogs = actual.get(COGS_ACCOUNT, ZERO_MONEY)
            act_vc = actual.get(EXPENSE_SHIPPING, ZERO_MONEY)
            act_exp = actual.get(EXPENSE_MISC, ZERO_MONEY)
            act_profit = money_value(act_revenue - act_cogs - act_vc - act_exp)
            profit_pass = abs(act_profit - exp_profit) < MONEY_QUANTUM
            if not profit_pass:
                all_pass = False

            checks.append({
                'code':      'NET_PROFIT',
                'label':     'صافي الربح',
                'type':      'derived',
                'direction': '',
                'expected':  exp_profit,
                'actual':    act_profit,
                'passed':    profit_pass,
                'diff':      round(act_profit - exp_profit, 2),
            })

            # ── فحص ميزان المراجعة ─────────────────────────────────────
            if not trial_balanced:
                all_pass = False
            checks.append({
                'code':      'TRIAL_BALANCE',
                'label':     'ميزان المراجعة',
                'type':      'trial',
                'direction': '',
                'expected':  0.0,
                'actual':    trial_diff,
                'passed':    trial_balanced,
                'diff':      trial_diff,
            })

            # ── دائماً نرجع للنقطة الأصلية (لا نُعدّل البيانات) ────────
            sp.rollback()

            return jsonify({
                'passed':        all_pass,
                'total_checks':  len(checks),
                'passed_count':  sum(1 for c in checks if c['passed']),
                'failed_count':  sum(1 for c in checks if not c['passed']),
                'checks':        checks,
                'scenario': {
                    'purchase_price':   PURCHASE_PRICE,
                    'supplier_paid':    SUPPLIER_PAID,
                    'vehicle_cost':     VEHICLE_COST,
                    'selling_price':    SELLING_PRICE,
                    'cash_collected':   CASH_COLLECTED,
                    'ar_amount':        AR_AMOUNT,
                    'installment_pay':  INSTALLMENT_PAY,
                    'expense_amount':   EXPENSE_AMOUNT,
                    'expected_profit':  exp_profit,
                },
                'note': 'جميع البيانات التجريبية أُلغيت — لم يُعدَّل أي سجل حقيقي',
            })

        except Exception as exc:
            try:
                db.session.rollback()
            except Exception:
                pass
            return jsonify({'error': f'فشل الاختبار: {exc}'}), 500

    @app.route('/api/admin/system-health', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_database')
    def api_system_health():
        """Return a compact operational health snapshot for administrators."""
        is_pg = _is_postgres()
        db_url = str(db.engine.url)
        # عنوان قاعدة البيانات المعروض: host/dbname أو مسار SQLite
        if is_pg:
            db_display = db_url.split('@')[-1] if '@' in db_url else db_url
        else:
            db_display = Config.DATABASE_PATH

        integrity = 'unknown'
        foreign_key_issues = []
        db_size = 0
        try:
            if is_pg:
                # PostgreSQL: يفرض الـ constraints تلقائياً عند الكتابة
                integrity = 'ok'
                db_size_bytes = db.session.execute(
                    text('SELECT pg_database_size(current_database())')
                ).scalar() or 0
                db_size = int(db_size_bytes)
            else:
                integrity = db.session.execute(text('PRAGMA integrity_check')).scalar() or 'unknown'
                foreign_key_issues = [
                    dict(row._mapping)
                    for row in db.session.execute(text('PRAGMA foreign_key_check')).fetchall()
                ]
                db_path_local = Config.DATABASE_PATH
                db_size = os.path.getsize(db_path_local) if os.path.exists(db_path_local) else 0
        except Exception as exc:
            integrity = f'error: {exc}'

        models = get_database_models()
        table_counts = {}
        for table_name, model in models.items():
            try:
                table_counts[table_name] = model.query.count()
            except Exception:
                table_counts[table_name] = None

        logs = []
        logs_root = os.path.join(Config.DATA_DIR, 'logs')
        alt_logs_root = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')), 'logs')
        for root in {logs_root, alt_logs_root}:
            if not root or not os.path.isdir(root):
                continue
            for name in sorted(os.listdir(root)):
                if not name.endswith('.log'):
                    continue
                path = os.path.join(root, name)
                try:
                    logs.append({
                        'name': name,
                        'path': path,
                        'size': os.path.getsize(path),
                        'modified_at': datetime.fromtimestamp(os.path.getmtime(path)).isoformat(timespec='seconds'),
                    })
                except OSError:
                    continue

        latest_backups = list_backup_archives()[:5]

        # Trial balance check
        trial_status = 'unknown'
        trial_difference = 0.0
        try:
            from .accounting import get_trial_balance as _gtb
            _, tb_totals = _gtb()
            td = decimal_value(tb_totals.get('total_debit', 0))
            tc = decimal_value(tb_totals.get('total_credit', 0))
            trial_difference = round(td - tc, 2)
            trial_status = 'balanced' if abs(trial_difference) <= 0.01 else 'unbalanced'
        except Exception as exc:
            trial_status = f'error: {exc}'

        # Accounting integrity
        integrity_report = build_accounting_integrity_report()
        integrity_issues  = integrity_report.get('total_issues', 0)

        # Unbalanced journal entries count (fast query)
        tolerance = 0.01
        unbalanced_je_count = 0
        for je in JournalEntry.query.all():
            d = sum((decimal_value(line.debit) for line in je.lines), ZERO_MONEY)
            c = sum((decimal_value(line.credit) for line in je.lines), ZERO_MONEY)
            if abs(d - c) > tolerance:
                unbalanced_je_count += 1

        warnings = []
        if integrity != 'ok':
            warnings.append('database_integrity')
        if foreign_key_issues:
            warnings.append('foreign_key_issues')
        if not os.environ.get('SECRET_KEY'):
            warnings.append('ephemeral_secret_key_in_dev')
        if len(latest_backups) == 0:
            warnings.append('no_backups_found')
        if trial_status == 'unbalanced':
            warnings.append('trial_balance_unbalanced')
        if integrity_issues > 0:
            warnings.append(f'accounting_integrity_issues_{integrity_issues}')
        if unbalanced_je_count > 0:
            warnings.append(f'unbalanced_journal_entries_{unbalanced_je_count}')

        payload = {
            'checked_at': datetime.utcnow().isoformat(timespec='seconds'),
            'version':    APP_VERSION,
            'status': 'ok' if not warnings else 'attention',
            'warnings': warnings,
            'database': {
                'path': db_display,
                'exists': True,
                'size': db_size,
                'integrity': integrity,
                'foreign_key_issues': foreign_key_issues,
                'table_counts': table_counts,
            },
            'accounting': {
                'accounts_count':       Account.query.count(),
                'journal_entries_count': JournalEntry.query.count(),
                'trial_balance':        trial_status,
                'trial_difference':     trial_difference,
                'integrity_issues':     integrity_issues,
                'unbalanced_entries':   unbalanced_je_count,
            },
            'backups': {
                'count': len(list_backup_archives()),
                'latest': latest_backups,
            },
            'logs': sorted(logs, key=lambda item: item['modified_at'], reverse=True)[:8],
            'error_log': list(_error_log_buffer),
            'runtime': {
                'data_dir': Config.DATA_DIR,
                'upload_folder': Config.UPLOAD_FOLDER,
                'backup_folder': Config.BACKUP_FOLDER,
                'session_lifetime_hours': Config.PERMANENT_SESSION_LIFETIME.total_seconds() / 3600,
                'secure_cookie': bool(Config.SESSION_COOKIE_SECURE),
            },
        }
        if current_user.role != 'Owner':
            payload.pop('runtime', None)
            payload.pop('error_log', None)
        return jsonify(payload)

    # ── Public health-check (no auth) ──────────────────────────────────────────
    @app.route('/api/health', methods=['GET'])
    def api_health():
        """Lightweight public health check used by monitoring tools."""
        db_ok = True
        try:
            db.session.execute(text('SELECT 1'))
        except Exception:
            db_ok = False
        status = 'ok' if db_ok else 'degraded'
        code   = 200 if db_ok else 503
        return jsonify({
            'status':    status,
            'version':   APP_VERSION,
            'app':       APP_NAME,
            'timestamp': datetime.utcnow().isoformat(timespec='seconds') + 'Z',
            'database':  'ok' if db_ok else 'error',
        }), code

    @app.route('/api/version', methods=['GET'])
    @api_login_required
    def api_version():
        return jsonify({'version': APP_VERSION, 'app': APP_NAME})

    # ── Windows Autostart ──────────────────────────────────────────────────────

    _AUTOSTART_KEY  = r'Software\Microsoft\Windows\CurrentVersion\Run'
    _AUTOSTART_NAME = 'CarShowroomManagement'

    def _autostart_exe_path() -> str:
        import sys
        if getattr(sys, 'frozen', False):
            return f'"{sys.executable}"'
        script = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'desktop_app.py'))
        return f'"{sys.executable}" "{script}"'

    def _autostart_is_enabled() -> bool:
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, _AUTOSTART_KEY, 0, winreg.KEY_READ)
            winreg.QueryValueEx(key, _AUTOSTART_NAME)
            winreg.CloseKey(key)
            return True
        except (FileNotFoundError, OSError, ImportError):
            return False

    def _autostart_set(enable: bool) -> None:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, _AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE)
        if enable:
            winreg.SetValueEx(key, _AUTOSTART_NAME, 0, winreg.REG_SZ, _autostart_exe_path())
        else:
            try:
                winreg.DeleteValue(key, _AUTOSTART_NAME)
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)

    @app.route('/api/system/autostart', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_database')
    def api_autostart_get():
        if os.name != 'nt':
            return jsonify({'enabled': False, 'supported': False, 'reason': 'Windows only'})
        return jsonify({'enabled': _autostart_is_enabled(), 'supported': True,
                        'exe_path': _autostart_exe_path()})

    @app.route('/api/system/autostart', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_database')
    def api_autostart_set():
        if os.name != 'nt':
            return jsonify({'error': 'التشغيل التلقائي متاح على ويندوز فقط'}), 400
        data = request.get_json(silent=True) or {}
        enable = bool(data.get('enabled', False))
        try:
            _autostart_set(enable)
            log_action(
                f'autostart_{"enable" if enable else "disable"}',
                'system', None,
                details=f'exe={_autostart_exe_path()}',
            )
            return jsonify({'enabled': enable, 'exe_path': _autostart_exe_path()})
        except Exception as _exc:
            app.logger.warning('Autostart registry error: %s', _exc)
            return jsonify({'error': f'فشل تعديل السجل: {_exc}'}), 500

    # ── Admin error-log viewer ─────────────────────────────────────────────────
    @app.route('/api/admin/logs', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_database')
    def api_admin_logs():
        """Return the last 50 application errors from the in-memory buffer
        and the tail of logs/app.log (if it exists)."""
        log_path = os.path.join(
            os.path.abspath(os.path.join(os.path.dirname(__file__), '..')),
            'logs', 'app.log'
        )
        file_tail: list = []
        if os.path.exists(log_path):
            try:
                with open(log_path, 'r', encoding='utf-8', errors='replace') as fh:
                    lines = fh.readlines()
                file_tail = [l.rstrip() for l in lines[-100:]]
            except OSError:
                pass
        return jsonify({
            'buffer':    list(_error_log_buffer),
            'file_tail': file_tail,
        })

    # --- Sales / Installments JSON CRUD ---

    @app.route('/api/sales', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_create_sale():
        data = request.get_json(silent=True) or {}

        car_id          = data.get('car_id')
        buyer_id        = data.get('buyer_id')
        selling_price   = data.get('selling_price')
        discount, discount_err = _parse_money(data.get('discount') or 0, 'الخصم')
        if discount_err:
            return discount_err
        paid_amount, paid_err = _parse_money(data.get('paid_amount') or 0, 'المبلغ المدفوع')
        if paid_err:
            return paid_err
        payment_method  = data.get('payment_method')
        sale_date_str   = data.get('sale_date')
        currency        = normalize_currency(data.get('currency') or 'USD')

        if not all([car_id, buyer_id, selling_price, payment_method, sale_date_str]):
            return jsonify({'error': 'الحقول المطلوبة: car_id, buyer_id, selling_price, payment_method, sale_date'}), 400

        sp_val, sp_err = _parse_money(selling_price, 'سعر البيع')
        if sp_err:
            return sp_err
        if sp_val <= 0:
            return jsonify({'error': 'سعر البيع يجب أن يكون أكبر من صفر'}), 400
        selling_price = sp_val
        if paid_amount > selling_price:
            return jsonify({'error': 'المبلغ المدفوع لا يمكن أن يتجاوز سعر البيع'}), 400
        if discount < 0:
            return jsonify({'error': 'الخصم لا يمكن أن يكون سالباً'}), 400
        if discount > selling_price:
            return jsonify({'error': 'الخصم لا يمكن أن يتجاوز سعر البيع'}), 400
        try:
            datetime.strptime(sale_date_str, '%Y-%m-%d')
        except (TypeError, ValueError):
            return jsonify({'error': 'صيغة تاريخ البيع غير صحيحة (YYYY-MM-DD)'}), 400
        remaining_amount = max(selling_price - discount - paid_amount, ZERO_MONEY)

        car   = Car.query.get(int(car_id))
        buyer = Customer.query.get(int(buyer_id))

        if not car or not branch_allowed(car):
            return jsonify({'error': 'السيارة غير موجودة أو لا يمكن الوصول إليها'}), 404
        if car.status != 'Available':
            return jsonify({'error': 'هذه السيارة غير متاحة للبيع (مباعة أو محجوزة)'}), 409
        if not buyer or not branch_allowed(buyer):
            return jsonify({'error': 'المشتري غير موجود أو لا يمكن الوصول إليه'}), 404

        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error
        if car.branch_id != creation_branch_id or buyer.branch_id != creation_branch_id:
            return jsonify({'error': 'لا يمكن إنشاء فاتورة بيع بفرع مختلف عن فرع السيارة أو المشتري'}), 409

        # Installment fields (all optional)
        enable_installment       = bool(data.get('enable_installment'))
        number_of_months         = data.get('number_of_months')
        installment_start_date_s = data.get('installment_start_date')
        installment_due_day      = data.get('installment_due_day')
        installment_notes        = data.get('installment_notes')
        months    = int(number_of_months)          if number_of_months    else None
        due_day   = int(installment_due_day)        if installment_due_day else None
        start_date = parse_optional_date(installment_start_date_s) if installment_start_date_s else None

        if enable_installment and remaining_amount > 0:
            if not start_date or not due_day:
                return jsonify({'error': 'تاريخ بداية الأقساط ويوم الاستحقاق مطلوبان'}), 400
            if due_day < 1 or due_day > 31:
                return jsonify({'error': 'يوم الاستحقاق يجب أن يكون بين 1 و 31'}), 400
            if months is not None and months <= 0:
                return jsonify({'error': 'عدد الأشهر يجب أن يكون أكبر من صفر'}), 400

        invoice_number = f'SALE-{datetime.utcnow().strftime("%Y%m%d")}-{uuid4().hex[:8].upper()}'
        sale = Sale(
            branch_id=creation_branch_id,
            invoice_number=invoice_number,
            car_id=car.id,
            buyer_id=buyer.id,
            selling_price=selling_price,
            discount=discount,
            paid_amount=paid_amount,
            remaining_amount=remaining_amount,
            currency=currency,
            payment_method=payment_method,
            sale_date=datetime.strptime(sale_date_str, '%Y-%m-%d'),
        )
        # If a sales representative was provided, snapshot their details into the sale
        sales_rep_id = data.get('sales_rep_id')
        if sales_rep_id:
            try:
                emp = Employee.query.get(int(sales_rep_id))
                if emp:
                    sale.sales_rep_id = emp.id
                    sale.sales_rep_name = emp.full_name
                    sale.sales_rep_phone = emp.phone
                    sale.sales_rep_id_number = emp.id_number
                    sale.sales_rep_title = emp.title
                    sale.sales_rep_address = emp.address
            except Exception:
                pass
        car.status = 'Sold'
        db.session.add(sale)
        db.session.flush()

        initial_payment = None
        if paid_amount > 0:
            initial_payment = Payment(
                payment_type='sale',
                branch_id=creation_branch_id,
                sale_id=sale.id,
                amount=paid_amount,
                currency=currency,
                payment_method=payment_method,
                payment_date=sale.sale_date,
            )
            db.session.add(initial_payment)
            db.session.flush()

        if enable_installment and remaining_amount > 0:
            installment_amount = (
                money_value(remaining_amount / Decimal(months))
                if months
                else remaining_amount
            )
            plan = InstallmentPlan(
                branch_id=creation_branch_id,
                sale_id=sale.id,
                total_amount=remaining_amount,
                paid_amount=ZERO_MONEY,
                remaining_amount=remaining_amount,
                currency=currency,
                number_of_months=months,
                installment_start_date=start_date,
                installment_due_day=due_day,
                installment_amount=installment_amount,
                notes=installment_notes,
            )
            db.session.add(plan)
            db.session.flush()
            if months:
                remaining_to_schedule = remaining_amount
                for index in range(months):
                    amt = installment_amount if index < months - 1 else money_value(remaining_to_schedule)
                    remaining_to_schedule = money_value(remaining_to_schedule - amt)
                    db.session.add(InstallmentSchedule(
                        branch_id=creation_branch_id,
                        installment_plan_id=plan.id,
                        installment_number=index + 1,
                        due_date=due_date_for_month(start_date, due_day, index),
                        amount=amt,
                        paid_amount=ZERO_MONEY,
                        remaining_amount=amt,
                        currency=currency,
                        status='Pending',
                    ))

        # ── قيود محاسبية تلقائية ──────────────────────────────────────────
        try:
            _post_sale_journal_entries(sale, car, initial_payment)
        except Exception as _je_err:
            db.session.rollback()
            app.logger.warning('Sale JE failed (sale=%s): %s', sale.id, _je_err)
            return jsonify({'error': 'فشل إنشاء القيد المحاسبي للبيع، لم يتم حفظ العملية'}), 500

        log_action('create sale', 'Sale', sale.id, sale.invoice_number)
        db.session.commit()
        return jsonify({'id': sale.id, 'invoice_number': sale.invoice_number}), 201

    @app.route('/api/sales/<int:sale_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_sale_detail(sale_id):
        sale = Sale.query.get_or_404(sale_id)
        if not branch_allowed(sale):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403

        car   = sale.car
        buyer = sale.buyer
        payments = [{
            'id':             p.id,
            'amount':         p.amount,
            'currency':       p.currency,
            'payment_method': p.payment_method,
            'payment_date':   p.payment_date.isoformat() if p.payment_date else None,
            'notes':          p.notes,
        } for p in sale.payments]

        plan_data = None
        if sale.installment_plan:
            ip = sale.installment_plan
            schedules = [{
                'id':                 sc.id,
                'installment_number': sc.installment_number,
                'due_date':           sc.due_date.isoformat() if sc.due_date else None,
                'amount':             sc.amount,
                'paid_amount':        sc.paid_amount,
                'remaining_amount':   sc.remaining_amount,
                'currency':           sc.currency,
                'status':             sc.status,
                'payment_date':       sc.payment_date.isoformat() if sc.payment_date else None,
            } for sc in sorted(ip.schedules, key=lambda x: x.installment_number)]
            plan_data = {
                'id':                    ip.id,
                'total_amount':          ip.total_amount,
                'paid_amount':           ip.paid_amount,
                'remaining_amount':      ip.remaining_amount,
                'currency':              ip.currency,
                'number_of_months':      ip.number_of_months,
                'installment_amount':    ip.installment_amount,
                'installment_start_date': ip.installment_start_date.isoformat() if ip.installment_start_date else None,
                'installment_due_day':   ip.installment_due_day,
                'status':                ip.status,
                'schedules':             schedules,
            }

        return jsonify({
            'id':               sale.id,
            'invoice_number':   sale.invoice_number,
            'branch_id':        sale.branch_id,
            'branch':           branch_json(sale.branch),
            'status':           sale.status,
            'sale_date':        sale.sale_date.isoformat() if sale.sale_date else None,
            'selling_price':    sale.selling_price,
            'discount':         sale.discount,
            'paid_amount':      sale.paid_amount,
            'remaining_amount': sale.remaining_amount,
            'currency':         sale.currency,
            'payment_method':   sale.payment_method,
            'cancel_reason':    sale.cancel_reason,
            'cancelled_at':     sale.cancelled_at.isoformat() if sale.cancelled_at else None,
            'sales_rep_id':          sale.sales_rep_id,
            'sales_rep_name':        sale.sales_rep_name,
            'sales_rep_phone':       sale.sales_rep_phone,
            'sales_rep_id_number':   sale.sales_rep_id_number,
            'sales_rep_title':       sale.sales_rep_title,
            'sales_rep_address':     sale.sales_rep_address,
            'car': {
                'id':                car.id,
                'brand':             car.brand,
                'model':             car.model,
                'manufacturing_year': car.manufacturing_year,
                'trim':              car.trim,
                'color':             car.color,
                'vin':               car.vin,
                'plate_number':      car.plate_number,
                'status':            car.status,
            } if car else None,
            'buyer': {
                'id':       buyer.id,
                'name':     buyer.full_name or buyer.name,
                'phone':    buyer.phone,
                'address':  buyer.address,
                'id_type':  buyer.id_type,
                'id_number': buyer.id_number,
            } if buyer else None,
            'payments':            payments,
            'installment_plan':    plan_data,
        })

    @app.route('/api/sales/<int:sale_id>/cancel', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_cancel_sale(sale_id):
        """إلغاء فاتورة بيع مع عكس جميع قيودها المحاسبية تلقائياً."""
        from .accounting import create_journal_entry
        sale = Sale.query.get_or_404(sale_id)
        if not branch_allowed(sale):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403
        if sale.status == 'Cancelled':
            return jsonify({'error': 'الفاتورة ملغاة بالفعل'}), 400
        data = request.get_json(silent=True) or {}
        cancel_reason = (data.get('cancel_reason') or '').strip() or 'Cancelled by user'
        # عكس جميع القيود المرتبطة بهذه الفاتورة ومدفوعاتها
        refs_to_reverse = [('Sale', sale.id)] + [('Payment', p.id) for p in sale.payments]
        for ref_type, ref_id in refs_to_reverse:
            for je in JournalEntry.query.filter_by(
                reference_type=ref_type, reference_id=ref_id, status='posted'
            ).all():
                try:
                    rev_lines = [
                        {'account_code': l.account.code, 'debit': decimal_value(l.credit), 'credit': decimal_value(l.debit)}
                        for l in je.lines if l.account
                    ]
                    if rev_lines:
                        rev = create_journal_entry(
                            entry_date=datetime.utcnow(),
                            description=f'إلغاء: {je.description or ""} (#{je.id})',
                            branch_id=je.branch_id,
                            reference_type=f'{ref_type}Cancel',
                            reference_id=ref_id,
                            lines=rev_lines,
                            auto_post=True,
                            posted_by_id=current_user.id,
                            allow_inactive_accounts=True,
                        )
                        rev.reversal_of_id = je.id
                        je.status = 'reversed'
                except Exception as _rev_err:
                    db.session.rollback()
                    app.logger.warning('Sale cancel JE reversal failed je=%s: %s', je.id, _rev_err)
                    return jsonify({
                        'error': 'فشل عكس القيد المحاسبي، لم يتم إلغاء فاتورة البيع'
                    }), 500
        sale.status = 'Cancelled'
        sale.cancelled_at = datetime.utcnow()
        sale.cancel_reason = cancel_reason
        if sale.car:
            sale.car.status = 'Available'
        if sale.installment_plan:
            for sch in sale.installment_plan.schedules:
                if sch.status not in ('Paid',):
                    sch.status = 'Cancelled'
        log_action('cancel sale', 'Sale', sale.id, sale.invoice_number)
        db.session.commit()
        return jsonify({'id': sale.id, 'status': sale.status, 'cancel_reason': sale.cancel_reason})

    @app.route('/api/sales/<int:sale_id>/payments', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_add_sale_payment(sale_id):
        """إضافة دفعة إضافية لفاتورة بيع مع قيد محاسبي تلقائي."""
        from .accounting import create_journal_entry
        sale = Sale.query.get_or_404(sale_id)
        if not branch_allowed(sale):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403
        if sale.status == 'Cancelled':
            return jsonify({'error': 'لا يمكن إضافة دفعة لفاتورة ملغاة'}), 400
        data = request.get_json(silent=True) or {}
        amount, amount_err = _parse_money(data.get('amount') or 0, 'المبلغ')
        if amount_err:
            return amount_err
        payment_method = (data.get('payment_method') or 'Cash').strip()
        notes = (data.get('notes') or '').strip() or None
        if amount <= 0:
            return jsonify({'error': 'المبلغ يجب أن يكون أكبر من صفر'}), 400
        if amount > decimal_value(sale.remaining_amount):
            return jsonify({'error': f'المبلغ ({amount}) يتجاوز المتبقي ({sale.remaining_amount})'}), 400
        payment = Payment(
            payment_type='sale', branch_id=sale.branch_id, sale_id=sale.id,
            amount=amount, currency=sale.currency,
            payment_method=payment_method, notes=notes,
            payment_date=datetime.utcnow(),
        )
        sale.paid_amount = money_value(decimal_value(sale.paid_amount) + amount)
        sale.remaining_amount = max(
            money_value(
                decimal_value(sale.selling_price)
                - decimal_value(sale.discount)
                - sale.paid_amount
            ),
            ZERO_MONEY,
        )
        db.session.add(payment)
        db.session.flush()
        try:
            paid_iqd = to_iqd(amount, sale.currency)
            if paid_iqd > 0:
                create_journal_entry(
                    entry_date=payment.payment_date,
                    description=f'قبض دفعة بيع #{sale.id} — {sale.invoice_number}',
                    branch_id=payment.branch_id,
                    reference_type='Payment', reference_id=payment.id,
                    lines=[
                        {'account_code': acct_cash(payment_method), 'debit': paid_iqd, 'credit': 0},
                        {'account_code': AR_ACCOUNT,                'debit': 0,         'credit': paid_iqd},
                    ],
                )
        except Exception as _je_err:
            db.session.rollback()
            app.logger.warning('Sale payment JE failed: %s', _je_err)
            return jsonify({'error': 'فشل إنشاء القيد المحاسبي للدفعة، لم يتم حفظ العملية'}), 500
        log_action('add sale payment', 'Sale', sale.id, sale.invoice_number)
        db.session.commit()
        return jsonify({
            'payment_id': payment.id,
            'paid_amount': sale.paid_amount,
            'remaining_amount': sale.remaining_amount,
        }), 201

    @app.route('/api/installments/<int:plan_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_installments')
    def api_installment_plan_detail(plan_id):
        plan = InstallmentPlan.query.get_or_404(plan_id)
        if not branch_allowed(plan):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الخطة'}), 403

        refresh_installment_plan(plan)
        db.session.commit()

        sale = plan.sale
        car  = sale.car  if sale else None
        buyer = sale.buyer if sale else None

        schedules = [{
            'id':                 sc.id,
            'installment_number': sc.installment_number,
            'due_date':           sc.due_date.isoformat() if sc.due_date else None,
            'amount':             sc.amount,
            'paid_amount':        sc.paid_amount,
            'remaining_amount':   sc.remaining_amount,
            'currency':           sc.currency,
            'status':             sc.status,
            'payment_date':       sc.payment_date.isoformat() if sc.payment_date else None,
        } for sc in sorted(plan.schedules, key=lambda x: x.installment_number)]

        payments = [{
            'id': payment.id,
            'schedule_id': payment.installment_schedule_id,
            'amount': payment.amount,
            'currency': payment.currency,
            'payment_method': payment.payment_method,
            'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
            'notes': payment.notes,
        } for payment in Payment.query.filter(
            Payment.payment_type == 'installment',
            Payment.sale_id == plan.sale_id,
        ).order_by(Payment.payment_date.desc(), Payment.id.desc()).all()]

        customer_statement = None
        if buyer:
            buyer_plans = branch_filter(InstallmentPlan.query.join(Sale), InstallmentPlan).filter(
                Sale.buyer_id == buyer.id,
                Sale.status != 'Cancelled',
            ).all()
            buyer_plan_ids = [buyer_plan.id for buyer_plan in buyer_plans]
            buyer_schedules = InstallmentSchedule.query.filter(
                InstallmentSchedule.installment_plan_id.in_(buyer_plan_ids)
            ).all() if buyer_plan_ids else []
            for buyer_plan in buyer_plans:
                refresh_installment_plan(buyer_plan)
            total_schedules = len(buyer_schedules)
            overdue_schedules = [
                sc for sc in buyer_schedules
                if sc.remaining_amount > 0 and sc.due_date and sc.due_date.date() < datetime.utcnow().date()
            ]
            overdue_count_cs = len(overdue_schedules)
            overdue_amount_cs = sum(sc.remaining_amount or 0 for sc in overdue_schedules)
            # risk score: 0–100 بناءً على نسبة الأقساط المتأخرة
            risk_score = round(min((overdue_count_cs / max(total_schedules, 1)) * 100, 100))
            risk_label = (
                'مرتفع جداً' if risk_score >= 50 else
                'مرتفع'      if risk_score >= 30 else
                'متوسط'      if risk_score >= 15 else
                'منخفض'
            )
            customer_statement = {
                'customer_id': buyer.id,
                'customer_name': buyer.full_name or buyer.name,
                'plans_count': len(buyer_plans),
                'total_amount': sum(buyer_plan.total_amount or 0 for buyer_plan in buyer_plans),
                'paid_amount': sum(buyer_plan.paid_amount or 0 for buyer_plan in buyer_plans),
                'remaining_amount': sum(buyer_plan.remaining_amount or 0 for buyer_plan in buyer_plans),
                'overdue_amount': overdue_amount_cs,
                'overdue_count': overdue_count_cs,
                'total_schedules': total_schedules,
                'risk_score': risk_score,
                'risk_label': risk_label,
                'currency': plan.currency,
            }
            db.session.commit()

        return jsonify({
            'id':                    plan.id,
            'sale_id':               plan.sale_id,
            'branch_id':             plan.branch_id,
            'branch':                branch_json(plan.branch),
            'total_amount':          plan.total_amount,
            'paid_amount':           plan.paid_amount,
            'remaining_amount':      plan.remaining_amount,
            'currency':              plan.currency,
            'number_of_months':      plan.number_of_months,
            'installment_amount':    plan.installment_amount,
            'installment_start_date': plan.installment_start_date.isoformat() if plan.installment_start_date else None,
            'installment_due_day':   plan.installment_due_day,
            'status':                plan.status,
            'notes':                 plan.notes,
            'invoice_number':        sale.invoice_number if sale else None,
            'car_name':              f'{car.brand} {car.model} {car.manufacturing_year}' if car else None,
            'buyer_name':            (buyer.full_name or buyer.name) if buyer else None,
            'buyer_phone':           buyer.phone if buyer else None,
            'schedules':             schedules,
            'payments':              payments,
            'customer_statement':     customer_statement,
        })

    @app.route('/api/installments/schedules/<int:schedule_id>/payment', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_installments')
    def api_pay_installment_schedule(schedule_id):
        schedule = InstallmentSchedule.query.get_or_404(schedule_id)
        if not branch_allowed(schedule):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا القسط'}), 403

        plan = schedule.plan
        if plan.sale.status == 'Cancelled':
            return jsonify({'error': 'لا يمكن تسجيل دفعة لقسط مرتبط بفاتورة ملغاة'}), 409

        refresh_installment_status(schedule)
        if schedule.status == 'Paid':
            return jsonify({'error': 'هذا القسط مدفوع بالكامل بالفعل'}), 409

        data           = request.get_json(silent=True) or {}
        amount, amount_err = _parse_money(data.get('amount') or 0, 'المبلغ')
        if amount_err:
            return amount_err
        payment_method = data.get('payment_method') or 'Cash'
        notes          = data.get('notes')

        if amount <= 0:
            return jsonify({'error': 'المبلغ يجب أن يكون أكبر من صفر'}), 400
        if amount > schedule.remaining_amount:
            return jsonify({'error': f'المبلغ يتجاوز المتبقي ({schedule.remaining_amount})'}), 400

        payment = Payment(
            payment_type='installment',
            branch_id=plan.branch_id,
            sale_id=plan.sale_id,
            installment_schedule_id=schedule.id,
            amount=amount,
            currency=plan.currency,
            payment_method=payment_method,
            notes=notes,
            payment_date=datetime.utcnow(),
        )
        schedule.paid_amount      += amount
        schedule.remaining_amount = max(
            money_value(decimal_value(schedule.amount) - decimal_value(schedule.paid_amount)),
            ZERO_MONEY,
        )
        if schedule.remaining_amount <= 0:
            schedule.payment_date = payment.payment_date
        refresh_installment_status(schedule)
        refresh_installment_plan(plan)
        plan.sale.paid_amount      += amount
        plan.sale.remaining_amount = max(
            money_value(
                decimal_value(plan.sale.selling_price)
                - decimal_value(plan.sale.discount)
                - decimal_value(plan.sale.paid_amount)
            ),
            ZERO_MONEY,
        )
        db.session.add(payment)
        db.session.flush()

        # ── قيود محاسبية تلقائية ──────────────────────────────────────────
        try:
            _post_installment_payment_journal_entry(payment, schedule, plan)
        except Exception as _je_err:
            db.session.rollback()
            app.logger.warning('Installment payment JE failed (schedule=%s): %s', schedule.id, _je_err)
            return jsonify({'error': 'فشل إنشاء القيد المحاسبي لدفعة القسط، لم يتم حفظ العملية'}), 500

        log_action(
            'add installment payment', 'InstallmentSchedule', schedule.id,
            f'{plan.sale.invoice_number} #{schedule.installment_number}'
        )
        db.session.commit()
        return jsonify({
            'schedule_id':      schedule.id,
            'status':           schedule.status,
            'paid_amount':      schedule.paid_amount,
            'remaining_amount': schedule.remaining_amount,
            'plan_status':      plan.status,
            'plan_remaining':   plan.remaining_amount,
        })

    @app.route('/api/payments/<int:payment_id>/receipt', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_installments')
    def api_payment_receipt(payment_id):
        """Return all data needed to render a payment receipt (سند قبض)."""
        payment = Payment.query.get_or_404(payment_id)
        if not branch_allowed(payment):
            return jsonify({'error': 'لا يمكنك الوصول إلى إيصال دفع في فرع آخر'}), 403
        plan    = None
        sale    = None
        schedule = None
        buyer   = None
        car     = None

        if payment.installment_schedule_id:
            schedule = InstallmentSchedule.query.get(payment.installment_schedule_id)
        if payment.sale_id:
            sale = Sale.query.get(payment.sale_id)
        if sale:
            buyer = sale.buyer
            car   = sale.car
            if sale.installment_plan:
                plan = sale.installment_plan

        return jsonify({
            'payment': {
                'id':             payment.id,
                'amount':         float(payment.amount or 0),
                'currency':       payment.currency,
                'payment_method': payment.payment_method,
                'payment_date':   payment.payment_date.strftime('%Y-%m-%d') if payment.payment_date else None,
                'payment_type':   payment.payment_type,
                'notes':          payment.notes,
            },
            'schedule': {
                'id':                  schedule.id,
                'installment_number':  schedule.installment_number,
                'due_date':            schedule.due_date.strftime('%Y-%m-%d') if schedule.due_date else None,
                'amount':              float(schedule.amount or 0),
                'paid_amount':         float(schedule.paid_amount or 0),
                'remaining_amount':    float(schedule.remaining_amount or 0),
            } if schedule else None,
            'plan': {
                'id':               plan.id,
                'number_of_months': plan.number_of_months,
                'installment_amount': float(plan.installment_amount or 0),
                'total_amount':     float(plan.total_amount or 0),
                'paid_amount':      float(plan.paid_amount or 0),
                'remaining_amount': float(plan.remaining_amount or 0),
            } if plan else None,
            'sale': {
                'id':             sale.id,
                'invoice_number': sale.invoice_number,
            } if sale else None,
            'customer': {
                'id':    buyer.id,
                'name':  buyer.full_name or buyer.name,
                'phone': buyer.phone,
            } if buyer else None,
            'car': {
                'name': f'{car.brand} {car.model} {car.manufacturing_year}',
                'vin':  car.vin,
            } if car else None,
        })

    # --- Customers JSON CRUD ---

    def _customer_payload(c):
        return {
            'id':             c.id,
            'name':           c.name,
            'full_name':      c.full_name,
            'phone':          c.phone,
            'address':        c.address,
            'id_type':        c.id_type,
            'id_number':      c.id_number,
            'id_issue_date':  c.id_issue_date.isoformat() if c.id_issue_date else None,
            'id_expiry_date': c.id_expiry_date.isoformat() if c.id_expiry_date else None,
            'nationality':    c.nationality,
            'date_of_birth':  c.date_of_birth.isoformat() if c.date_of_birth else None,
            'customer_type':  c.customer_type,
            'notes':          c.notes,
            'branch_id':      c.branch_id,
            'branch':         branch_json(c.branch),
            'created_at':     c.created_at.isoformat() if c.created_at else None,
            'sales_count':    len(c.sales) if c.sales else 0,
            'purchases_count': len(c.purchases) if c.purchases else 0,
            'documents': [
                {
                    'id':                d.id,
                    'document_type':     d.document_type,
                    'filename':          d.filename,
                    'original_filename': d.original_filename,
                    'uploaded_at':       d.uploaded_at.isoformat() if d.uploaded_at else None,
                }
                for d in (c.documents or [])
            ],
        }

    @app.route('/api/customers/<int:customer_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_customer_detail(customer_id):
        c = Customer.query.get_or_404(customer_id)
        if not branch_allowed(c):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل'}), 403
        return jsonify(_customer_payload(c))

    @app.route('/api/customers/<int:customer_id>/statement', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_customer_statement(customer_id):
        c = Customer.query.get_or_404(customer_id)
        if not branch_allowed(c):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل'}), 403

        # All sales where this customer is the buyer
        sales = Sale.query.filter_by(buyer_id=customer_id).filter(Sale.status != 'Cancelled').all()

        sales_data = []
        total_sales_amount = ZERO_MONEY
        total_paid_amount = ZERO_MONEY
        total_remaining = ZERO_MONEY
        total_overdue = ZERO_MONEY
        last_payment_date    = None

        today = datetime.utcnow().date()

        for s in sorted(sales, key=lambda x: x.sale_date or datetime.min, reverse=True):
            car = s.car
            plan = s.installment_plan

            # Build payments list
            sale_payments = []
            for p in (s.payments or []):
                sale_payments.append({
                    'id':             p.id,
                    'amount':         float(p.amount),
                    'currency':       p.currency,
                    'payment_method': p.payment_method,
                    'payment_date':   p.payment_date.strftime('%Y-%m-%d') if p.payment_date else None,
                    'payment_type':   p.payment_type,
                    'notes':          p.notes,
                })
                if p.payment_date:
                    d = p.payment_date.date() if hasattr(p.payment_date, 'date') else p.payment_date
                    if last_payment_date is None or d > last_payment_date:
                        last_payment_date = d

            # Build schedules if installment plan exists
            schedules_data = []
            plan_overdue = ZERO_MONEY
            if plan:
                for sch in (plan.schedules or []):
                    refresh_installment_status(sch)
                    remaining_iqd = to_iqd(sch.remaining_amount or 0, sch.currency)
                    if sch.status in ('Overdue',) and sch.remaining_amount > 0:
                        plan_overdue += remaining_iqd
                    schedules_data.append({
                        'id':                  sch.id,
                        'installment_number':  sch.installment_number,
                        'due_date':            sch.due_date.strftime('%Y-%m-%d') if sch.due_date else None,
                        'amount':              float(sch.amount),
                        'paid_amount':         float(sch.paid_amount or 0),
                        'remaining_amount':    float(sch.remaining_amount or 0),
                        'currency':            sch.currency,
                        'status':              sch.status,
                        'payment_date':        sch.payment_date.strftime('%Y-%m-%d') if sch.payment_date else None,
                    })

            sale_iqd       = to_iqd(s.selling_price or 0, s.currency)
            paid_iqd       = to_iqd(s.paid_amount or 0, s.currency)
            remaining_iqd  = to_iqd(s.remaining_amount or 0, s.currency)

            total_sales_amount += sale_iqd
            total_paid_amount  += paid_iqd
            total_remaining    += remaining_iqd
            total_overdue      += plan_overdue

            sales_data.append({
                'id':               s.id,
                'invoice_number':   s.invoice_number,
                'sale_date':        s.sale_date.strftime('%Y-%m-%d') if s.sale_date else None,
                'car_name':         f'{car.brand} {car.model} {car.manufacturing_year}' if car else None,
                'car_vin':          car.vin if car else None,
                'selling_price':    float(s.selling_price or 0),
                'currency':         s.currency,
                'paid_amount':      float(s.paid_amount or 0),
                'remaining_amount': float(s.remaining_amount or 0),
                'payment_method':   s.payment_method,
                'status':           s.status,
                'has_installment':  plan is not None,
                'installment_plan': {
                    'id':                   plan.id,
                    'total_amount':          float(plan.total_amount or 0),
                    'paid_amount':           float(plan.paid_amount or 0),
                    'remaining_amount':      float(plan.remaining_amount or 0),
                    'currency':              plan.currency,
                    'number_of_months':      plan.number_of_months,
                    'installment_amount':    float(plan.installment_amount or 0),
                    'status':                plan.status,
                    'overdue_amount':        plan_overdue,
                    'schedules':             schedules_data,
                } if plan else None,
                'payments': sale_payments,
            })

        return jsonify({
            'customer': {
                'id':            c.id,
                'name':          c.full_name or c.name,
                'phone':         c.phone,
                'customer_type': c.customer_type,
            },
            'summary': {
                'sales_count':         len(sales_data),
                'total_sales_amount':  round(total_sales_amount, 2),
                'total_paid_amount':   round(total_paid_amount, 2),
                'total_remaining':     round(total_remaining, 2),
                'total_overdue':       round(total_overdue, 2),
                'last_payment_date':   last_payment_date.strftime('%Y-%m-%d') if last_payment_date else None,
                'currency':            'IQD',
            },
            'sales': sales_data,
        })

    @app.route('/api/customers', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_create_customer():
        data          = request.get_json(silent=True) or {}
        name          = (data.get('name') or data.get('full_name') or '').strip()
        phone         = (data.get('phone') or '').strip()
        id_number     = (data.get('id_number') or '').strip()
        customer_type = (data.get('customer_type') or '').strip()

        if not all([name, phone, id_number, customer_type]):
            return jsonify({'error': 'الحقول المطلوبة: الاسم، الهاتف، رقم الهوية، نوع العميل'}), 400
        if customer_type not in ('Buyer', 'Seller'):
            return jsonify({'error': 'نوع العميل يجب أن يكون Buyer أو Seller'}), 400

        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error

        existing = Customer.query.filter_by(id_number=id_number).first()
        if existing:
            return jsonify({'error': 'رقم الهوية مستخدم بالفعل'}), 409

        c = Customer(
            branch_id=creation_branch_id,
            name=name, full_name=name,
            phone=phone,
            address=data.get('address'),
            id_type=data.get('id_type'),
            id_number=id_number,
            id_issue_date=parse_optional_date(data.get('id_issue_date')),
            id_expiry_date=parse_optional_date(data.get('id_expiry_date')),
            nationality=data.get('nationality'),
            date_of_birth=parse_optional_date(data.get('date_of_birth')),
            customer_type=customer_type,
            notes=data.get('notes'),
        )
        db.session.add(c)
        log_action('create customer', 'Customer', None, name)
        db.session.flush()
        db.session.commit()
        return jsonify(_customer_payload(c)), 201

    @app.route('/api/customers/<int:customer_id>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_update_customer(customer_id):
        c = Customer.query.get_or_404(customer_id)
        if not branch_allowed(c):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل'}), 403

        data          = request.get_json(silent=True) or {}
        name          = (data.get('name') or data.get('full_name') or '').strip()
        phone         = (data.get('phone') or '').strip()
        id_number     = (data.get('id_number') or '').strip()
        customer_type = (data.get('customer_type') or '').strip()

        if not all([name, phone, id_number, customer_type]):
            return jsonify({'error': 'الحقول المطلوبة: الاسم، الهاتف، رقم الهوية، نوع العميل'}), 400
        if customer_type not in ('Buyer', 'Seller'):
            return jsonify({'error': 'نوع العميل يجب أن يكون Buyer أو Seller'}), 400

        conflict = Customer.query.filter(Customer.id_number == id_number, Customer.id != customer_id).first()
        if conflict:
            return jsonify({'error': 'رقم الهوية مستخدم بالفعل'}), 409

        c.name = name; c.full_name = name
        c.phone = phone
        c.address = data.get('address', c.address)
        c.id_type = data.get('id_type', c.id_type)
        c.id_number = id_number
        c.id_issue_date  = parse_optional_date(data.get('id_issue_date'))  if 'id_issue_date'  in data else c.id_issue_date
        c.id_expiry_date = parse_optional_date(data.get('id_expiry_date')) if 'id_expiry_date' in data else c.id_expiry_date
        c.nationality  = data.get('nationality',  c.nationality)
        c.date_of_birth = parse_optional_date(data.get('date_of_birth')) if 'date_of_birth' in data else c.date_of_birth
        c.customer_type = customer_type
        c.notes = data.get('notes', c.notes)
        log_action('edit customer', 'Customer', c.id, c.name)
        db.session.commit()
        return jsonify(_customer_payload(c))

    # Single-instance document types (one per customer); document_photo allows multiples
    SINGLE_DOC_TYPES = {'id_front', 'id_back', 'residence_card', 'passport'}
    ALL_DOC_TYPES    = SINGLE_DOC_TYPES | {'document_photo'}

    @app.route('/api/customers/<int:customer_id>/documents', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_upload_customer_document(customer_id):
        c = Customer.query.get_or_404(customer_id)
        if not branch_allowed(c):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل'}), 403

        document_type = (request.form.get('document_type') or '').strip()
        if document_type not in ALL_DOC_TYPES:
            return jsonify({'error': f'نوع الوثيقة غير صالح. القيم المقبولة: {", ".join(sorted(ALL_DOC_TYPES))}'}), 400

        file_storage = request.files.get('file')
        if not file_storage or not file_storage.filename:
            return jsonify({'error': 'لم يتم اختيار ملف'}), 400
        if not allowed_upload(file_storage.filename):
            return jsonify({'error': 'صيغة الملف غير مدعومة (المقبول: jpg, jpeg, png, webp, pdf)'}), 400
        if not _check_file_magic(file_storage, ALLOWED_UPLOAD_EXTENSIONS):
            return jsonify({'error': 'نوع الملف لا يطابق محتواه الفعلي. مقبول: jpg, jpeg, png, webp, pdf'}), 400

        # Replace existing document for single-instance types
        if document_type in SINGLE_DOC_TYPES:
            existing = CustomerDocument.query.filter_by(customer_id=c.id, document_type=document_type).first()
            if existing:
                old_path = os.path.join(Config.PRIVATE_STORAGE_FOLDER, 'customers', existing.filename)
                try:
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except OSError:
                    pass
                db.session.delete(existing)
                db.session.flush()

        upload_folder = os.path.join(Config.PRIVATE_STORAGE_FOLDER, 'customers')
        os.makedirs(upload_folder, exist_ok=True)
        original_name = secure_filename(file_storage.filename)
        extension = original_name.rsplit('.', 1)[1].lower()
        filename = f'{uuid4().hex}.{extension}'
        file_storage.save(os.path.join(upload_folder, filename))

        doc = CustomerDocument(
            customer_id=c.id,
            document_type=document_type,
            filename=filename,
            original_filename=original_name,
        )
        db.session.add(doc)
        log_action('upload customer document', 'Customer', c.id, f'{c.name} - {document_type}')
        db.session.commit()

        return jsonify({
            'id':                doc.id,
            'document_type':     doc.document_type,
            'filename':          doc.filename,
            'original_filename': doc.original_filename,
            'uploaded_at':       doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        }), 201

    @app.route('/api/customers/<int:customer_id>/documents/<int:doc_id>/download', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_download_customer_document(customer_id, doc_id):
        c = Customer.query.get_or_404(customer_id)
        if not branch_allowed(c):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل'}), 403

        doc = CustomerDocument.query.filter_by(id=doc_id, customer_id=customer_id).first_or_404()
        private_folder = os.path.join(Config.PRIVATE_STORAGE_FOLDER, 'customers')
        safe_filename = os.path.basename(doc.filename)

        response = send_from_directory(
            private_folder,
            safe_filename,
            as_attachment=True,
            download_name=doc.original_filename or safe_filename
        )
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        return response

    @app.route('/api/customers/<int:customer_id>/documents/<int:doc_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_delete_customer_document(customer_id, doc_id):
        c = Customer.query.get_or_404(customer_id)
        if not branch_allowed(c):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذا العميل'}), 403

        doc = CustomerDocument.query.filter_by(id=doc_id, customer_id=customer_id).first_or_404()
        file_path = os.path.join(Config.PRIVATE_STORAGE_FOLDER, 'customers', doc.filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass

        db.session.delete(doc)
        log_action('delete customer document', 'Customer', c.id, f'{c.name} - {doc.document_type}')
        db.session.commit()
        return jsonify({'message': 'تم حذف الوثيقة بنجاح'}), 200

    # --- Scanner (WIA) ---

    scan_lock = threading.Lock()
    scan_state = {'started_at': None}

    def _acquire_scan_lock():
        now = datetime.utcnow()
        started_at = scan_state.get('started_at')
        if started_at and (now - started_at).total_seconds() > 180:
            try:
                scan_lock.release()
            except RuntimeError:
                pass
            scan_state['started_at'] = None

        if not scan_lock.acquire(blocking=False):
            return False

        scan_state['started_at'] = now
        return True

    def _release_scan_lock():
        scan_state['started_at'] = None
        try:
            scan_lock.release()
        except RuntimeError:
            pass

    def _prepare_scanned_jpeg(path):
        """
        Keep scanner payloads small enough for the browser.
        High-DPI WIA scans can be huge; sending them as base64 can freeze the UI.
        """
        from PIL import Image, ImageOps  # type: ignore[import-untyped]
        import io

        with Image.open(path) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')

            max_side = 1800
            if max(img.size) > max_side:
                img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

            quality = 82
            while quality >= 55:
                out = io.BytesIO()
                img.save(out, format='JPEG', quality=quality, optimize=True, progressive=True)
                data = out.getvalue()
                if len(data) <= 2_500_000:
                    return data
                quality -= 12

            return data

    def _wia_probe():
        """
        Probe Windows WIA subsystem.  Returns a dict with:
          pywin32_available  bool
          wia_available      bool
          scanners_detected  int
          devices            list[{name, type, is_scanner}]
          error              str | None
        Never raises.
        """
        info = {
            'pywin32_available': False,
            'wia_available':     False,
            'scanners_detected': 0,
            'devices':           [],
            'error':             None,
        }
        try:
            import win32com.client as wcom
            import pythoncom
        except ImportError as e:
            info['error'] = f'pywin32 not importable: {e}'
            return info

        info['pywin32_available'] = True
        try:
            pythoncom.CoInitialize()
            dm    = wcom.Dispatch('WIA.DeviceManager')
            total = dm.DeviceInfos.Count
            for i in range(1, total + 1):
                dev = dm.DeviceInfos.Item(i)
                try:
                    name = dev.Properties['Name'].Value
                except Exception:
                    name = 'unknown'
                dtype = dev.Type
                info['devices'].append({'name': name, 'type': dtype, 'is_scanner': dtype == 1})
                if dtype == 1:
                    info['scanners_detected'] += 1
            info['wia_available'] = True
        except Exception as e:
            info['error'] = str(e)
        finally:
            try:
                if pythoncom:
                    pythoncom.CoUninitialize()
            except Exception:
                pass
        return info

    @app.route('/api/scanner/status', methods=['GET'])
    @api_login_required
    def api_scanner_status():
        """
        Diagnostic endpoint.
        Returns pywin32 availability, WIA reachability, and connected scanner list.
        Always HTTP 200 — callers inspect the JSON fields, not the status code.
        """
        return jsonify(_wia_probe())

    @app.route('/api/scan/preview', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_customers')
    def api_scan_preview():
        """
        Invoke the Windows WIA scanner dialog and return the scanned image as base64.
        Always HTTP 200 — errors are in the JSON body so Axios never throws.

        Response shapes:
          { success: true,  data, mime_type, filename, size }
          { error: "scan_cancelled" }
          { error: "scanner_unavailable", message }   ← pywin32 missing
          { error: "no_scanner",          message }   ← pywin32 OK but no device found
          { error: "scan_failed",         message }   ← COM / hardware error
        """
        if not _acquire_scan_lock():
            return jsonify({
                'error':   'scan_busy',
                'message': 'يوجد مسح ضوئي قيد التنفيذ حالياً. انتظر لحظة ثم أعد المحاولة.',
            })

        probe = _wia_probe()

        if not probe['pywin32_available']:
            _release_scan_lock()
            return jsonify({
                'error':   'scanner_unavailable',
                'message': 'مكتبة pywin32 غير متوفرة في بيئة التشغيل الحالية.',
            })

        if not probe['wia_available']:
            _release_scan_lock()
            return jsonify({
                'error':   'scanner_unavailable',
                'message': f"تعذّر الوصول إلى WIA: {probe['error']}",
            })

        if probe['scanners_detected'] == 0:
            _release_scan_lock()
            return jsonify({
                'error':   'no_scanner',
                'message': 'لم يتم العثور على ماسح ضوئي — تحقق من توصيل الطابعة/الماسح بالجهاز وأعد المحاولة.',
            })

        try:
            worker_path = os.path.join(os.path.dirname(__file__), 'scanner_worker.py')
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
            proc = subprocess.run(
                [sys.executable, worker_path],
                cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), '..')),
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=210,
                env=env,
                creationflags=creationflags,
            )
            stdout = (proc.stdout or '').strip()

            if proc.returncode != 0:
                return jsonify({
                    'error': 'scan_failed',
                    'message': f'تعذر تشغيل عملية المسح. رمز الخطأ: {proc.returncode}',
                    'details': (proc.stderr or '').strip()[-500:],
                })

            if not stdout:
                return jsonify({
                    'error': 'scan_failed',
                    'message': 'لم يرجع الماسح أي نتيجة. أغلق نافذة الماسح وأعد المحاولة.',
                })

            try:
                return jsonify(json.loads(stdout))
            except json.JSONDecodeError:
                return jsonify({
                    'error': 'scan_failed',
                    'message': 'رجعت عملية المسح نتيجة غير مفهومة.',
                    'details': stdout[-500:],
                })

        except subprocess.TimeoutExpired:
            return jsonify({
                'error': 'scan_failed',
                'message': 'انتهى وقت انتظار الماسح. أغلق نافذة الماسح إن كانت مفتوحة ثم أعد المحاولة.',
            })
        except Exception as exc:
            return jsonify({'error': 'scan_failed', 'message': f'فشل المسح: {exc}'})
        finally:
            _release_scan_lock()

        tmp_path = None
        pythoncom = None
        try:
            import win32com.client as wcom
            import pythoncom, tempfile, base64 as _b64
            pythoncom.CoInitialize()

            wia_dialog = wcom.Dispatch('WIA.CommonDialog')
            scanned = wia_dialog.ShowAcquireImage(
                1,                                          # WiaDeviceType: Scanner
                1,                                          # WiaImageIntent: Color
                64,                                         # WiaImageBias: MaximizeQuality
                '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}',  # JPEG format GUID
                False,                                      # AlwaysSelectDevice
                True,                                       # UseCommonUI
                True,                                       # CancelError – raise on cancel
            )

            if scanned is None:
                return jsonify({'error': 'scan_cancelled'})

            tmp_path = tempfile.mktemp(suffix='.jpg')
            scanned.SaveFile(tmp_path)

            try:
                raw = _prepare_scanned_jpeg(tmp_path)
            except Exception:
                with open(tmp_path, 'rb') as fh:
                    raw = fh.read()

            if len(raw) > 4_000_000:
                return jsonify({
                    'error':   'scan_too_large',
                    'message': 'حجم الصورة الممسوحة كبير جداً. اختَر دقة أقل من نافذة الماسح ثم أعد المحاولة.',
                    'size':    len(raw),
                })

            return jsonify({
                'success':   True,
                'data':      _b64.b64encode(raw).decode('ascii'),
                'mime_type': 'image/jpeg',
                'filename':  'scan.jpg',
                'size':      len(raw),
            })

        except Exception as exc:
            msg = str(exc)
            if '80210007' in msg or 'cancel' in msg.lower():
                return jsonify({'error': 'scan_cancelled'})
            return jsonify({'error': 'scan_failed', 'message': f'فشل المسح: {msg}'})

        finally:
            if tmp_path:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass
            _release_scan_lock()

    @app.route('/api/scan/available', methods=['GET'])
    @api_login_required
    def api_scan_available():
        """Kept for backward compatibility — delegates to _wia_probe."""
        probe = _wia_probe()
        return jsonify({
            'available':      probe['wia_available'] and probe['scanners_detected'] > 0,
            'scanner_count':  probe['scanners_detected'],
            'pywin32':        probe['pywin32_available'],
            'reason':         probe.get('error'),
        })

    # --- Employees JSON CRUD ---

    def _employee_payload(e):
        return {
            'id':                 e.id,
            'branch_id':          e.branch_id,
            'branch':             branch_json(e.branch),
            'full_name':          e.full_name,
            'phone':              e.phone,
            'id_number':          e.id_number,
            'address':            e.address,
            'title':              e.title,
            'is_active':          e.is_active,
            'signature_filename': e.signature_filename,
            'created_at':         e.created_at.isoformat() if e.created_at else None,
        }

    @app.route('/api/employees', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_list_employees():
        q = Employee.query
        if not current_user.can_access_all_branches and current_user.branch_id:
            q = q.filter(
                (Employee.branch_id == current_user.branch_id) | (Employee.branch_id.is_(None))
            )
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        if active_only:
            q = q.filter(Employee.is_active.is_(True))
        search = request.args.get('search', '').strip()
        if search:
            q = q.filter(Employee.full_name.ilike(f'%{search}%'))
        page     = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)
        total    = q.count()
        items    = q.order_by(Employee.full_name).offset((page - 1) * per_page).limit(per_page).all()
        return jsonify({'total': total, 'page': page, 'per_page': per_page,
                        'items': [_employee_payload(e) for e in items]})

    @app.route('/api/employees', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_create_employee():
        data = request.get_json(silent=True) or {}
        full_name = (data.get('full_name') or '').strip()
        phone     = (data.get('phone') or '').strip()
        if not full_name or not phone:
            return jsonify({'error': 'الاسم الكامل ورقم الهاتف مطلوبان'}), 400
        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error
        emp = Employee(
            branch_id=creation_branch_id,
            full_name=full_name,
            phone=phone,
            id_number=(data.get('id_number') or '').strip() or None,
            address=(data.get('address') or '').strip() or None,
            title=(data.get('title') or '').strip() or None,
            is_active=bool(data.get('is_active', True)),
        )
        db.session.add(emp)
        db.session.flush()
        log_action('create employee', 'Employee', emp.id, full_name)
        db.session.commit()
        return jsonify(_employee_payload(emp)), 201

    @app.route('/api/employees/<int:emp_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_employee_detail(emp_id):
        emp = Employee.query.get_or_404(emp_id)
        if not branch_allowed(emp):
            return jsonify({'error': 'لا يمكنك الوصول إلى موظف في فرع آخر'}), 403
        return jsonify(_employee_payload(emp))

    @app.route('/api/employees/<int:emp_id>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_update_employee(emp_id):
        emp  = Employee.query.get_or_404(emp_id)
        if not branch_allowed(emp):
            return jsonify({'error': 'لا يمكنك الوصول إلى موظف في فرع آخر'}), 403
        data = request.get_json(silent=True) or {}
        full_name = (data.get('full_name') or '').strip()
        phone     = (data.get('phone') or '').strip()
        if not full_name or not phone:
            return jsonify({'error': 'الاسم الكامل ورقم الهاتف مطلوبان'}), 400
        emp.full_name  = full_name
        emp.phone      = phone
        emp.id_number  = (data.get('id_number') or '').strip() or None
        emp.address    = (data.get('address') or '').strip() or None
        emp.title      = (data.get('title') or '').strip() or None
        emp.is_active  = bool(data.get('is_active', emp.is_active))
        log_action('update employee', 'Employee', emp.id, full_name)
        db.session.commit()
        return jsonify(_employee_payload(emp))

    @app.route('/api/employees/<int:emp_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_delete_employee(emp_id):
        emp = Employee.query.get_or_404(emp_id)
        if not branch_allowed(emp):
            return jsonify({'error': 'لا يمكنك الوصول إلى موظف في فرع آخر'}), 403
        if emp.sales:
            return jsonify({'error': 'لا يمكن حذف موظف مرتبط بفواتير بيع'}), 409
        log_action('delete employee', 'Employee', emp.id, emp.full_name)
        db.session.delete(emp)
        db.session.commit()
        return jsonify({'message': 'تم حذف الموظف بنجاح'})

    # ─── Contracts (عقود البيع بالأقساط) ────────────────────────────────────

    @app.route('/api/contracts')
    @api_login_required
    @api_permission_required('manage_sales')
    def api_contracts():
        page     = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)
        status   = request.args.get('status')
        search   = request.args.get('search')

        query = (
            scoped_query(Sale)
            .filter(Sale.payment_method == 'Installment')
            .join(InstallmentPlan, Sale.id == InstallmentPlan.sale_id, isouter=True)
            .order_by(Sale.sale_date.desc(), Sale.id.desc())
        )
        if status == 'active':
            query = query.filter(Sale.status == 'Active')
        elif status == 'paid':
            query = query.filter(InstallmentPlan.status == 'Paid')
        elif status == 'cancelled':
            query = query.filter(Sale.status == 'Cancelled')
        if search:
            q = f'%{search}%'
            query = query.filter(
                db.or_(
                    Sale.invoice_number.ilike(q),
                    Customer.name.ilike(q) if False else Sale.buyer_id.in_(
                        db.session.query(Customer.id).filter(Customer.name.ilike(q))
                    ),
                )
            )
        total = query.count()
        sales = query.offset((page - 1) * per_page).limit(per_page).all()
        items = []
        for sale in sales:
            car    = sale.car
            buyer  = sale.buyer
            plan   = sale.installment_plan
            items.append({
                'sale_id':        sale.id,
                'plan_id':        plan.id if plan else None,
                'invoice_number': sale.invoice_number,
                'sale_date':      sale.sale_date.strftime('%Y-%m-%d') if sale.sale_date else None,
                'car':            f'{car.brand} {car.model} {car.manufacturing_year}' if car else '—',
                'customer_name':  buyer.name if buyer else '—',
                'customer_id':    buyer.id if buyer else None,
                'selling_price':  sale.selling_price,
                'currency':       sale.currency,
                'paid_amount':    sale.paid_amount,
                'remaining_amount': sale.remaining_amount,
                'number_of_months': plan.number_of_months if plan else None,
                'installment_amount': plan.installment_amount if plan else None,
                'installment_start_date': plan.installment_start_date.strftime('%Y-%m-%d') if plan and plan.installment_start_date else None,
                'sale_status':    sale.status,
                'plan_status':    plan.status if plan else None,
            })
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': items})

    @app.route('/api/sales/<int:sale_id>/sales-rep', methods=['PATCH'])
    @api_login_required
    @api_permission_required('manage_sales')
    def api_set_sale_rep(sale_id):
        sale = Sale.query.get_or_404(sale_id)
        if not branch_allowed(sale):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه الفاتورة'}), 403
        data   = request.get_json(silent=True) or {}
        emp_id = data.get('employee_id')
        if emp_id:
            emp = Employee.query.get(int(emp_id))
            if not emp:
                return jsonify({'error': 'الموظف غير موجود'}), 404
            sale.sales_rep_id       = emp.id
            sale.sales_rep_name     = emp.full_name
            sale.sales_rep_phone    = emp.phone
            sale.sales_rep_id_number = emp.id_number
            sale.sales_rep_title    = emp.title
            sale.sales_rep_address  = emp.address
        else:
            sale.sales_rep_id        = None
            sale.sales_rep_name      = None
            sale.sales_rep_phone     = None
            sale.sales_rep_id_number = None
            sale.sales_rep_title     = None
            sale.sales_rep_address   = None
        log_action('set sale rep', 'Sale', sale.id, sale.invoice_number)
        db.session.commit()
        return jsonify({
            'sales_rep_id':       sale.sales_rep_id,
            'sales_rep_name':     sale.sales_rep_name,
            'sales_rep_phone':    sale.sales_rep_phone,
            'sales_rep_id_number': sale.sales_rep_id_number,
            'sales_rep_title':    sale.sales_rep_title,
            'sales_rep_address':  sale.sales_rep_address,
        })

    # --- Inventory JSON CRUD ---

    CAR_PHOTO_SUBFOLDER = 'vehicles'

    def _car_payload(c):
        return {
            'id':                c.id,
            'branch_id':         c.branch_id,
            'branch':            branch_json(c.branch),
            'brand':             c.brand,
            'model':             c.model,
            'manufacturing_year': c.manufacturing_year,
            'trim':              c.trim,
            'condition':         c.condition,
            'color':             c.color,
            'vin':               c.vin,
            'plate_number':      c.plate_number,
            'plate_status':      c.plate_status,
            'mileage':           c.mileage,
            'engine_size':       c.engine_size,
            'cylinders':         c.cylinders,
            'transmission':      c.transmission,
            'fuel_type':         c.fuel_type,
            'import_country':    c.import_country,
            'seat_count':        c.seat_count,
            'seat_material':     c.seat_material,
            'purchase_price':    c.purchase_price,
            'selling_price':     c.selling_price,
            'currency':          c.currency,
            'status':            c.status,
            'notes':             c.notes,
            'created_at':        c.created_at.isoformat() if c.created_at else None,
            'photos': [
                {'id': p.id, 'filename': p.filename, 'subfolder': CAR_PHOTO_SUBFOLDER}
                for p in (c.photos or [])
            ],
        }

    def _public_car_payload(c):
        return {
            'id':                c.id,
            'branch_id':         c.branch_id,
            'branch':            branch_json(c.branch),
            'brand':             c.brand,
            'model':             c.model,
            'manufacturing_year': c.manufacturing_year,
            'trim':              c.trim,
            'condition':         c.condition,
            'color':             c.color,
            'vin':               c.vin,
            'plate_number':      c.plate_number,
            'plate_status':      c.plate_status,
            'mileage':           c.mileage,
            'engine_size':       c.engine_size,
            'cylinders':         c.cylinders,
            'transmission':      c.transmission,
            'fuel_type':         c.fuel_type,
            'import_country':    c.import_country,
            'seat_count':        c.seat_count,
            'seat_material':     c.seat_material,
            'selling_price':     c.selling_price,
            'currency':          c.currency,
            'status':            c.status,
            'created_at':        c.created_at.isoformat() if c.created_at else None,
            'photos': [
                {'id': p.id, 'filename': p.filename, 'subfolder': CAR_PHOTO_SUBFOLDER}
                for p in (c.photos or [])
            ],
            'cover_photo': (
                {'id': c.photos[0].id, 'filename': c.photos[0].filename, 'subfolder': CAR_PHOTO_SUBFOLDER}
                if c.photos else None
            ),
        }

    @app.route('/api/public/inventory', methods=['GET'])
    def api_public_inventory():
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)
        search = request.args.get('search')

        query = scoped_query(Car).filter_by(status='Available')
        if search:
            q = f"%{search}%"
            query = query.filter(or_(Car.brand.ilike(q), Car.model.ilike(q), Car.vin.ilike(q)))

        from sqlalchemy.orm import joinedload as _jl, subqueryload as _sl
        total = query.count()
        items = query.options(
            _sl(Car.photos), _jl(Car.branch)
        ).order_by(Car.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
        results = []
        for c in items:
            results.append(_public_car_payload(c))
        return jsonify({'total': total, 'page': page, 'per_page': per_page, 'items': results})

    @app.route('/api/public/inventory/<int:car_id>', methods=['GET'])
    def api_public_car_detail(car_id):
        c = Car.query.get_or_404(car_id)
        return jsonify(_public_car_payload(c))

    @app.route('/api/inventory/<int:car_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_car_detail(car_id):
        car = Car.query.get_or_404(car_id)
        if not branch_allowed(car):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه السيارة'}), 403
        return jsonify(_car_payload(car))

    @app.route('/api/inventory', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_create_car():
        data = request.get_json(silent=True) or {}
        brand = (data.get('brand') or '').strip()
        model = (data.get('model') or '').strip()
        manufacturing_year = data.get('manufacturing_year')
        color = (data.get('color') or '').strip()
        vin   = (data.get('vin')   or '').strip()
        plate_number = (data.get('plate_number') or '').strip()
        mileage = data.get('mileage')
        purchase_price = data.get('purchase_price')

        if not all([brand, model, manufacturing_year, color, vin, plate_number, purchase_price]):
            return jsonify({'error': 'الحقول المطلوبة: الماركة، الموديل، السنة، اللون، الشاصي، اللوحة، سعر الشراء'}), 400

        year_val, year_err = _validate_year(manufacturing_year)
        if year_err:
            return year_err
        price_val, price_err = _parse_money(purchase_price, 'سعر الشراء')
        if price_err:
            return price_err
        if price_val <= 0:
            return jsonify({'error': 'سعر الشراء يجب أن يكون أكبر من صفر'}), 400

        if Car.query.filter_by(vin=vin).first():
            return jsonify({'error': 'رقم الشاصي مستخدم بالفعل'}), 409
        if Car.query.filter_by(plate_number=plate_number).first():
            return jsonify({'error': 'رقم اللوحة مستخدم بالفعل'}), 409

        creation_branch_id, branch_error = require_creation_branch_id()
        if branch_error:
            return branch_error

        selling_price_raw = data.get('selling_price')
        selling_price_val = None
        if selling_price_raw not in (None, ''):
            sp_val, sp_err = _parse_money(selling_price_raw, 'سعر البيع')
            if sp_err:
                return sp_err
            if sp_val < 0:
                return jsonify({'error': 'سعر البيع لا يمكن أن يكون سالباً'}), 400
            selling_price_val = sp_val

        car = Car(
            branch_id=creation_branch_id,
            brand=brand, model=model,
            manufacturing_year=year_val,
            trim=data.get('trim'),
            condition=data.get('condition') or 'New',
            color=color, vin=vin,
            plate_number=plate_number,
            plate_status=data.get('plate_status'),
            mileage=int(mileage or 0),
            engine_size=data.get('engine_size'),
            cylinders=int(data['cylinders']) if data.get('cylinders') else None,
            transmission=data.get('transmission'),
            fuel_type=data.get('fuel_type'),
            import_country=data.get('import_country'),
            seat_count=int(data['seat_count']) if data.get('seat_count') else None,
            seat_material=data.get('seat_material'),
            purchase_price=price_val,
            selling_price=selling_price_val,
            currency=normalize_currency(data.get('currency') or 'USD'),
            status='Available',
            notes=data.get('notes'),
        )
        db.session.add(car)
        log_action('add car', 'Car', None, f'{brand} {model}')
        db.session.flush()
        db.session.commit()
        return jsonify(_car_payload(car)), 201

    @app.route('/api/inventory/<int:car_id>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_update_car(car_id):
        car = Car.query.get_or_404(car_id)
        if not branch_allowed(car):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه السيارة'}), 403

        data = request.get_json(silent=True) or {}
        brand = (data.get('brand') or '').strip()
        model = (data.get('model') or '').strip()
        manufacturing_year = data.get('manufacturing_year')
        color = (data.get('color') or '').strip()
        vin   = (data.get('vin')   or '').strip()
        plate_number = (data.get('plate_number') or '').strip()
        purchase_price = data.get('purchase_price')

        if not all([brand, model, manufacturing_year, color, vin, plate_number, purchase_price]):
            return jsonify({'error': 'الحقول المطلوبة: الماركة، الموديل، السنة، اللون، الشاصي، اللوحة، سعر الشراء'}), 400

        year_val, year_err = _validate_year(manufacturing_year)
        if year_err:
            return year_err
        price_val, price_err = _parse_money(purchase_price, 'سعر الشراء')
        if price_err:
            return price_err
        if price_val <= 0:
            return jsonify({'error': 'سعر الشراء يجب أن يكون أكبر من صفر'}), 400

        vin_conflict = Car.query.filter(Car.vin == vin, Car.id != car_id).first()
        if vin_conflict:
            return jsonify({'error': 'رقم الشاصي مستخدم بالفعل'}), 409
        plate_conflict = Car.query.filter(Car.plate_number == plate_number, Car.id != car_id).first()
        if plate_conflict:
            return jsonify({'error': 'رقم اللوحة مستخدم بالفعل'}), 409

        car.brand = brand; car.model = model
        car.manufacturing_year = year_val
        car.trim           = data.get('trim', car.trim)
        car.condition      = data.get('condition', car.condition) or 'New'
        car.color          = color
        car.vin            = vin
        car.plate_number   = plate_number
        car.plate_status   = data.get('plate_status', car.plate_status)
        car.mileage        = int(data['mileage']) if data.get('mileage') is not None else car.mileage
        car.engine_size    = data.get('engine_size', car.engine_size)
        car.cylinders      = int(data['cylinders']) if data.get('cylinders') else car.cylinders
        car.transmission   = data.get('transmission', car.transmission)
        car.fuel_type      = data.get('fuel_type', car.fuel_type)
        car.import_country = data.get('import_country', car.import_country)
        car.seat_count     = int(data['seat_count']) if data.get('seat_count') else car.seat_count
        car.seat_material  = data.get('seat_material', car.seat_material)
        car.purchase_price = price_val
        if data.get('selling_price') not in (None, ''):
            selling_price, selling_price_err = _parse_money(data['selling_price'], 'سعر البيع')
            if selling_price_err:
                return selling_price_err
            car.selling_price = selling_price
        car.currency       = normalize_currency(data.get('currency') or car.currency)
        car.notes          = data.get('notes', car.notes)
        log_action('edit car', 'Car', car.id, f'{car.brand} {car.model}')
        db.session.commit()
        return jsonify(_car_payload(car))

    @app.route('/api/inventory/<int:car_id>/photos', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_upload_car_photo(car_id):
        car = Car.query.get_or_404(car_id)
        if not branch_allowed(car):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه السيارة'}), 403

        files = request.files.getlist('photos') or [request.files.get('photo')]
        files = [f for f in files if f and f.filename]

        if not files:
            return jsonify({'error': 'لم يتم اختيار أي صورة'}), 400

        upload_folder = os.path.join(Config.UPLOAD_FOLDER, CAR_PHOTO_SUBFOLDER)
        os.makedirs(upload_folder, exist_ok=True)

        saved = []
        for file_storage in files:
            if not allowed_photo(file_storage.filename):
                continue
            if not _check_file_magic(file_storage, ALLOWED_PHOTO_EXTENSIONS):
                return jsonify({'error': 'نوع الملف لا يطابق محتواه الفعلي. مقبول: jpg, jpeg, png, webp'}), 400
            original_name = secure_filename(file_storage.filename)
            extension = original_name.rsplit('.', 1)[1].lower()
            filename = f'{uuid4().hex}.{extension}'
            file_storage.save(os.path.join(upload_folder, filename))
            photo = CarPhoto(car_id=car.id, filename=filename)
            db.session.add(photo)
            db.session.flush()
            saved.append({'id': photo.id, 'filename': photo.filename, 'subfolder': CAR_PHOTO_SUBFOLDER})

        if not saved:
            return jsonify({'error': 'لا توجد صور بصيغة مدعومة (jpg, jpeg, png, webp)'}), 400

        log_action('upload car photo', 'Car', car.id, f'{car.brand} {car.model} — {len(saved)} صورة')
        db.session.commit()
        return jsonify({'photos': saved}), 201

    @app.route('/api/inventory/<int:car_id>/photos/<int:photo_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('manage_cars')
    def api_delete_car_photo(car_id, photo_id):
        car = Car.query.get_or_404(car_id)
        if not branch_allowed(car):
            return jsonify({'error': 'لا يمكنك الوصول إلى هذه السيارة'}), 403

        photo = CarPhoto.query.filter_by(id=photo_id, car_id=car_id).first_or_404()
        file_path = os.path.join(Config.UPLOAD_FOLDER, CAR_PHOTO_SUBFOLDER, photo.filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass

        db.session.delete(photo)
        log_action('delete car photo', 'Car', car.id, f'{car.brand} {car.model}')
        db.session.commit()
        return jsonify({'message': 'تم حذف الصورة بنجاح'}), 200

    # --- Exchange Rate JSON ---

    @app.route('/api/exchange-rate/current', methods=['GET'])
    @api_login_required
    def api_exchange_rate_current():
        rate = get_current_exchange_rate()
        if not rate:
            return jsonify(None)
        return jsonify({
            'id':         rate.id,
            'rate':       rate.rate,
            'source':     rate.source,
            'updated_at': rate.updated_at.isoformat() if rate.updated_at else None,
            'updated_by': rate.updated_by,
        })

    @app.route('/api/exchange-rate', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_accounting')
    def api_set_exchange_rate():
        data   = request.get_json(silent=True) or {}
        action = data.get('action', 'manual')
        try:
            if action == 'online':
                rate_value = fetch_online_exchange_rate()
                source     = 'online'
            else:
                rate_value = rate_decimal(data.get('rate') or 0)
                source     = 'manual'
            if rate_value <= 0:
                return jsonify({'error': 'أدخل سعر صرف صحيح أكبر من صفر'}), 400
            rate = ExchangeRate(
                rate=rate_value, source=source,
                updated_at=datetime.utcnow(),
                updated_by=current_user.username,
            )
            db.session.add(rate)
            db.session.flush()
            log_action('update exchange rate', 'ExchangeRate', rate.id,
                       f'USD/IQD={format_money(rate.rate)} source={source}')
            db.session.commit()
            return jsonify({
                'id':         rate.id,
                'rate':       rate.rate,
                'source':     rate.source,
                'updated_at': rate.updated_at.isoformat(),
                'updated_by': rate.updated_by,
            }), 201
        except Exception:
            db.session.rollback()
            return jsonify({'error': 'تعذّر تحديث سعر الصرف. يرجى المحاولة لاحقاً.'}), 500

    @app.route('/api/exchange-rate/history', methods=['GET'])
    @api_login_required
    def api_exchange_rate_history():
        rates = ExchangeRate.query.order_by(
            ExchangeRate.updated_at.desc(), ExchangeRate.id.desc()
        ).limit(20).all()
        return jsonify([{
            'id':         r.id,
            'rate':       r.rate,
            'source':     r.source,
            'updated_at': r.updated_at.isoformat() if r.updated_at else None,
            'updated_by': r.updated_by,
        } for r in rates])

    # --- JSON Auth endpoints ---

    def _user_payload(user):
        """Public user representation — never exposes password_hash."""
        return {
            'id':                      user.id,
            'username':                user.username,
            'role':                    user.role,
            'role_label':              ROLE_LABELS.get(user.role, user.role),
            'branch_id':               user.branch_id,
            'branch':                  branch_json(user.branch),
            'can_access_all_branches': bool(user.can_access_all_branches),
            'is_active_user':          bool(user.is_active_user),
            'created_at':              user.created_at.isoformat() if user.created_at else None,
        }

    def _user_json(user):
        permissions = list(get_role_permissions(user.role))
        branches    = get_accessible_branches()
        active      = get_selected_branch()
        return {
            'user': {
                'id':                      user.id,
                'username':                user.username,
                'role':                    user.role,
                'branch_id':               user.branch_id,
                'can_access_all_branches': bool(user.can_access_all_branches),
                'is_active_user':          bool(user.is_active_user),
                'permissions':             permissions,
                'created_at':              user.created_at.isoformat() if user.created_at else '',
            },
            'branches': [
                {
                    'id':         b.id,
                    'name':       b.name,
                    'is_main':    b.is_main,
                    'created_at': b.created_at.isoformat() if b.created_at else '',
                }
                for b in branches
            ],
            'active_branch': {
                'id':         active.id,
                'name':       active.name,
                'is_main':    active.is_main,
                'created_at': active.created_at.isoformat() if active.created_at else '',
            } if active else None,
        }

    @app.route('/api/auth/login', methods=['POST'])
    def api_auth_login():
        ip   = request.remote_addr or '127.0.0.1'
        data = request.get_json(silent=True) or {}
        username = (data.get('username') or '').strip()
        password = data.get('password') or ''

        if not username or not password:
            return jsonify({'error': 'يجب إدخال اسم المستخدم وكلمة المرور'}), 400

        if not _check_rate_limit(ip):
            return jsonify({'error': 'عدد محاولات كثيرة جداً. يرجى الانتظار دقيقة ثم المحاولة مجدداً.'}), 429

        locked, secs = _is_locked_out(username)
        if locked:
            mins = max(1, secs // 60)
            return jsonify({'error': f'الحساب مقفل مؤقتاً. حاول بعد {mins} دقيقة.'}), 429

        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password) or not user.is_active_user:
            _record_failure(username)
            return jsonify({'error': 'اسم المستخدم أو كلمة المرور غير صحيح'}), 401

        _record_success(username)
        session.clear()
        login_user(user)
        session.permanent = True
        session['password_fingerprint'] = password_hash_fingerprint(user.password_hash)
        log_action('login', 'User', user.id, user.username)
        db.session.commit()
        return jsonify(_user_json(user))

    @app.route('/api/auth/logout', methods=['POST'])
    @api_login_required
    def api_auth_logout():
        log_action('logout', 'User', current_user.id, current_user.username)
        db.session.commit()
        logout_user()
        return jsonify({'success': True})

    @app.route('/api/auth/me', methods=['GET'])
    @api_login_required
    def api_auth_me():
        return jsonify(_user_json(current_user))

    @app.route('/api/auth/change-password', methods=['POST'])
    @api_login_required
    def api_auth_change_password():
        data = request.get_json(silent=True) or {}
        current_password = data.get('current_password') or ''
        new_password = (data.get('new_password') or '').strip()
        confirm_password = (data.get('confirm_password') or '').strip()

        if not current_user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 403
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400
        if new_password != confirm_password:
            return jsonify({'error': 'Password confirmation does not match'}), 400

        current_user.set_password(new_password)
        session['password_fingerprint'] = password_hash_fingerprint(current_user.password_hash)
        log_action('change password', 'User', current_user.id, current_user.username)
        db.session.commit()
        return jsonify({'success': True})

    # --- User Management JSON API ---

    def _can_manage_target(target_user):
        """Return (True, None) if caller may manage target, else (False, error_response)."""
        if not branch_allowed(target_user):
            return False, (jsonify({'error': 'لا يمكنك الوصول إلى هذا المستخدم'}), 403)
        if target_user.role == 'Owner' and current_user.role != 'Owner':
            return False, (jsonify({'error': 'فقط مالك المعرض يمكنه إدارة حسابات المالك'}), 403)
        return True, None

    @app.route('/api/users', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_list_users():
        page     = max(int(request.args.get('page', 1)), 1)
        per_page = min(int(request.args.get('per_page', 50)), 200)
        search      = (request.args.get('search') or '').strip()
        role_filter = (request.args.get('role') or '').strip()

        query = scoped_query(User)
        if search:
            query = query.filter(User.username.ilike(f'%{search}%'))
        if role_filter and role_filter in ROLE_LABELS:
            query = query.filter(User.role == role_filter)

        total = query.count()
        items = query.order_by(User.created_at.desc()) \
                     .offset((page - 1) * per_page).limit(per_page).all()
        return jsonify({
            'total':    total,
            'page':     page,
            'per_page': per_page,
            'roles':    [{'value': k, 'label': v} for k, v in ROLE_LABELS.items()],
            'items':    [_user_payload(u) for u in items],
        })

    @app.route('/api/users', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_create_user():
        data     = request.get_json(silent=True) or {}
        username = (data.get('username') or '').strip()
        password = (data.get('password') or '').strip()
        role     = (data.get('role') or '').strip()

        if not all([username, password, role]):
            return jsonify({'error': 'اسم المستخدم وكلمة المرور والدور مطلوبة'}), 400
        if len(username) < 3:
            return jsonify({'error': 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'}), 400
        if len(password) < 6:
            return jsonify({'error': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'}), 400
        if role not in ROLE_LABELS:
            return jsonify({'error': f'الدور غير صحيح. القيم المقبولة: {", ".join(ROLE_LABELS)}'}), 400
        if role == 'Owner' and current_user.role != 'Owner':
            return jsonify({'error': 'فقط مالك المعرض يمكنه إنشاء مستخدمين بدور المالك'}), 403

        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'اسم المستخدم مستخدم بالفعل'}), 409

        # Branch assignment
        raw_bid = data.get('branch_id')
        if raw_bid is not None and can_access_all_branches():
            branch_id = int(raw_bid) if raw_bid else None
        else:
            branch_id = record_branch_id()

        grant_all = bool(data.get('can_access_all_branches', False))
        if grant_all and not can_access_all_branches():
            grant_all = False

        new_user = User(
            username=username,
            role=role,
            branch_id=branch_id,
            can_access_all_branches=grant_all,
            is_active_user=True,
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush()
        log_action('add user', 'User', new_user.id, username)
        db.session.commit()
        return jsonify(_user_payload(new_user)), 201

    @app.route('/api/users/<int:user_id>', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_get_user(user_id):
        user = User.query.get_or_404(user_id)
        ok, err = _can_manage_target(user)
        if not ok:
            return err
        return jsonify(_user_payload(user))

    @app.route('/api/users/<int:user_id>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_update_user(user_id):
        user = User.query.get_or_404(user_id)
        ok, err = _can_manage_target(user)
        if not ok:
            return err

        data     = request.get_json(silent=True) or {}
        username = (data.get('username') or '').strip()
        role     = (data.get('role') or '').strip()

        if not all([username, role]):
            return jsonify({'error': 'اسم المستخدم والدور مطلوبان'}), 400
        if len(username) < 3:
            return jsonify({'error': 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'}), 400
        if role not in ROLE_LABELS:
            return jsonify({'error': 'الدور غير صحيح'}), 400
        if role == 'Owner' and current_user.role != 'Owner':
            return jsonify({'error': 'فقط مالك المعرض يمكنه تعيين دور المالك'}), 403

        conflict = User.query.filter(User.username == username, User.id != user_id).first()
        if conflict:
            return jsonify({'error': 'اسم المستخدم مستخدم بالفعل'}), 409

        user.username = username
        user.role     = role

        # Branch
        raw_bid = data.get('branch_id')
        if raw_bid is not None and can_access_all_branches():
            user.branch_id = int(raw_bid) if raw_bid else None

        # can_access_all_branches — only grantable by those who already have it
        if can_access_all_branches() and 'can_access_all_branches' in data:
            user.can_access_all_branches = bool(data['can_access_all_branches'])

        if 'is_active_user' in data:
            requested_active = bool(data['is_active_user'])
            if user.id == current_user.id and not requested_active:
                return jsonify({'error': 'You cannot disable your current account'}), 400
            user.is_active_user = requested_active

        # Optional password reset in edit
        password = (data.get('password') or '').strip()
        if password:
            if len(password) < 6:
                return jsonify({'error': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'}), 400
            user.set_password(password)
            if user.id == current_user.id:
                session['password_fingerprint'] = password_hash_fingerprint(user.password_hash)

        log_action('edit user', 'User', user.id, user.username)
        db.session.commit()
        return jsonify(_user_payload(user))

    @app.route('/api/users/<int:user_id>/toggle-active', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_toggle_user_active(user_id):
        user = User.query.get_or_404(user_id)
        ok, err = _can_manage_target(user)
        if not ok:
            return err
        if user.id == current_user.id:
            return jsonify({'error': 'لا يمكنك تغيير حالة حسابك الحالي'}), 400

        user.is_active_user = not user.is_active_user
        action = 'enable user' if user.is_active_user else 'disable user'
        log_action(action, 'User', user.id, user.username)
        db.session.commit()
        return jsonify(_user_payload(user))

    @app.route('/api/users/<int:user_id>/reset-password', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_users')
    def api_reset_user_password(user_id):
        user = User.query.get_or_404(user_id)
        ok, err = _can_manage_target(user)
        if not ok:
            return err

        data     = request.get_json(silent=True) or {}
        password = (data.get('password') or '').strip()
        if len(password) < 6:
            return jsonify({'error': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'}), 400

        user.set_password(password)
        if user.id == current_user.id:
            session['password_fingerprint'] = password_hash_fingerprint(user.password_hash)
        log_action('reset password', 'User', user.id, user.username)
        db.session.commit()
        return jsonify({'success': True, 'message': 'تمت إعادة تعيين كلمة المرور بنجاح'})

    @app.route('/api/users/<int:user_id>', methods=['DELETE'])
    @api_login_required
    @api_permission_required('delete_records')
    def api_delete_user(user_id):
        user = User.query.get_or_404(user_id)
        ok, err = _can_manage_target(user)
        if not ok:
            return err
        if user.id == current_user.id:
            return jsonify({'error': 'لا يمكنك حذف حسابك الحالي'}), 400

        log_action('delete user', 'User', user.id, user.username)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True})

    # --- Roles / Permissions JSON API ---

    def _role_payload(role):
        return {
            'role':        role,
            'label':       ROLE_LABELS.get(role, role),
            'permissions': sorted(get_role_permissions(role)),
            'is_fixed':    role == 'Owner',
        }

    @app.route('/api/roles', methods=['GET'])
    @api_login_required
    @api_permission_required('manage_roles')
    def api_list_roles():
        return jsonify({
            'roles': [_role_payload(r) for r in ROLE_LABELS],
            'all_permissions': [
                {'key': p, 'label': PERMISSION_LABELS.get(p, p)}
                for p in PERMISSIONS
            ],
        })

    @app.route('/api/roles/<string:role>', methods=['PUT'])
    @api_login_required
    @api_permission_required('manage_roles')
    def api_update_role(role):
        if role not in ROLE_LABELS:
            return jsonify({'error': 'الدور غير موجود'}), 404
        if role == 'Owner':
            return jsonify({'error': 'لا يمكن تعديل صلاحيات مالك المعرض'}), 403
        if role == 'Admin' and current_user.role != 'Owner':
            return jsonify({'error': 'فقط مالك المعرض يمكنه تعديل صلاحيات المدير'}), 403

        data = request.get_json(silent=True) or {}
        raw_permissions = data.get('permissions', [])
        if not isinstance(raw_permissions, list):
            return jsonify({'error': 'permissions يجب أن تكون قائمة'}), 400

        # Only accept known permissions
        new_permissions = [p for p in raw_permissions if p in PERMISSIONS]

        # view_dashboard must always be present
        if 'view_dashboard' not in new_permissions:
            new_permissions.insert(0, 'view_dashboard')

        RolePermission.query.filter_by(role=role).delete()
        for perm in new_permissions:
            db.session.add(RolePermission(role=role, permission=perm))
        log_action('change permissions', 'Role', None, f'{role}: {", ".join(sorted(new_permissions))}')
        db.session.commit()
        return jsonify(_role_payload(role))

    @app.route('/api/roles/<string:role>/reset', methods=['POST'])
    @api_login_required
    @api_permission_required('manage_roles')
    def api_reset_role(role):
        """Restore a role's permissions to system defaults."""
        if role not in ROLE_LABELS:
            return jsonify({'error': 'الدور غير موجود'}), 404
        if role == 'Owner':
            return jsonify({'error': 'لا يمكن إعادة ضبط صلاحيات مالك المعرض'}), 403
        if role == 'Admin' and current_user.role != 'Owner':
            return jsonify({'error': 'فقط مالك المعرض يمكنه إعادة ضبط صلاحيات المدير'}), 403

        RolePermission.query.filter_by(role=role).delete()
        defaults = DEFAULT_ROLE_PERMISSIONS.get(role, [])
        for perm in defaults:
            db.session.add(RolePermission(role=role, permission=perm))
        log_action('reset permissions', 'Role', None, role)
        db.session.commit()
        return jsonify(_role_payload(role))


    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
