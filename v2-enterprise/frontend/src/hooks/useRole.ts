'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

export type AppRole = 'Owner' | 'Admin' | 'Accountant' | 'Sales' | 'Viewer'

const ROLE_HIERARCHY: Record<AppRole, number> = {
  Owner:      5,
  Admin:      4,
  Accountant: 3,
  Sales:      2,
  Viewer:     1,
}

export function useRole() {
  const user = useAuthStore((state) => state.user)
  const role = (user?.role ?? 'Viewer') as AppRole

  function hasRole(...roles: AppRole[]) {
    return roles.includes(role)
  }

  function hasMinRole(minRole: AppRole) {
    return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0)
  }

  return { role, hasRole, hasMinRole, isOwner: role === 'Owner', isAdmin: hasRole('Owner', 'Admin') }
}
