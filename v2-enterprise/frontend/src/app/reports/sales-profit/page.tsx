'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, RefreshCw, AlertCircle, ChevronLeft, DollarSign, Package, BadgeDollarSign } from 'lucide-react'
import Link from 'next/link'
import { getSalesProfitReport } from '@/lib/api/reports'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

function StatCard({ label, value, color = 'default' }: { label: string; value: string; color?: 'green' | 'red' | 'blue' | 'default' }) {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      color === 'green' ? 'border-emerald-500/30 bg-emerald-500/5' :
      color === 'red'   ? 'border-rose-500/30 bg-rose-500/5' :
      color === 'blue'  ? 'border-blue-500/30 bg-blue-500/5' :
      'border-border bg-card'
    )}>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'font-numeric text-lg font-bold',
        color === 'green' ? 'text-emerald-400' :
        color === 'red'   ? 'text-rose-400' :
        color === 'blue'  ? 'text-blue-400' :
        'text-foreground'
      )}>{value}</p>
    </div>
  )
}

export default function SalesProfitPage() {
  const thisYear = new Date().getFullYear()
  const [fromDate, setFromDate] = useState(`${thisYear}-01-01`)
  const [toDate, setToDate]     = useState(new Date().toISOString().slice(0, 10))

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales-profit', fromDate, toDate],
    queryFn: () => getSalesProfitReport({ fromDate, toDate }),
  })

  return (
    <div className="flex flex-col gap-5 p-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reports" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted/40 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">تقرير أرباح المبيعات</h1>
          <p className="text-xs text-muted-foreground">ربحية كل عملية بيع مع المقارنة بالتكلفة</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">من تاريخ</label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">إلى تاريخ</label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </Button>
      </div>

      {/* Summary */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      )}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="إجمالي إيرادات المبيعات" value={formatMoney(data.total_sale_price, 'IQD')} color="blue" />
          <StatCard label="إجمالي التكلفة الدفترية" value={formatMoney(data.total_book_value, 'IQD')} />
          <StatCard label="الربح المباشر" value={formatMoney(data.total_direct_profit, 'IQD')} color="green" />
          <StatCard
            label="صافي الربح الإجمالي"
            value={formatMoney(data.total_overall_profit, 'IQD')}
            color={data.total_overall_profit >= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['رقم العقد', 'التاريخ', 'العميل', 'السيارة', 'سعر البيع', 'التكلفة', 'الربح', 'نوع الدفع'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
              ))}
              {isError && (
                <tr><td colSpan={8} className="px-4 py-8 text-center">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-400" />
                  <p className="text-sm text-muted-foreground">فشل تحميل البيانات</p>
                </td></tr>
              )}
              {!isLoading && !isError && (!data?.sales || data.sales.length === 0) && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <TrendingUp className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm text-muted-foreground">لا توجد مبيعات في هذه الفترة</p>
                </td></tr>
              )}
              {data?.sales.map((s) => {
                const profit = (s.overall_profit ?? s.direct_profit ?? (s.sale_price - s.book_value))
                const isProfit = profit >= 0
                return (
                  <tr key={s.contract_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-400">{s.contract_number}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(s.sale_date)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{s.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.vehicle_model}</td>
                    <td className="px-4 py-3 font-numeric text-foreground">{formatMoney(s.sale_price, 'IQD')}</td>
                    <td className="px-4 py-3 font-numeric text-muted-foreground">{formatMoney(s.book_value, 'IQD')}</td>
                    <td className={cn('px-4 py-3 font-numeric font-semibold', isProfit ? 'text-emerald-400' : 'text-rose-400')}>
                      {isProfit ? '+' : ''}{formatMoney(profit, 'IQD')}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.payment_type ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
