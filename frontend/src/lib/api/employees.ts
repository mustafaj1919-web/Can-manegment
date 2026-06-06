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

export async function getEmployees(params: {
  page?: number; per_page?: number; search?: string; active_only?: boolean
} = {}): Promise<EmployeesListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 50))
  if (params.search)      qs.set('search',      params.search)
  if (params.active_only) qs.set('active_only', 'true')
  return get<EmployeesListResponse>(`/employees?${qs.toString()}`)
}

export async function getEmployeeById(id: number): Promise<Employee> {
  return get<Employee>(`/employees/${id}`)
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  return post<Employee>('/employees', payload)
}

export async function updateEmployee(id: number, payload: EmployeePayload): Promise<Employee> {
  return put<Employee>(`/employees/${id}`, payload)
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiClient.delete(`/employees/${id}`)
}

export async function setSaleRep(saleId: number, employeeId: number | null): Promise<{
  sales_rep_id: number | null
  sales_rep_name: string | null
  sales_rep_phone: string | null
  sales_rep_id_number: string | null
  sales_rep_title: string | null
  sales_rep_address: string | null
}> {
  const response = await apiClient.patch(`/sales/${saleId}/sales-rep`, {
    employee_id: employeeId,
  })
  return response.data
}
