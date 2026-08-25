export type SessionType = 'employee' | 'customer'

export interface BranchSummary {
  id: string
  name: string
  is_main: boolean
  created_at?: string
}

export interface AuthenticatedUser {
  id: string
  username: string
  name?: string
  role: string
  branch_id: string
  can_access_all_branches: boolean
  is_active_user: boolean
  permissions: string[]
  created_at?: string
}

export interface EmployeeLoginRequest {
  username: string
  password: string
}

export interface EmployeeLoginResponse {
  success: boolean
  message: string
  token: string
  user: AuthenticatedUser
  branches: BranchSummary[]
  active_branch: BranchSummary
}

export interface CustomerLoginRequest {
  phone: string
  password: string
}

export interface CustomerLoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    customer: {
      id: string
      name: string
      phone: string
      email?: string | null
    }
  }
}

export interface UserCapabilities {
  canViewExecutiveDashboard: boolean
  canManageSales: boolean
  canCollectPayments: boolean
  canViewAccounting: boolean
  canSwitchBranches: boolean
  isCustomer: boolean
}

export function deriveCapabilities(role: string, permissions: string[], sessionType: SessionType): UserCapabilities {
  if (sessionType === 'customer') {
    return {
      canViewExecutiveDashboard: false,
      canManageSales: false,
      canCollectPayments: false,
      canViewAccounting: false,
      canSwitchBranches: false,
      isCustomer: true,
    }
  }

  const isOwnerOrAdmin = role === 'Owner' || role === 'Admin'
  const isAccountant = role === 'Accountant'
  const isCashier = role === 'Cashier'
  const isSales = role === 'Sales'

  return {
    canViewExecutiveDashboard: isOwnerOrAdmin || permissions.includes('Dashboard.View'),
    canManageSales: isOwnerOrAdmin || isSales || permissions.includes('Sales.Create'),
    canCollectPayments: isOwnerOrAdmin || isAccountant || isCashier || permissions.includes('Payments.Create'),
    canViewAccounting: isOwnerOrAdmin || isAccountant || permissions.includes('Accounting.View'),
    canSwitchBranches: isOwnerOrAdmin || isAccountant,
    isCustomer: false,
  }
}
