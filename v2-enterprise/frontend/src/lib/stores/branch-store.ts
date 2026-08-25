'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Branch } from '@/types'

interface BranchState {
  branches: Branch[]
  activeBranch: Branch | null

  setBranches: (branches: Branch[]) => void
  setActiveBranch: (branch: Branch | null) => void
  reset: () => void
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branches: [],
      activeBranch: null,

      setBranches: (branches) => set({ branches }),

      // Pure state setter — backend sync is handled by BranchSelector
      setActiveBranch: (branch) => set({ activeBranch: branch }),

      reset: () => set({ branches: [], activeBranch: null }),
    }),
    {
      name: 'branch-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
)
