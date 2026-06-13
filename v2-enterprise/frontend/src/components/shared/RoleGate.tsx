'use client'

import { useRole, type AppRole } from '@/hooks/useRole'

interface RoleGateProps {
  allow: AppRole | AppRole[]
  minRole?: AppRole
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Renders children only if the current user's role matches.
 * Usage:
 *   <RoleGate allow={['Owner','Admin']}>  — visible to Owner/Admin only
 *   <RoleGate minRole="Accountant">       — visible to Accountant, Admin, Owner
 */
export function RoleGate({ allow, minRole, fallback = null, children }: RoleGateProps) {
  const { hasRole, hasMinRole } = useRole()

  const allowed = minRole
    ? hasMinRole(minRole)
    : hasRole(...(Array.isArray(allow) ? allow : [allow]))

  return allowed ? <>{children}</> : <>{fallback}</>
}
