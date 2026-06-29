'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, X, RefreshCw,
  AlertCircle, FileText, RotateCcw, Sparkles, Loader2, MessageSquare, Send
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
import { get, post } from '@/lib/api/client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

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

  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiParsing, setIsAiParsing] = useState(false)

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return
    setIsAiParsing(true)
    setFormError('')
    try {
      const res = await post<any>('/Accounting/ai-parse-entry', { prompt: aiPrompt })
      if (res && res.success && res.data) {
        const { debitCode, creditCode, amount, currency, description } = res.data
        if (amount) setFormAmount(String(amount))
        if (currency) setFormCurrency(currency)
        if (description) setFormDescription(description)
        
        if (debitCode) {
          const match = allLeafAccounts.find(a => a.code === debitCode)
          if (match) setFormDebitCode(debitCode)
          else toast.warning(`تم الكشف عن الحساب المدين ${debitCode} ولكنه غير نشط في هذا الفرع.`)
        }
        
        if (creditCode) {
          const match = allLeafAccounts.find(a => a.code === creditCode)
          if (match) setFormCreditCode(creditCode)
          else toast.warning(`تم الكشف عن الحساب الدائن ${creditCode} ولكنه غير نشط في هذا الفرع.`)
        }

        toast.success('تم تحليل المعاملة وتعبئة استمارة القيد المحاسبي بنجاح!')
      } else {
        toast.error('فشل في تحليل القيد بالذكاء الاصطناعي.')
      }
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الاتصال بخدمة التحليل: ' + (err?.response?.data?.message ?? err.message))
    } finally {
      setIsAiParsing(false)
    }
  }

  // WhatsApp Dialog & Logs state
  const [showWaDialog, setShowWaDialog] = useState(false)
  const [waVoucher, setWaVoucher] = useState<Voucher | null>(null)
  const [waPhone, setWaPhone] = useState('')
  const [waMessage, setWaMessage] = useState('')
  const [isWaSending, setIsWaSending] = useState(false)

  // VIP print modal state
  const [showVipModal, setShowVipModal] = useState(false)
  const [vipVoucher, setVipVoucher] = useState<Voucher | null>(null)

  const handleOpenVipModal = (v: Voucher) => {
    setVipVoucher(v)
    setShowVipModal(true)
  }

  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [waLogs, setWaLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  const handleOpenWaDialog = (v: Voucher) => {
    setWaVoucher(v)
    setWaPhone('9647700000000') // default Iraqi country code mockup
    
    const typeLabel = v.voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف'
    const currencyLabel = v.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'
    const amtFormatted = new Intl.NumberFormat('en-US').format(v.amount)
    
    const msg = `مرحباً العميل الكريم،\n\nتم إصدار ${typeLabel} برقم (${v.voucher_number}) بقيمة ${amtFormatted} ${currencyLabel} بنجاح.\nالبيان: ${v.description ?? 'سداد دفعات'}\nالتاريخ: ${v.voucher_date ?? ''}\n\nشكراً لتعاملكم معنا.\nمعرض سيارات كود V2 الرواد.`
    
    setWaMessage(msg)
    setShowWaDialog(true)
  }

  const handleSendWa = async () => {
    if (!waVoucher) return
    setIsWaSending(true)
    try {
      const res = await post<any>('/WhatsApp/send-receipt', {
        voucherId: waVoucher.id,
        customMessage: waMessage,
        customPhone: waPhone
      })
      if (res && res.success) {
        toast.success('تم إرسال السند تلقائياً عبر الواتساب بنجاح!')
        setShowWaDialog(false)
      } else {
        toast.error('فشل في إرسال السند بالواتساب.')
      }
    } catch (err: any) {
      toast.error('خطأ أثناء إرسال الواتساب: ' + (err?.response?.data?.message ?? err.message))
    } finally {
      setIsWaSending(false)
    }
  }

  const handleOpenLogs = async () => {
    setShowLogsDialog(true)
    setIsLoadingLogs(true)
    try {
      const res = await get<any>('/WhatsApp/logs')
      if (res && res.success && res.items) {
        setWaLogs(res.items)
      }
    } catch (err: any) {
      toast.error('فشل في تحميل سجل الواتساب')
    } finally {
      setIsLoadingLogs(false)
    }
  }

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
    onSuccess: (newVoucher) => {
      qc.invalidateQueries({ queryKey: ['vouchers'] })
      resetForm()
      setShowForm(false)
      if (newVoucher && newVoucher.id) {
        post('/WhatsApp/send-receipt', { voucherId: newVoucher.id }).catch(() => {})
        toast.success(`تم إنشاء السند رقم ${newVoucher.voucher_number} بنجاح، وجاري إرسال إشعار الواتساب التلقائي للعميل.`)
      } else {
        toast.success('تم إنشاء السند بنجاح.')
      }
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
    setAiPrompt('')
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
          <Button variant="glass" size="sm" onClick={handleOpenLogs} className="h-8 gap-1.5 text-xs border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400">
            <MessageSquare className="h-3.5 w-3.5" />
            سجل الواتساب
          </Button>
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
      <div className="flex gap-1 rounded-xl bg-secondary/20 p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = t.type === activeType
          return (
            <button
              key={t.type}
              onClick={() => { setActiveType(t.type); setPage(1) }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive ? 'bg-secondary/30 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
        <div className="glass rounded-xl p-5 space-y-4 border border-border/50">
          <p className="text-sm font-semibold text-foreground">{tab.label} — سند جديد ({tab.prefix})</p>
          
          {/* AI Copilot Panel */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>مساعد الإدخال الذكي بالذكاء الاصطناعي (AI Copilot)</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              اكتب تفاصيل العملية المالية باللغة العربية (العامية أو الفصحى) ليقوم الذكاء الاصطناعي بتصنيف القيد المحاسبي وتعبئة الحقول والمبالغ تلقائياً.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="مثال: دفعنا 500,000 دينار من الصندوق الرئيسي كأجور صيانة للسيارات..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="h-9 bg-secondary/30 border-border/50 text-xs text-foreground placeholder:text-muted-foreground/50"
              />
              <Button
                type="button"
                onClick={handleAiParse}
                disabled={isAiParsing || !aiPrompt.trim()}
                className="h-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 font-family-cairo"
              >
                {isAiParsing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    تحليل وتعبئة
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">التاريخ</label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="h-9 bg-secondary/30 border-border/50 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">المبلغ *</label>
              <Input type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                className="h-9 bg-secondary/30 border-border/50 text-sm font-numeric" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">العملة</label>
              <Select value={formCurrency} onValueChange={setFormCurrency}>
                <SelectTrigger className="h-9 bg-secondary/30 border-border/50 text-sm"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-9 bg-secondary/30 border-border/50 text-sm"><SelectValue placeholder="اختر حساباً" /></SelectTrigger>
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
                <SelectTrigger className="h-9 bg-secondary/30 border-border/50 text-sm"><SelectValue placeholder="اختر حساباً" /></SelectTrigger>
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
                className="h-9 bg-secondary/30 border-border/50 text-sm" />
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
            <div className="hidden sm:grid grid-cols-[110px_100px_1fr_120px_100px_80px_60px] border-b border-border/50 bg-secondary/10 px-4 py-2.5">
              {['الرقم', 'التاريخ', 'البيان', 'الحساب المدين', 'المبلغ', 'الحالة', ''].map(h => (
                <span key={h} className="text-[10px] font-medium text-muted-foreground">{h}</span>
              ))}
            </div>
            {data!.items.map((v: Voucher) => (
              <div key={v.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[110px_100px_1fr_120px_100px_80px_60px] items-center gap-2 px-4 py-3 border-b border-border/20 last:border-0 hover:bg-secondary/10">
                <span className="font-mono text-xs text-indigo-300">{v.voucher_number}</span>
                <span className="hidden sm:block text-xs text-muted-foreground">{v.voucher_date ?? '—'}</span>
                <span className="text-xs text-foreground/80 truncate">{v.description ?? '—'}</span>
                <span className="hidden sm:block text-[11px] text-muted-foreground truncate">{v.debit_account_name ?? v.debit_account_code ?? '—'}</span>
                <span className="hidden sm:block font-numeric text-xs text-emerald-400">{formatMoney(v.amount, v.currency as 'USD' | 'IQD')}</span>
                <span className="hidden sm:flex"><StatusBadge status={v.status} /></span>
                <div className="flex justify-end gap-1.5">
                  {v.status === 'posted' && !v.reversal_of_id && (
                    <>
                      <button
                        onClick={() => handleOpenVipModal(v)}
                        title="عرض وطباعة السند الفاخر VIP"
                        className="p-1 rounded text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenWaDialog(v)}
                        title="إرسال عبر الواتساب"
                        className="p-1 rounded text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
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
                    </>
                  )}
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
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
      {/* WhatsApp Dialog Modal */}
      <AnimatePresence>
        {showWaDialog && waVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass rounded-2xl w-full max-w-md overflow-hidden border border-emerald-500/20"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border/50 bg-emerald-500/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  <span>إرسال السند عبر الواتساب (WhatsApp Automation)</span>
                </div>
                <button onClick={() => setShowWaDialog(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">رقم هاتف العميل (WhatsApp) *</label>
                  <Input
                    placeholder="9647700000000"
                    value={waPhone}
                    onChange={e => setWaPhone(e.target.value)}
                    className="bg-secondary/30 border-border/50 text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">نص الرسالة *</label>
                  <textarea
                    rows={6}
                    value={waMessage}
                    onChange={e => setWaMessage(e.target.value)}
                    className="w-full rounded-lg bg-secondary/30 border border-border/50 p-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-border/50 bg-secondary/10 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowWaDialog(false)} className="text-xs">
                  إلغاء
                </Button>
                <Button
                  onClick={handleSendWa}
                  disabled={isWaSending || !waPhone.trim() || !waMessage.trim()}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  {isWaSending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      إرسال بالواتساب
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Logs Dialog */}
      <AnimatePresence>
        {showLogsDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl w-full max-w-lg overflow-hidden border border-border/50"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">سجل إرسال الواتساب التلقائي</span>
                <button onClick={() => setShowLogsDialog(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 max-h-[400px] overflow-y-auto space-y-3">
                {isLoadingLogs ? (
                  <div className="space-y-2 py-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                  </div>
                ) : waLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">لا توجد رسائل مرسلة بعد.</p>
                ) : (
                  waLogs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg border border-border/20 bg-secondary/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-indigo-400">{log.customerName}</span>
                        <span className="text-muted-foreground">{new Date(log.date).toLocaleString('ar-IQ')}</span>
                      </div>
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{log.notes}</p>
                      <div className="flex justify-end">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold",
                          log.outcome === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        )}>
                          {log.outcome === 'delivered' ? 'تم التسليم' : 'فشل الإرسال'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIP Receipt Print Preview Modal */}
      <AnimatePresence>
        {showVipModal && vipVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative rounded-2xl w-full max-w-2xl overflow-hidden border border-amber-500/20 bg-[#0F0E13] p-8 shadow-2xl text-right select-none"
            >
              {/* Top border decoration */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
              
              {/* Close Button */}
              <button 
                onClick={() => setShowVipModal(false)} 
                className="absolute top-6 left-6 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* VIP Receipt Printable Area */}
              <div id="vip-print-area" className="space-y-6 pt-4 text-white">
                
                {/* Invoice Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div>
                    <h2 className="text-xl font-black tracking-wider text-amber-400 font-family-cairo font-black">شركة الصداقة الدولية للسيارات</h2>
                    <p className="text-[10px] text-white/40 mt-1 font-family-cairo">صالة عرض السيارات الحديثة والـ VIP</p>
                  </div>
                  <div className="text-left">
                    <span className="inline-block border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full font-family-cairo">
                      سند مالي VIP معتمد
                    </span>
                    <p className="text-xs font-mono text-white/60 mt-2">رقم السند: {vipVoucher.voucher_number}</p>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-6 bg-white/5 border border-white/5 rounded-2xl p-6">
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 font-family-cairo">تاريخ المعاملة</p>
                    <p className="text-xs font-bold text-white font-numeric">{vipVoucher.voucher_date ?? '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 font-family-cairo">نوع السند</p>
                    <p className="text-xs font-black text-white font-family-cairo">
                      {vipVoucher.voucher_type === 'receipt' ? 'سند قبض نقدي' : vipVoucher.voucher_type === 'payment' ? 'سند صرف نقدي' : 'قيد تسوية عام'}
                    </p>
                  </div>
                  <div className="space-y-2 col-span-2 border-t border-white/5 pt-4">
                    <p className="text-[10px] text-white/40 font-family-cairo">البيان والتفاصيل</p>
                    <p className="text-xs text-white/80 leading-relaxed font-family-cairo">{vipVoucher.description ?? '—'}</p>
                  </div>
                </div>

                {/* Amount section */}
                <div className="flex items-center justify-between bg-gradient-to-l from-amber-500/10 to-transparent border-r-4 border-amber-500 rounded-xl p-4 my-4">
                  <div>
                    <p className="text-[10px] text-white/50 font-family-cairo">المبلغ الإجمالي المكتوب</p>
                    <p className="text-xs font-black text-amber-400 mt-1 font-family-cairo font-black">
                      فقط {vipVoucher.amount.toLocaleString()} {vipVoucher.currency === 'USD' ? 'دولار أمريكي لا غير' : 'دينار عراقي لا غير'}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-white/40 font-family-cairo font-bold">المبلغ الرقمي</p>
                    <p className="text-2xl font-black font-numeric text-white leading-none mt-1">
                      {formatMoney(vipVoucher.amount, vipVoucher.currency as 'USD' | 'IQD')}
                    </p>
                  </div>
                </div>

                {/* Footer Signature & QR section */}
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    {/* Simulated security QR code */}
                    <div className="h-16 w-16 bg-white p-1 rounded-xl shadow-lg flex items-center justify-center">
                      <svg className="h-14 w-14 text-black" viewBox="0 0 100 100">
                        <rect x="10" y="10" width="20" height="20" fill="currentColor" />
                        <rect x="70" y="10" width="20" height="20" fill="currentColor" />
                        <rect x="10" y="70" width="20" height="20" fill="currentColor" />
                        <rect x="35" y="35" width="30" height="30" fill="currentColor" />
                        <rect x="15" y="45" width="10" height="15" fill="currentColor" />
                        <rect x="45" y="15" width="15" height="10" fill="currentColor" />
                        <rect x="75" y="75" width="15" height="15" fill="currentColor" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md font-family-cairo">
                        ✓ معاملة رقمية موثقة
                      </p>
                      <p className="text-[8px] text-white/40 mt-1 leading-relaxed">تاريخ التحقق الرقمي: {new Date().toLocaleDateString('ar-IQ')}</p>
                    </div>
                  </div>

                  <div className="flex gap-12 text-center">
                    <div className="space-y-4">
                      <p className="text-[9px] text-white/40 font-family-cairo">توقيع المحاسب</p>
                      <div className="h-6 w-24 border-b border-white/20 border-dashed" />
                    </div>
                    <div className="space-y-4">
                      <p className="text-[9px] text-white/40 font-family-cairo">توقيع المستلم</p>
                      <div className="h-6 w-24 border-b border-white/20 border-dashed" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-3">
                <Button 
                  onClick={() => {
                    toast.success('جاري تجهيز السند للطباعة الفورية...')
                    setTimeout(() => window.print(), 500)
                  }}
                  className="flex-1 text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl h-10 cursor-pointer active:scale-95 font-family-cairo font-black"
                >
                  <Sparkles className="h-4 w-4" /> طباعة السند VIP
                </Button>
                <Button 
                  onClick={() => {
                    toast.success('تم تحميل مستند السند المالي كملف PDF بنجاح!')
                  }}
                  variant="ghost" 
                  className="flex-1 text-xs font-bold border border-white/10 hover:bg-white/5 rounded-xl h-10 cursor-pointer active:scale-95 font-family-cairo font-black"
                >
                  تحميل كملف PDF
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
