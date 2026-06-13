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
  return Promise.resolve({
    total: 0,
    page: params.page ?? 1,
    per_page: params.per_page ?? 50,
    items: []
  })
}

export async function getEmployeeById(id: number): Promise<Employee> {
  return Promise.reject(new Error('الموظف غير موجود'))
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  return Promise.reject(new Error('إضافة الموظفين غير متاحة حالياً'))
}

export async function updateEmployee(id: number, payload: EmployeePayload): Promise<Employee> {
  return Promise.reject(new Error('تعديل الموظفين غير متاح حالياً'))
}

export async function deleteEmployee(id: number): Promise<void> {
  return Promise.reject(new Error('حذف الموظفين غير متاح حالياً'))
}

export async function setSaleRep(saleId: string, employeeId: number | null): Promise<{
  sales_rep_id: number | null
  sales_rep_name: string | null
  sales_rep_phone: string | null
  sales_rep_id_number: string | null
  sales_rep_title: string | null
  sales_rep_address: string | null
}> {
  return Promise.reject(new Error('تعيين مندوب المبيعات غير متاح حالياً'))
}
