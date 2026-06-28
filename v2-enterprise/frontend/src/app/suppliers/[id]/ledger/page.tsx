'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Download, Printer, RefreshCw, BookOpen, TrendingUp, TrendingDown, Wallet, AlertCircle, Banknote, X } from 'lucide-react'
import { cn, formatMoney, formatDate } from '@/lib/utils'
import { getSupplierLedger, paySupplier } from '@/lib/api/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function toDateInput(d: Date) { return d.toISOString().slice(0, 10) }

function SummaryCard({ label, value, icon, colorClass, borderClass }: {
  label: string; value: number; icon: React.ReactNode; colorClass: string; borderClass: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex items-start gap-3', borderClass)}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', borderClass)}>
        <span className={colorClass}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        <p className={cn('mt-1 font-numeric text-base font-black tabular-nums truncate', colorClass)}>
          {formatMoney(value, 'IQD')}
        </p>
      </div>
    </div>
  )
}

function PayDialog({ supplierId, supplierName, balance, onClose, onSuccess }: {
  supplierId: string; supplierName: string; balance: number
  onClose: () => void; onSuccess: () => void
}) {
  const [amount, setAmount]   = useState('')
  const [method, setMethod]   = useState('Cash')
  const [notes,  setNotes]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    setLoading(true)
    try {
      await paySupplier(supplierId, { amount: amt, paymentMethod: method, notes })
      toast.success(`تم سداد ${formatMoney(amt, 'IQD')} للمورد ${supplierName}`)
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'فشل السداد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute left-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary/50">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <Banknote className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">سداد للمورد</h2>
            <p className="text-xs text-muted-foreground/70">{supplierName}</p>
          </div>
        </div>

        {balance > 0 && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground/70">المستحق حالياً</p>
            <p className="font-numeric text-lg font-black text-amber-400">{formatMoney(balance, 'IQD')}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">المبلغ المدفوع (IQD) *</Label>
            <Input
              type="number" min="1" step="any" autoFocus
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePay()}
              placeholder="أدخل المبلغ"
              className="font-numeric bg-secondary/30 border-border/60 text-lg"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-secondary/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">نقداً</SelectItem>
                <SelectItem value="Bank">حوالة بنكية</SelectItem>
                <SelectItem value="Cheque">شيك</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات (اختياري)</Label>
            <Input
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="رقم الإيصال، ملاحظة..."
              className="bg-secondary/30 border-border/60"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={handlePay} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              {loading ? 'جاري السداد...' : 'تأكيد السداد'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SupplierLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const printRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [startDate, setStartDate] = useState(toDateInput(firstOfMonth))
  const [endDate,   setEndDate]   = useState(toDateInput(now))
  const [showPay,   setShowPay]   = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['supplier-ledger', id, startDate, endDate],
    queryFn: () => getSupplierLedger(id, startDate, endDate),
    staleTime: 30_000,
    enabled: !!id,
  })

  function handlePrint() { window.print() }

  function handleExportCsv() {
    if (!data?.entries?.length) return
    const rows = [
      ['التاريخ', 'رقم القيد', 'البيان', 'مدين (IQD)', 'دائن (IQD)', 'الرصيد المتراكم (IQD)'],
      ...data.entries.map((e: any) => [
        formatDate(e.date), e.entry_number, e.description,
        e.debit > 0 ? e.debit.toFixed(0) : '',
        e.credit > 0 ? e.credit.toFixed(0) : '',
        e.running_balance.toFixed(0)
      ])
    ]
    const csv = '﻿' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `كشف-${data.supplier?.name}-${startDate}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const balance = data?.summary?.balance ?? 0
  const isOwed  = balance > 0

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; inset: 0; background: white; padding: 24px; color: black; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
          th { background: #f3f4f6; font-weight: 700; }
          .print-header { text-align: center; margin-bottom: 16px; }
          .print-summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
          .print-summary-card { border: 1px solid #ccc; border-radius: 8px; padding: 8px 12px; min-width: 140px; }
        }
      `}</style>

      {showPay && (
        <PayDialog
          supplierId={id}
          supplierName={data?.supplier?.name ?? ''}
          balance={balance}
          onClose={() => setShowPay(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger', id] })
            refetch()
          }}
        />
      )}

      <div className="space-y-5" dir="rtl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
              <BookOpen className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold text-foreground">
                كشف حساب المورد{data?.supplier?.name ? `: ${data.supplier.name}` : ''}
              </h1>
              <p className="text-xs text-muted-foreground/60 mt-0.5">جميع الحركات المالية بالرصيد المتراكم</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!data?.entries?.length} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!data?.entries?.length} className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white">
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
            {/* ── زر السداد ── */}
            <Button
              size="sm"
              onClick={() => setShowPay(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              <Banknote className="h-3.5 w-3.5" />
              سداد للمورد
            </Button>
          </div>
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/30 bg-secondary/10 px-4 py-3 no-print">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">من:</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-8 w-36 border-border/50 bg-secondary/30 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">إلى:</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-8 w-36 border-border/50 bg-secondary/30 text-xs" />
          </div>
        </div>

        {/* Summary cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 no-print">
            <SummaryCard label="إجمالي المشتريات" value={data.summary.total_credit}
              icon={<TrendingUp className="h-4 w-4" />} colorClass="text-rose-400" borderClass="border-rose-500/20 bg-rose-500/5" />
            <SummaryCard label="إجمالي المدفوع" value={data.summary.total_debit}
              icon={<TrendingDown className="h-4 w-4" />} colorClass="text-emerald-400" borderClass="border-emerald-500/20 bg-emerald-500/5" />
            <SummaryCard label="الرصيد الحالي" value={Math.abs(balance)}
              icon={<Wallet className="h-4 w-4" />}
              colorClass={isOwed ? 'text-amber-400' : 'text-foreground'}
              borderClass={isOwed ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/30 bg-secondary/10'} />
            <SummaryCard label="مستحقات غير مسددة" value={data.summary.unpaid_purchases}
              icon={<AlertCircle className="h-4 w-4" />}
              colorClass={data.summary.unpaid_purchases > 0 ? 'text-rose-400' : 'text-muted-foreground'}
              borderClass={data.summary.unpaid_purchases > 0 ? 'border-rose-500/20 bg-rose-500/5' : 'border-border/20 bg-secondary/5'} />
          </div>
        )}

        {/* Print area */}
        <div id="print-area">
          <div className="hidden print-header">
            <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
              كشف حساب المورد: {data?.supplier?.name}
            </h2>
            <p style={{ fontSize: 11, color: '#666' }}>الفترة: {startDate} — {endDate}</p>
            <div className="print-summary">
              {data?.summary && <>
                <div className="print-summary-card"><b>المشتريات:</b> {formatMoney(data.summary.total_credit, 'IQD')}</div>
                <div className="print-summary-card"><b>المدفوع:</b> {formatMoney(data.summary.total_debit, 'IQD')}</div>
                <div className="print-summary-card"><b>الرصيد:</b> {formatMoney(balance, 'IQD')}</div>
                <div className="print-summary-card"><b>غير مسدد:</b> {formatMoney(data.summary.unpaid_purchases, 'IQD')}</div>
              </>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/30">
            <div className="flex items-center justify-between border-b border-border/30 bg-secondary/20 px-5 py-3 no-print">
              <p className="text-sm font-semibold text-foreground">
                حركات الحساب
                {data?.entries?.length ? (
                  <span className="mr-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {data.entries.length} حركة
                  </span>
                ) : null}
              </p>
              {balance > 0 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400">
                  مستحق للمورد: {formatMoney(balance, 'IQD')}
                </span>
              )}
              {balance === 0 && data?.entries?.length ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
                  الحساب مسدد بالكامل
                </span>
              ) : null}
            </div>

            {isLoading ? (
              <div className="space-y-px p-3">
                {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 rounded-md" />)}
              </div>
            ) : !data?.entries?.length ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">لا توجد حركات في هذه الفترة</p>
                <p className="text-xs text-muted-foreground/60">جرّب توسيع نطاق التاريخ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/30">
                      <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">التاريخ</th>
                      <th className="w-36 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">رقم القيد</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">البيان</th>
                      <th className="w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-500/80">مدين ✓</th>
                      <th className="w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-rose-500/80">دائن ↑</th>
                      <th className="w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {(data.entries as any[]).map((entry, i) => {
                      const isPurchase = entry.reference_type === 'Purchase' && entry.credit > 0
                      const isPayment  = entry.debit > 0
                      const bal        = entry.running_balance as number
                      return (
                        <tr key={i} className={cn(
                          'transition-colors hover:bg-secondary/20',
                          isPurchase && 'bg-rose-500/[0.02]',
                          isPayment  && 'bg-emerald-500/[0.02]',
                        )}>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(entry.date)}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[10px] text-muted-foreground/60">{entry.entry_number}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', isPurchase ? 'bg-rose-400' : 'bg-emerald-400')} />
                              <span className="text-xs text-foreground/90 leading-tight">{entry.description}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-left font-numeric text-xs font-semibold text-emerald-400">
                            {entry.debit > 0 ? formatMoney(entry.debit, 'IQD') : <span className="text-border">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-left font-numeric text-xs font-semibold text-rose-400">
                            {entry.credit > 0 ? formatMoney(entry.credit, 'IQD') : <span className="text-border">—</span>}
                          </td>
                          <td className={cn('px-4 py-2.5 text-left font-numeric text-xs font-bold',
                            bal > 0 ? 'text-amber-400' : bal < 0 ? 'text-rose-400' : 'text-emerald-400')}>
                            {formatMoney(bal, 'IQD')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/40 bg-secondary/30">
                      <td colSpan={3} className="px-4 py-3 text-xs font-bold text-foreground">الإجمالي</td>
                      <td className="px-4 py-3 text-left font-numeric text-xs font-black text-emerald-400">
                        {formatMoney(data.summary?.total_debit ?? 0, 'IQD')}
                      </td>
                      <td className="px-4 py-3 text-left font-numeric text-xs font-black text-rose-400">
                        {formatMoney(data.summary?.total_credit ?? 0, 'IQD')}
                      </td>
                      <td className={cn('px-4 py-3 text-left font-numeric text-xs font-black',
                        balance > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                        {formatMoney(balance, 'IQD')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
