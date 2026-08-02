export interface EligibleAccount {
  id: string
  code: string
  name: string
  accountType: 'Cashbox' | 'Bank'
  currency: string
  isDefault: boolean
}

export interface InstallmentPlanSummaryItem {
  id: string
  sale_id?: string | null
  purchase_id?: string | null
  plan_type: 'sale' | 'purchase'
  invoice_number?: string | null
  car_name?: string | null
  buyer_id?: string | null
  buyer_name?: string | null
  buyer_phone?: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: string
  number_of_months: number
  installment_amount: number
  next_due_date?: string | null
  next_due_amount?: number
  schedule_count: number
  paid_schedule_count: number
  partial_count: number
  unpaid_count: number
  overdue_count: number
  status: 'Active' | 'Paid' | 'Cancelled' | string
}

export interface InstallmentScheduleItem {
  id: string
  installment_number: number
  due_date: string
  amount: number
  paid_amount: number
  remaining_amount: number
  currency: string
  status: 'Pending' | 'Paid' | 'PartiallyPaid' | 'Overdue' | 'Cancelled' | string
  payment_date?: string | null
}

export interface InstallmentPlanDetail {
  id: string
  sale_id?: string | null
  purchase_id?: string | null
  plan_type: 'sale' | 'purchase'
  branch_id: string
  notes?: string | null
  invoice_number?: string | null
  car_name?: string | null
  buyer_name?: string | null
  buyer_phone?: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: string
  number_of_months: number
  installment_amount: number
  installment_start_date?: string
  status: 'Active' | 'Paid' | 'Cancelled' | string
  schedules: InstallmentScheduleItem[]
  payments: Array<{
    id: string
    amount: number
    currency: string
    payment_method: string
    payment_date: string
    notes?: string | null
  }>
  customer_statement?: {
    customer_id: string
    customer_name: string
    plans_count: number
    total_amount: number
    paid_amount: number
    remaining_amount: number
    overdue_amount: number
    currency: string
  } | null
}

export interface PaySchedulePayload {
  amount: number
  paymentMethod: 'Cash' | 'Bank' | string
  accountId?: string | null
  idempotencyKey?: string | null
  notes?: string | null
}

export interface PaymentResultData {
  success: boolean
  paymentId: string
  receiptId: string
  receiptNumber: string
  idempotencyKey: string
  financialStatus: string
  accountingStatus: string
  receiptStatus: string
  archiveStatus: string
  postedAmount: number
  currency: string
  totalPaid: number
  remainingBalance: number
  paidInstallmentCount: number
  remainingInstallmentCount: number
  journalEntryId?: string | null
  createdAt: string
}

export interface DigitalReceiptData {
  payment: {
    id: string
    amount: number
    currency: string
    status: string
    payment_method: string
    payment_date: string
    created_at: string
    reference_number: string
    notes?: string | null
  }
  schedule?: {
    installment_number: number
  } | null
  sale?: {
    invoice_number: string
    sale_date?: string
  } | null
  customer?: {
    id: string
    name: string
    phone?: string
    national_id?: string
  } | null
  car?: {
    brand?: string
    model?: string
    year?: number
    vin?: string
    plate_number?: string
    color?: string
  } | null
  journal_entry_number?: string | null
  cancellation_reason?: string | null
}

export function normalizeMoneyInput(raw: string): number {
  if (!raw) return 0
  // Convert Arabic numerals to Western
  const arabicToWestern: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  }
  const westernStr = raw.replace(/[٠-٩]/g, (w) => arabicToWestern[w] || w)
  const cleaned = westernStr.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function formatMoney(amount: number, currency: string = 'IQD'): string {
  const formatted = Math.round(amount).toLocaleString('en-US')
  return `${formatted} ${currency}`
}
