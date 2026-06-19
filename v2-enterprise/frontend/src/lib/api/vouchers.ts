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

export async function getVouchers(params?: {
  type?: VoucherType; page?: number; per_page?: number
}): Promise<VouchersResponse> {
  const qs = new URLSearchParams()
  if (params?.type)     qs.set('type', params.type)
  if (params?.page)     qs.set('page', String(params.page))
  if (params?.per_page) qs.set('per_page', String(params.per_page))
  const res = await get<any>(`/Payments${qs.toString() ? `?${qs.toString()}` : ''}`)
  const data = (res && res.success && res.data) ? res.data : res
  return {
    total: data?.total ?? 0,
    page: data?.page ?? params?.page ?? 1,
    per_page: data?.per_page ?? params?.per_page ?? 25,
    items: data?.items ?? [],
  }
}

export async function createVoucher(data: CreateVoucherPayload): Promise<Voucher> {
  const body = {
    VoucherType: data.voucher_type,
    DebitAccountCode: data.debit_account_code,
    CreditAccountCode: data.credit_account_code,
    Amount: data.amount,
    Currency: data.currency,
    Description: data.description,
  }
  const res = await post<any>('/Payments/voucher', body)
  return { id: res.voucherId, voucher_number: res.voucher_number, ...data } as any
}

export async function cancelVoucher(id: number | string): Promise<{ cancelled: Voucher; reversal: Voucher }> {
  const res = await post<any>(`/Payments/${id}/cancel`, {})
  return res as any
}

async function fetchMovement(accountCode: string, params?: { start_date?: string; end_date?: string }): Promise<MovementReport> {
  const qs = new URLSearchParams()
  qs.set('account_code', accountCode)
  if (params?.start_date) qs.set('start_date', params.start_date)
  if (params?.end_date)   qs.set('end_date', params.end_date)
  const res = await get<any>(`/Accounting/account-movement?${qs.toString()}`)
  const d = (res && res.success && res.data) ? res.data : res
  return {
    account_code: d?.account_code ?? accountCode, account_name: d?.account_name ?? '',
    rows: d?.rows ?? [], total_inflow: d?.total_inflow ?? 0, total_outflow: d?.total_outflow ?? 0, final_balance: d?.final_balance ?? 0,
  }
}

export function getCashboxMovement(params?: {
  account_code?: string; start_date?: string; end_date?: string
}): Promise<MovementReport> {
  return fetchMovement(params?.account_code || '111001', params)
}

export function getBankMovement(params?: {
  account_code?: string; start_date?: string; end_date?: string
}): Promise<MovementReport> {
  return fetchMovement(params?.account_code || '112001', params)
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
