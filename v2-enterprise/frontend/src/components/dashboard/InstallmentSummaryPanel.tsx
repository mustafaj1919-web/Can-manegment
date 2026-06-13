'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarDays, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'
import { formatMoney, formatNumber } from '@/lib/utils'

export function InstallmentSummaryPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="border border-subtle bg-bg-surface rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return null
  }

  const s = data?.installment_summary
  const overdueAmt = data?.overdue_amount ?? 0
  const overdueCount = data?.overdue_installments ?? 0
  const todayAmt = s?.due_today_amount ?? 0
  const todayCount = s?.due_today_count ?? 0
  const soonAmt = s?.due_tomorrow_amount ?? 0
  const soonCount = s?.due_tomorrow_count ?? 0
  
  // Total receivables
  const totalReceivables = data?.receivables ?? 0

  const items = [
    {
      label: 'أقساط متأخرة الميعاد',
      count: overdueCount,
      amount: overdueAmt,
      color: '#ef4444',
      bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/10',
    },
    {
      label: 'مستحقة الدفع اليوم',
      count: todayCount,
      amount: todayAmt,
      color: '#f59e0b',
      bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
    },
    {
      label: 'مستحقة خلال 48 ساعة',
      count: soonCount,
      amount: soonAmt,
      color: '#3b82f6',
      bgClass: 'bg-sky-500/10 text-sky-400 border-sky-500/10',
    },
  ]

  return (
    <div className="border border-subtle bg-bg-surface rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-subtle mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">ملخص وحالات خطط التقسيط</p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>إجمالي الذمم المدينة المتبقية:</span>
          <span className="font-bold text-foreground font-numeric tabular-nums">
            {formatMoney(totalReceivables, 'IQD')}
          </span>
        </div>
      </div>

      {/* Grid of progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item) => {
          const percentage = totalReceivables > 0 ? Math.min((item.amount / totalReceivables) * 100, 100) : 0
          return (
            <div key={item.label} className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-numeric tabular-nums text-foreground">{item.count} أقساط</span>
              </div>
              <div className="flex items-end justify-between">
                <h4 className="text-base font-bold font-numeric text-foreground tabular-nums leading-none">
                  {formatMoney(item.amount, 'IQD')}
                </h4>
                <span className="text-[10px] text-muted-foreground font-numeric tabular-nums leading-none">
                  {percentage.toFixed(1)}% من الإجمالي
                </span>
              </div>
              {/* Progress bar container */}
              <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden border border-subtle">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
