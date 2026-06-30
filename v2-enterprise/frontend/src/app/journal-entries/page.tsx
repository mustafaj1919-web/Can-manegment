'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, BookOpen, Calendar, ChevronDown, ChevronUp,
  Download, Filter, RefreshCw, Search, X, RotateCcw, Plus, Check, Loader2,
} from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import {
  getJournalEntries, reverseJournalEntry, getChartOfAccounts, createJournalEntry,
  type JournalEntryItem, type ChartAccountNode, type AccountClassification
} from '@/lib/api/accounting'
import { getExchangeRate } from '@/lib/api/exchange-rate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'

const REF_TYPE_OPTS = [
  { value: 'all',      label: 'كل أنواع العمليات' },
  { value: 'sale',     label: 'بيع' },
  { value: 'purchase', label: 'شراء' },
  { value: 'payment',  label: 'دفعة' },
  { value: 'expense',  label: 'مصروف' },
  { value: 'income',   label: 'إيراد' },
]

const REF_LABELS: Record<string, string> = {
  sale: 'بيع', purchase: 'شراء', payment: 'دفعة',
  expense: 'مصروف', income: 'إيراد',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  posted:   { label: 'منشور',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  draft:    { label: 'مسودة',  cls: 'bg-slate-500/10  text-muted-foreground  border-slate-500/20'  },
  reversed: { label: 'معكوس', cls: 'bg-rose-500/10   text-rose-400   border-rose-500/20'   },
}

function hasFilters(search: string, refType: string, dateFrom: string, dateTo: string, accountCode: string) {
  return search || refType !== 'all' || dateFrom || dateTo || accountCode
}

export default function JournalEntriesPage() {
  const [search,      setSearch]      = useState('')
  const [refType,     setRefType]     = useState('all')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [page,        setPage]        = useState(1)
  const [expanded,    setExpanded]    = useState<Set<number>>(new Set())
  const [exporting,   setExporting]   = useState(false)
  const [reversing,   setReversing]   = useState<number | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const perPage = 30

  const qc = useQueryClient()

  const params = {
    page,
    per_page:     perPage,
    search:       search.trim()       || undefined,
    ref_type:     refType !== 'all'   ? refType     : undefined,
    date_from:    dateFrom            || undefined,
    date_to:      dateTo              || undefined,
    account_code: accountCode.trim()  || undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['journal-entries', params],
    queryFn:  () => getJournalEntries(params),
    staleTime: 30_000,
    retry: 1,
  })

  const reverseMutation = useMutation({
    mutationFn: (id: number) => reverseJournalEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
      setReversing(null)
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error ?? 'حدث خطأ أثناء عكس القيد')
      setReversing(null)
    },
  })

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const activeFilters = hasFilters(search, refType, dateFrom, dateTo, accountCode)

  function resetFilters() {
    setSearch(''); setRefType('all'); setDateFrom('')
    setDateTo(''); setAccountCode(''); setPage(1)
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleReverse(e: React.MouseEvent, entry: JournalEntryItem) {
    e.stopPropagation()
    if (reversing) return
    if (!confirm(`هل تريد عكس القيد ${entry.reference_number ?? '#' + entry.id}؟\nسيُنشأ قيد عكسي جديد.`)) return
    setReversing(entry.id)
    reverseMutation.mutate(entry.id)
  }

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const all = await getJournalEntries({ ...params, page: 1, per_page: 2000 })
      const headers = ['رقم القيد', 'الرقم المرجعي', 'الحالة', 'التاريخ', 'الوصف', 'نوع العملية', 'عدد السطور', 'إجمالي مدين', 'إجمالي دائن', 'متوازن']
      const rows = all.items.map((e: JournalEntryItem) => [
        e.id,
        e.reference_number ?? '',
        e.status ?? 'posted',
        e.entry_date ?? '',
        e.description ?? '',
        REF_LABELS[e.reference_type ?? ''] ?? (e.reference_type ?? ''),
        e.line_count,
        e.total_debit,
        e.total_credit,
        e.is_balanced ? 'نعم' : 'لا',
      ])
      await exportXlsx('القيود-اليومية', headers, rows)
    } finally {
      setExporting(false)
    }
  }, [params])

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <BookOpen className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">القيود اليومية</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${total.toLocaleString('ar-EG')} قيد`}
              {activeFilters && <span className="text-indigo-400"> (مفلترة)</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />تحديث
          </Button>
          <Button variant="outline" size="sm"
            onClick={handleExport} disabled={exporting || isLoading || total === 0}
            className="h-9 gap-2 border-border/50 bg-secondary/30 text-xs hover:bg-secondary/40">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}
            className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
            <Plus className="h-3.5 w-3.5" />
            قيد جديد
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="بحث في الوصف..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="ps-9 bg-secondary/30 border-border/50 h-9 text-sm"
            />
          </div>
          <Select value={refType} onValueChange={v => { setRefType(v); setPage(1) }}>
            <SelectTrigger className="w-[180px] h-9 bg-secondary/30 border-border/50 text-sm">
              <Filter className="h-3.5 w-3.5 me-1.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REF_TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-[150px]">
            <Input
              placeholder="رمز حساب (مثل 111001)"
              value={accountCode}
              onChange={e => { setAccountCode(e.target.value); setPage(1) }}
              className="bg-secondary/30 border-border/50 h-9 text-sm font-mono"
              maxLength={6}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">من:</span>
            <Input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="h-8 bg-secondary/30 border-border/50 text-xs flex-1 min-w-[130px]" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">إلى:</span>
            <Input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="h-8 bg-secondary/30 border-border/50 text-xs flex-1 min-w-[130px]" />
          </div>
          {activeFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />مسح الفلاتر
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" />تحديث
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="glass overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل القيود اليومية</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">إعادة المحاولة</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
            <p className="font-medium text-foreground/70">
              {activeFilters ? 'لا توجد قيود تطابق الفلترة' : 'لا توجد قيود يومية'}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {activeFilters ? 'جرّب تغيير معايير البحث أو مسح الفلاتر' : 'القيود تُنشأ تلقائياً عند تسجيل العمليات'}
            </p>
            {activeFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 text-xs gap-1.5">
                <X className="h-3 w-3" />مسح الفلاتر
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[90px_100px_80px_1fr_90px_100px_100px_60px] border-b border-border/50 bg-secondary/10 px-4 py-2.5">
              {['المرجع', 'التاريخ', 'الحالة', 'الوصف', 'نوع العملية', 'مدين', 'دائن', ''].map(h => (
                <span key={h} className="text-[10px] font-medium text-muted-foreground">{h}</span>
              ))}
            </div>

            {items.map((entry, i) => {
              const badge = STATUS_BADGE[entry.status ?? 'posted'] ?? STATUS_BADGE.posted
              const canReverse = (entry.status ?? 'posted') === 'posted' && !entry.reversal_of_id
              return (
                <motion.div key={entry.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/20 last:border-0">

                  <div
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[90px_100px_80px_1fr_90px_100px_100px_60px] items-center gap-2 px-4 py-3 hover:bg-secondary/10 cursor-pointer"
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <span className="font-mono text-xs text-indigo-300/80">{entry.reference_number ?? `#${entry.id}`}</span>
                    <span className="hidden sm:block text-xs text-muted-foreground">{entry.entry_date ?? '—'}</span>
                    <span className="hidden sm:flex">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </span>
                    <span className="text-xs text-foreground/90 truncate">{entry.description ?? '—'}</span>
                    <span className="hidden sm:block">
                      {entry.reference_type ? (
                        <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
                          {REF_LABELS[entry.reference_type] ?? entry.reference_type}
                        </span>
                      ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </span>
                    <span className="hidden sm:block font-numeric text-xs text-emerald-400">{formatMoney(entry.total_debit, 'IQD')}</span>
                    <span className="hidden sm:block font-numeric text-xs text-rose-400">{formatMoney(entry.total_credit, 'IQD')}</span>
                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      {!entry.is_balanced && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="غير متوازن" />
                      )}
                      {canReverse && (
                        <button
                          onClick={e => handleReverse(e, entry)}
                          disabled={reversing === entry.id}
                          title="عكس القيد"
                          className="p-1 rounded-md text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); toggleExpand(entry.id) }}>
                        {expanded.has(entry.id)
                          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded lines */}
                  <AnimatePresence initial={false}>
                    {expanded.has(entry.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-secondary/30 border-t border-border/30 px-6 pb-3 pt-2">
                          <div className="grid grid-cols-[120px_1fr_100px_100px] text-[10px] text-muted-foreground mb-1.5 px-1">
                            <span>رمز الحساب</span><span>اسم الحساب</span>
                            <span className="text-end">مدين</span><span className="text-end">دائن</span>
                          </div>
                          {entry.lines.map((line, li) => (
                            <div key={li} className="grid grid-cols-[120px_1fr_100px_100px] items-center py-1 px-1 rounded hover:bg-secondary/20 text-xs">
                              <span className="font-numeric text-cyan-300 text-[11px]">{line.account_code ?? '—'}</span>
                              <span className="text-foreground/80 truncate">{line.account_name ?? '—'}</span>
                              <span className="font-numeric text-end text-emerald-400/80">
                                {line.debit > 0 ? formatMoney(line.debit, 'IQD') : '—'}
                              </span>
                              <span className="font-numeric text-end text-rose-400/80">
                                {line.credit > 0 ? formatMoney(line.credit, 'IQD') : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
                <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages} · {total.toLocaleString('ar-EG')} قيد</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showAddDialog && (
          <AddJournalEntryDialog
            onClose={() => setShowAddDialog(false)}
            onSuccess={() => {
              setShowAddDialog(false)
              refetch()
            }}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

/* ─── Add Journal Entry Dialog ─────────────────────────────────────────── */

interface JournalLineInput {
  accountId: string
  debit: string
  credit: string
  description: string
}

function flatLeafAccounts(nodes: ChartAccountNode[]): ChartAccountNode[] {
  const result: ChartAccountNode[] = []
  function walk(n: ChartAccountNode) {
    if (!n.children || n.children.length === 0) result.push(n)
    else n.children.forEach(walk)
  }
  nodes.forEach(walk)
  return result
}

function AddJournalEntryDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('IQD')
  const [exchangeRate, setExchangeRate] = useState('1500')
  const [lines, setLines] = useState<JournalLineInput[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ])

  const { data: rateData } = useQuery({
    queryKey: ['exchange-rate-je'],
    queryFn: getExchangeRate,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (rateData?.rate) {
      setExchangeRate(String(rateData.rate))
    }
  }, [rateData])

  const { data: coaData } = useQuery({
    queryKey: ['chart-of-accounts-flat'],
    queryFn: getChartOfAccounts,
    staleTime: 300_000,
  })

  const leafAccounts = coaData ? flatLeafAccounts(coaData.items) : []

  const mutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      toast.success('تم تسجيل وترحيل القيد المحاسبي بنجاح!')
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'حدث خطأ أثناء حفظ القيد المحاسبي.')
    }
  })

  const addLine = () => {
    setLines(prev => [...prev, { accountId: '', debit: '', credit: '', description: '' }])
  }

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const updateLine = (idx: number, field: keyof JournalLineInput, val: string) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: val }
      if (field === 'debit' && val !== '') updated.credit = ''
      if (field === 'credit' && val !== '') updated.debit = ''
      return updated
    }))
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('البيان الإجمالي مطلوب')
      return
    }
    if (lines.some(l => !l.accountId)) {
      toast.error('يرجى تحديد الحساب لجميع السطور')
      return
    }
    if (lines.some(l => !l.debit && !l.credit)) {
      toast.error('كل سطر يجب أن يحتوي على قيمة مدين أو دائن')
      return
    }
    if (!isBalanced) {
      toast.error('القيد غير متوازن مالياً: إجمالي المدين يجب أن يساوي إجمالي الدائن')
      return
    }

    const rateVal = currency === 'USD' ? (parseFloat(exchangeRate) || 1500) : 1.0
    const finalDescription = currency === 'USD'
      ? `[$${totalDebit.toLocaleString('en-US')} @ ${rateVal.toLocaleString('en-US')}] ${description}`
      : description

    mutation.mutate({
      entryDate,
      description: finalDescription,
      lines: lines.map(l => {
        const lineDebit = parseFloat(l.debit) || 0
        const lineCredit = parseFloat(l.credit) || 0
        return {
          accountId: l.accountId,
          debit: currency === 'USD' ? Math.round(lineDebit * rateVal) : lineDebit,
          credit: currency === 'USD' ? Math.round(lineCredit * rateVal) : lineCredit,
          description: l.description || undefined
        }
      })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glass w-full max-w-3xl rounded-xl border border-border/50 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">إنشاء سند قيد محاسبي جديد</h3>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/40"><X className="h-4 w-4" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">البيان الإجمالي للقيد *</label>
              <Input
                placeholder="تسجيل قيد تسوية، إثبات، استهلاك..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                className="h-9 bg-secondary/30 border-border/50 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">تاريخ القيد *</label>
              <Input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                required
                className="h-9 bg-secondary/30 border-border/50 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">العملة *</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9 bg-secondary/30 border-border/50 text-xs">
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {currency === 'USD' && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 items-center">
              <div className="md:col-span-2 flex items-center text-[11px] text-indigo-400 gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>سيتم إدخال المبالغ بالدولار، ويقوم النظام تلقائياً بالتحويل للدينار.</span>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">سعر الصرف (دينار لكل دولار) *</label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  required
                  className="h-9 bg-secondary/30 border-border/50 text-xs font-numeric"
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center pb-1 border-b border-border/30">
              <span className="text-xs font-bold text-muted-foreground">بنود القيد (سطور اليومية)</span>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-xs gap-1 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400">
                <Plus className="h-3 w-3" />
                إضافة سطر
              </Button>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1.2fr_2fr_auto] gap-2.5 items-start bg-secondary/10 p-2.5 rounded-lg border border-border/20">
                  <div>
                    <label className="md:hidden text-[10px] text-muted-foreground mb-1 block">الحساب</label>
                    <Select value={line.accountId} onValueChange={v => updateLine(idx, 'accountId', v)}>
                      <SelectTrigger className="h-9 bg-secondary/30 border-border/50 text-xs"><SelectValue placeholder="اختر الحساب..." /></SelectTrigger>
                      <SelectContent className="max-h-48">
                        {leafAccounts.map(a => (
                          <SelectItem key={a.accountId} value={a.accountId ?? ''}>{a.code} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="md:hidden text-[10px] text-muted-foreground mb-1 block">مدين</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={line.debit}
                      onChange={e => updateLine(idx, 'debit', e.target.value)}
                      className="h-9 bg-secondary/30 border-border/50 text-xs font-numeric text-emerald-400"
                    />
                    {currency === 'USD' && line.debit && (
                      <span className="text-[10px] text-emerald-400/80 block mt-0.5 font-numeric text-left">
                        ≈ {Math.round(parseFloat(line.debit) * (parseFloat(exchangeRate) || 1500)).toLocaleString()} د.ع
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="md:hidden text-[10px] text-muted-foreground mb-1 block">دائن</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={line.credit}
                      onChange={e => updateLine(idx, 'credit', e.target.value)}
                      className="h-9 bg-secondary/30 border-border/50 text-xs font-numeric text-rose-400"
                    />
                    {currency === 'USD' && line.credit && (
                      <span className="text-[10px] text-rose-400/80 block mt-0.5 font-numeric text-left">
                        ≈ {Math.round(parseFloat(line.credit) * (parseFloat(exchangeRate) || 1500)).toLocaleString()} د.ع
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="md:hidden text-[10px] text-muted-foreground mb-1 block">البيان الخاص للسطر (اختياري)</label>
                    <Input
                      placeholder="ملاحظة السطر..."
                      value={line.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                      className="h-9 bg-secondary/30 border-border/50 text-xs"
                    />
                  </div>
                  <div className="pt-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(idx)}
                      className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground/60 transition-colors flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-border/40 bg-secondary/20">
            <div className="flex gap-4 text-xs font-semibold">
              <div>
                <span className="text-muted-foreground">إجمالي المدين: </span>
                <span className="font-numeric text-emerald-400">{formatMoney(totalDebit, currency as any)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">إجمالي الدائن: </span>
                <span className="font-numeric text-rose-400">{formatMoney(totalCredit, currency as any)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold font-numeric">
              {isBalanced ? (
                <span className="text-emerald-400 flex items-center gap-1"><Check className="h-4 w-4" /> القيد متوازن</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> القيد غير متوازن ({formatMoney(Math.abs(totalDebit - totalCredit), currency as any)})</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={mutation.isPending || !isBalanced} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2 h-9 text-sm font-bold">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              ترحيل وحفظ سند القيد
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="border border-border/50">إلغاء</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
