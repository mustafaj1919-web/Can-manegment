'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, RefreshCw, Download, TrendingUp, TrendingDown, Scale,
  ChevronDown, ChevronUp, Layers
} from 'lucide-react'
import { getCostCenterReport } from '@/lib/api/reports'
import { formatMoney } from '@/lib/utils'
import { exportXlsx } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

function money(v: number) { return formatMoney(v, 'IQD') }

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today   = new Date()
const yearAgo = new Date(today.getFullYear(), 0, 1)

export default function CostCenterPage() {
  const [fromDate, setFromDate] = useState(toDateInput(yearAgo))
  const [toDate, setToDate]     = useState(toDateInput(today))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['cost-center-report', fromDate, toDate],
    queryFn:  () => getCostCenterReport({ from_date: fromDate, to_date: toDate }),
    staleTime: 60_000,
    retry: 1,
  })

  function toggleExpand(center: string) {
    setExpanded(prev => ({ ...prev, [center]: !prev[center] }))
  }

  async function handleExport() {
    if (!data) return
    const headers = ['مركز التكلفة', 'عدد البنود', 'المجموع (IQD)']
    const rows: (string | number)[][] = [
      ...(data.expense_centers ?? []).map(g => [g.center, g.count, g.total]),
      ...(data.vehicle_cost_centers ?? []).map(g => [g.center, g.count, g.total]),
      ['---', '', ''],
      ['إجمالي الإيرادات', data.sales_count, data.total_revenue],
      ['إجمالي المصاريف', '', data.total_expenses],
      ['تكاليف السيارات', '', data.total_vehicle_costs],
      ['صافي النتيجة', '', data.net_result],
    ]
    await exportXlsx('cost-center-report', headers, rows)
  }

  const allCenters = [
    ...(data?.expense_centers ?? []),
    ...(data?.vehicle_cost_centers ?? [])
  ]
  const netPositive = (data?.net_result ?? 0) >= 0

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <Building2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="section-title">تقرير مراكز التكلفة</h1>
            <p className="section-subtitle">الإيرادات والمصاريف مجمّعة حسب كل مركز تكلفة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={handleExport} disabled={!data} className="gap-2 h-8">
            <Download className="h-3.5 w-3.5" />تصدير
          </Button>
          <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />تحديث
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">من تاريخ</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => refetch()} disabled={isFetching} className="h-9 w-full gap-2 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              عرض التقرير
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="glass rounded-xl py-12 text-center text-sm text-muted-foreground">
          تعذر تحميل بيانات مراكز التكلفة
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              <p className="mt-1 font-numeric text-lg font-black text-emerald-400">{money(data.total_revenue)}</p>
              <p className="text-[10px] text-muted-foreground/60">{data.sales_count} عملية بيع</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">إجمالي المصاريف</p>
              <p className="mt-1 font-numeric text-lg font-black text-rose-400">{money(data.total_expenses)}</p>
              <p className="text-[10px] text-muted-foreground/60">{data.expense_centers?.length ?? 0} مركز</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">تكاليف السيارات</p>
              <p className="mt-1 font-numeric text-lg font-black text-amber-400">{money(data.total_vehicle_costs)}</p>
              <p className="text-[10px] text-muted-foreground/60">{data.vehicle_cost_centers?.length ?? 0} نوع</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">صافي النتيجة</p>
              <p className={`mt-1 font-numeric text-lg font-black ${netPositive ? 'text-cyan-400' : 'text-rose-400'}`}>
                {money(data.net_result)}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {netPositive
                  ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                  : <TrendingDown className="h-3 w-3 text-rose-400" />}
                <span className={`text-[10px] font-semibold ${netPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netPositive ? 'ربح' : 'خسارة'}
                </span>
              </div>
            </div>
          </div>

          {/* Cost Centers List */}
          {allCenters.length === 0 ? (
            <div className="glass rounded-xl py-16 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد بيانات لمراكز التكلفة في هذه الفترة</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">
                تفاصيل مراكز التكلفة ({allCenters.length} مركز)
              </p>
              {allCenters.map((group) => {
                const isOpen = expanded[group.center] ?? false
                const totalCosts = (data.total_expenses ?? 0) + (data.total_vehicle_costs ?? 0)
                const pct = totalCosts > 0 ? (group.total / totalCosts) * 100 : 0
                return (
                  <div key={group.center} className="glass overflow-hidden rounded-xl">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-4 text-right hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleExpand(group.center)}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-sm font-semibold text-foreground">{group.center}</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500/70 transition-all"
                            style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="font-numeric text-sm font-bold text-foreground">{money(group.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{group.count} بند • {pct.toFixed(1)}%</p>
                      </div>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                    </button>

                    {isOpen && group.items.length > 0 && (
                      <div className="border-t border-border/20 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/20 bg-secondary/20">
                              <th className="py-2.5 pr-4 text-right font-semibold text-muted-foreground">التاريخ</th>
                              <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">البيان</th>
                              <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">الملاحظات</th>
                              <th className="py-2.5 pl-4 text-left font-semibold text-muted-foreground">المبلغ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(group.items as any[]).map((item, i) => (
                              <tr key={i} className="border-b border-border/10 last:border-0 hover:bg-secondary/10">
                                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                                  {item.date ? new Date(item.date).toLocaleDateString('ar-IQ') : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-foreground max-w-[200px] truncate">
                                  {item.title ?? '—'}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground/70 max-w-[180px] truncate">
                                  {item.notes ?? '—'}
                                </td>
                                <td className="py-2.5 pl-4 text-left font-numeric font-semibold text-rose-400 whitespace-nowrap">
                                  {money(item.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border/30 bg-secondary/20">
                              <td colSpan={3} className="py-2.5 pr-4 text-xs font-bold text-muted-foreground">
                                مجموع {group.center}
                              </td>
                              <td className="py-2.5 pl-4 text-left font-numeric font-black text-rose-400 whitespace-nowrap">
                                {money(group.total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                    {isOpen && group.items.length === 0 && (
                      <p className="border-t border-border/20 px-4 py-3 text-xs text-muted-foreground">
                        لا تفاصيل لهذا المركز
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Summary Footer */}
              <div className="glass rounded-xl p-4 border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">ملخص المراكز</span>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">إجمالي التكاليف</p>
                      <p className="font-numeric font-black text-rose-400">
                        {money((data.total_expenses ?? 0) + (data.total_vehicle_costs ?? 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">صافي النتيجة</p>
                      <p className={`font-numeric font-black ${netPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {money(data.net_result)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
