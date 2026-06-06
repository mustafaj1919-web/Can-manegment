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
  customer_type: 'Buyer' | 'Seller'
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
  customer_type: 'Buyer' | 'Seller'
  address?: string
  id_type?: string
  id_issue_date?: string
  id_expiry_date?: string
  nationality?: string
  date_of_birth?: string
  notes?: string
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
  return get<CustomersListResponse>(`/customers?${qs.toString()}`)
}

export async function getCustomerById(id: number): Promise<Customer> {
  return get<Customer>(`/customers/${id}`)
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

export async function getCustomerStatement(id: number): Promise<CustomerStatement> {
  return get<CustomerStatement>(`/customers/${id}/statement`)
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  return post<Customer>('/customers', payload)
}

export async function updateCustomer(id: number, payload: CustomerPayload): Promise<Customer> {
  return put<Customer>(`/customers/${id}`, payload)
}

export async function uploadCustomerDocument(
  customerId: number,
  documentType: CustomerDocumentType,
  file: File
): Promise<CustomerDocument> {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('file', file)
  const { apiClient } = await import('./client')
  const response = await apiClient.post<CustomerDocument>(
    `/customers/${customerId}/documents`,
    formData,
  )
  return response.data
}

export async function deleteCustomerDocument(
  customerId: number,
  docId: number
): Promise<void> {
  const { apiClient } = await import('./client')
  await apiClient.delete(`/customers/${customerId}/documents/${docId}`)
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
  const { apiClient } = await import('./client')
  const res = await apiClient.get<ScannerStatus>('/scanner/status')
  return res.data
}

export async function scanDocument(): Promise<ScanResult> {
  const axios = (await import('axios')).default
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const backendBase = `http://${host}:5000/api`
  // All responses are HTTP 200 — errors are in the JSON body, never throws.
  const res = await axios.post<ScanResult>(`${backendBase}/scan/preview`, undefined, {
    timeout: 240_000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  })
  return res.data
}

export async function checkScannerAvailable(): Promise<{ available: boolean; scanner_count?: number; pywin32?: boolean; reason?: string | null }> {
  const { apiClient } = await import('./client')
  const res = await apiClient.get('/scan/available')
  return res.data
}
