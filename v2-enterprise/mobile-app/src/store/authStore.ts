import { create } from 'zustand'
import {
  AuthenticatedUser,
  BranchSummary,
  EmployeeLoginRequest,
  CustomerLoginRequest,
  SessionType,
  UserCapabilities,
  deriveCapabilities,
} from '../types/auth'
import {
  getAccessToken,
  getSessionType,
  saveSession,
  clearSession,
} from '../services/storageService'
import {
  loginEmployee as loginEmployeeApi,
  loginCustomer as loginCustomerApi,
  getEmployeeMe,
  getCustomerMe,
  switchBranchApi,
} from '../api/authApi'
import { registerSessionExpiredCallback } from '../api/client'

interface AuthState {
  user: AuthenticatedUser | null
  customer: { id: string; name: string; phone: string } | null
  sessionType: SessionType | null
  activeBranch: BranchSummary | null
  branches: BranchSummary[]
  isAuthenticated: boolean
  isHydrated: boolean
  isLoading: boolean
  capabilities: UserCapabilities

  hydrate: () => Promise<void>
  loginEmployee: (payload: EmployeeLoginRequest) => Promise<void>
  loginCustomer: (payload: CustomerLoginRequest) => Promise<void>
  switchBranch: (branchId: string) => Promise<void>
  logout: () => Promise<void>
}

const defaultCapabilities: UserCapabilities = {
  canViewExecutiveDashboard: false,
  canManageSales: false,
  canCollectPayments: false,
  canViewAccounting: false,
  canSwitchBranches: false,
  isCustomer: false,
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register 401 callback to perform clean session clearance
  registerSessionExpiredCallback(() => {
    set({
      user: null,
      customer: null,
      sessionType: null,
      activeBranch: null,
      branches: [],
      isAuthenticated: false,
      capabilities: defaultCapabilities,
    })
  })

  return {
    user: null,
    customer: null,
    sessionType: null,
    activeBranch: null,
    branches: [],
    isAuthenticated: false,
    isHydrated: false,
    isLoading: false,
    capabilities: defaultCapabilities,

    hydrate: async () => {
      try {
        const token = await getAccessToken()
        const sessionType = await getSessionType()

        if (!token || !sessionType) {
          set({
            isHydrated: true,
            isAuthenticated: false,
            capabilities: defaultCapabilities,
          })
          return
        }

        if (sessionType === 'employee') {
          const res = await getEmployeeMe()
          if (res && res.success && res.user) {
            const caps = deriveCapabilities(res.user.role, res.user.permissions || [], 'employee')
            set({
              user: res.user,
              sessionType: 'employee',
              activeBranch: res.active_branch,
              branches: res.branches || [],
              isAuthenticated: true,
              isHydrated: true,
              capabilities: caps,
            })
            return
          }
        } else if (sessionType === 'customer') {
          const res = await getCustomerMe()
          if (res && res.success && res.data) {
            const caps = deriveCapabilities('Customer', [], 'customer')
            set({
              customer: {
                id: res.data.id,
                name: res.data.name,
                phone: res.data.phone,
              },
              sessionType: 'customer',
              isAuthenticated: true,
              isHydrated: true,
              capabilities: caps,
            })
            return
          }
        }

        // If restoration fails or token invalid, clear session
        await clearSession()
        set({
          user: null,
          customer: null,
          sessionType: null,
          isAuthenticated: false,
          isHydrated: true,
          capabilities: defaultCapabilities,
        })
      } catch (err) {
        await clearSession()
        set({
          user: null,
          customer: null,
          sessionType: null,
          isAuthenticated: false,
          isHydrated: true,
          capabilities: defaultCapabilities,
        })
      }
    },

    loginEmployee: async (payload) => {
      set({ isLoading: true })
      try {
        const res = await loginEmployeeApi(payload)
        if (res.success && res.token && res.user) {
          await saveSession(res.token, 'employee')
          const caps = deriveCapabilities(res.user.role, res.user.permissions || [], 'employee')
          set({
            user: res.user,
            sessionType: 'employee',
            activeBranch: res.active_branch,
            branches: res.branches || [],
            isAuthenticated: true,
            isLoading: false,
            capabilities: caps,
          })
        } else {
          set({ isLoading: false })
          throw new Error(res.message || 'بيانات الدخول غير صحيحة')
        }
      } catch (err: any) {
        set({ isLoading: false })
        const msg = err?.response?.data?.message || err?.message || 'بيانات تسجيل الدخول غير صحيحة'
        throw new Error(msg)
      }
    },

    loginCustomer: async (payload) => {
      set({ isLoading: true })
      try {
        const res = await loginCustomerApi(payload)
        if (res.success && res.data && res.data.token) {
          await saveSession(res.data.token, 'customer')
          const caps = deriveCapabilities('Customer', [], 'customer')
          set({
            customer: {
              id: res.data.customer.id,
              name: res.data.customer.name,
              phone: res.data.customer.phone,
            },
            sessionType: 'customer',
            isAuthenticated: true,
            isLoading: false,
            capabilities: caps,
          })
        } else {
          set({ isLoading: false })
          throw new Error(res.message || 'بيانات الدخول غير صحيحة')
        }
      } catch (err: any) {
        set({ isLoading: false })
        const msg = err?.response?.data?.message || err?.message || 'بيانات الدخول غير صحيحة، يرجى التحقق من رقم الهاتف ورقم الهوية'
        throw new Error(msg)
      }
    },

    switchBranch: async (branchId) => {
      const { capabilities } = get()
      if (!capabilities.canSwitchBranches) {
        throw new Error('ليس لديك صلاحية لتبديل الفرع')
      }

      set({ isLoading: true })
      try {
        const res = await switchBranchApi(branchId)
        if (res.success && res.token) {
          await saveSession(res.token, 'employee')
          set({
            activeBranch: res.active_branch,
            isLoading: false,
          })
        } else {
          set({ isLoading: false })
          throw new Error(res.message || 'تعذر تبديل الفرع')
        }
      } catch (err: any) {
        set({ isLoading: false })
        const msg = err?.response?.data?.message || err?.message || 'تعذر تبديل الفرع'
        throw new Error(msg)
      }
    },

    logout: async () => {
      set({ isLoading: true })
      await clearSession()
      set({
        user: null,
        customer: null,
        sessionType: null,
        activeBranch: null,
        branches: [],
        isAuthenticated: false,
        isLoading: false,
        capabilities: defaultCapabilities,
      })
    },
  }
})
