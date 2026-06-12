'use client'

import { cn } from '@/lib/utils'

const CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Available:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  Sold:       { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/25',    dot: 'bg-rose-400'    },
  Reserved:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400'   },
  Active:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  Cancelled:  { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-600/25',   dot: 'bg-slate-500'   },
  Pending:    { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-600/25',   dot: 'bg-slate-500'   },
  Paid:       { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  Overdue:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/25',    dot: 'bg-rose-400'    },
  Partial:    { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/25',  dot: 'bg-orange-400'  },
  New:        { bg: 'bg-primary/10',     text: 'text-primary',     border: 'border-primary/25',     dot: 'bg-primary'     },
  Used:       { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400'   },
  Damaged:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/25',    dot: 'bg-rose-400'    },
  Salvage:    { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-600/25',   dot: 'bg-slate-500'   },
  Buyer:      { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/25',    dot: 'bg-rose-400'    },
  Seller:     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400'   },
}

const FALLBACK = { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-600/25', dot: 'bg-slate-500' }

const LABELS: Record<string, string> = {
  Available: 'متاحة', Sold: 'مباعة', Reserved: 'محجوزة',
  Active: 'نشط', Cancelled: 'ملغاة', Pending: 'بانتظار الدفع',
  Paid: 'مدفوع', Overdue: 'متأخر', Partial: 'جزئي',
  New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة', Salvage: 'سكراب',
  Buyer: 'مشتري', Seller: 'بائع',
}

interface StatusBadgeProps {
  status: string
  className?: string
  dot?: boolean
  size?: 'xs' | 'sm'
}

export function StatusBadge({ status, className, dot = true, size = 'sm' }: StatusBadgeProps) {
  const c = CFG[status] ?? FALLBACK
  const label = LABELS[status] ?? status
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
      size === 'xs' ? 'px-2 py-px text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
      c.bg, c.text, c.border, className,
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', c.dot)} />}
      {label}
    </span>
  )
}
