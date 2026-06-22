'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Lightbulb } from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { getFinancialInsights } from '@/lib/api/accounting'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

function ChangeIndicator({ pct, inverse = false }: { pct: number; inverse?: boolean }) {
  const isGood = inverse ? pct < 0 : pct > 0
  const isNeutral = Math.abs(pct) < 2
  if (isNeutral) return (
    <span className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />{Math.abs(pct)}%
    </span>
  )
  return (
    <span className={cn('flex items-center gap-0.5 text-[11px] font-bold', isGood ? 'text-emerald-400' : 'text-rose-400')}>
      {pct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  )
}

function MetricRow({ label, current, previous, pct, inverse = false }: {
  label: string; current: number; previous: number; pct: number; inverse?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/20 py-3 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted-foreground/60">{formatMoney(previous, 'IQD')}</span>
        <span className="font-numeric text-sm font-bold text-foreground">{formatMoney(current, 'IQD')}</span>
        <ChangeIndicator pct={pct} inverse={inverse} />
      </div>
    </div>
  )
}

export function FinancialInsightsPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['financial-insights'],
    queryFn: getFinancialInsights,
    staleTime: 2 * 60_000,
  })

  if (isLoading) return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-32 rounded" />
      {[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
    </div>
  )
  if (!data) return null

  const { this_month, last_month, changes, top_expenses, insights, period } = data
  const isProfitable = this_month.net_profit >= 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">الرؤى المالية</p>
          <p className="text-[11px] text-muted-foreground">{period.month_name} {period.year} vs الشهر الماضي</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-7">
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {/* Net Profit Banner */}
      <div className={cn('rounded-xl border p-3.5', isProfitable ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5')}>
        <p className="text-[11px] text-muted-foreground mb-1">{isProfitable ? 'صافي الربح' : 'صافي الخسارة'} — {period.month_name}</p>
        <div className="flex items-center justify-between">
          <p className={cn('font-numeric text-xl font-black', isProfitable ? 'text-emerald-400' : 'text-rose-400')}>
            {formatMoney(Math.abs(this_month.net_profit), 'IQD')}
          </p>
          <ChangeIndicator pct={changes.profit_pct} />
        </div>
      </div>

      {/* Metrics */}
      <div className="rounded-xl border border-border/30 bg-secondary/10 px-4">
        <MetricRow label="الإيرادات" current={this_month.revenue} previous={last_month.revenue} pct={changes.revenue_pct} />
        <MetricRow label="المصروفات" current={this_month.expenses} previous={last_month.expenses} pct={changes.expense_pct} inverse />
      </div>

      {/* Top Expenses */}
      {top_expenses.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground">أعلى بنود المصاريف</p>
          <div className="space-y-1.5">
            {top_expenses.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-2">
                <span className="text-xs text-foreground">{e.account_name}</span>
                <span className="font-numeric text-xs font-bold text-rose-400">{formatMoney(e.amount, 'IQD')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-violet-400" />
            <p className="text-[11px] font-semibold text-violet-300">تحليل ذكي</p>
          </div>
          <ul className="space-y-1">
            {insights.map((insight, i) => (
              <li key={i} className="text-xs text-muted-foreground">{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
