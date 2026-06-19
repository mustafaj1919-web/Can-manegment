import { get, post, put } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type CustomerDocumentType =
  | 'id_front'
  | 'id_back'
  | 'residence_card'
  | 'passport'
  | 'document_photo'

export const DOCUMENT_SLOTS: { type: CustomerDocumentType; label: string; required: boolean; multiple: boolean }[] = [
  { type: 'id_front',       label: 'وجه الهوية (أمامي)',     required: false, multiple: false },
  { type: 'id_back',        label: 'ظهر الهوية (خلفي)',      required: false, multiple: false },
  { type: 'residence_card', label: 'بطاقة السكن',             required: false, multiple: false },
  { type: 'passport',       label: 'جواز السفر',              required: false, multiple: false },
  { type: 'document_photo', label: 'مستمسكات أخرى',           required: false, multiple: true  },
]

export const DOC_TYPE_LABEL: Record<CustomerDocumentType, string> = {
  id_front:       'وجه الهوية',
  id_back:        'ظهر الهوية',
  residence_card: 'بطاقة السكن',
  passport:       'جواز السفر',
  document_photo: 'مستمسك آخر',
}

export interface CustomerDocument {
  id: number
  document_type: CustomerDocumentType
  filename: string
  original_filename: string | null
  uploaded_at: string | null
}

export interface Customer {
  id: number
  name: string
  full_name?: string | null
  phone?: string | null
  address: string | null
  id_type: string | null
  id_number?: string | null
  id_issue_date?: string | null
  id_expiry_date?: string | null
  nationality?: string | null
  date_of_birth?: string | null
  customer_type: 'Individual' | 'Company'
  notes?: string | null
  branch_id?: number | null
  branch?: { id: number; name: string; is_main: boolean; created_at?: string } | null
  created_at: string | null
  documents_count?: number
  sales_count?: number
  purchases_count?: number
  documents?: CustomerDocument[]
}

export interface CustomersListResponse {
  total: number
  page: number
  per_page: number
  items: Customer[]
}

export interface CustomerPayload {
  name: string
  phone: string
  id_number: string
  customer_type: 'Individual' | 'Company'
  address?: string
  id_type?: string
  id_issue_date?: string
  id_expiry_date?: string
  nationality?: string
  date_of_birth?: string
  notes?: string
}

/* ─── Backend → Frontend field mapper ───────────────────────────────────── */

function mapCustomerFromBackend(c: any): Customer {
  return {
    id:             c.id             ?? c.Id             ?? '',
    name:           c.name           ?? c.Name           ?? '',
    full_name:      c.fullName       ?? c.full_name      ?? c.FullName ?? null,
    phone:          c.phone          ?? c.Phone          ?? null,
    address:        c.address        ?? c.Address        ?? null,
    id_type:        c.idType         ?? c.id_type        ?? null,
    id_number:      c.idNumber       ?? c.id_number      ?? '',
    id_issue_date:  c.idIssueDate    ?? c.id_issue_date  ?? null,
    id_expiry_date: c.idExpiryDate   ?? c.id_expiry_date ?? null,
    nationality:    c.nationality    ?? c.Nationality    ?? null,
    date_of_birth:  c.dateOfBirth    ?? c.date_of_birth  ?? null,
    customer_type:  (c.customerType  ?? c.customer_type  ?? 'Individual') as 'Individual' | 'Company',
    notes:          c.notes          ?? c.Notes          ?? null,
    branch_id:      c.branchId       ?? c.branch_id      ?? null,
    created_at:     c.createdAt      ?? c.created_at     ?? null,
    documents_count: c.documentsCount ?? c.documents_count ?? 0,
    sales_count:    c.salesCount     ?? c.sales_count    ?? 0,
    documents:      c.documents      ?? [],
  }
}

/* ─── API functions ──────────────────────────────────────────────────────── */

export async function getCustomers(params: {
  page?: number; per_page?: number; search?: string; customer_type?: string
} = {}): Promise<CustomersListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.search)        qs.set('search',        params.search)
  if (params.customer_type) qs.set('customer_type', params.customer_type)
  const res = await get<any>(`/Customers?${qs.toString()}`)
  if (res && res.success && res.data) {
    const data = res.data
    if (Array.isArray(data)) {
      return {
        items: data.map(mapCustomerFromBackend),
        total:    res.total    ?? data.length,
        page:     res.page     ?? params.page     ?? 1,
        per_page: res.per_page ?? params.per_page ?? 25,
      }
    }
    return data
  }
  return res
}

export async function getCustomerById(id: number | string): Promise<Customer> {
  try {
    const res = await get<any>(`/Customers/${id}`)
    if (res && res.success && res.data) {
      return mapCustomerFromBackend(res.data)
    }
    return mapCustomerFromBackend(res)
  } catch {
    return Promise.reject(new Error('العميل غير موجود'))
  }
}

/* ─── Customer Statement ────────────────────────────────────────────────── */

