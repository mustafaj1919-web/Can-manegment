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
  branch_id?: number | string | null
  can_access_all_branches?: boolean
}

export interface UpdateUserPayload {
  username: string
  role: UserRole
  branch_id?: number | string | null
  can_access_all_branches?: boolean
  is_active_user?: boolean
  password?: string
}

export interface ResetPasswordPayload {
  password: string
}

export async function listUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
  return get<UsersListResponse>('/users', { params })
}

export async function getUser(id: number | string): Promise<User> {
  return get<User>(`/users/${id}`)
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return post<User>('/users', payload)
}

export async function updateUser(id: number | string, payload: UpdateUserPayload): Promise<User> {
  return put<User>(`/users/${id}`, payload)
}

export async function toggleUserActive(id: number | string): Promise<User> {
  return post<User>(`/users/${id}/toggle-active`, {})
}

export async function resetUserPassword(id: number | string, payload: ResetPasswordPayload): Promise<{ success: boolean }> {
  return post<{ success: boolean }>(`/users/${id}/reset-password`, payload)
}

export async function deleteUser(id: number | string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/users/${id}`)
}

export const ROLE_COLORS: Record<string, string> = {
  Owner:      'border-violet-500/30 bg-violet-500/10 text-violet-300',
  Admin:      'border-blue-500/30 bg-blue-500/10 text-blue-300',
  Accountant: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Sales:      'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Viewer:     'border-slate-500/30 bg-slate-500/10 text-slate-300',
}
