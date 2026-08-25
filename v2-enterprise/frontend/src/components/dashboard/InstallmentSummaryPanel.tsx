'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'
import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function InstallmentSummaryPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="border border-subtle bg-bg-surface rounded-xl p-4 space-y-3">
        <Skeleton className="h-4 w-36 rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (isError) return null

  const s                = data?.installment_summary
  const overdueAmt       = data?.overdue_amount ?? 0
  const overdueCount     = data?.overdue_installments ?? 0
  const todayAmt         = s?.due_today_amount ?? 0
  const todayCount       = s?.due_today_count ?? 0
  const soonAmt          = s?.due_tomorrow_amount ?? 0
  const soonCount        = s?.due_tomorrow_count ?? 0
  const totalReceivables = data?.receivables ?? 0
  const allClear         = overdueCount === 0 && todayCount === 0 && soonCount === 0

  const items = [
    {
      label:    'متأخرة الميعاد',
      count:    overdueCount,
      amount:   overdueAmt,
      barColor: 'bg-rose-500',
      dotColor: 'bg-rose-500',
      textCls:  'text-rose-400',
      badge:    'bg-rose-500/10 text-rose-400',
    },
    {
      label:    'مستحقة اليوم',
      count:    todayCount,
      amount:   todayAmt,
      barColor: 'bg-amber-500',
      dotColor: 'bg-amber-500',
      textCls:  'text-amber-400',
      badge:    'bg-amber-500/10 text-amber-400',
    },
    {
      label:    'خلال 48 ساعة',
      count:    soonCount,
      amount:   soonAmt,
      barColor: 'bg-sky-500',
      dotColor: 'bg-sky-500',
      textCls:  'text-sky-400',
      badge:    'bg-sky-500/10 text-sky-400',
    },
  ]

  return (
    <div className="border border-subtle bg-bg-surface rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">ملخص الأقساط</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>إجمالي الذمم:</span>
          <span className="font-bold text-foreground tabular-nums">{formatMoney(totalReceivables, 'IQD')}</span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-subtle">
        {items.map((item) => {
          const pct = totalReceivables > 0
            ? Math.min((item.amount / totalReceivables) * 100, 100)
            : 0

          return (
            <div key={item.label} className="px-4 py-3 space-y-2">
              {/* Label row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', item.dotColor)} />
                  <span className="text-[11px] text-muted-foreground truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums', item.badge)}>
                    {item.count} قسط
                  </span>
                  <span className="text-[11px] font-bold text-foreground tabular-nums">
                    {formatMoney(item.amount, 'IQD')}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', item.barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground tabular-nums w-8 text-left shrink-0">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* All-clear footer */}
      {allClear && (
        <div className="flex items-center gap-2 border-t border-subtle bg-emerald-500/5 px-4 py-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <p className="text-[10px] font-bold text-emerald-400">جميع الأقساط تسير في الموعد</p>
        </div>
      )}
    </div>
  )
}