export interface StatementSchedule {
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

export interface StatementPayment {
  id: number
  amount: number
  currency: 'USD' | 'IQD'
  payment_method: string | null
  payment_date: string | null
  payment_type: string | null
  notes: string | null
}

export interface StatementInstallmentPlan {
  id: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: 'USD' | 'IQD'
  number_of_months: number | null
  installment_amount: number
  status: 'Active' | 'Paid'
  overdue_amount: number
  schedules: StatementSchedule[]
}

export interface StatementSaleItem {
  id: number
  invoice_number: string
  sale_date: string | null
  car_name: string | null
  car_vin: string | null
  selling_price: number
  currency: 'USD' | 'IQD'
  paid_amount: number
  remaining_amount: number
  payment_method: string
  status: string
  has_installment: boolean
  installment_plan: StatementInstallmentPlan | null
  payments: StatementPayment[]
}

export interface CustomerStatementSummary {
  sales_count: number
  total_sales_amount: number
  total_paid_amount: number
  total_remaining: number
  total_overdue: number
  last_payment_date: string | null
  currency: 'IQD'
}

export interface CustomerStatement {
  customer: { id: number; name: string; phone: string | null; customer_type: string }
  summary: CustomerStatementSummary
  sales: StatementSaleItem[]
}

export async function getCustomerStatement(id: number | string): Promise<CustomerStatement> {
  const res = await get<any>(`/Customers/${id}/statement`)
  if (res && res.success && res.data) {
    return res.data
  }
  return res
}

// تحويل حقول الفورم (snake_case) إلى حقول الأمر في الباكيند (PascalCase).
// ملاحظة: .NET يطابق الأسماء دون حساسية لحالة الأحرف لكنه لا يفهم snake_case.
function mapCustomerBody(payload: CustomerPayload) {
  return {
    Name: payload.name,
    FullName: payload.name,
    Phone: payload.phone,
    IdNumber: payload.id_number,
    IdType: payload.id_type || null,
    Address: payload.address || null,
    IdIssueDate: payload.id_issue_date || null,
    IdExpiryDate: payload.id_expiry_date || null,
    Nationality: payload.nationality || null,
    DateOfBirth: payload.date_of_birth || null,
    CustomerType: (payload.customer_type === 'Individual' || (payload.customer_type as string) === 'Buyer') ? 'Individual' : 'Company', // Individual | Company
    Notes: payload.notes || null,
  }
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const res = await post<any>('/Customers', mapCustomerBody(payload))
  if (res && res.success) {
    return {
      id: res.customerId,
      ...payload
    } as any
  }
  return res
}

export async function updateCustomer(id: number | string, payload: CustomerPayload): Promise<Customer> {
  const res = await put<any>(`/Customers/${id}`, mapCustomerBody(payload))
  if (res && res.success) {
    return { id: res.customerId ?? id, ...payload } as any
  }
  return res
}

export async function getCustomerDocuments(customerId: number | string): Promise<CustomerDocument[]> {
  const res = await get<any>(`/Customers/${customerId}/documents`)
  if (res && res.success && Array.isArray(res.data)) {
    return res.data.map((d: any) => ({
      id:                d.id ?? d.Id,
      document_type:     d.document_type ?? d.documentType ?? '',
      filename:          d.filename ?? d.FileName ?? '',
      original_filename: d.original_filename ?? d.originalFileName ?? null,
      uploaded_at:       d.uploaded_at ?? d.uploadedAt ?? null,
    }))
  }
  return []
}

export async function deleteCustomerDocument(customerId: number | string, docId: number | string): Promise<void> {
  const { apiClient } = await import('./client')
  await apiClient.delete(`/Customers/${customerId}/documents/${docId}`)
}

export function getDocumentUrl(filename: string): string {
  return `/api/Customers/documents/${filename}`
}

export async function uploadCustomerDocument(
  customerId: number | string,
  documentType: CustomerDocumentType,
  file: File
): Promise<CustomerDocument> {
  const formData = new FormData()
  formData.append('documentType', documentType) // ASP.NET Core parameters are camelCase/PascalCase
  formData.append('file', file)
  const { apiClient } = await import('./client')
  const response = await apiClient.post<any>(
    `/Customers/${customerId}/documents`,
    formData,
  )
  if (response.data && response.data.success) {
    return {
      id: response.data.documentId,
      document_type: documentType,
      filename: file.name,
      original_filename: file.name,
      uploaded_at: new Date().toISOString()
    }
  }
  return response.data
}

/* ─── Scanner API ─────────────────────────────────────────────────────────── */

export interface ScannerStatus {
  pywin32_available: boolean
  wia_available: boolean
  scanners_detected: number
  devices: Array<{ name: string; type: number; is_scanner: boolean }>
  error: string | null
}

export type ScanResult =
  | { success: true; data: string; mime_type: string; filename: string; size: number }
  | { error: 'scan_cancelled' }
  | { error: 'scanner_unavailable' | 'no_scanner' | 'scan_failed' | 'scan_busy' | 'scan_too_large'; message?: string; size?: number }

export async function getScannerStatus(): Promise<ScannerStatus> {
  return Promise.resolve({
    pywin32_available: false,
    wia_available: false,
    scanners_detected: 0,
    devices: [],
    error: 'الماسح الضوئي غير متصل'
  })
}

export async function scanDocument(): Promise<ScanResult> {
  return Promise.resolve({
    error: 'no_scanner',
    message: 'الماسح الضوئي غير متاح'
  })
}

export async function checkScannerAvailable(): Promise<{ available: boolean; scanner_count?: number; pywin32?: boolean; reason?: string | null }> {
  return Promise.resolve({
    available: false,
    scanner_count: 0,
    pywin32: false,
    reason: 'الماسح الضوئي غير متاح'
  })
}
