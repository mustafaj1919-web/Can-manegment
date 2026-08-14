import { get, post } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface SaleListItem {
  id: number
  invoice_number: string
  branch_id?: number | null
  branch?: { id: any; name: string; code?: string; vat_number?: string | null; tax_name?: string | null } | null
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
  einvoice_status?: string | null
  einvoice_qr_code?: string | null
  einvoice_uuid?: string | null
  einvoice_error?: string | null
  einvoice_xml_hash?: string | null
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
  customer_vat_number?: string | null // الرقم الضريبي للعميل
  sales_rep_id?: string | null // معرف مندوب المبيعات
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
  if (params.date_from) qs.set('date_from', params.date_from.length === 10 ? params.date_from + 'T00:00:00Z' : params.date_from)
  if (params.date_to)   qs.set('date_to',   params.date_to.length   === 10 ? params.date_to   + 'T23:59:59Z' : params.date_to)
  if (params.method)    qs.set('method',    params.method)
  const res = await get<any>(`/Sales?${qs.toString()}`)
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

export async function getSaleById(id: number | string): Promise<SaleDetail> {
  return get<SaleDetail>(`/Sales/${id}`)
}

// enum الباكيند: Cash=1, Bank=2, Cheque=3, Installment=4
function mapPaymentMethod(method?: string): number {
  switch (method) {
    case 'Cash': return 1
    case 'Bank transfer':
    case 'Bank': return 2
    case 'Cheque': return 3
    case 'Installment': return 4
    default: return 1
  }
}

function resolveOwnershipPayload(payload: any) {
  let rawType = payload.ownership_type
  let rawName = payload.owner_person_name?.toString().trim() || null
  let rawPhone = payload.owner_person_phone?.toString().trim() || null
  let rawIdNum = payload.owner_person_id_number?.toString().trim() || null
  let rawSupplierId = payload.supplier_id || null

  let ownershipType = 3 // COMPANY (default المعرض نفسه)

  if (rawType === 'PERSON' || rawType === 'Person' || rawType === 1 || rawType === '1') {
    ownershipType = 1
  } else if (rawType === 'SUPPLIER' || rawType === 'Supplier' || rawType === 2 || rawType === '2') {
    ownershipType = 2
  } else if (rawType === 'COMPANY' || rawType === 'Company' || rawType === 3 || rawType === '3') {
    ownershipType = 3
  } else {
    if (rawName && rawName.length > 0) {
      ownershipType = 1 // PERSON
    } else if (rawSupplierId) {
      ownershipType = 2 // SUPPLIER
    } else {
      ownershipType = 3 // COMPANY
    }
  }

  if (ownershipType === 3) {
    return {
      OwnershipType: 3,
      OwnerPersonName: null,
      OwnerPersonPhone: null,
      OwnerPersonIdNumber: null,
      OwnerNotes: null,
      SupplierId: null,
      SupplierReference: null,
      SupplyDate: null
    }
  }

  if (ownershipType === 2) {
    return {
      OwnershipType: 2,
      OwnerPersonName: null,
      OwnerPersonPhone: null,
      OwnerPersonIdNumber: null,
      OwnerNotes: payload.owner_notes ?? null,
      SupplierId: rawSupplierId ?? null,
      SupplierReference: payload.supplier_reference ?? null,
      SupplyDate: payload.supply_date ?? null
    }
  }

  return {
    OwnershipType: 1,
    OwnerPersonName: rawName || 'مالك شخصي غير مسمى',
    OwnerPersonPhone: rawPhone,
    OwnerPersonIdNumber: rawIdNum,
    OwnerNotes: payload.owner_notes ?? null,
    SupplierId: null,
    SupplierReference: null,
    SupplyDate: null
  }
}

export async function createSale(payload: CreateSalePayload): Promise<{ id: number | string; invoice_number: string }> {
  const ownershipData = resolveOwnershipPayload(payload)

  // مطابقة الحقول لـ CreateSaleContractCommand المتوقع في الخلفية
  const body = {
    CustomerId: payload.buyer_id,
    VehicleId: payload.car_id,
    SalePrice: payload.selling_price,
    TaxAmount: 0,
    RegistrationFees: 0,
    Discount: payload.discount ?? 0,
    DownPayment: payload.paid_amount ?? 0,
    PaymentMethod: mapPaymentMethod(payload.payment_method),
    ...ownershipData,
    InstallmentPeriodMonths: payload.number_of_months ?? 0,
    CustomMonthlyInstallmentAmount: (payload as any).custom_monthly_installment_amount ?? null,
    ProfitRatePercentage: (payload as any).profit_rate ?? 0,
    InstallmentStartDate: (payload as any).installment_start_date ?? null,
    CustomerVatNumber: payload.customer_vat_number ?? null,
    SalesRepId: payload.sales_rep_id ?? null
  }
  const res = await post<any>('/Sales', body)
  return {
    id: res.contractId ?? '',
    invoice_number: res.contractId ? `INV-${String(res.contractId).substring(0, 8)}` : ''
  }
}

export async function getAvailableCars(): Promise<CarOption[]> {
  const data = await get<any>('/Inventory?status=Available&per_page=200')
  const raw: any[] = data?.success
    ? (Array.isArray(data.data) ? data.data : (data.data?.items ?? []))
    : (data?.items ?? [])

  return raw.map((v: any): CarOption => ({
    id:                v.id,
    brand:             v.brand  ?? v.model?.split(' ')[0] ?? '',
    model:             v.model  ?? '',
    manufacturing_year: v.manufacturing_year ?? v.year ?? 0,
    trim:              v.trim   ?? null,
    color:             v.color  ?? '',
    vin:               v.vin    ?? v.chassisNumber ?? v.chassis_number ?? '',
    plate_number:      v.plate_number ?? '',
    selling_price:     v.selling_price ?? v.targetSellingPrice ?? v.target_selling_price ?? null,
    purchase_price:    v.purchase_price ?? v.purchaseCost ?? v.purchase_cost ?? 0,
    currency:          v.currency ?? 'USD',
    status:            v.status  ?? '',
  }))
}

export async function getBuyers(): Promise<CustomerOption[]> {
  const data = await get<any>('/Customers?per_page=200')
  const raw: any[] = data?.success
    ? (Array.isArray(data.data) ? data.data : (data.data?.items ?? []))
    : (data?.items ?? [])
  return raw
}

/* ─── Cancel Sale ────────────────────────────────────────────────────────── */

export interface CancelSaleResponse {
  id: number | string
  status: 'Cancelled'
  cancel_reason: string
}

export async function cancelSale(
  id: number | string,
  payload: { cancel_reason?: string } = {},
): Promise<CancelSaleResponse> {
  const res = await post<any>(`/Sales/${id}/cancel`)
  return {
    id: id,
    status: 'Cancelled',
    cancel_reason: payload.cancel_reason ?? ''
  }
}

/* ─── Additional Sale Payment ────────────────────────────────────────────── */

export interface AddSalePaymentPayload {
  amount: number
  payment_method: string
  notes?: string
}

export interface AddSalePaymentResponse {
  payment_id: number | string
  paid_amount: number
  remaining_amount: number
}

export async function addSalePayment(
  id: number | string,
  payload: AddSalePaymentPayload,
): Promise<AddSalePaymentResponse> {
  return Promise.reject(new Error('إضافة دفعات العقد غير متاحة حالياً'))
}
