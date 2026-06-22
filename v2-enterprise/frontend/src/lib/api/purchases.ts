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
  id: string
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
  seller_id: string
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
  if (params.date_from) qs.set('date_from', params.date_from.length === 10 ? params.date_from + 'T00:00:00Z' : params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to.length   === 10 ? params.date_to   + 'T23:59:59Z' : params.date_to)
  if (params.method)    qs.set('method',    params.method)
  const res = await get<any>(`/Purchases?${qs.toString()}`)
  if (res && res.success && res.data) {
    const data = res.data
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params.page ?? 1,
        per_page: params.per_page ?? 25
      }
    }
    return data
  }
  return res
}

export async function getPurchaseById(id: number | string): Promise<PurchaseDetail> {
  return get<PurchaseDetail>(`/Purchases/${id}`)
}

export async function createPurchase(payload: CreatePurchasePayload): Promise<{ id: number | string; invoice_number: string }> {
  const methodMap: Record<string, number> = { Cash: 1, Bank: 2, 'Bank transfer': 2, Cheque: 3 }
  const paidAmount = payload.paid_amount != null && payload.paid_amount >= 0 ? payload.paid_amount : payload.purchase_price
  const body = {
    SupplierId: payload.seller_id,
    PurchaseCost: payload.purchase_price,
    PaidAmount: paidAmount,
    PaymentMethod: methodMap[payload.payment_method] ?? 1,
    Brand: payload.brand,
    Model: payload.model,
    ChassisNumber: payload.vin,
    Color: payload.color,
    Year: payload.manufacturing_year,
    TargetSellingPrice: payload.purchase_price,
  }
  const res = await post<any>('/Purchases', body)
  return {
    id: res.purchaseId ?? '',
    invoice_number: res.purchaseId ? `PUR-${String(res.purchaseId).substring(0, 8)}` : ''
  }
}

export async function getSellers(): Promise<SellerOption[]> {
  // البائعون (الموردون) مصدرهم جدول Suppliers وليس Customers.
  const data = await get<any>('/Suppliers?per_page=200')
  const rows = (data && data.success && data.data)
    ? (Array.isArray(data.data) ? data.data : (data.data.items ?? []))
    : (data?.items ?? [])
  return rows
}

export interface CreateSupplierPayload {
  name: string
  phone: string
  address?: string
  notes?: string
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<{ id: string }> {
  const body = {
    Name: payload.name,
    // كود فريد يُولَّد تلقائيًا (الباكيند يتطلب كودًا غير فارغ)
    Code: `SUP-${Date.now().toString(36).toUpperCase()}`,
    Phone: payload.phone,
    Address: payload.address,
    Notes: payload.notes,
  }
  const res = await post<any>('/Suppliers', body)
  return { id: res.supplierId ?? res.id ?? '' }
}

/* ─── Cancel Purchase ────────────────────────────────────────────────────── */

export interface CancelPurchaseResponse {
  id: number | string
  status: 'Cancelled'
  cancel_reason: string
}

export async function cancelPurchase(
  id: number | string,
  payload: { cancel_reason?: string } = {},
): Promise<CancelPurchaseResponse> {
  return Promise.reject(new Error('إلغاء فواتير الشراء غير متاح حالياً'))
}

/* ─── Additional Purchase Payment ───────────────────────────────────────── */

export interface AddPurchasePaymentPayload {
  amount: number
  payment_method: string
  notes?: string
}

export interface AddPurchasePaymentResponse {
  payment_id: number | string
  paid_amount: number
  remaining_amount: number
}

export async function addPurchasePayment(
  id: number | string,
  payload: AddPurchasePaymentPayload,
): Promise<AddPurchasePaymentResponse> {
  const body = {
    Amount: payload.amount,
    PaymentMethod: payload.payment_method,
    Notes: payload.notes,
  }
  const res = await post<any>(`/Purchases/${id}/payment`, body)
  return {
    payment_id: res.payment_id ?? '',
    paid_amount: res.paid_amount ?? 0,
    remaining_amount: res.remaining_amount ?? 0,
  }
}
