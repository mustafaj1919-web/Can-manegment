'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { get } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ExpBreakdown {
  category: string
  label: string
  this_month: number
  last_month: number
  pct_of_total: number
  change_pct: number
  count: number
}

interface ExpenseAnalysisResponse {
  this_month_total: number
  last_month_total: number
  change_pct: number
  breakdown: ExpBreakdown[]
  top_expenses: Array<{ id: number; title: string; amount_iqd: number; category: string }>
}

const CAT_COLORS: string[] = [
  'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-blue-500', 'bg-orange-500', 'bg-teal-500',
]

function money(v: number) { return formatMoney(v, 'IQD') }

export function ExpenseAnalysisWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['expense-analysis'],
    queryFn: () => get<ExpenseAnalysisResponse>('/reports/expense-analysis'),
    staleTime: 300_000,
    retry: 1,
  })

  const isUp = (data?.change_pct ?? 0) > 0

  return (
    <div className="dash-card overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div>
          <h2 className="text-sm font-bold text-foreground">تحليل المصاريف</h2>
          <p className="text-[10px] text-muted-foreground">توزيع هذا الشهر بالفئات</p>
        </div>
        {data && (
          <div className="text-left">
            <p className="font-numeric text-base font-black text-foreground">{money(data.this_month_total)}</p>
            <div className={`flex items-center gap-1 justify-end text-[10px] font-medium ${isUp ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {isUp ? '+' : ''}{data.change_pct.toFixed(1)}% عن الشهر الماضي
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
      ) : !data ? null : (
        <div className="p-4 space-y-3">
          {/* Donut-like bar breakdown */}
          {data.breakdown.slice(0, 6).map((cat, i) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${CAT_COLORS[i % CAT_COLORS.length]}`} />
                  <span className="text-xs text-foreground/80">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${cat.change_pct > 15 ? 'text-rose-400' : cat.change_pct < -10 ? 'text-emerald-400' : 'text-muted-foreground/60'}`}>
                    {cat.change_pct > 0 ? '+' : ''}{cat.change_pct.toFixed(0)}%
                  </span>
                  <span className="font-numeric text-xs font-semibold text-foreground">{money(cat.this_month)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${CAT_COLORS[i % CAT_COLORS.length]}`}
                  style={{ width: `${Math.min(cat.pct_of_total, 100)}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          ))}

          {/* Top 3 expenses */}
          {data.top_expenses.length > 0 && (
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">أعلى المصاريف</p>
              {data.top_expenses.slice(0, 3).map(e => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-foreground/80 truncate max-w-[160px]">{e.title}</span>
                  <span className="font-numeric text-xs font-bold text-rose-300 shrink-0">{money(e.amount_iqd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
