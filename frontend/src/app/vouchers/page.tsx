'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, X, RefreshCw,
  AlertCircle, FileText, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import {
  getVouchers, createVoucher, cancelVoucher,
  type Voucher, type VoucherType, type CreateVoucherPayload,
} from '@/lib/api/vouchers'
import { getChartOfAccounts, type ChartAccountNode } from '@/lib/api/accounting'

const TABS: { type: VoucherType; label: string; icon: typeof ArrowDownLeft; prefix: string; color: string }[] = [
  { type: 'receipt',  label: 'سندات القبض',  icon: ArrowDownLeft,  prefix: 'RV', color: 'emerald' },
  { type: 'payment',  label: 'سندات الصرف',  icon: ArrowUpRight,   prefix: 'PV', color: 'rose' },
  { type: 'transfer', label: 'التحويلات',    icon: ArrowLeftRight, prefix: 'TR', color: 'indigo' },
]

const CASH_BANK_PREFIXES = ['111001', '111002', '111003', '112001', '112002', '112003']

function flatLeafAccounts(nodes: ChartAccountNode[]): ChartAccountNode[] {
  const result: ChartAccountNode[] = []
  function walk(n: ChartAccountNode) {
    if (!n.children || n.children.length === 0) result.push(n)
    else n.children.forEach(walk)
  }
  nodes.forEach(walk)
  return result
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'rounded-full border px-2 py-0.5 text-[10px] font-medium',
      status === 'posted'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
    )}>
      {status === 'posted' ? 'منشور' : 'ملغى'}
    </span>
  )
}

