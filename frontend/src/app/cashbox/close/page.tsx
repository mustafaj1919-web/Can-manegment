'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import {
  getCashboxCloses, createCashboxClose, getCurrentBalance,
  type CashboxCloseRecord,
} from '@/lib/api/vouchers'

const CASH_ACCOUNTS = [
  { code: '111001', name: 'الصندوق الرئيسي' },
  { code: '111002', name: 'صندوق فرع الأصدقاء' },
  { code: '111003', name: 'صندوق فرع الأصدقاء 2' },
]

export default function CashboxClosePage() {
  const [accountCode,    setAccountCode]    = useState('111001')
  const [actualBalance,  setActualBalance]  = useState('')
  const [note,           setNote]           = useState('')
  const [formError,      setFormError]      = useState('')

  const qc = useQueryClient()

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['cashbox-balance', accountCode],
    queryFn:  () => getCurrentBalance(accountCode),
    staleTime: 30_000,
  })

  const { data: closes, isLoading: closesLoading } = useQuery({
    queryKey: ['cashbox-closes', accountCode],
    queryFn:  () => getCashboxCloses(accountCode),
    staleTime: 30_000,
  })

  const closeMutation = useMutation({
    mutationFn: () => createCashboxClose({
      account_code:   accountCode,
      actual_balance: parseFloat(actualBalance),
      note:           note || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashbox-closes'] })
      qc.invalidateQueries({ queryKey: ['cashbox-balance'] })
      setActualBalance(''); setNote(''); setFormError('')
    },
    onError: (err: any) => setFormError(err?.response?.data?.error ?? 'حدث خطأ'),
  })

  const systemBalance = balanceData?.balance ?? null
  const actualNum     = parseFloat(actualBalance) || null
  const difference    = systemBalance !== null && actualNum !== null ? actualNum - systemBalance : null

  function handleClose() {
    setFormError('')
    const parsed = parseFloat(actualBalance)
    if (!actualBalance || isNaN(parsed)) {
      setFormError('يرجى إدخال الرصيد الفعلي'); return
    }
    if (parsed < 0) {
      setFormError('الرصيد الفعلي لا يمكن أن يكون سالباً'); return
    }
    if (!confirm('هل تريد تأكيد إقفال الصندوق؟')) return
    closeMutation.mutate()
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
          <Lock className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="section-title">إقفال الصندوق اليومي</h1>
          <p className="section-subtitle">مطابقة الرصيد النظامي مع الفعلي</p>
        </div>
      </div>

      {/* Account selector */}
      <div className="glass rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[220px]">
            <label className="text-[11px] text-muted-foreground mb-1 block">حساب الصندوق</label>
            <Select value={accountCode} onValueChange={v => { setAccountCode(v); setActualBalance('') }}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASH_ACCOUNTS.map(a => <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchBalance()} className="h-9 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Balance comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">الرصيد النظامي</p>
            {balanceLoading ? (
              <Skeleton className="h-7 w-24 mx-auto" />
            ) : (
              <p className="font-numeric text-lg font-bold text-foreground">
                {systemBalance !== null ? formatMoney(systemBalance, 'IQD') : '—'}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">الرصيد الفعلي</p>
            <Input
              type="number"
              placeholder="أدخل الرصيد الفعلي"
              value={actualBalance}
              onChange={e => setActualBalance(e.target.value)}
              className="h-9 bg-transparent border-white/10 text-center font-numeric text-lg font-bold"
            />
          </div>
          <div className={cn(
            'rounded-xl border p-4 text-center',
            difference === null ? 'border-white/[0.06] bg-white/[0.03]' :
            difference === 0 ? 'border-emerald-500/20 bg-emerald-500/[0.05]' :
            'border-rose-500/20 bg-rose-500/[0.05]'
          )}>
            <p className="text-[11px] text-muted-foreground mb-1">الفرق</p>
            <p className={cn(
              'font-numeric text-lg font-bold',
              difference === null ? 'text-muted-foreground/40' :
              difference === 0 ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {difference !== null ? formatMoney(difference, 'IQD') : '—'}
            </p>
            {difference === 0 && <p className="text-[10px] text-emerald-400 mt-0.5">✓ مطابق</p>}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">ملاحظة الفرق (اختياري)</label>
          <Input
            placeholder="سبب الفرق أو ملاحظة..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="h-9 bg-white/5 border-white/10 text-sm"
          />
        </div>

        {formError && <p className="text-xs text-rose-400">{formError}</p>}

        <Button
          onClick={handleClose}
          disabled={closeMutation.isPending || !actualBalance}
          className="gap-1.5 text-xs"
        >
          <Lock className="h-3.5 w-3.5" />
          {closeMutation.isPending ? 'جاري الإقفال...' : 'تأكيد الإقفال'}
        </Button>
      </div>

      {/* Previous closes */}
      <section className="dash-card overflow-hidden">
        <div className="dash-header">
          <div className="flex items-center gap-2">
            <p className="dash-title">سجل الإقفالات السابقة</p>
          </div>
        </div>
        <div className="dash-body">
          {closesLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
          ) : (closes?.length ?? 0) === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/50">لا توجد إقفالات سابقة</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  {['التاريخ', 'الرصيد النظامي', 'الرصيد الفعلي', 'الفرق', 'المستخدم', 'ملاحظة'].map(h => (
                    <th key={h} className="px-3 py-2 text-start text-[10px] font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closes!.map((c: CashboxCloseRecord) => (
                  <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-xs font-numeric">{c.close_date ?? '—'}</td>
                    <td className="px-3 py-2 text-xs font-numeric">{formatMoney(c.system_balance, 'IQD')}</td>
                    <td className="px-3 py-2 text-xs font-numeric">{formatMoney(c.actual_balance, 'IQD')}</td>
                    <td className="px-3 py-2 text-xs font-numeric">
                      <span className={c.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatMoney(c.difference, 'IQD')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.closed_by ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{c.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
