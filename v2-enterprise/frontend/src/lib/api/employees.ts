import { get, post, put } from './client'
import { apiClient } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface Employee {
  id: number
  branch_id: number | null
  branch?: { id: number; name: string; is_main: boolean } | null
  full_name: string
  phone: string
  id_number: string | null
  address: string | null
  title: string | null
  is_active: boolean
  signature_filename: string | null
  created_at: string | null
}

export interface EmployeesListResponse {
  total: number
  page: number
  per_page: number
  items: Employee[]
}

export interface EmployeePayload {
  full_name: string
  phone: string
  id_number?: string
  address?: string
  title?: string
  is_active?: boolean
}

/* ─── API functions ──────────────────────────────────────────────────────── */

function mapEmployeeBody(p: EmployeePayload) {
  return {
    FullName: p.full_name,
    Phone: p.phone,
    IdNumber: p.id_number,
    Address: p.address,
    Title: p.title,
    IsActive: p.is_active ?? true,
  }
}

export async function getEmployees(params: {
  page?: number; per_page?: number; search?: string; active_only?: boolean
} = {}): Promise<EmployeesListResponse> {
  const qs = new URLSearchParams()
  if (params.page)        qs.set('page', String(params.page))
  if (params.per_page)    qs.set('per_page', String(params.per_page))
  if (params.search)      qs.set('search', params.search)
  if (params.active_only) qs.set('active_only', 'true')
  const res = await get<any>(`/Employees${qs.toString() ? `?${qs.toString()}` : ''}`)
  const data = (res && res.success && res.data) ? res.data : res
  return {
    total: data?.total ?? 0,
    page: data?.page ?? params.page ?? 1,
    per_page: data?.per_page ?? params.per_page ?? 50,
    items: data?.items ?? [],
  }
}

export async function getEmployeeById(id: number | string): Promise<Employee> {
  const res = await get<any>(`/Employees/${id}`)
  return (res && res.success && res.data) ? res.data : res
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  const res = await post<any>('/Employees', mapEmployeeBody(payload))
  return { id: res.employeeId, ...payload } as any
}

export async function updateEmployee(id: number | string, payload: EmployeePayload): Promise<Employee> {
  const res = await put<any>(`/Employees/${id}`, mapEmployeeBody(payload))
  return { id: res.employeeId ?? id, ...payload } as any
}

export async function deleteEmployee(id: number | string): Promise<void> {
  await apiClient.delete(`/Employees/${id}`)
}

export async function setSaleRep(saleId: string, employeeId: number | string | null): Promise<{
  sales_rep_id: string | null
  sales_rep_name: string | null
  sales_rep_phone: string | null
  sales_rep_id_number: string | null
  sales_rep_title: string | null
  sales_rep_address: string | null
}> {
  const res = await put<any>(`/Employees/sales-rep/${saleId}`, { EmployeeId: employeeId })
  return res
}
