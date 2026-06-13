import { get, post } from './client'

export type VoucherType = 'receipt' | 'payment' | 'transfer'

export interface Voucher {
  id: number
  voucher_type: VoucherType
  voucher_number: string
  voucher_date: string | null
  debit_account_code: string | null
  debit_account_name: string | null
  credit_account_code: string | null
  credit_account_name: string | null
  amount: number
  currency: string
  description: string | null
  status: 'posted' | 'cancelled'
  journal_entry_id: number | null
  reversal_of_id: number | null
  created_by: string | null
  created_at: string | null
}

export interface VouchersResponse {
  total: number
  page: number
  per_page: number
  items: Voucher[]
}

export interface CreateVoucherPayload {
  voucher_type: VoucherType
  voucher_date: string
  debit_account_code: string
  credit_account_code: string
  amount: number
  currency: string
  description?: string
}

export interface MovementRow {
  date: string | null
  journal_ref: string | null
  voucher_number: string | null
  description: string | null
  inflow: number
  outflow: number
  balance: number
}

export interface MovementReport {
  account_code: string
  account_name: string
  rows: MovementRow[]
  total_inflow: number
  total_outflow: number
  final_balance: number
}

export interface CashboxCloseRecord {
  id: number
  close_date: string | null
  account_code: string | null
  account_name: string | null
  system_balance: number
  actual_balance: number
  difference: number
  note: string | null
  closed_by: string | null
  created_at: string | null
}

export interface CashDashboard {
  cashbox_balance_iqd: number
  bank_balance_iqd: number
  today_inflow_iqd: number
  today_outflow_iqd: number
  last_close: { date: string; difference: number; note: string | null } | null
  cash_accounts: Array<{ code: string; name: string; balance: number }>
  bank_accounts: Array<{ code: string; name: string; balance: number }>
}

export function getVouchers(params?: {
  type?: VoucherType; page?: number; per_page?: number
}): Promise<VouchersResponse> {
  return Promise.resolve({
    total: 0,
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 25,
    items: []
  })
}

export function createVoucher(data: CreateVoucherPayload): Promise<Voucher> {
  return Promise.reject(new Error('إنشاء السندات غير متاح حالياً'))
}

export function cancelVoucher(id: number | string): Promise<{ cancelled: Voucher; reversal: Voucher }> {
  return Promise.reject(new Error('إلغاء السندات غير متاح حالياً'))
}

export function getCashboxMovement(params?: {
  account_code?: string; start_date?: string; end_date?: string
}): Promise<MovementReport> {
  return Promise.resolve({
    account_code: params?.account_code ?? '',
    account_name: '',
    rows: [],
    total_inflow: 0,
    total_outflow: 0,
    final_balance: 0
  })
}

export function getBankMovement(params?: {
  account_code?: string; start_date?: string; end_date?: string
}): Promise<MovementReport> {
  return Promise.resolve({
    account_code: params?.account_code ?? '',
    account_name: '',
    rows: [],
    total_inflow: 0,
    total_outflow: 0,
    final_balance: 0
  })
}

export function getCashboxCloses(accountCode?: string): Promise<CashboxCloseRecord[]> {
  const qs = accountCode ? `?account_code=${accountCode}` : ''
  return get<CashboxCloseRecord[]>(`/cashbox-closes${qs}`)
}

export function createCashboxClose(data: {
  account_code: string; actual_balance: number; note?: string
}): Promise<CashboxCloseRecord> {
  return post<CashboxCloseRecord>('/cashbox-closes', data)
}

export function getCurrentBalance(accountCode: string): Promise<{ account_code: string; account_name: string; balance: number }> {
  return get(`/cashbox-closes/current-balance?account_code=${accountCode}`)
}

export async function getCashDashboard(): Promise<CashDashboard> {
  // نظرًا لعدم توفر لوحة نقدية بالخلفية، نقوم بحساب الأرصدة من إغلاقات الصندوق المتاحة
  try {
    const closes = await getCashboxCloses()
    const latest = closes[0]
    return {
      cashbox_balance_iqd: latest?.actual_balance ?? 0,
      bank_balance_iqd: 0,
      today_inflow_iqd: 0,
      today_outflow_iqd: 0,
      last_close: latest ? {
        date: latest.close_date ?? '',
        difference: latest.difference,
        note: latest.note
      } : null,
      cash_accounts: latest ? [{ code: latest.account_code ?? '111001', name: latest.account_name ?? 'الصندوق الرئيسي', balance: latest.actual_balance }] : [],
      bank_accounts: []
    }
  } catch {
    return {
      cashbox_balance_iqd: 0,
      bank_balance_iqd: 0,
      today_inflow_iqd: 0,
      today_outflow_iqd: 0,
      last_close: null,
      cash_accounts: [],
      bank_accounts: []
    }
  }
}
