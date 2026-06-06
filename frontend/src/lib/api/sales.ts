import { get, post } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface SaleListItem {
  id: number
  invoice_number: string
  branch_id?: number | null
  branch?: { id: number; name: string; is_main: boolean; created_at?: string } | null
  car_id: number | null
  buyer_id: number | null
  car_name: string | null
  car_vin: string | null
  buyer_name: string | null
  buyer_phone: string | null
  selling_price: number
  discount: number
  paid_amount: number
  remaining_amount: number
  currency: 'USD' | 'IQD'
  payment_method: string
  status: 'Active' | 'Cancelled'
  has_installment: boolean
  sale_date: string | null
  created_at: string | null
}

export interface SaleDetail extends SaleListItem {
  cancel_reason: string | null
  cancelled_at: string | null
  sales_rep_id: number | null
  sales_rep_name: string | null
  sales_rep_phone: string | null
  sales_rep_id_number: string | null
  sales_rep_title: string | null
  sales_rep_address: string | null
  car: {
    id: number
    brand: string
    model: string
    manufacturing_year: number
    trim: string | null
    color: string
    vin: string
    plate_number: string
    status: string
  } | null
  buyer: {
    id: number
    name: string
    phone: string
    address: string | null
    id_type: string | null
    id_number: string
  } | null
  payments: Array<{
    id: number
    amount: number
    currency: 'USD' | 'IQD'
    payment_method: string | null
    payment_date: string | null
    notes: string | null
  }>
  installment_plan: InstallmentPlanEmbed | null
}

export interface InstallmentScheduleItem {
  id: number
  installment_number: number
  due_date: string | null
  amount: number
  paid_amount: number
  remaining_amount: number
  currency: 'USD' | 'IQD'
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue'
  payment_date: string | null
}

export interface InstallmentPlanEmbed {
  id: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: 'USD' | 'IQD'
  number_of_months: number | null
  installment_amount: number
  installment_start_date: string | null
  installment_due_day: number
  status: 'Active' | 'Paid'
  schedules: InstallmentScheduleItem[]
}

export interface CreateSalePayload {
  car_id: number
  buyer_id: number
  selling_price: number
  discount?: number
  paid_amount?: number
  currency: 'USD' | 'IQD'
  payment_method: string
  sale_date: string
  enable_installment?: boolean
  number_of_months?: number | null
  installment_start_date?: string | null
  installment_due_day?: number | null
  installment_notes?: string | null
}

export interface SalesListParams {
  page?: number
  per_page?: number
  status?: string
  search?: string
  date_from?: string
  date_to?: string
  method?: string
}

export interface SalesListResponse {
  total: number
  page: number
  per_page: number
  items: SaleListItem[]
}

/* ─── Car option for sale form ───────────────────────────────────────────── */

export interface CarOption {
  id: number
  brand: string
  model: string
  manufacturing_year: number
  trim: string | null
  color: string
  vin: string
  plate_number: string
  selling_price: number | null
  purchase_price: number
  currency: 'USD' | 'IQD'
  status: string
}

export interface CustomerOption {
  id: number
  name: string
  full_name: string | null
  phone: string
  id_number: string
  customer_type: string
}

/* ─── API functions ──────────────────────────────────────────────────────── */

export async function getSales(params: SalesListParams = {}): Promise<SalesListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.status)    qs.set('status',    params.status)
  if (params.search)    qs.set('search',    params.search)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to)
  if (params.method)    qs.set('method',    params.method)
  return get<SalesListResponse>(`/sales?${qs.toString()}`)
}

export async function getSaleById(id: number): Promise<SaleDetail> {
  return get<SaleDetail>(`/sales/${id}`)
}

export async function createSale(payload: CreateSalePayload): Promise<{ id: number; invoice_number: string }> {
  return post<{ id: number; invoice_number: string }>('/sales', payload)
}

export async function getAvailableCars(): Promise<CarOption[]> {
  const data = await get<{ items: CarOption[] }>('/inventory?status=Available&per_page=200')
  return data.items ?? []
}

export async function getBuyers(): Promise<CustomerOption[]> {
  const data = await get<{ items: CustomerOption[] }>('/customers?customer_type=Buyer&per_page=200')
  return data.items ?? []
}

/* ─── Cancel Sale ────────────────────────────────────────────────────────── */

export interface CancelSaleResponse {
  id: number
  status: 'Cancelled'
  cancel_reason: string
}

export async function cancelSale(
  id: number,
  payload: { cancel_reason?: string } = {},
): Promise<CancelSaleResponse> {
  return post<CancelSaleResponse>(`/sales/${id}/cancel`, payload)
}

/* ─── Additional Sale Payment ────────────────────────────────────────────── */

export interface AddSalePaymentPayload {
  amount: number
  payment_method: string
  notes?: string
}

export interface AddSalePaymentResponse {
  payment_id: number
  paid_amount: number
  remaining_amount: number
}

export async function addSalePayment(
  id: number,
  payload: AddSalePaymentPayload,
): Promise<AddSalePaymentResponse> {
  return post<AddSalePaymentResponse>(`/sales/${id}/payments`, payload)
}
