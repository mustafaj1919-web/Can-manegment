'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBranchStore } from '@/lib/stores/branch-store'
import { toast } from 'sonner'
import type { Branch } from '@/types'

export function BranchSelector() {
  const { branches, activeBranch, setActiveBranch } = useBranchStore()
  const [switching, setSwitching] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  if (branches.length === 0) return null

  const current = activeBranch ?? branches[0]

  async function handleSelect(branch: Branch) {
    if (switching || branch.id === current?.id) return
    setSwitching(true)
    try {
      const response = await fetch('/branch/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
        body: `branch_id=${branch.id}`,
        credentials: 'include',
      })
      if (!response.ok) {
        toast.error('تعذر تبديل الفرع، حاول مرة أخرى')
        return
      }
      setActiveBranch(branch)
      await queryClient.invalidateQueries()
      router.refresh()
    } catch {
      toast.error('تعذر تبديل الفرع، تحقق من الاتصال بالخادم')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={switching}
          className={cn(
            'h-8 gap-1.5 text-xs rounded-lg px-3 transition-colors',
            'border border-white/[0.07] bg-white/[0.03]',
            'text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] hover:border-white/[0.1]',
          )}
        >
          {switching ? (
            <Loader2 className="h-3.5 w-3.5 text-primary/70 shrink-0 animate-spin" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-primary/60 shrink-0" />
          )}
          <span className="max-w-[110px] truncate hidden sm:block font-medium">{current?.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[210px] rounded-xl p-1.5"
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--glass-border-strong)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60 px-3 py-2 font-bold">
          اختر الفرع
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.06] mx-2" />
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleSelect(branch)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 cursor-pointer',
              branch.id === current?.id && 'bg-primary/10 text-primary',
            )}
          >
            <div className="flex items-center gap-2.5">
              <Building2
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  branch.is_main ? 'text-primary/80' : 'text-muted-foreground'
                )}
              />
              <span className="text-sm">{branch.name}</span>
              {branch.is_main && (
                <span className="text-[9px] font-bold text-primary/70 border border-primary/25 rounded-md px-1.5 py-0.5 leading-none bg-primary/8">
                  رئيسي
                </span>
              )}
            </div>
            {current?.id === branch.id && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