export default function VouchersPage() {
  const [activeType, setActiveType] = useState<VoucherType>('receipt')
  const [showForm,   setShowForm]   = useState(false)
  const [page, setPage] = useState(1)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  // Form state
  const [formDate,         setFormDate]         = useState('')
  const [formDebitCode,    setFormDebitCode]     = useState('')
  const [formCreditCode,   setFormCreditCode]    = useState('')
  const [formAmount,       setFormAmount]        = useState('')
  const [formCurrency,     setFormCurrency]      = useState('IQD')
  const [formDescription,  setFormDescription]   = useState('')
  const [formError,        setFormError]         = useState('')

  const qc = useQueryClient()
  const perPage = 20

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vouchers', activeType, page],
    queryFn:  () => getVouchers({ type: activeType, page, per_page: perPage }),
    staleTime: 30_000,
  })

  const { data: coaData } = useQuery({
    queryKey: ['chart-of-accounts-flat'],
    queryFn:  getChartOfAccounts,
    staleTime: 300_000,
  })

  const allLeafAccounts = coaData ? flatLeafAccounts(coaData.items) : []
  const cashBankAccounts = allLeafAccounts.filter(a => CASH_BANK_PREFIXES.includes(a.code))
  const contraAccounts   = allLeafAccounts.filter(a => !CASH_BANK_PREFIXES.includes(a.code))

  const createMutation = useMutation({
    mutationFn: (payload: CreateVoucherPayload) => createVoucher(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      resetForm()
      setShowForm(false)
    },
    onError: (err: any) => setFormError(err?.response?.data?.error ?? 'حدث خطأ'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelVoucher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      setCancellingId(null)
    },
    onError: (err: any) => alert(err?.response?.data?.error ?? 'حدث خطأ أثناء الإلغاء'),
  })

  function resetForm() {
    setFormDate(''); setFormDebitCode(''); setFormCreditCode('')
    setFormAmount(''); setFormCurrency('IQD'); setFormDescription(''); setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!formDebitCode || !formCreditCode || !formAmount) {
      setFormError('يرجى ملء جميع الحقول المطلوبة'); return
    }
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError('المبلغ غير صحيح'); return
    }
    createMutation.mutate({
      voucher_type:        activeType,
      voucher_date:        formDate || new Date().toISOString().split('T')[0],
      debit_account_code:  formDebitCode,
      credit_account_code: formCreditCode,
      amount,
      currency:            formCurrency,
      description:         formDescription || undefined,
    })
  }

  const tab = TABS.find(t => t.type === activeType)!
  const totalPages = Math.ceil((data?.total ?? 0) / perPage)
  const isTransfer = activeType === 'transfer'

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <FileText className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="section-title">السندات المالية</h1>
            <p className="section-subtitle">{data?.total ?? 0} سند</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={() => refetch()} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => { setShowForm(v => !v); resetForm() }} className="h-8 gap-1.5 text-xs">
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'إغلاق' : 'سند جديد'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = t.type === activeType
          return (
            <button
              key={t.type}
              onClick={() => { setActiveType(t.type); setPage(1) }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive ? 'bg-white/[0.09] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass rounded-xl p-5 space-y-4 border border-white/[0.08]">
          <p className="text-sm font-semibold text-foreground">{tab.label} — سند جديد ({tab.prefix})</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">التاريخ</label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="h-9 bg-white/5 border-white/10 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">المبلغ *</label>
              <Input type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                className="h-9 bg-white/5 border-white/10 text-sm font-numeric" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">العملة</label>
              <Select value={formCurrency} onValueChange={setFormCurrency}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IQD">IQD — دينار</SelectItem>
                  <SelectItem value="USD">USD — دولار</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Debit account */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                {isTransfer ? 'حساب الوجهة (مدين) *' : activeType === 'receipt' ? 'الصندوق/البنك (مدين) *' : 'الحساب المقابل (مدين) *'}
              </label>
              <Select value={formDebitCode} onValueChange={setFormDebitCode}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm"><SelectValue placeholder="اختر حساباً" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {(isTransfer ? cashBankAccounts : activeType === 'receipt' ? cashBankAccounts : contraAccounts).map(a => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Credit account */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">
                {isTransfer ? 'حساب المصدر (دائن) *' : activeType === 'payment' ? 'الصندوق/البنك (دائن) *' : 'الحساب المقابل (دائن) *'}
              </label>
              <Select value={formCreditCode} onValueChange={setFormCreditCode}>
                <SelectTrigger className="h-9 bg-white/5 border-white/10 text-sm"><SelectValue placeholder="اختر حساباً" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {(isTransfer ? cashBankAccounts : activeType === 'payment' ? cashBankAccounts : contraAccounts).map(a => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-[11px] text-muted-foreground mb-1 block">البيان</label>
              <Input placeholder="وصف السند..." value={formDescription} onChange={e => setFormDescription(e.target.value)}
                className="h-9 bg-white/5 border-white/10 text-sm" />
            </div>
          </div>
          {formError && <p className="text-xs text-rose-400">{formError}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={createMutation.isPending} size="sm" className="gap-1.5 text-xs">
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ السند'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm() }} className="text-xs">
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : isError ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل السندات</p>
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/60">لا توجد سندات</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[110px_100px_1fr_120px_100px_80px_60px] border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              {['الرقم', 'التاريخ', 'البيان', 'الحساب المدين', 'المبلغ', 'الحالة', ''].map(h => (
                <span key={h} className="text-[10px] font-medium text-muted-foreground">{h}</span>
              ))}
            </div>
            {data!.items.map((v: Voucher) => (
              <div key={v.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[110px_100px_1fr_120px_100px_80px_60px] items-center gap-2 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                <span className="font-mono text-xs text-indigo-300">{v.voucher_number}</span>
                <span className="hidden sm:block text-xs text-muted-foreground">{v.voucher_date ?? '—'}</span>
                <span className="text-xs text-foreground/80 truncate">{v.description ?? '—'}</span>
                <span className="hidden sm:block text-[11px] text-muted-foreground truncate">{v.debit_account_name ?? v.debit_account_code ?? '—'}</span>
                <span className="hidden sm:block font-numeric text-xs text-emerald-400">{formatMoney(v.amount, v.currency as 'USD' | 'IQD')}</span>
                <span className="hidden sm:flex"><StatusBadge status={v.status} /></span>
                <div className="flex justify-end">
                  {v.status === 'posted' && !v.reversal_of_id && (
                    <button
                      onClick={() => {
                        if (!confirm(`إلغاء السند ${v.voucher_number}?`)) return
                        setCancellingId(v.id)
                        cancelMutation.mutate(v.id)
                      }}
                      disabled={cancellingId === v.id}
                      title="إلغاء السند"
                      className="p-1 rounded text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
                <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
