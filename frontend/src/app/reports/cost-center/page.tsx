'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getCostCenterReport, type CostCenterReportItem } from '@/lib/api/cost-centers'

function CenterCard({ center }: { center: CostCenterReportItem }) {
  const isProfit = center.net_profit_iqd >= 0
  return (
    <div className="dash-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{center.name}</p>
          {center.code && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{center.code}</p>}
        </div>
        <span className={cn(
          'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0',
          isProfit
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
        )}>
          {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isProfit ? 'رابح' : 'خاسر'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">الإيرادات</p>
          <p className="text-xs font-bold font-numeric text-emerald-400">{formatMoney(center.revenue_iqd, 'IQD')}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">المصاريف</p>
          <p className="text-xs font-bold font-numeric text-rose-400">{formatMoney(center.expense_iqd, 'IQD')}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">صافي الربح</p>
          <p className={cn('text-xs font-bold font-numeric', isProfit ? 'text-emerald-300' : 'text-rose-400')}>
            {formatMoney(center.net_profit_iqd, 'IQD')}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        {center.entry_count} قيد مرتبط
      </p>
    </div>
  )
}

export default function CostCenterReportPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['cost-center-report', startDate, endDate],
    queryFn: () => getCostCenterReport({ start_date: startDate || undefined, end_date: endDate || undefined }),
    staleTime: 60_000,
    retry: 1,
  })

  const totalRevenue  = data?.centers.reduce((s, c) => s + c.revenue_iqd, 0) ?? 0
  const totalExpense  = data?.centers.reduce((s, c) => s + c.expense_iqd, 0) ?? 0
  const totalProfit   = totalRevenue - totalExpense

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <Building2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="section-title">تقرير مراكز التكلفة</h1>
            <p className="section-subtitle">الإيرادات والمصاريف لكل مركز تكلفة</p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Date filter */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">من:</span>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-8 bg-white/5 border-white/10 text-xs w-[145px]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">إلى:</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-8 bg-white/5 border-white/10 text-xs w-[145px]" />
        </div>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate('') }}
            className="h-8 text-xs text-muted-foreground">
            مسح
          </Button>
        )}
      </div>

      {/* Totals */}
      {!isLoading && data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="dash-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">إجمالي الإيرادات</p>
            <p className="font-numeric text-base font-bold text-emerald-400">{formatMoney(totalRevenue, 'IQD')}</p>
          </div>
          <div className="dash-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">إجمالي المصاريف</p>
            <p className="font-numeric text-base font-bold text-rose-400">{formatMoney(totalExpense, 'IQD')}</p>
          </div>
          <div className={cn('dash-card p-4 text-center', totalProfit >= 0 ? '' : 'border-rose-500/20')}>
            <p className="text-[11px] text-muted-foreground mb-1">صافي الربح الكلي</p>
            <p className={cn('font-numeric text-base font-bold', totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {formatMoney(totalProfit, 'IQD')}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400/60" />
          <p className="mt-3 text-sm text-muted-foreground">تعذر تحميل تقرير مراكز التكلفة</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.centers.map((center, i) => <CenterCard key={center.id ?? `unassigned-${i}`} center={center} />)}
        </div>
      )}
    </div>
  )
}
