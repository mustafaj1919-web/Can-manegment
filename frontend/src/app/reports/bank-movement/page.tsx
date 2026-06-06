'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getBankMovement } from '@/lib/api/vouchers'

const BANK_ACCOUNTS = [
  { code: '112001', name: 'البنك الأهلي العراقي' },
  { code: '112002', name: 'مصرف الرافدين' },
  { code: '112003', name: 'حساب الدولار' },
]

export default function BankMovementPage() {
  const [accountCode, setAccountCode] = useState('112001')
  const [startDate,   setStartDate]   = useState('')
  const [endDate,     setEndDate]     = useState('')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['bank-movement', accountCode, startDate, endDate],
    queryFn:  () => getBankMovement({
      account_code: accountCode,
      start_date: startDate || undefined,
      end_date:   endDate   || undefined,
    }),
    staleTime: 30_000,
  })

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
            <Building2 className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="section-title">حركة البنك</h1>
            <p className="section-subtitle">{data?.account_name ?? ''} — {data?.rows.length ?? 0} حركة</p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">البنك</label>
          <Select value={accountCode} onValueChange={setAccountCode}>
            <SelectTrigger className="h-9 w-[220px] bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BANK_ACCOUNTS.map(a => <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">من</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-9 w-[145px] bg-white/5 border-white/10 text-xs" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">إلى</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-9 w-[145px] bg-white/5 border-white/10 text-xs" />
        </div>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate('') }} className="h-9 text-xs mt-auto">
            مسح
          </Button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="dash-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">إجمالي الوارد</p>
            <p className="font-numeric text-base font-bold text-emerald-400">{formatMoney(data.total_inflow, 'IQD')}</p>
          </div>
          <div className="dash-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">إجمالي الصادر</p>
            <p className="font-numeric text-base font-bold text-rose-400">{formatMoney(data.total_outflow, 'IQD')}</p>
          </div>
          <div className="dash-card p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">الرصيد النهائي</p>
            <p className={cn('font-numeric text-base font-bold', data.final_balance >= 0 ? 'text-foreground' : 'text-rose-400')}>
              {formatMoney(data.final_balance, 'IQD')}
            </p>
          </div>
        </div>
      )}

      <div className="glass overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
        ) : isError ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل حركة البنك</p>
          </div>
        ) : (data?.rows.length ?? 0) === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/50">لا توجد حركات في الفترة المحددة</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[100px_110px_1fr_110px_110px_120px] border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              {['التاريخ', 'رقم السند', 'البيان', 'وارد (د.ع)', 'صادر (د.ع)', 'الرصيد (د.ع)'].map(h => (
                <span key={h} className="text-[10px] font-medium text-muted-foreground">{h}</span>
              ))}
            </div>
            {data!.rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[100px_110px_1fr_110px_110px_120px] items-center gap-2 px-4 py-2.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                <span className="text-xs text-muted-foreground">{row.date ?? '—'}</span>
                <span className="hidden sm:block font-mono text-[11px] text-indigo-300">
                  {row.voucher_number ?? row.journal_ref ?? '—'}
                </span>
                <span className="text-xs text-foreground/80 truncate">{row.description ?? '—'}</span>
                <span className="hidden sm:block font-numeric text-xs">
                  {row.inflow > 0 ? <span className="text-emerald-400">{row.inflow.toLocaleString()}</span> : <span className="text-muted-foreground/30">—</span>}
                </span>
                <span className="hidden sm:block font-numeric text-xs">
                  {row.outflow > 0 ? <span className="text-rose-400">{row.outflow.toLocaleString()}</span> : <span className="text-muted-foreground/30">—</span>}
                </span>
                <span className={cn(
                  'hidden sm:block font-numeric text-xs font-semibold',
                  row.balance >= 0 ? 'text-foreground' : 'text-rose-400'
                )}>{row.balance.toLocaleString()}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
