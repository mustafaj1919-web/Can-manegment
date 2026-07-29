'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, RefreshCw, TrendingUp, TrendingDown, Scale, Download } from 'lucide-react'
import { getCashboxMovement } from '@/lib/api/vouchers'
import { formatMoney, formatDate } from '@/lib/utils'
import { exportXlsx } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

function money(v: number) { return formatMoney(v, 'IQD') }

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today    = new Date()
const monthAgo = new Date(); monthAgo.setDate(today.getDate() - 30)

export default function CashboxMovementPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate, setEndDate]     = useState(toDateInput(today))
  const [accountCode, setAccountCode] = useState('111001')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['cashbox-movement', accountCode, startDate, endDate],
    queryFn:  () => getCashboxMovement({ account_code: accountCode, start_date: startDate, end_date: endDate }),
    staleTime: 30_000,
    retry: 1,
  })

  async function handleExport() {
    if (!data?.rows?.length) return
    const headers = ['التاريخ', 'المرجع', 'البيان', 'وارد', 'صادر', 'الرصيد']
    const rows = data.rows.map(r => [
      r.date ? new Date(r.date).toLocaleDateString('ar-IQ') : '',
      r.journal_ref ?? '',
      r.description ?? '',
      r.inflow,
      r.outflow,
      r.balance,
    ])
    await exportXlsx(`cashbox-${accountCode}`, headers, rows)
  }

  const hasData = !isLoading && !isError && data

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="section-title">حركة الصندوق التفصيلية</h1>
            <p className="section-subtitle">
              {hasData ? `${data.account_name} (${data.account_code})` : 'الحركات والعمليات النقدية التفصيلية'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={handleExport} disabled={!hasData || !data?.rows?.length} className="gap-2 h-8">
            <Download className="h-3.5 w-3.5" />
            تصدير
          </Button>
          <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">كود الحساب</label>
            <select
              value={accountCode}
              onChange={e => setAccountCode(e.target.value)}
              aria-label="كود الحساب"
              className="h-9 w-full rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="111001">111001 - الصندوق الرئيسي</option>
              <option value="111002">111002 - صندوق فرعي</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">من تاريخ</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => refetch()} disabled={isFetching} className="h-9 w-full gap-2 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              عرض الحركة
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="glass rounded-xl py-12 text-center text-sm text-muted-foreground">
          تعذر تحميل بيانات الصندوق
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الوارد</p>
                  <p className="mt-1 font-numeric text-xl font-black text-emerald-400">{money(data?.total_inflow ?? 0)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الصادر</p>
                  <p className="mt-1 font-numeric text-xl font-black text-rose-400">{money(data?.total_outflow ?? 0)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                  <TrendingDown className="h-5 w-5 text-rose-400" />
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                  <p className={`mt-1 font-numeric text-xl font-black ${(data?.final_balance ?? 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {money(data?.final_balance ?? 0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                  <Scale className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Movement Table */}
          {!data?.rows?.length ? (
            <div className="glass rounded-xl py-16 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد حركات في هذه الفترة</p>
            </div>
          ) : (
            <div className="glass overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-secondary/20">
                      <th className="py-3 pr-4 text-right font-semibold text-muted-foreground">التاريخ</th>
                      <th className="py-3 px-3 text-right font-semibold text-muted-foreground">المرجع</th>
                      <th className="py-3 px-3 text-right font-semibold text-muted-foreground">البيان</th>
                      <th className="py-3 px-3 text-left font-semibold text-emerald-400">وارد</th>
                      <th className="py-3 px-3 text-left font-semibold text-rose-400">صادر</th>
                      <th className="py-3 pl-4 text-left font-semibold text-muted-foreground">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {row.date ? new Date(row.date).toLocaleDateString('ar-IQ') : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground/70 whitespace-nowrap">
                          {row.journal_ref ?? '—'}
                        </td>
                        <td className="py-3 px-3 text-foreground max-w-[240px] truncate">
                          {row.description ?? '—'}
                        </td>
                        <td className="py-3 px-3 text-left font-numeric font-semibold text-emerald-400 whitespace-nowrap">
                          {row.inflow > 0 ? money(row.inflow) : '—'}
                        </td>
                        <td className="py-3 px-3 text-left font-numeric font-semibold text-rose-400 whitespace-nowrap">
                          {row.outflow > 0 ? money(row.outflow) : '—'}
                        </td>
                        <td className={`py-3 pl-4 text-left font-numeric font-bold whitespace-nowrap ${row.balance >= 0 ? 'text-foreground' : 'text-rose-400'}`}>
                          {money(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/50 bg-secondary/30">
                      <td colSpan={3} className="py-3 pr-4 text-xs font-bold text-muted-foreground">المجموع</td>
                      <td className="py-3 px-3 text-left font-numeric font-black text-emerald-400 whitespace-nowrap">{money(data.total_inflow)}</td>
                      <td className="py-3 px-3 text-left font-numeric font-black text-rose-400 whitespace-nowrap">{money(data.total_outflow)}</td>
                      <td className={`py-3 pl-4 text-left font-numeric font-black whitespace-nowrap ${data.final_balance >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {money(data.final_balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
