'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'

type AuthUser = User & { permissions: string[] }

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: AuthUser) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      clearAuth: () => {
        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? sessionStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
