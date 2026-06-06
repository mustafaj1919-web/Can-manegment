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
  const qs = new URLSearchParams()
  if (params?.type)     qs.set('type',     params.type)
  if (params?.page)     qs.set('page',     String(params.page))
  if (params?.per_page) qs.set('per_page', String(params.per_page))
  return get<VouchersResponse>(`/vouchers${qs.toString() ? '?' + qs.toString() : ''}`)
}

export function createVoucher(data: CreateVoucherPayload): Promise<Voucher> {
  return post<Voucher>('/vouchers', data)
}

export function cancelVoucher(id: number): Promise<{ cancelled: Voucher; reversal: Voucher }> {
  return post<{ cancelled: Voucher; reversal: Voucher }>(`/vouchers/${id}/cancel`, {})
}

export function getCashboxMovement(params?: {
  account_code?: string; start_date?: string; end_date?: string
}): Promise<MovementReport> {
  const qs = new URLSearchParams()
  if (params?.account_code) qs.set('account_code', params.account_code)
  if (params?.start_date)   qs.set('start_date',   params.start_date)
  if (params?.end_date)     qs.set('end_date',      params.end_date)
  return get<MovementReport>(`/reports/cashbox-movement${qs.toString() ? '?' + qs.toString() : ''}`)
}

export function getBankMovement(params?: {
  account_code?: string; start_date?: string; end_date?: string
}): Promise<MovementReport> {
  const qs = new URLSearchParams()
  if (params?.account_code) qs.set('account_code', params.account_code)
  if (params?.start_date)   qs.set('start_date',   params.start_date)
  if (params?.end_date)     qs.set('end_date',      params.end_date)
  return get<MovementReport>(`/reports/bank-movement${qs.toString() ? '?' + qs.toString() : ''}`)
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

export function getCashDashboard(): Promise<CashDashboard> {
  return get<CashDashboard>('/cash-dashboard')
}
