import { get, post, put, del } from './client'
import type { User, Branch, UserRole } from '@/types'

export interface RoleOption {
  value: UserRole
  label: string
}

export interface UsersListResponse {
  total: number
  page: number
  per_page: number
  roles: RoleOption[]
  items: User[]
}

export interface UsersListParams {
  page?: number
  per_page?: number
  search?: string
  role?: string
}

export interface CreateUserPayload {
  username: string
  password: string
  role: UserRole
  branch_id?: number | null
  can_access_all_branches?: boolean
}

export interface UpdateUserPayload {
  username: string
  role: UserRole
  branch_id?: number | null
  can_access_all_branches?: boolean
  is_active_user?: boolean
  password?: string
}

export interface ResetPasswordPayload {
  password: string
}

export async function listUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
  return Promise.resolve({
    total: 0,
    page: params.page ?? 1,
    per_page: params.per_page ?? 25,
    roles: [],
    items: []
  })
}

export async function getUser(id: number | string): Promise<User> {
  return Promise.reject(new Error('المستخدم غير موجود'))
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return Promise.reject(new Error('إضافة مستخدمين غير متاحة حالياً'))
}

export async function updateUser(id: number | string, payload: UpdateUserPayload): Promise<User> {
  return Promise.reject(new Error('تعديل المستخدمين غير متاح حالياً'))
}

export async function toggleUserActive(id: number | string): Promise<User> {
  return Promise.reject(new Error('تعديل حالة المستخدم غير متاح حالياً'))
}

export async function resetUserPassword(id: number | string, payload: ResetPasswordPayload): Promise<{ success: boolean }> {
  return Promise.reject(new Error('إعادة تعيين كلمة المرور غير متاح حالياً'))
}

export async function deleteUser(id: number | string): Promise<{ success: boolean }> {
  return Promise.reject(new Error('حذف المستخدم غير متاح حالياً'))
}

export const ROLE_COLORS: Record<string, string> = {
  Owner:      'border-violet-500/30 bg-violet-500/10 text-violet-300',
  Admin:      'border-blue-500/30 bg-blue-500/10 text-blue-300',
  Accountant: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Sales:      'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Viewer:     'border-slate-500/30 bg-slate-500/10 text-slate-300',
}
