import { get, post, put, del } from './client'

export interface Supplier {
  id: string
  name: string
  code: string
  phone: string
  address: string | null
  notes: string | null
  account_id: string
  account_code: string
  branch_id: string
  is_active: boolean
}

export interface SupplierDetail extends Supplier {
  purchases_count: number
  total_purchased: number
}

export interface SuppliersListResponse {
  success: boolean
  total: number
  page: number
  per_page: number
  data: Supplier[]
}

export interface CreateSupplierPayload {
  name: string
  phone: string
  address?: string
  notes?: string
}

export interface UpdateSupplierPayload {
  name?: string
  phone?: string
  address?: string | null
  notes?: string | null
}

export interface BulkVehicleOverride {
  color?: string
  plateNumber?: string
  notes?: string
  targetSellingPrice?: number
}

export interface BulkPurchasePayload {
  supplierId: string
  brand?: string
  model: string
  year: number
  color?: string
  purchaseCost: number
  paidAmount: number  // 0 = full credit on supplier account
  targetSellingPrice: number
  paymentMethod: 'Cash' | 'Bank' | 'Cheque'
  chassisNumbers: string[]
  vehicleOverrides?: Record<string, BulkVehicleOverride>
}

export interface BulkPurchaseResult {
  success: boolean
  created_count: number
  purchase_ids: string[]
  errors: string[]
  message: string
  chassis_to_vehicle_id?: Record<string, string>
}

export async function getSuppliers(params: { page?: number; per_page?: number; search?: string } = {}): Promise<SuppliersListResponse> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.search) qs.set('search', params.search)
  return get<SuppliersListResponse>(`/Suppliers?${qs.toString()}`)
}

export async function getSupplier(id: string): Promise<{ success: boolean; data: SupplierDetail }> {
  return get<{ success: boolean; data: SupplierDetail }>(`/Suppliers/${id}`)
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<{ success: boolean; supplierId: string }> {
  const body = {
    Name: payload.name,
    Code: `SUP-${Date.now().toString(36).toUpperCase()}`,
    Phone: payload.phone,
    Address: payload.address ?? null,
    Notes: payload.notes ?? null,
  }
  return post<any>('/Suppliers', body)
}

export async function updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<{ success: boolean }> {
  return put<any>(`/Suppliers/${id}`, payload)
}

export async function deleteSupplier(id: string): Promise<{ success: boolean }> {
  return del<any>(`/Suppliers/${id}`)
}

export async function paySupplier(id: string, payload: { amount: number; paymentMethod: string; creditAccountCode?: string; notes?: string }): Promise<{ success: boolean; paymentId: string }> {
  const methodMap: Record<string, number> = { Cash: 1, Bank: 2, Cheque: 3 }
  const body = {
    SupplierId: id,
    Amount: payload.amount,
    PaymentMethod: methodMap[payload.paymentMethod] ?? 1,
    CreditAccountCode: payload.creditAccountCode ?? (payload.paymentMethod === 'Bank' ? '112001' : '111001'),
    Notes: payload.notes ?? null,
  }
  return post<any>(`/Suppliers/${id}/pay`, body)
}

export async function bulkCreatePurchase(payload: BulkPurchasePayload): Promise<BulkPurchaseResult> {
  const methodMap: Record<string, number> = { Cash: 1, Bank: 2, Cheque: 3 }
  const body = {
    SupplierId: payload.supplierId,
    PurchaseCost: payload.purchaseCost,
    PaymentMethod: methodMap[payload.paymentMethod] ?? 1,
    Brand: payload.brand ?? null,
    Model: payload.model,
    Color: payload.color ?? null,
    Year: payload.year,
    TargetSellingPrice: payload.targetSellingPrice,
    ChassisNumbers: payload.chassisNumbers,
    PaidAmount: payload.paidAmount,
    VehicleOverrides: payload.vehicleOverrides
      ? Object.fromEntries(
          Object.entries(payload.vehicleOverrides).map(([vin, o]) => [
            vin,
            {
              Color: o.color ?? null,
              PlateNumber: o.plateNumber ?? null,
              Notes: o.notes ?? null,
              TargetSellingPrice: o.targetSellingPrice ?? null,
            },
          ])
        )
      : null,
  }
  const res = await post<any>('/Purchases/bulk', body)
  return {
    success: res.success ?? true,
    created_count: res.createdCount ?? res.created_count ?? 0,
    purchase_ids: res.purchaseIds ?? res.purchase_ids ?? [],
    errors: res.errors ?? [],
    message: res.message ?? '',
    chassis_to_vehicle_id: res.chassisToVehicleId ?? res.chassis_to_vehicle_id ?? {},
  } satisfies BulkPurchaseResult
}

// ─── Supplier Ledger ─────────────────────────────────────────────────────────

export interface SupplierLedgerEntry {
  date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  running_balance: number
  reference_type: string
}

export interface SupplierLedger {
  supplier: { id: string; name: string; phone: string; account_id: string }
  period: { from: string; to: string }
  summary: { total_debit: number; total_credit: number; balance: number; unpaid_purchases: number }
  entries: SupplierLedgerEntry[]
}

export async function getSupplierLedger(id: string, from?: string, to?: string): Promise<SupplierLedger | null> {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to)   qs.set('to', to)
  try {
    const res = await get<any>(`/Suppliers/${id}/ledger${qs.toString() ? `?${qs.toString()}` : ''}`)
    return res ?? null
  } catch {
    return null
  }
}
