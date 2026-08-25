'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getCashForecast, type CashForecastItem } from '@/lib/api/accounting'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const PERIOD_OPTIONS = [
  { value: 7,  label: '7 أيام' },
  { value: 30, label: '30 يوم' },
  { value: 60, label: '60 يوم' },
  { value: 90, label: '90 يوم' },
]

function ForecastRow({ item, type }: { item: CashForecastItem; type: 'inflow' | 'outflow' }) {
  const isInflow = type === 'inflow'
  return (
    <div className="flex items-center justify-between border-b border-border/20 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">
          {isInflow ? item.customer_name : item.supplier_name}
          {item.installment_number ? ` — قسط ${item.installment_number}` : ''}
          {item.invoice_number ? ` — ${item.invoice_number}` : ''}
        </p>
        <p className="text-[10px] text-muted-foreground">{formatDate(item.due_date)}</p>
      </div>
      <span className={cn('font-numeric text-xs font-bold shrink-0 mr-3', isInflow ? 'text-emerald-400' : 'text-rose-400')}>
        {isInflow ? '+' : '-'}{formatMoney(item.amount, 'IQD')}
      </span>
    </div>
  )
}

export function CashForecastPanel() {
  const [days, setDays] = useState(30)
  const [expanded, setExpanded] = useState<'inflow' | 'outflow' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['cash-forecast', days],
    queryFn: () => getCashForecast(days),
    staleTime: 60_000,
  })

  if (isLoading) return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">{[0,1,2].map(i=><Skeleton key={i} className="h-20 rounded-lg"/>)}</div>
      <Skeleton className="h-40 rounded-lg" />
    </div>
  )

  if (!data) return null

  const netColor = data.is_healthy ? 'text-emerald-400' : 'text-rose-400'

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDays(opt.value)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              days === opt.value
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="glass rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">الرصيد الحالي</p>
          <p className="font-numeric text-sm font-bold text-foreground">{formatMoney(data.total_current, 'IQD')}</p>
          <p className="text-[10px] text-muted-foreground/60">نقد + بنك</p>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
            <p className="text-[10px] text-muted-foreground">وارد متوقع</p>
          </div>
          <p className="font-numeric text-sm font-bold text-emerald-400">{formatMoney(data.expected_inflow, 'IQD')}</p>
          <p className="text-[10px] text-muted-foreground/60">{data.inflow_count} دفعة</p>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <ArrowDownLeft className="h-3 w-3 text-rose-400" />
            <p className="text-[10px] text-muted-foreground">صادر متوقع</p>
          </div>
          <p className="font-numeric text-sm font-bold text-rose-400">{formatMoney(data.expected_outflow, 'IQD')}</p>
          <p className="text-[10px] text-muted-foreground/60">{data.outflow_count} فاتورة</p>
        </div>
        <div className={cn('rounded-lg border p-3', data.is_healthy ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5')}>
          <div className="flex items-center gap-1 mb-1">
            {data.is_healthy ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertTriangle className="h-3 w-3 text-rose-400" />}
            <p className="text-[10px] text-muted-foreground">صافي التوقع</p>
          </div>
          <p className={cn('font-numeric text-sm font-bold', netColor)}>{formatMoney(data.net_forecast, 'IQD')}</p>
          <p className={cn('text-[10px]', data.is_healthy ? 'text-emerald-400/60' : 'text-rose-400/60')}>
            {data.is_healthy ? 'وضع مالي جيد' : 'يحتاج انتباه'}
          </p>
        </div>
      </div>

      {/* Details toggle */}
      <div className="grid grid-cols-2 gap-3">
        {/* Inflow */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <button
            onClick={() => setExpanded(expanded === 'inflow' ? null : 'inflow')}
            className="flex w-full items-center justify-between p-3"
          >
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">أقساط قادمة ({data.inflow_count})</span>
            </div>
            <span className="text-[10px] text-emerald-400/70">{expanded === 'inflow' ? '▲' : '▼'}</span>
          </button>
          {expanded === 'inflow' && data.inflow_items.length > 0 && (
            <div className="border-t border-emerald-500/20 px-3 max-h-48 overflow-y-auto">
              {data.inflow_items.slice(0, 10).map((item, i) => (
                <ForecastRow key={i} item={item} type="inflow" />
              ))}
            </div>
          )}
        </div>

        {/* Outflow */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5">
          <button
            onClick={() => setExpanded(expanded === 'outflow' ? null : 'outflow')}
            className="flex w-full items-center justify-between p-3"
          >
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-semibold text-rose-300">مستحقات موردين ({data.outflow_count})</span>
            </div>
            <span className="text-[10px] text-rose-400/70">{expanded === 'outflow' ? '▲' : '▼'}</span>
          </button>
          {expanded === 'outflow' && data.outflow_items.length > 0 && (
            <div className="border-t border-rose-500/20 px-3 max-h-48 overflow-y-auto">
              {data.outflow_items.slice(0, 10).map((item, i) => (
                <ForecastRow key={i} item={item} type="outflow" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
