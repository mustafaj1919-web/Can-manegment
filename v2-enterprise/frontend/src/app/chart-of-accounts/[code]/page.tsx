'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowUpRight, ArrowDownLeft, Scale } from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getAccountMovement } from '@/lib/api/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/shared/SectionCard'
import { DetailHeader } from '@/components/shared/DetailHeader'

export default function AccountStatementPage() {
  const routeParams = useParams<{ code: string }>()
  const code = routeParams?.code ? String(routeParams.code) : ""
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [applied, setApplied] = useState({ from: '', to: '' })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['account-movement', code, applied.from, applied.to],
    queryFn: () => getAccountMovement(code, applied.from || undefined, applied.to || undefined),
    staleTime: 30_000,
    enabled: !!code,
  })

  const balance = data?.final_balance ?? 0

  return (
    <div className="space-y-5 mx-auto max-w-5xl" dir="rtl">
      <DetailHeader
        backHref="/chart-of-accounts"
        backLabel="دليل الحسابات"
        title={data?.account_name ? `كشف حساب: ${data.account_name}` : `كشف حساب: ${code}`}
        subtitle={`رمز الحساب: ${code}`}
      />

      {/* Date filter */}
      <SectionCard title="فلترة الفترة">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">من تاريخ</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 bg-secondary/30 border-border/60" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">إلى تاريخ</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 bg-secondary/30 border-border/60" />
          </div>
          <Button size="sm" onClick={() => setApplied({ from: dateFrom, to: dateTo })} className="bg-cyan-600 text-white hover:bg-cyan-500">
            عرض
          </Button>
          {(applied.from || applied.to) && (
            <Button size="sm" variant="ghost" onClick={() => { setDateFrom(''); setDateTo(''); setApplied({ from: '', to: '' }) }} className="border border-border/50">
              إعادة ضبط
            </Button>
          )}
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertCircle className="h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل كشف الحساب</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">إجمالي المدين</p>
              </div>
              <p className="font-numeric text-lg font-bold text-emerald-400">{formatMoney(data.total_inflow, 'IQD')}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
                  <ArrowDownLeft className="h-4 w-4 text-rose-400" />
                </div>
                <p className="text-xs text-muted-foreground">إجمالي الدائن</p>
              </div>
              <p className="font-numeric text-lg font-bold text-rose-400">{formatMoney(data.total_outflow, 'IQD')}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', balance >= 0 ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-rose-500/20 bg-rose-500/10')}>
                  <Scale className={cn('h-4 w-4', balance >= 0 ? 'text-cyan-400' : 'text-rose-400')} />
                </div>
                <p className="text-xs text-muted-foreground">الرصيد الختامي</p>
              </div>
              <p className={cn('font-numeric text-lg font-bold', balance >= 0 ? 'text-cyan-400' : 'text-rose-400')}>{formatMoney(balance, 'IQD')}</p>
            </div>
          </div>

          {/* Transactions table */}
          <SectionCard title={`حركة الحساب (${data.rows.length} حركة)`}>
            {data.rows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">لا توجد حركات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-secondary/20 text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-right">التاريخ</th>
                      <th className="px-4 py-3 text-right">رقم القيد</th>
                      <th className="px-4 py-3 text-right">البيان</th>
                      <th className="px-4 py-3 text-left">مدين</th>
                      <th className="px-4 py-3 text-left">دائن</th>
                      <th className="px-4 py-3 text-left">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5 font-numeric text-xs text-cyan-300 whitespace-nowrap">{row.journal_ref}</td>
                        <td className="px-4 py-2.5 text-xs text-foreground max-w-[240px]">
                          <p className="truncate">{row.description}</p>
                        </td>
                        <td className="px-4 py-2.5 font-numeric text-xs text-left text-emerald-400 whitespace-nowrap">
                          {row.inflow > 0 ? formatMoney(row.inflow, 'IQD') : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-numeric text-xs text-left text-rose-400 whitespace-nowrap">
                          {row.outflow > 0 ? formatMoney(row.outflow, 'IQD') : '—'}
                        </td>
                        <td className={cn('px-4 py-2.5 font-numeric text-xs font-bold text-left whitespace-nowrap', row.balance >= 0 ? 'text-foreground' : 'text-rose-400')}>
                          {formatMoney(row.balance, 'IQD')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/50 bg-secondary/20 text-xs font-bold">
                      <td colSpan={3} className="px-4 py-3 text-muted-foreground">الإجمالي</td>
                      <td className="px-4 py-3 font-numeric text-left text-emerald-400">{formatMoney(data.total_inflow, 'IQD')}</td>
                      <td className="px-4 py-3 font-numeric text-left text-rose-400">{formatMoney(data.total_outflow, 'IQD')}</td>
                      <td className={cn('px-4 py-3 font-numeric text-left', balance >= 0 ? 'text-cyan-400' : 'text-rose-400')}>{formatMoney(balance, 'IQD')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
