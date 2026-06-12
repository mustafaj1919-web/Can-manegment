from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from .database import db


class Branch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    is_main = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ExchangeRate(db.Model):
    __table_args__ = (
        db.Index('ix_exchange_rate_updated_at', 'updated_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    rate = db.Column(db.Numeric(15, 6), nullable=False)
    source = db.Column(db.String(64), nullable=False, default='manual')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_by = db.Column(db.String(64), nullable=True)


class Car(db.Model):
    __table_args__ = (
        db.Index('ix_car_branch_id', 'branch_id'),
        db.Index('ix_car_status', 'status'),
        db.Index('ix_car_branch_status', 'branch_id', 'status'),
        db.Index('ix_car_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    brand = db.Column(db.String(128), nullable=False)
    model = db.Column(db.String(128), nullable=False)
    manufacturing_year = db.Column(db.Integer, nullable=False)
    trim = db.Column(db.String(128), nullable=True)
    condition = db.Column(db.String(32), nullable=False, default='New')
    color = db.Column(db.String(64), nullable=False)
    vin = db.Column(db.String(64), unique=True, nullable=False)
    plate_number = db.Column(db.String(32), unique=True, nullable=False)
    plate_status = db.Column(db.String(64), nullable=True)
    mileage = db.Column(db.Integer, nullable=False, default=0)
    engine_size = db.Column(db.String(32), nullable=True)
    cylinders = db.Column(db.Integer, nullable=True)
    transmission = db.Column(db.String(64), nullable=True)
    fuel_type = db.Column(db.String(64), nullable=True)
    import_country = db.Column(db.String(128), nullable=True)
    seat_count = db.Column(db.Integer, nullable=True)
    seat_material = db.Column(db.String(64), nullable=True)
    purchase_price = db.Column(db.Numeric(15, 2), nullable=False)
    selling_price = db.Column(db.Numeric(15, 2), nullable=True)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    status = db.Column(db.String(32), nullable=False, default='Available')
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    photos = db.relationship('CarPhoto', backref='car', lazy=True)
    sales = db.relationship('Sale', backref='car', lazy=True)
    purchases = db.relationship('Purchase', backref='car', lazy=True)
    branch = db.relationship('Branch', backref='cars', lazy=True)


class CarPhoto(db.Model):
    __table_args__ = (
        db.Index('ix_car_photo_car_id', 'car_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)
    filename = db.Column(db.String(256), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)


class Customer(db.Model):
    __table_args__ = (
        db.Index('ix_customer_branch_id', 'branch_id'),
        db.Index('ix_customer_name', 'name'),
        db.Index('ix_customer_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    name = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(128), nullable=True)
    phone = db.Column(db.String(32), nullable=False)
    address = db.Column(db.String(256), nullable=True)
    id_type = db.Column(db.String(64), nullable=True)
    id_number = db.Column(db.String(64), unique=True, nullable=False)
    id_issue_date = db.Column(db.DateTime, nullable=True)
    id_expiry_date = db.Column(db.DateTime, nullable=True)
    nationality = db.Column(db.String(64), nullable=True)
    date_of_birth = db.Column(db.DateTime, nullable=True)
    customer_type = db.Column(db.String(32), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sales = db.relationship('Sale', backref='buyer', lazy=True, foreign_keys='Sale.buyer_id')
    purchases = db.relationship('Purchase', backref='seller', lazy=True, foreign_keys='Purchase.seller_id')
    documents = db.relationship('CustomerDocument', backref='customer', lazy=True, cascade='all, delete-orphan')
    branch = db.relationship('Branch', backref='customers', lazy=True)


class CustomerDocument(db.Model):
    __table_args__ = (
        db.Index('ix_customer_document_customer_id', 'customer_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    document_type = db.Column(db.String(64), nullable=False)
    filename = db.Column(db.String(256), nullable=False)
    original_filename = db.Column(db.String(256), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)


class Employee(db.Model):
    __table_args__ = (
        db.Index('ix_employee_branch_id', 'branch_id'),
        db.Index('ix_employee_is_active', 'is_active'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    full_name = db.Column(db.String(128), nullable=False)
    phone = db.Column(db.String(32), nullable=False)
    id_number = db.Column(db.String(64), nullable=True)
    address = db.Column(db.String(256), nullable=True)
    title = db.Column(db.String(128), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    signature_filename = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch = db.relationship('Branch', backref='employees', lazy=True)


class ShowroomInfo(db.Model):
    """Singleton-like table to store configurable showroom information."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    address = db.Column(db.String(512), nullable=True)
    phone_numbers = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Sale(db.Model):
    __table_args__ = (
        db.Index('ix_sale_branch_id', 'branch_id'),
        db.Index('ix_sale_status', 'status'),
        db.Index('ix_sale_car_id', 'car_id'),
        db.Index('ix_sale_buyer_id', 'buyer_id'),
        db.Index('ix_sale_sale_date', 'sale_date'),
        db.Index('ix_sale_branch_status', 'branch_id', 'status'),
        db.Index('ix_sale_branch_date', 'branch_id', 'sale_date'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    invoice_number = db.Column(db.String(64), unique=True, nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    sales_rep_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=True)
    sales_rep_name = db.Column(db.String(128), nullable=True)
    sales_rep_phone = db.Column(db.String(32), nullable=True)
    sales_rep_id_number = db.Column(db.String(64), nullable=True)
    sales_rep_title = db.Column(db.String(128), nullable=True)
    sales_rep_address = db.Column(db.String(256), nullable=True)
    selling_price = db.Column(db.Numeric(15, 2), nullable=False)
    discount = db.Column(db.Numeric(15, 2), default=0)
    paid_amount = db.Column(db.Numeric(15, 2), default=0)
    remaining_amount = db.Column(db.Numeric(15, 2), default=0)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    payment_method = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='Active')
    cancel_reason = db.Column(db.Text, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    sale_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    payments = db.relationship('Payment', backref='sale', lazy=True, foreign_keys='Payment.sale_id')
    installment_plan = db.relationship('InstallmentPlan', backref='sale', lazy=True, uselist=False, cascade='all, delete-orphan')
    branch = db.relationship('Branch', backref='sales', lazy=True)
    sales_rep = db.relationship('Employee', backref='sales', lazy=True, foreign_keys=[sales_rep_id])


class InstallmentPlan(db.Model):
    __table_args__ = (
        db.Index('ix_installment_plan_branch_id', 'branch_id'),
        db.Index('ix_installment_plan_status', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False, unique=True)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(15, 2), default=0)
    remaining_amount = db.Column(db.Numeric(15, 2), default=0)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    number_of_months = db.Column(db.Integer, nullable=True)
    installment_start_date = db.Column(db.DateTime, nullable=False)
    installment_due_day = db.Column(db.Integer, nullable=False)
    installment_amount = db.Column(db.Numeric(15, 2), default=0)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(32), nullable=False, default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    schedules = db.relationship('InstallmentSchedule', backref='plan', lazy=True, cascade='all, delete-orphan')
    branch = db.relationship('Branch', backref='installment_plans', lazy=True)


class InstallmentSchedule(db.Model):
    __table_args__ = (
        db.Index('ix_installment_schedule_plan_id', 'installment_plan_id'),
        db.Index('ix_installment_schedule_branch_id', 'branch_id'),
        db.Index('ix_installment_schedule_status', 'status'),
        db.Index('ix_installment_schedule_due_date', 'due_date'),
        db.Index('ix_installment_schedule_remaining', 'remaining_amount'),
        db.Index('ix_installment_schedule_status_due', 'status', 'due_date'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    installment_plan_id = db.Column(db.Integer, db.ForeignKey('installment_plan.id'), nullable=False)
    installment_number = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(15, 2), default=0)
    remaining_amount = db.Column(db.Numeric(15, 2), default=0)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    status = db.Column(db.String(32), nullable=False, default='Pending')
    payment_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    payments = db.relationship('Payment', backref='installment_schedule', lazy=True, foreign_keys='Payment.installment_schedule_id')
    branch = db.relationship('Branch', backref='installment_schedules', lazy=True)


class Purchase(db.Model):
    __table_args__ = (
        db.Index('ix_purchase_branch_id', 'branch_id'),
        db.Index('ix_purchase_status', 'status'),
        db.Index('ix_purchase_car_id', 'car_id'),
        db.Index('ix_purchase_seller_id', 'seller_id'),
        db.Index('ix_purchase_purchase_date', 'purchase_date'),
        db.Index('ix_purchase_branch_status', 'branch_id', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    invoice_number = db.Column(db.String(64), unique=True, nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    purchase_price = db.Column(db.Numeric(15, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(15, 2), default=0)
    remaining_amount = db.Column(db.Numeric(15, 2), default=0)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    payment_method = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='Active')
    cancel_reason = db.Column(db.Text, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    payments = db.relationship('Payment', backref='purchase', lazy=True, foreign_keys='Payment.purchase_id')
    branch = db.relationship('Branch', backref='purchases', lazy=True)


class Payment(db.Model):
    __table_args__ = (
        db.Index('ix_payment_branch_id', 'branch_id'),
        db.Index('ix_payment_sale_id', 'sale_id'),
        db.Index('ix_payment_purchase_id', 'purchase_id'),
        db.Index('ix_payment_schedule_id', 'installment_schedule_id'),
        db.Index('ix_payment_payment_type', 'payment_type'),
        db.Index('ix_payment_payment_date', 'payment_date'),
        db.Index('ix_payment_type_date', 'payment_type', 'payment_date'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    payment_type = db.Column(db.String(32), nullable=False)
    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('purchase.id'), nullable=True)
    installment_schedule_id = db.Column(db.Integer, db.ForeignKey('installment_schedule.id'), nullable=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    payment_method = db.Column(db.String(64), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch = db.relationship('Branch', backref='payments', lazy=True)


class Expense(db.Model):
    __table_args__ = (
        db.Index('ix_expense_branch_id', 'branch_id'),
        db.Index('ix_expense_expense_date', 'expense_date'),
        db.Index('ix_expense_category', 'category'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    title = db.Column(db.String(128), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    category = db.Column(db.String(64), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    expense_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch = db.relationship('Branch', backref='expenses', lazy=True)


class Transaction(db.Model):
    __table_args__ = (
        db.Index('ix_transaction_branch_id', 'branch_id'),
        db.Index('ix_transaction_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    transaction_type = db.Column(db.String(32), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch = db.relationship('Branch', backref='transactions', lazy=True)


class Account(db.Model):
    __table_args__ = (
        db.Index('ix_account_parent_id', 'parent_id'),
        db.Index('ix_account_code', 'code'),
        db.Index('ix_account_branch_id', 'branch_id'),
        db.Index('ix_account_type', 'type'),
    )
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(64), nullable=True)
    name = db.Column(db.String(256), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=True)
    type = db.Column(db.String(32), nullable=False)  # Asset, Liability, Equity, Income, Expense
    # classification: sub-category used for financial reporting grouping
    # Values: current_asset | fixed_asset | current_liability | long_term_liability |
    #         equity | operating_revenue | other_revenue |
    #         cogs | operating_expense | admin_expense
    classification = db.Column(db.String(64), nullable=True)
    balance = db.Column(db.Numeric(15, 4), default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    children = db.relationship('Account', backref=db.backref('parent', remote_side=[id]), lazy=True)


class JournalEntry(db.Model):
    __table_args__ = (
        db.Index('ix_journal_entry_branch_id', 'branch_id'),
        db.Index('ix_journal_entry_status', 'status'),
        db.Index('ix_journal_entry_entry_date', 'entry_date'),
        db.Index('ix_journal_entry_reference', 'reference_type', 'reference_id'),
        db.Index('ix_journal_entry_branch_status', 'branch_id', 'status'),
        db.Index('ix_journal_entry_branch_date', 'branch_id', 'entry_date'),
    )
    id = db.Column(db.Integer, primary_key=True)
    entry_date = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(512), nullable=True)
    reference_type = db.Column(db.String(64), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)
    reference_number = db.Column(db.String(32), unique=True, nullable=True)
    status = db.Column(db.String(16), nullable=False, default='posted')  # draft | posted | reversed
    reversal_of_id = db.Column(db.Integer, db.ForeignKey('journal_entry.id'), nullable=True)
    posted_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    posted_at = db.Column(db.DateTime, nullable=True)
    cost_center_id = db.Column(db.Integer, db.ForeignKey('cost_center.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    lines = db.relationship('JournalEntryLine', backref='entry', lazy=True, cascade='all, delete-orphan')
    reversal_of = db.relationship('JournalEntry', remote_side='JournalEntry.id', foreign_keys='JournalEntry.reversal_of_id', backref='reversed_by', lazy=True)
    cost_center = db.relationship('CostCenter', backref='journal_entries', lazy=True)


class JournalEntryLine(db.Model):
    __table_args__ = (
        db.Index('ix_journal_entry_line_entry_id', 'journal_entry_id'),
        db.Index('ix_journal_entry_line_account_id', 'account_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entry.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    debit = db.Column(db.Numeric(15, 4), default=0)
    credit = db.Column(db.Numeric(15, 4), default=0)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    account = db.relationship('Account', backref='journal_lines', lazy=True)


class Voucher(db.Model):
    __table_args__ = (
        db.Index('ix_voucher_branch_id', 'branch_id'),
        db.Index('ix_voucher_voucher_date', 'voucher_date'),
        db.Index('ix_voucher_status', 'status'),
        db.Index('ix_voucher_debit_account_id', 'debit_account_id'),
        db.Index('ix_voucher_credit_account_id', 'credit_account_id'),
    )
    id                = db.Column(db.Integer, primary_key=True)
    voucher_type      = db.Column(db.String(16), nullable=False)  # receipt | payment | transfer
    voucher_number    = db.Column(db.String(32), unique=True, nullable=False)
    voucher_date      = db.Column(db.DateTime, nullable=False)
    debit_account_id  = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    credit_account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    amount            = db.Column(db.Numeric(15, 2), nullable=False)
    currency          = db.Column(db.String(3), nullable=False, default='IQD')
    description       = db.Column(db.String(512), nullable=True)
    status            = db.Column(db.String(16), nullable=False, default='posted')  # posted | cancelled
    journal_entry_id  = db.Column(db.Integer, db.ForeignKey('journal_entry.id'), nullable=True)
    reversal_of_id    = db.Column(db.Integer, db.ForeignKey('voucher.id'), nullable=True)
    branch_id         = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    created_by_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    debit_account  = db.relationship('Account', foreign_keys='Voucher.debit_account_id',  backref='voucher_debits',  lazy=True)
    credit_account = db.relationship('Account', foreign_keys='Voucher.credit_account_id', backref='voucher_credits', lazy=True)
    journal_entry  = db.relationship('JournalEntry', foreign_keys='Voucher.journal_entry_id', backref='vouchers', lazy=True)
    created_by     = db.relationship('User', foreign_keys='Voucher.created_by_id', backref='vouchers', lazy=True)
    reversal_of    = db.relationship('Voucher', remote_side='Voucher.id', foreign_keys='Voucher.reversal_of_id', backref='reversed_vouchers', lazy=True)


class CashboxClose(db.Model):
    __table_args__ = (
        db.Index('ix_cashbox_close_branch_id', 'branch_id'),
        db.Index('ix_cashbox_close_close_date', 'close_date'),
    )
    id             = db.Column(db.Integer, primary_key=True)
    close_date     = db.Column(db.Date, nullable=False)
    branch_id      = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    account_id     = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    system_balance = db.Column(db.Numeric(15, 4), nullable=False)
    actual_balance = db.Column(db.Numeric(15, 4), nullable=False)
    difference     = db.Column(db.Numeric(15, 4), nullable=False)
    note           = db.Column(db.String(512), nullable=True)
    closed_by_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)
    account    = db.relationship('Account', foreign_keys='CashboxClose.account_id', backref='cashbox_closes', lazy=True)
    closed_by  = db.relationship('User', foreign_keys='CashboxClose.closed_by_id', backref='cashbox_closes', lazy=True)


class CostCenter(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(128), unique=True, nullable=False)
    code       = db.Column(db.String(32), nullable=True)
    is_active  = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class VehicleCost(db.Model):
    __table_args__ = (
        db.Index('ix_vehicle_cost_car_id', 'car_id'),
    )
    id          = db.Column(db.Integer, primary_key=True)
    car_id      = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=False)
    cost_type   = db.Column(db.String(64), nullable=False)
    # shipping | clearance | inspection | preparation | other
    amount      = db.Column(db.Numeric(15, 2), nullable=False)
    currency    = db.Column(db.String(3), nullable=False, default='USD')
    description = db.Column(db.String(256), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    car         = db.relationship('Car', backref='costs', lazy=True)


class RolePermission(db.Model):
    __table_args__ = (
        db.Index('ix_role_permission_role', 'role'),
    )
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(32), nullable=False)
    permission = db.Column(db.String(64), nullable=False)


class LoginAttempt(db.Model):
    """Persistent store for login failures — survives server restarts."""
    __tablename__ = 'login_attempt'
    __table_args__ = (
        db.Index('ix_login_attempt_username', 'username'),
        db.Index('ix_login_attempt_ip', 'ip_address'),
        db.Index('ix_login_attempt_at', 'attempted_at'),
    )
    id           = db.Column(db.Integer, primary_key=True)
    ip_address   = db.Column(db.String(45), nullable=False)
    username     = db.Column(db.String(80), nullable=False)
    attempted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    success      = db.Column(db.Boolean, nullable=False, default=False)


class AuditLog(db.Model):
    __table_args__ = (
        db.Index('ix_audit_log_user_id', 'user_id'),
        db.Index('ix_audit_log_created_at', 'created_at'),
        db.Index('ix_audit_log_entity', 'entity_type', 'entity_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    action = db.Column(db.String(128), nullable=False)
    entity_type = db.Column(db.String(64), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='audit_logs', lazy=True)


class User(db.Model, UserMixin):
    __table_args__ = (
        db.Index('ix_user_branch_id', 'branch_id'),
        db.Index('ix_user_role', 'role'),
    )
    id = db.Column(db.Integer, primary_key=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(db.String(32), nullable=False)
    can_access_all_branches = db.Column(db.Boolean, nullable=False, default=False)
    is_active_user = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    branch = db.relationship('Branch', backref='users', lazy=True)

    @property
    def is_active(self):
        return self.is_active_user

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


# ══════════════════════════════════════════════════════════════════════════════
#  CRM + Sales Pipeline + Employee Performance
# ══════════════════════════════════════════════════════════════════════════════

class CustomerInteraction(db.Model):
    """سجل تفاعلات العملاء — مكالمات، زيارات، رسائل، تجارب قيادة."""
    __tablename__ = 'customer_interaction'
    __table_args__ = (
        db.Index('ix_customer_interaction_branch_id', 'branch_id'),
        db.Index('ix_customer_interaction_customer_id', 'customer_id'),
        db.Index('ix_customer_interaction_date', 'interaction_date'),
    )
    id               = db.Column(db.Integer, primary_key=True)
    branch_id        = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    customer_id      = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    employee_id      = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=True)
    created_by_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    # call | whatsapp | visit | test_drive | email | other
    interaction_type = db.Column(db.String(32), nullable=False, default='call')
    notes            = db.Column(db.Text, nullable=True)
    outcome          = db.Column(db.String(64), nullable=True)   # interested | not_interested | follow_up | closed
    follow_up_date   = db.Column(db.DateTime, nullable=True)
    interaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    customer         = db.relationship('Customer', backref='interactions', lazy=True)
    employee         = db.relationship('Employee', backref='interactions', lazy=True)
    created_by       = db.relationship('User', backref='interactions', lazy=True)


class SalePipeline(db.Model):
    """خط أنابيب المبيعات — تتبع كل فرصة من الاهتمام حتى الإغلاق."""
    __tablename__ = 'sale_pipeline'
    __table_args__ = (
        db.Index('ix_sale_pipeline_branch_id', 'branch_id'),
        db.Index('ix_sale_pipeline_customer_id', 'customer_id'),
        db.Index('ix_sale_pipeline_stage', 'stage'),
        db.Index('ix_sale_pipeline_assigned_to_id', 'assigned_to_id'),
    )
    id               = db.Column(db.Integer, primary_key=True)
    branch_id        = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    customer_id      = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    car_id           = db.Column(db.Integer, db.ForeignKey('car.id'), nullable=True)
    assigned_to_id   = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=True)
    created_by_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    sale_id          = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=True)
    # lead | contacted | test_drive | negotiating | reserved | won | lost
    stage            = db.Column(db.String(32), nullable=False, default='lead')
    expected_price   = db.Column(db.Numeric(15, 2), nullable=True)
    currency         = db.Column(db.String(3), nullable=False, default='USD')
    notes            = db.Column(db.Text, nullable=True)
    lost_reason      = db.Column(db.String(256), nullable=True)
    stage_changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    customer         = db.relationship('Customer', backref='pipeline_deals', lazy=True)
    car              = db.relationship('Car', backref='pipeline_deals', lazy=True)
    assigned_to      = db.relationship('Employee', backref='pipeline_deals', lazy=True)
    created_by       = db.relationship('User', backref='pipeline_deals', lazy=True)
    sale             = db.relationship('Sale', backref='pipeline_deal', lazy=True)


class EmployeeTarget(db.Model):
    """أهداف الموظف الشهرية — عدد المبيعات، الإيراد، الربح."""
    __tablename__ = 'employee_target'
    __table_args__ = (
        db.Index('ix_employee_target_employee_id', 'employee_id'),
        db.Index('ix_employee_target_branch_id', 'branch_id'),
        db.Index('ix_employee_target_period', 'period'),
    )
    id                  = db.Column(db.Integer, primary_key=True)
    employee_id         = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    branch_id           = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    period              = db.Column(db.String(7), nullable=False)   # YYYY-MM
    target_sales_count  = db.Column(db.Integer, nullable=False, default=0)
    target_revenue      = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    target_profit       = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    currency            = db.Column(db.String(3), nullable=False, default='USD')
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    employee            = db.relationship('Employee', backref='targets', lazy=True)


class EmployeeCommission(db.Model):
    """عمولة الموظف على كل عملية بيع."""
    __tablename__ = 'employee_commission'
    __table_args__ = (
        db.Index('ix_employee_commission_employee_id', 'employee_id'),
        db.Index('ix_employee_commission_sale_id', 'sale_id'),
        db.Index('ix_employee_commission_branch_id', 'branch_id'),
    )
    id                = db.Column(db.Integer, primary_key=True)
    employee_id       = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    sale_id           = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False)
    branch_id         = db.Column(db.Integer, db.ForeignKey('branch.id'), nullable=True)
    commission_rate   = db.Column(db.Numeric(8, 4), nullable=False, default=0)   # نسبة %
    commission_amount = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    currency          = db.Column(db.String(3), nullable=False, default='USD')
    is_paid           = db.Column(db.Boolean, nullable=False, default=False)
    paid_at           = db.Column(db.DateTime, nullable=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    employee          = db.relationship('Employee', backref='commissions', lazy=True)
    sale              = db.relationship('Sale', backref='commissions', lazy=True)


class AccountingPeriod(db.Model):
    """فترة محاسبية — تمنع نشر القيود في الفترات المغلقة."""
    __tablename__ = 'accounting_period'
    __table_args__ = (
        db.Index('ix_accounting_period_status', 'status'),
        db.Index('ix_accounting_period_start', 'start_date'),
    )
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(128), nullable=False)
    start_date    = db.Column(db.Date, nullable=False)
    end_date      = db.Column(db.Date, nullable=False)
    status        = db.Column(db.String(16), nullable=False, default='open')  # open | closed
    closed_at     = db.Column(db.DateTime, nullable=True)
    closed_by_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    closed_by     = db.relationship('User', foreign_keys='AccountingPeriod.closed_by_id',
                                    backref='closed_periods', lazy=True)
