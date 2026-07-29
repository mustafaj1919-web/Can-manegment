'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, RefreshCw, Download, TrendingUp, TrendingDown,
  ShoppingCart, Users, Car
} from 'lucide-react'
import { getBranchComparison } from '@/lib/api/reports'
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

export default function BranchComparisonPage() {
  const [fromDate, setFromDate] = useState(toDateInput(yearAgo))
  const [toDate, setToDate]     = useState(toDateInput(today))

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['branch-comparison', fromDate, toDate],
    queryFn:  () => getBranchComparison({ start_date: fromDate, end_date: toDate }),
    staleTime: 60_000,
    retry: 1,
  })

  async function handleExport() {
    if (!data?.branches?.length) return
    const headers = ['الفرع', 'مبيعات', 'مشتريات', 'عملاء', 'سيارات متاحة', 'سيارات مباعة', 'إيرادات', 'مشتريات', 'مصاريف', 'صافي الربح']
    const rows = data.branches.map(b => [
      b.branch_name, b.sales_count, b.purchases_count,
      b.customers_count, b.available_cars, b.sold_cars,
      b.total_revenue, b.total_purchases, b.total_expenses, b.net_profit,
    ])
    await exportXlsx('branch-comparison', headers, rows)
  }

  const totals = data?.totals

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
            <Building2 className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="section-title">مقارنة الفروع</h1>
            <p className="section-subtitle">تحليل الأداء المالي والتشغيلي لكل فرع في الفترة المحددة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={handleExport} disabled={!data?.branches?.length} className="gap-2 h-8">
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
              عرض المقارنة
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="glass rounded-xl py-12 text-center text-sm text-muted-foreground">
          تعذر تحميل بيانات مقارنة الفروع
        </div>
      ) : data ? (
        <>
          {/* Totals Strip */}
          {totals && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
                <p className="mt-1 font-numeric text-lg font-black text-emerald-400">{money(totals.total_revenue)}</p>
                <p className="text-[10px] text-muted-foreground/60">{totals.sales_count} عملية بيع</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                <p className="mt-1 font-numeric text-lg font-black text-amber-400">{money(totals.total_purchases)}</p>
                <p className="text-[10px] text-muted-foreground/60">{totals.purchases_count} عملية</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground">إجمالي المصاريف</p>
                <p className="mt-1 font-numeric text-lg font-black text-rose-400">{money(totals.total_expenses)}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground">صافي الربح الكلي</p>
                <p className={`mt-1 font-numeric text-lg font-black ${totals.net_profit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {money(totals.net_profit)}
                </p>
              </div>
            </div>
          )}

          {/* Branches */}
          {!data.branches?.length ? (
            <div className="glass rounded-xl py-16 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد فروع لعرض بياناتها</p>
            </div>
          ) : (
            <>
              {/* Branch Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.branches.map((branch) => {
                  const netPos = branch.net_profit >= 0
                  return (
                    <div key={branch.branch_id} className="glass rounded-xl p-5 space-y-4">
                      {/* Branch Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
                            <Building2 className="h-4 w-4 text-sky-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{branch.branch_name}</p>
                            <p className="text-[10px] text-muted-foreground/60">كود: {branch.branch_code}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${branch.is_active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-border/30 bg-secondary/30 text-muted-foreground'}`}>
                          {branch.is_active ? 'نشط' : 'موقف'}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-secondary/30 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <ShoppingCart className="h-3 w-3 text-muted-foreground/60" />
                          </div>
                          <p className="font-numeric text-base font-bold text-foreground">{branch.sales_count}</p>
                          <p className="text-[9px] text-muted-foreground">مبيعات</p>
                        </div>
                        <div className="rounded-lg bg-secondary/30 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Users className="h-3 w-3 text-muted-foreground/60" />
                          </div>
                          <p className="font-numeric text-base font-bold text-foreground">{branch.customers_count}</p>
                          <p className="text-[9px] text-muted-foreground">عملاء</p>
                        </div>
                        <div className="rounded-lg bg-secondary/30 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Car className="h-3 w-3 text-muted-foreground/60" />
                          </div>
                          <p className="font-numeric text-base font-bold text-foreground">{branch.available_cars}</p>
                          <p className="text-[9px] text-muted-foreground">سيارة متاحة</p>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="space-y-1.5 border-t border-border/20 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">الإيرادات</span>
                          <span className="font-numeric font-semibold text-emerald-400">{money(branch.total_revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">المشتريات</span>
                          <span className="font-numeric font-semibold text-amber-400">{money(branch.total_purchases)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">المصاريف</span>
                          <span className="font-numeric font-semibold text-rose-400">{money(branch.total_expenses)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/20 pt-1.5 text-sm">
                          <span className="font-semibold text-foreground">صافي الربح</span>
                          <div className="flex items-center gap-1.5">
                            {netPos
                              ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                              : <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
                            <span className={`font-numeric font-black ${netPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {money(branch.net_profit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Comparison Table */}
              <div className="glass overflow-hidden rounded-xl">
                <div className="border-b border-border/30 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">جدول مقارنة الفروع</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-secondary/20">
                        <th className="py-3 pr-4 text-right font-semibold text-muted-foreground">الفرع</th>
                        <th className="py-3 px-3 text-center font-semibold text-muted-foreground">مبيعات</th>
                        <th className="py-3 px-3 text-center font-semibold text-muted-foreground">عملاء</th>
                        <th className="py-3 px-3 text-center font-semibold text-muted-foreground">سيارات</th>
                        <th className="py-3 px-3 text-left font-semibold text-emerald-400">الإيرادات</th>
                        <th className="py-3 px-3 text-left font-semibold text-amber-400">المشتريات</th>
                        <th className="py-3 px-3 text-left font-semibold text-rose-400">المصاريف</th>
                        <th className="py-3 pl-4 text-left font-semibold text-cyan-400">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branches.map((branch) => (
                        <tr key={branch.branch_id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-foreground whitespace-nowrap">
                            {branch.branch_name}
                          </td>
                          <td className="py-3 px-3 text-center text-muted-foreground">{branch.sales_count}</td>
                          <td className="py-3 px-3 text-center text-muted-foreground">{branch.customers_count}</td>
                          <td className="py-3 px-3 text-center text-muted-foreground">
                            {branch.available_cars} / {branch.sold_cars + branch.available_cars}
                          </td>
                          <td className="py-3 px-3 text-left font-numeric font-semibold text-emerald-400 whitespace-nowrap">
                            {money(branch.total_revenue)}
                          </td>
                          <td className="py-3 px-3 text-left font-numeric font-semibold text-amber-400 whitespace-nowrap">
                            {money(branch.total_purchases)}
                          </td>
                          <td className="py-3 px-3 text-left font-numeric font-semibold text-rose-400 whitespace-nowrap">
                            {money(branch.total_expenses)}
                          </td>
                          <td className={`py-3 pl-4 text-left font-numeric font-black whitespace-nowrap ${branch.net_profit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                            {money(branch.net_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {totals && (
                      <tfoot>
                        <tr className="border-t border-border/50 bg-secondary/30">
                          <td className="py-3 pr-4 text-xs font-black text-muted-foreground">الإجمالي</td>
                          <td className="py-3 px-3 text-center font-bold text-foreground">{totals.sales_count}</td>
                          <td className="py-3 px-3 text-center font-bold text-foreground">—</td>
                          <td className="py-3 px-3 text-center font-bold text-foreground">—</td>
                          <td className="py-3 px-3 text-left font-numeric font-black text-emerald-400 whitespace-nowrap">{money(totals.total_revenue)}</td>
                          <td className="py-3 px-3 text-left font-numeric font-black text-amber-400 whitespace-nowrap">{money(totals.total_purchases)}</td>
                          <td className="py-3 px-3 text-left font-numeric font-black text-rose-400 whitespace-nowrap">{money(totals.total_expenses)}</td>
                          <td className={`py-3 pl-4 text-left font-numeric font-black whitespace-nowrap ${totals.net_profit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>{money(totals.net_profit)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
