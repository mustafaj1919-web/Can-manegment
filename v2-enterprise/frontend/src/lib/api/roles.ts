import { get, post, put } from './client'

export interface PermissionOption {
  key: string
  label: string
}

export interface RoleItem {
  role: string
  label: string
  permissions: string[]
  is_fixed: boolean
}

export interface RolesResponse {
  roles: RoleItem[]
  all_permissions: PermissionOption[]
}

export async function listRoles(): Promise<RolesResponse> {
  return get<RolesResponse>('/roles')
}

export async function updateRolePermissions(
  role: string,
  permissions: string[],
): Promise<RoleItem> {
  return put<RoleItem>(`/roles/${encodeURIComponent(role)}`, { permissions })
}

export async function resetRolePermissions(role: string): Promise<RoleItem> {
  return post<RoleItem>(`/roles/${encodeURIComponent(role)}/reset`)
}

export const ROLE_COLORS: Record<string, string> = {
  Owner:      'border-violet-500/30 bg-violet-500/10 text-violet-300',
  Admin:      'border-blue-500/30 bg-blue-500/10 text-blue-300',
  Accountant: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Sales:      'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Viewer:     'border-slate-500/30 bg-slate-500/10 text-slate-300',
}

export const ROLE_BORDER: Record<string, string> = {
  Owner:      'border-violet-500/20',
  Admin:      'border-blue-500/20',
  Accountant: 'border-emerald-500/20',
  Sales:      'border-amber-500/20',
  Viewer:     'border-slate-500/20',
}
