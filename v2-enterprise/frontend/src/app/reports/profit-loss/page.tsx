'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, TrendingUp, TrendingDown, Scale, RefreshCw } from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getProfitAndLoss } from '@/lib/api/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/shared/SectionCard'

export default function ProfitLossPage() {
  const today = new Date()
  const firstOfYear = `${today.getFullYear()}-01-01`
  const todayStr = today.toISOString().slice(0, 10)

  const [fromDate, setFromDate] = useState(firstOfYear)
  const [toDate, setToDate] = useState(todayStr)
  const [applied, setApplied] = useState({ from: firstOfYear, to: todayStr })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['profit-loss', applied.from, applied.to],
    queryFn: () => getProfitAndLoss(applied.from, applied.to),
  })

  const netProfit = data?.netProfitOrLoss ?? 0
  const isProfitable = netProfit >= 0

  return (
    <div className="space-y-5 mx-auto max-w-5xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            ← التقارير
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">قائمة الأرباح والخسائر</h1>
          <p className="text-xs text-muted-foreground">إيرادات ومصروفات الفترة المالية</p>
        </div>
        <div className="mr-auto">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <SectionCard title="الفترة الزمنية">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">من</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 bg-secondary/30" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">إلى</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 bg-secondary/30" />
          </div>
          <Button size="sm" onClick={() => setApplied({ from: fromDate, to: toDate })} className="bg-cyan-600 text-white hover:bg-cyan-500">
            عرض
          </Button>
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i=><Skeleton key={i} className="h-24 rounded-lg"/>)}</div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <AlertCircle className="h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل التقرير</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              </div>
              <p className="font-numeric text-lg font-bold text-emerald-400">{formatMoney(data.totalRevenues, 'IQD')}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                </div>
                <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
              </div>
              <p className="font-numeric text-lg font-bold text-rose-400">{formatMoney(data.totalExpenses, 'IQD')}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', isProfitable ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-rose-500/20 bg-rose-500/10')}>
                  <Scale className={cn('h-4 w-4', isProfitable ? 'text-cyan-400' : 'text-rose-400')} />
                </div>
                <p className="text-xs text-muted-foreground">{isProfitable ? 'صافي الربح' : 'صافي الخسارة'}</p>
              </div>
              <p className={cn('font-numeric text-lg font-bold', isProfitable ? 'text-cyan-400' : 'text-rose-400')}>{formatMoney(Math.abs(netProfit), 'IQD')}</p>
            </div>
          </div>

          {/* Two columns: revenues and expenses */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SectionCard title={`الإيرادات (${data.revenues.length})`}>
              {data.revenues.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">لا توجد إيرادات في هذه الفترة</p>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border/40 bg-secondary/20 text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-right">الحساب</th>
                      <th className="px-4 py-2.5 text-left">المبلغ</th>
                    </tr></thead>
                    <tbody>
                      {data.revenues.map((r, i) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-medium text-foreground">{r.accountName}</p>
                            <p className="text-[10px] text-muted-foreground">{r.accountCode}</p>
                          </td>
                          <td className="px-4 py-2.5 font-numeric text-xs text-left text-emerald-400">{formatMoney(r.amount, 'IQD')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border/50 bg-secondary/20">
                      <td className="px-4 py-2.5 text-xs font-bold">الإجمالي</td>
                      <td className="px-4 py-2.5 font-numeric text-xs font-bold text-left text-emerald-400">{formatMoney(data.totalRevenues, 'IQD')}</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title={`المصروفات (${data.expenses.length})`}>
              {data.expenses.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">لا توجد مصروفات في هذه الفترة</p>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border/40 bg-secondary/20 text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-right">الحساب</th>
                      <th className="px-4 py-2.5 text-left">المبلغ</th>
                    </tr></thead>
                    <tbody>
                      {data.expenses.map((r, i) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-secondary/20">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-medium text-foreground">{r.accountName}</p>
                            <p className="text-[10px] text-muted-foreground">{r.accountCode}</p>
                          </td>
                          <td className="px-4 py-2.5 font-numeric text-xs text-left text-rose-400">{formatMoney(r.amount, 'IQD')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t border-border/50 bg-secondary/20">
                      <td className="px-4 py-2.5 text-xs font-bold">الإجمالي</td>
                      <td className="px-4 py-2.5 font-numeric text-xs font-bold text-left text-rose-400">{formatMoney(data.totalExpenses, 'IQD')}</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}
