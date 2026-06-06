import { get, post } from './client'

export interface PurchaseListItem {
  id: number
  invoice_number: string
  branch_id?: number | null
  branch?: { id: number; name: string; is_main: boolean; created_at?: string } | null
  car_id: number | null
  seller_id: number | null
  car_name: string | null
  seller_name: string | null
  purchase_price: number
  paid_amount: number
  remaining_amount: number
  currency: 'USD' | 'IQD'
  payment_method: string
  status: 'Active' | 'Cancelled'
  purchase_date: string | null
}

export interface PurchaseDetail extends PurchaseListItem {
  cancel_reason: string | null
  cancelled_at: string | null
  created_at: string | null
  car: {
    id: number
    brand: string
    model: string
    manufacturing_year: number
    trim: string | null
    color: string
    vin: string
    plate_number: string
    mileage: number
    status: string
  } | null
  seller: {
    id: number
    name: string
    full_name: string | null
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
}

export interface PurchasesListResponse {
  total: number
  page: number
  per_page: number
  items: PurchaseListItem[]
}

export interface PurchasesListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  date_from?: string
  date_to?: string
  method?: string
}

export interface SellerOption {
  id: number
  name: string
  full_name?: string | null
  phone?: string | null
  id_number?: string | null
  customer_type: string
}

export interface CreatePurchasePayload {
  brand: string
  model: string
  manufacturing_year: number
  color: string
  vin: string
  plate_number: string
  mileage: number
  seller_id: number
  purchase_price: number
  paid_amount?: number
  currency: 'USD' | 'IQD'
  payment_method: string
  purchase_date: string
}

export async function getPurchases(params: PurchasesListParams = {}): Promise<PurchasesListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.search)    qs.set('search',    params.search)
  if (params.status)    qs.set('status',    params.status)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to)
  if (params.method)    qs.set('method',    params.method)
  return get<PurchasesListResponse>(`/purchases?${qs.toString()}`)
}

export async function getPurchaseById(id: number): Promise<PurchaseDetail> {
  return get<PurchaseDetail>(`/purchases/${id}`)
}

export async function createPurchase(payload: CreatePurchasePayload): Promise<{ id: number; invoice_number: string }> {
  return post<{ id: number; invoice_number: string }>('/purchases', payload)
}

export async function getSellers(): Promise<SellerOption[]> {
  const data = await get<{ items: SellerOption[] }>('/customers?customer_type=Seller&per_page=200')
  return data.items ?? []
}

/* ─── Cancel Purchase ────────────────────────────────────────────────────── */

export interface CancelPurchaseResponse {
  id: number
  status: 'Cancelled'
  cancel_reason: string
}

export async function cancelPurchase(
  id: number,
  payload: { cancel_reason?: string } = {},
): Promise<CancelPurchaseResponse> {
  return post<CancelPurchaseResponse>(`/purchases/${id}/cancel`, payload)
}

/* ─── Additional Purchase Payment ───────────────────────────────────────── */

export interface AddPurchasePaymentPayload {
  amount: number
  payment_method: string
  notes?: string
}

export interface AddPurchasePaymentResponse {
  payment_id: number
  paid_amount: number
  remaining_amount: number
}

export async function addPurchasePayment(
  id: number,
  payload: AddPurchasePaymentPayload,
): Promise<AddPurchasePaymentResponse> {
  return post<AddPurchasePaymentResponse>(`/purchases/${id}/payments`, payload)
}
