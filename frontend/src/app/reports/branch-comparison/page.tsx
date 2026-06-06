'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, CalendarDays, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getBranchComparison, type BranchComparisonRow } from '@/lib/api/reports'

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const today = new Date()
const monthAgo = new Date()
monthAgo.setDate(today.getDate() - 30)

function money(value: number | null | undefined) {
  return formatMoney(value ?? 0, 'IQD')
}

function SummaryCard({ label, value, tone, icon: Icon }: { label: string; value: string; tone: string; icon: typeof TrendingUp }) {
  return (
    <div className="dash-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-numeric text-lg font-black text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function BranchRow({ row }: { row: BranchComparisonRow }) {
  const profitTone = row.net_profit_iqd >= 0 ? 'text-emerald-300' : 'text-rose-300'

  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <p className="text-xs font-bold text-foreground">{row.branch?.name ?? '-'}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {row.customers_count} عميل · {row.available_cars_count} متاح · {row.sold_cars_count} مباع
        </p>
      </td>
      <td className="px-4 py-3 text-xs font-numeric text-foreground">{row.sales_count}</td>
      <td className="px-4 py-3 text-xs font-numeric text-muted-foreground">{row.purchases_count}</td>
      <td className="px-4 py-3 text-xs font-numeric text-amber-300">{money(row.sales_total_iqd)}</td>
      <td className="px-4 py-3 text-xs font-numeric text-emerald-300">{money(row.sales_paid_iqd)}</td>
      <td className="px-4 py-3 text-xs font-numeric text-rose-300">{money(row.sales_remaining_iqd)}</td>
      <td className="px-4 py-3 text-xs font-numeric text-orange-300">{money(row.expenses_iqd)}</td>
      <td className={cn('px-4 py-3 text-xs font-numeric font-bold', profitTone)}>{money(row.net_profit_iqd)}</td>
      <td className="px-4 py-3 text-xs font-numeric text-sky-300">{money(row.cashbox_balance_iqd)}</td>
    </tr>
  )
}

export default function BranchComparisonPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate, setEndDate] = useState(toDateInput(today))

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['branch-comparison', startDate, endDate],
    queryFn: () => getBranchComparison({ start_date: startDate, end_date: endDate }),
    staleTime: 60_000,
    retry: 1,
  })

  const sortedBranches = [...(data?.branches ?? [])].sort((a, b) => b.sales_total_iqd - a.sales_total_iqd)
  const bestBranch = sortedBranches[0]

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
            <Building2 className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h1 className="section-title">مقارنة الفروع</h1>
            <p className="section-subtitle">
              {isLoading ? 'جاري التحميل...' : `${data?.branches.length ?? 0} فرع · ${formatDate(startDate)} - ${formatDate(endDate)}`}
            </p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-2">
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          تحديث
        </Button>
      </div>

      <div className="dash-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">من تاريخ</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-9 border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-9 border-white/10 bg-white/5" />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
              <CalendarDays className="me-1.5 inline h-3.5 w-3.5" />
              الفترة: {formatDate(startDate)} - {formatDate(endDate)}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400/60" />
          <p className="mt-3 text-sm text-muted-foreground">تعذر تحميل مقارنة الفروع</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="إجمالي المبيعات" value={money(data.totals.sales_total_iqd)} icon={TrendingUp} tone="border-amber-500/20 bg-amber-500/10 text-amber-300" />
            <SummaryCard label="المقبوض" value={money(data.totals.sales_paid_iqd)} icon={Wallet} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300" />
            <SummaryCard label="صافي الربح" value={money(data.totals.net_profit_iqd)} icon={TrendingUp} tone="border-violet-500/20 bg-violet-500/10 text-violet-300" />
            <SummaryCard label="أفضل فرع" value={bestBranch?.branch?.name ?? '-'} icon={Building2} tone="border-sky-500/20 bg-sky-500/10 text-sky-300" />
          </div>

          <section className="dash-card overflow-hidden">
            <div className="dash-header">
              <div>
                <p className="dash-title">تفاصيل الفروع</p>
                <p className="dash-sub">{data.branches.length} فرع ضمن الصلاحيات الحالية</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b border-border bg-white/[0.02]">
                  <tr>
                    {['الفرع', 'مبيعات', 'مشتريات', 'إجمالي المبيعات', 'المقبوض', 'المتبقي', 'المصاريف', 'صافي الربح', 'رصيد الصندوق'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-start text-[10px] font-semibold text-muted-foreground">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedBranches.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">لا توجد فروع ضمن الصلاحيات الحالية</td></tr>
                  ) : sortedBranches.map((row) => (
                    <BranchRow key={row.branch?.id ?? row.branch?.name ?? 'branch'} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
