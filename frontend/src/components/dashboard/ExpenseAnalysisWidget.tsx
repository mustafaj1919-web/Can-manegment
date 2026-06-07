'use client'

import { useQuery } from '@tanstack/react-query'
import { ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { get } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardWidget } from './DashboardWidget'

interface ExpBreakdown {
  category:     string
  label:        string
  this_month:   number
  last_month:   number
  pct_of_total: number
  change_pct:   number
  count:        number
}

interface ExpenseAnalysisResponse {
  this_month_total: number
  last_month_total: number
  change_pct:       number
  breakdown:        ExpBreakdown[]
  top_expenses:     Array<{ id: number; title: string; amount_iqd: number; category: string }>
}

const CAT_COLORS: string[] = [
  'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-blue-500', 'bg-orange-500', 'bg-teal-500',
]

function money(v: number) { return formatMoney(v, 'IQD') }

export function ExpenseAnalysisWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['expense-analysis'],
    queryFn:  () => get<ExpenseAnalysisResponse>('/reports/expense-analysis'),
    staleTime: 300_000,
    retry: 1,
  })

  const isUp = (data?.change_pct ?? 0) > 0

  const headerAction = data ? (
    <div className="text-end">
      <p className="font-numeric text-base font-black text-foreground">{money(data.this_month_total)}</p>
      <div className={cn('flex items-center justify-end gap-1 text-[10px] font-medium', isUp ? 'text-rose-400' : 'text-emerald-400')}>
        {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
        {isUp ? '+' : ''}{data.change_pct.toFixed(1)}% عن الشهر الماضي
      </div>
    </div>
  ) : undefined

  return (
    <DashboardWidget
      title="تحليل المصاريف"
      subtitle="توزيع هذا الشهر بالفئات"
      icon={ReceiptText}
      iconColor="text-rose-400"
      action={headerAction}
      noPadding
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded" />
          ))}
        </div>
      ) : !data ? null : (
        <div className="p-4 space-y-3">
          {/* Category breakdown */}
          {data.breakdown.slice(0, 6).map((cat, i) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', CAT_COLORS[i % CAT_COLORS.length])} />
                  <span className="text-xs text-foreground/80">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-[10px] font-medium',
                    cat.change_pct > 15 ? 'text-rose-400' : cat.change_pct < -10 ? 'text-emerald-400' : 'text-muted-foreground/60'
                  )}>
                    {cat.change_pct > 0 ? '+' : ''}{cat.change_pct.toFixed(0)}%
                  </span>
                  <span className="font-numeric text-xs font-semibold text-foreground">{money(cat.this_month)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', CAT_COLORS[i % CAT_COLORS.length])}
                  style={{ width: `${Math.min(cat.pct_of_total, 100)}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          ))}

          {/* Top expenses */}
          {data.top_expenses.length > 0 && (
            <div className="mt-4 rounded-lg border border-border/40 bg-secondary/20 divide-y divide-border/30">
              <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">أعلى المصاريف</p>
              {data.top_expenses.slice(0, 3).map(e => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-foreground/80 truncate max-w-[160px]">{e.title}</span>
                  <span className="font-numeric text-xs font-bold text-rose-400 shrink-0">{money(e.amount_iqd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardWidget>
  )
}
