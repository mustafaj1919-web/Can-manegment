/* ─── Core Domain Types ──────────────────────────────────────────────────── */

export type Currency = 'USD' | 'IQD'
export type CarStatus = 'Available' | 'Reserved' | 'Sold'
export type CarCondition = 'New' | 'Used' | 'Damaged' | 'Salvage'
export type SaleStatus = 'Active' | 'Cancelled'
export type InstallmentStatus = 'Active' | 'Paid'
export type ScheduleStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue'
export type PaymentMethod = 'Cash' | 'Installment' | 'Bank transfer'
export type UserRole = 'Owner' | 'Admin' | 'Accountant' | 'Sales' | 'Viewer'
export type CustomerType = 'Buyer' | 'Seller'
export type IdType = 'National ID' | 'Passport' | 'Residence Card'
export type TransactionType = 'Income' | 'Expense'
export type PlateStatus = 'No Plate' | 'Temporary' | 'Registered'
export type FuelType = 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric'
export type Transmission = 'Automatic' | 'Manual' | 'CVT' | 'DCT'

/* ─── Branch ─────────────────────────────────────────────────────────────── */

export interface Branch {
  id: number
  name: string
  is_main: boolean
  created_at: string
}

/* ─── User ───────────────────────────────────────────────────────────────── */

export interface User {
  id: number
  username: string
  role: UserRole
  role_label?: string
  branch_id: number | null
  can_access_all_branches: boolean
  is_active_user: boolean
  branch?: Branch
  created_at: string
}

/* ─── Vehicle ────────────────────────────────────────────────────────────── */

export interface CarPhoto {
  id: number
  car_id: number
  filename: string
  uploaded_at: string
}

export interface Car {
  id: number
  branch_id: number | null
  brand: string
  model: string
  manufacturing_year: number
  trim: string | null
  condition: CarCondition
  color: string
  vin: string
  plate_number: string
  plate_status: PlateStatus | null
  mileage: number
  engine_size: string | null
  cylinders: number | null
  transmission: Transmission | null
  fuel_type: FuelType | null
  import_country: string | null
  seat_count: number | null
  seat_material: string | null
  purchase_price: number
  selling_price: number | null
  currency: Currency
  status: CarStatus
  notes: string | null
  created_at: string
  photos: CarPhoto[]
  branch?: Branch
}

/* ─── Customer ───────────────────────────────────────────────────────────── */

export interface CustomerDocument {
  id: number
  customer_id: number
  document_type: 'id_front' | 'id_back' | 'document_photo'
  filename: string
  original_filename: string | null
  uploaded_at: string
}

export interface Customer {
  id: number
  branch_id: number | null
  name: string
  full_name: string | null
  phone: string
  address: string | null
  id_type: IdType | null
  id_number: string
  id_issue_date: string | null
  id_expiry_date: string | null
  nationality: string | null
  date_of_birth: string | null
  customer_type: CustomerType
  notes: string | null
  created_at: string
  documents: CustomerDocument[]
  branch?: Branch
}

/* ─── Sales & Purchases ──────────────────────────────────────────────────── */

export interface Payment {
  id: number
  branch_id: number | null
  payment_type: 'sale' | 'purchase' | 'installment'
  sale_id: number | null
  purchase_id: number | null
  installment_schedule_id: number | null
  amount: number
  currency: Currency
  payment_method: PaymentMethod | null
  notes: string | null
  payment_date: string
  created_at: string
}

export interface Sale {
  id: number
  branch_id: number | null
  invoice_number: string
  car_id: number
  buyer_id: number
  selling_price: number
  discount: number
  paid_amount: number
  remaining_amount: number
  currency: Currency
  payment_method: PaymentMethod
  status: SaleStatus
  cancel_reason: string | null
  cancelled_at: string | null
  sale_date: string
  created_at: string
  car?: Car
  buyer?: Customer
  payments?: Payment[]
  branch?: Branch
}

export interface Purchase {
  id: number
  branch_id: number | null
  invoice_number: string
  car_id: number
  seller_id: number
  purchase_price: number
  paid_amount: number
  remaining_amount: number
  currency: Currency
  payment_method: PaymentMethod
  status: SaleStatus
  cancel_reason: string | null
  cancelled_at: string | null
  purchase_date: string
  created_at: string
  car?: Car
  seller?: Customer
  payments?: Payment[]
  branch?: Branch
}

/* ─── Installments ───────────────────────────────────────────────────────── */

export interface InstallmentSchedule {
  id: number
  branch_id: number | null
  installment_plan_id: number
  installment_number: number
  due_date: string
  amount: number
  paid_amount: number
  remaining_amount: number
  currency: Currency
  status: ScheduleStatus
  payment_date: string | null
  created_at: string
}

export interface InstallmentPlan {
  id: number
  branch_id: number | null
  sale_id: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: Currency
  number_of_months: number | null
  installment_start_date: string
  installment_due_day: number
  installment_amount: number
  notes: string | null
  status: InstallmentStatus
  created_at: string
  schedules?: InstallmentSchedule[]
  sale?: Sale
  branch?: Branch
}

/* ─── Accounting ─────────────────────────────────────────────────────────── */

export interface Expense {
  id: number
  branch_id: number | null
  title: string
  amount: number
  currency: Currency
  category: string | null
  notes: string | null
  expense_date: string
  created_at: string
}

export interface Transaction {
  id: number
  branch_id: number | null
  transaction_type: TransactionType
  amount: number
  currency: Currency
  description: string | null
  created_at: string
}

export interface ExchangeRate {
  id: number
  rate: number
  source: 'online' | 'manual'
  updated_at: string
  updated_by: string | null
}

/* ─── Dashboard / API Responses ──────────────────────────────────────────── */

export interface DashboardStats {
  available_cars: number
  sold_cars: number
  reserved_cars?: number
  customers: number
  sales: number
  purchases: number
  installments: number
  cashbox_balance: number
  cashbox_currency?: string
  overdue_installments?: number
  total_sales_amount?: number
  total_purchases_amount?: number
  overdue_amount?: number
  receivables?: number
  today_payments?: number
  monthly_sales_paid?: number
  monthly_purchases_paid?: number
  monthly_profit?: number
  inventory_value?: number
  payables?: number
  annual_profit?: number
  cars_sold_month?: number
  installment_summary?: {
    total_receivables: number
    overdue_amount: number
    due_today_amount: number
    due_tomorrow_amount: number
    due_in_2_days_amount: number
    due_in_7_days_amount: number
    overdue_count: number
    due_today_count: number
    due_tomorrow_count: number
    due_in_2_days_count: number
    due_in_7_days_count: number
  }
  monthly_summary?: {
    sales_paid: number
    purchases_paid: number
    profit: number
  }
}

export interface Notification {
  id: number
  customer_name: string
  car_name: string
  invoice_number: string
  amount: number
  currency: Currency
  due_date: string
  status: ScheduleStatus
  days_until_due?: number
}

export interface AuditLog {
  id: number
  user_id: number | null
  action: string
  entity_type: string | null
  entity_id: number | null
  details: string | null
  created_at: string
  user?: User
}

/* ─── Auth ───────────────────────────────────────────────────────────────── */

export interface AuthResponse {
  user: User & { permissions: string[] }
  branches: Branch[]
  active_branch: Branch | null
}

export interface ApiError {
  error: string
  message?: string
}
