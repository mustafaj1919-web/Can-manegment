'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, RefreshCw, AlertCircle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { getInventoryValuation } from '@/lib/api/reports'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export default function InventoryValuationPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10))

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory-valuation', asOfDate],
    queryFn: () => getInventoryValuation(asOfDate),
  })

  const unrealizedGain = data ? data.total_book_value - data.total_purchase_cost : 0

  return (
    <div className="flex flex-col gap-5 p-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reports" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted/40 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
          <Package className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">تقييم المخزون</h1>
          <p className="text-xs text-muted-foreground">القيمة الدفترية الحالية لجميع السيارات في المخزون</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">بتاريخ</label>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-40 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </Button>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">عدد السيارات</p>
            <p className="font-numeric text-2xl font-bold text-foreground">{data.total_vehicles_count}</p>
            <p className="text-xs text-muted-foreground">سيارة في المخزون</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">إجمالي تكلفة الشراء</p>
            <p className="font-numeric text-lg font-bold text-foreground">{formatMoney(data.total_purchase_cost, 'IQD')}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">إجمالي القيمة الدفترية</p>
            <p className="font-numeric text-lg font-bold text-blue-400">{formatMoney(data.total_book_value, 'IQD')}</p>
          </div>
          <div className={cn(
            'rounded-xl border p-4',
            unrealizedGain > 0 ? 'border-emerald-500/30 bg-emerald-500/5' :
            unrealizedGain < 0 ? 'border-rose-500/30 bg-rose-500/5' :
            'border-border bg-card'
          )}>
            <p className="mb-1 text-xs text-muted-foreground">فرق التكاليف الإضافية</p>
            <p className={cn(
              'font-numeric text-lg font-bold',
              unrealizedGain > 0 ? 'text-emerald-400' : unrealizedGain < 0 ? 'text-rose-400' : 'text-foreground'
            )}>
              {unrealizedGain > 0 ? '+' : ''}{formatMoney(unrealizedGain, 'IQD')}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['السيارة', 'رقم الشاصي', 'تاريخ الشراء', 'المورد', 'تكلفة الشراء', 'القيمة الدفترية', 'الفرق'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
              ))}
              {isError && (
                <tr><td colSpan={7} className="px-4 py-8 text-center">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-400" />
                  <p className="text-sm text-muted-foreground">فشل تحميل البيانات</p>
                </td></tr>
              )}
              {!isLoading && !isError && (!data?.vehicles || data.vehicles.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm text-muted-foreground">لا توجد سيارات في المخزون</p>
                </td></tr>
              )}
              {data?.vehicles.map((v) => {
                const diff = v.book_value - v.purchase_cost
                return (
                  <tr key={v.vehicle_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{v.model}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.chassis_number}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{v.purchase_date ? formatDate(v.purchase_date) : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.supplier_name || '—'}</td>
                    <td className="px-4 py-3 font-numeric text-foreground">{formatMoney(v.purchase_cost, 'IQD')}</td>
                    <td className="px-4 py-3 font-numeric font-semibold text-blue-400">{formatMoney(v.book_value, 'IQD')}</td>
                    <td className={cn(
                      'px-4 py-3 font-numeric text-xs',
                      diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-muted-foreground'
                    )}>
                      {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatMoney(diff, 'IQD')}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {data && data.vehicles.length > 0 && (
              <tfoot className="border-t-2 border-border bg-muted/30">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-muted-foreground">الإجمالي</td>
                  <td className="px-4 py-3 font-numeric font-bold text-foreground">{formatMoney(data.total_purchase_cost, 'IQD')}</td>
                  <td className="px-4 py-3 font-numeric font-bold text-blue-400">{formatMoney(data.total_book_value, 'IQD')}</td>
                  <td className={cn('px-4 py-3 font-numeric font-bold text-xs', unrealizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {unrealizedGain !== 0 ? `${unrealizedGain > 0 ? '+' : ''}${formatMoney(unrealizedGain, 'IQD')}` : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
