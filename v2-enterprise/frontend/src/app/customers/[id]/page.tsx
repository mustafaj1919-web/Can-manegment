'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowRight, Calendar, Car, CheckCircle2, ChevronDown,
  Clock, CreditCard, Edit, ExternalLink, FileText,
  MapPin, Phone, Printer, RefreshCw, Shield, TrendingUp, User, Wallet, XCircle,
  Upload, Trash2, Eye, Download,
} from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import {
  getCustomerById, getCustomerStatement, getCustomerDocuments,
  uploadCustomerDocument, deleteCustomerDocument, getDocumentUrl,
  DOC_TYPE_LABEL, DOCUMENT_SLOTS,
} from '@/lib/api/customers'
import type { StatementSaleItem, StatementSchedule, CustomerDocumentType } from '@/lib/api/customers'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// ── Health Score ─────────────────────────────────────────────────────────────

function getHealthScore(salesCount: number, purchasesCount: number) {
  const total = (salesCount ?? 0) + (purchasesCount ?? 0)
  if (total === 0) return { score: 1, label: 'جديد',  color: 'text-muted-foreground', ring: 'bg-muted/50' }
  if (total === 1) return { score: 2, label: 'مبتدئ', color: 'text-sky-400',          ring: 'bg-sky-500/15' }
  if (total === 2) return { score: 3, label: 'نشط',   color: 'text-blue-400',         ring: 'bg-blue-500/15' }
  if (total === 3) return { score: 4, label: 'موثوق', color: 'text-emerald-400',      ring: 'bg-emerald-500/15' }
  return              { score: 5, label: 'ذهبي',  color: 'text-amber-400',        ring: 'bg-amber-500/15' }
}

function HealthDots({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('h-2 w-2 rounded-full', i < score ? color.replace('text-', 'bg-') : 'bg-muted/40')} />
      ))}
    </div>
  )
}

// ── Schedule status ───────────────────────────────────────────────────────────

const SCHEDULE_STATUS: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  Paid:    { label: 'مدفوع', icon: CheckCircle2,  cls: 'text-emerald-400' },
  Partial: { label: 'جزئي',  icon: Clock,         cls: 'text-amber-400' },
  Pending: { label: 'قادم',  icon: Clock,         cls: 'text-sky-400' },
  Overdue: { label: 'متأخر', icon: AlertTriangle, cls: 'text-rose-400' },
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'نظرة عامة' },
  { id: 'sales',      label: 'المبيعات والأقساط' },
  { id: 'timeline',   label: 'التايملاين' },
  { id: 'documents',  label: 'المستندات' },
]

function getDocumentTypeLabel(value: unknown) {
  const type = String(value ?? '')
  return Object.prototype.hasOwnProperty.call(DOC_TYPE_LABEL, type)
    ? DOC_TYPE_LABEL[type as keyof typeof DOC_TYPE_LABEL]
    : type
}

// ── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: string
  type: 'sale' | 'payment' | 'overdue'
  title: string
  amount?: number
  currency?: 'IQD' | 'USD'
  meta?: string
}

function buildTimeline(sales: StatementSaleItem[]): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const s of sales) {
    if (s.sale_date) events.push({ date: s.sale_date, type: 'sale', title: `بيع: ${s.car_name ?? 'سيارة'}`, amount: s.selling_price, currency: s.currency, meta: s.invoice_number })
    for (const p of s.payments ?? []) {
      if (p.payment_date) events.push({ date: p.payment_date, type: 'payment', title: 'دفعة سداد', amount: p.amount, currency: p.currency ?? 'IQD' })
    }
    if (s.installment_plan) {
      for (const sch of s.installment_plan.schedules ?? []) {
        if (sch.status === 'Overdue' && sch.due_date) events.push({ date: sch.due_date, type: 'overdue', title: `قسط متأخر #${sch.installment_number}`, amount: sch.remaining_amount, currency: sch.currency })
      }
    }
  }
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const TL_STYLE = {
  sale:    { icon: Car,           dot: 'bg-primary',     bg: 'border-primary/20 bg-primary/[0.05]' },
  payment: { icon: Wallet,        dot: 'bg-emerald-500', bg: 'border-emerald-500/20 bg-emerald-500/[0.05]' },
  overdue: { icon: AlertTriangle, dot: 'bg-rose-500',    bg: 'border-rose-500/20 bg-rose-500/[0.05]' },
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, cls }: { label: string; value: string; sub?: string; icon: React.ElementType; cls: string }) {
  return (
    <div className={cn('rounded-xl border p-4 flex items-start gap-3', cls)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium opacity-75">{label}</p>
        <p className="text-base font-black tabular-nums mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-[10px] opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = rawId
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [expandedSale, setExpandedSale] = useState<number | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadDocType, setUploadDocType] = useState<CustomerDocumentType>('id_front')

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !!id,
  })

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['customer-statement', id],
    queryFn: () => getCustomerStatement(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !!id,
  })

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['customer-documents', id],
    queryFn: () => getCustomerDocuments(id),
    staleTime: 30_000,
    enabled: !!id,
  })

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      await uploadCustomerDocument(id, uploadDocType, file)
      await refetchDocs()
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploadingDoc(false)
      e.target.value = ''
    }
  }

  async function handleDocDelete(docId: number | string) {
    if (!confirm('هل تريد حذف هذا المستند؟')) return
    try {
      await deleteCustomerDocument(id, docId)
      await refetchDocs()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  if (isLoading) return <PageSkeleton />

  if (isError || !customer) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
      <XCircle className="h-12 w-12 text-rose-400/60" />
      <p className="text-sm text-muted-foreground font-family-cairo">تعذر تحميل بيانات العميل</p>
      <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['customer', id] })}>
        <RefreshCw className="h-3.5 w-3.5 ml-1.5" />إعادة المحاولة
      </Button>
    </div>
  )

  const health  = getHealthScore(customer.sales_count ?? 0, customer.purchases_count ?? 0)
  const summary = statement?.summary
  const sales   = statement?.sales ?? []
  const timeline = buildTimeline(sales)

  return (
    <div className="pb-16" dir="rtl">

      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div className="bg-bg-surface border-b border-subtle px-6 pt-5 pb-0 sticky top-0 z-20">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
          <Link href="/customers" className="hover:text-foreground transition-colors">العملاء</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="text-foreground font-semibold">{customer.name}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border text-xl font-black', health.ring, health.color)}>
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-[22px] font-black tracking-tight">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border',
                  customer.customer_type === 'Individual' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                )}>
                  {customer.customer_type === 'Individual' ? 'فرد' : 'شركة'}
                </span>
                <span className={cn('text-[11px] font-bold', health.color)}>{health.label}</span>
                <HealthDots score={health.score} color={health.color} />
              </div>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-3 w-3" />{customer.phone}
                  </a>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />{customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${id}/edit`}><Edit className="h-3.5 w-3.5 ml-1" />تعديل</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 ml-1" />طباعة
            </Button>
            <Button size="sm" asChild>
              <Link href={`/sales/new?customer_id=${id}`}><Car className="h-3.5 w-3.5 ml-1" />بيع جديد</Link>
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 -mb-px">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-4 py-2.5 text-[12px] font-bold border-b-2 transition-colors whitespace-nowrap',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* KPIs */}
                {stmtLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="إجمالي المشتريات" value={formatMoney(summary?.total_sales_amount ?? 0, 'IQD')} sub={`${summary?.sales_count ?? 0} عملية`} icon={TrendingUp} cls="border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400" />
                    <StatCard label="إجمالي المدفوع"   value={formatMoney(summary?.total_paid_amount ?? 0, 'IQD')}   icon={Wallet}       cls="border-sky-500/20 bg-sky-500/[0.04] text-sky-400" />
                    <StatCard label="الرصيد المتبقي"   value={formatMoney(summary?.total_remaining ?? 0, 'IQD')}     icon={CreditCard}   cls="border-amber-500/20 bg-amber-500/[0.04] text-amber-400" />
                    <StatCard label="المتأخرات"        value={formatMoney(summary?.total_overdue ?? 0, 'IQD')}       icon={AlertTriangle} cls={summary?.total_overdue ? 'border-rose-500/20 bg-rose-500/[0.04] text-rose-400' : 'border-subtle bg-bg-surface text-muted-foreground'} />
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Personal info */}
                  <div className="rounded-xl border border-subtle bg-bg-surface p-5">
                    <p className="text-[11px] font-bold text-muted-foreground mb-3 flex items-center gap-2"><User className="h-3.5 w-3.5" />البيانات الشخصية</p>
                    {[
                      { label: 'نوع الهوية',     value: customer.id_type },
                      { label: 'رقم الهوية',     value: customer.id_number },
                      { label: 'تاريخ الإصدار',  value: customer.id_issue_date  ? formatDate(customer.id_issue_date)  : null },
                      { label: 'تاريخ الانتهاء', value: customer.id_expiry_date ? formatDate(customer.id_expiry_date) : null },
                      { label: 'الجنسية',        value: customer.nationality },
                      { label: 'تاريخ الميلاد',  value: customer.date_of_birth  ? formatDate(customer.date_of_birth)  : null },
                      { label: 'الفرع',          value: customer.branch?.name },
                      { label: 'تاريخ التسجيل',  value: customer.created_at     ? formatDate(customer.created_at)     : null },
                    ].filter(r => r.value).map((row, i) => (
                      <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/20 last:border-0">
                        <span className="text-[11px] text-muted-foreground">{row.label}</span>
                        <span className="text-[12px] font-semibold">{row.value}</span>
                      </div>
                    ))}
                    {customer.notes && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/20">
                        <p className="text-[10px] text-amber-400 font-bold mb-1">ملاحظات</p>
                        <p className="text-[12px] text-foreground/80 leading-relaxed">{customer.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Recent transactions */}
                  <div className="rounded-xl border border-subtle bg-bg-surface p-5">
                    <p className="text-[11px] font-bold text-muted-foreground mb-3 flex items-center gap-2"><FileText className="h-3.5 w-3.5" />آخر المعاملات</p>
                    {stmtLoading ? (
                      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                    ) : sales.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                        <Car className="h-8 w-8 opacity-20" />
                        <p className="text-[11px]">لا توجد معاملات بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sales.slice(0, 5).map(s => (
                          <Link key={s.id} href={`/sales/${s.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-secondary/30 hover:border-border/70 transition-colors group"
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold truncate">{s.car_name ?? 'سيارة'}</p>
                              <p className="text-[10px] text-muted-foreground">{s.invoice_number} · {s.sale_date ? formatDate(s.sale_date) : '—'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[12px] font-black tabular-nums">{formatMoney(s.selling_price, s.currency)}</span>
                              <ExternalLink className="h-3 w-3 opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all" />
                            </div>
                          </Link>
                        ))}
                        {sales.length > 5 && (
                          <button onClick={() => setTab('sales')} className="w-full text-center text-[11px] text-primary hover:underline py-1.5 font-semibold">
                            عرض الكل ({sales.length} معاملة)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SALES & INSTALLMENTS */}
            {tab === 'sales' && (
              <div className="space-y-4">
                {stmtLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
                 sales.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
                    <Car className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-family-cairo">لا توجد مبيعات</p>
                  </div>
                ) : sales.map((s: StatementSaleItem) => (
                  <div key={s.id} className="rounded-xl border border-subtle bg-bg-surface overflow-hidden">
                    <div
                      className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpandedSale(expandedSale === s.id ? null : s.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Car className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{s.car_name ?? 'سيارة'}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{s.invoice_number} · {s.sale_date ? formatDate(s.sale_date) : '—'}</p>
                          {s.has_installment && s.installment_plan && (
                            <span className={cn('inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1',
                              s.installment_plan.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                              s.installment_plan.overdue_amount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'
                            )}>
                              {s.installment_plan.status === 'Paid' ? 'مُسدَّد' : s.installment_plan.overdue_amount > 0 ? '⚠ متأخر' : `تقسيط · ${s.installment_plan.number_of_months} شهر`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black tabular-nums">{formatMoney(s.selling_price, s.currency)}</p>
                          {s.remaining_amount > 0 && <p className="text-[10px] text-rose-400 font-semibold">متبقي {formatMoney(s.remaining_amount, s.currency)}</p>}
                        </div>
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground/60 transition-transform', expandedSale === s.id && 'rotate-180')} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedSale === s.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-border/40">
                          <div className="p-4 space-y-4">
                            {/* Progress bar */}
                            {s.has_installment && s.installment_plan && (
                              <>
                                <div>
                                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                                    <span>تقدم السداد</span>
                                    <span className="font-bold tabular-nums">{formatMoney(s.installment_plan.paid_amount, s.installment_plan.currency)} / {formatMoney(s.installment_plan.total_amount, s.installment_plan.currency)}</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full bg-emerald-500"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${s.installment_plan.total_amount ? (s.installment_plan.paid_amount / s.installment_plan.total_amount) * 100 : 0}%` }}
                                      transition={{ duration: 0.6, ease: 'easeOut' }}
                                    />
                                  </div>
                                </div>
                                {/* Schedule */}
                                {(s.installment_plan.schedules?.length ?? 0) > 0 && (
                                  <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg">
                                    {s.installment_plan.schedules.map((sch: StatementSchedule) => {
                                      const st = SCHEDULE_STATUS[sch.status] ?? SCHEDULE_STATUS.Pending
                                      const Icon = st.icon
                                      return (
                                        <div key={sch.id} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border', st.cls, 'border-current/10 bg-current/5')}>
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-3 w-3" />
                                            <span className="text-[11px] font-medium text-foreground/80">قسط #{sch.installment_number}</span>
                                            {sch.due_date && <span className="text-[10px] text-muted-foreground">{formatDate(sch.due_date)}</span>}
                                          </div>
                                          <span className="text-[11px] font-bold tabular-nums">{formatMoney(sch.amount, sch.currency)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Payments */}
                            {(s.payments?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-[11px] font-bold text-muted-foreground mb-2">سجل الدفعات</p>
                                {s.payments.map(p => (
                                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-border/20 last:border-0 text-[11px]">
                                    <span className="text-muted-foreground">{p.payment_method ?? 'نقد'} {p.payment_date && `· ${formatDate(p.payment_date)}`}</span>
                                    <span className="font-bold text-emerald-400 tabular-nums">+{formatMoney(p.amount, p.currency ?? 'IQD')}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/sales/${s.id}`}><ExternalLink className="h-3 w-3 ml-1" />فتح الفاتورة</Link>
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}

            {/* TIMELINE */}
            {tab === 'timeline' && (
              <div className="max-w-2xl">
                {stmtLoading ? (
                  <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                ) : timeline.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
                    <Clock className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-family-cairo">لا توجد أحداث</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 end-[19px] w-px bg-border/30" />
                    <div className="space-y-3 pe-10">
                      {timeline.map((ev, i) => {
                        const style = TL_STYLE[ev.type]
                        const Icon = style.icon
                        return (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                            className={cn('relative rounded-xl border p-4 flex items-start gap-3', style.bg)}
                          >
                            <div className={cn('absolute -end-[23px] top-5 h-3 w-3 rounded-full border-2 border-bg-page', style.dot)} />
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border', style.bg)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-bold">{ev.title}</p>
                                {ev.amount !== undefined && <span className="text-[12px] font-black tabular-nums shrink-0">{formatMoney(ev.amount, ev.currency ?? 'IQD')}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Calendar className="h-3 w-3 text-muted-foreground/50" />
                                <span className="text-[10px] text-muted-foreground">{formatDate(ev.date)}</span>
                                {ev.meta && <span className="text-[10px] text-muted-foreground/50">· {ev.meta}</span>}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS */}
            {tab === 'documents' && (
              <div className="space-y-4">
                {/* Upload Panel */}
                <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
                  <p className="text-xs font-semibold text-foreground mb-3">رفع مستند جديد</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <label className="mb-1 block text-[10px] text-muted-foreground">نوع المستند</label>
                      <select
                        value={uploadDocType}
                        onChange={e => setUploadDocType(e.target.value as CustomerDocumentType)}
                        aria-label="نوع المستند"
                        className="h-9 w-full rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {DOCUMENT_SLOTS.map(slot => (
                          <option key={slot.type} value={slot.type}>{slot.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted-foreground">الملف (PDF, JPG, PNG)</label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="sr-only"
                          onChange={handleDocUpload}
                          disabled={uploadingDoc}
                          aria-label="رفع ملف مستند"
                        />
                        <span className={cn(
                          'flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-semibold transition-colors',
                          uploadingDoc
                            ? 'border-border/30 bg-secondary/20 text-muted-foreground cursor-not-allowed'
                            : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                        )}>
                          {uploadingDoc
                            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />جاري الرفع...</>
                            : <><Upload className="h-3.5 w-3.5" />اختر ملف</>}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Documents Grid */}
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                    <Shield className="h-10 w-10 opacity-20" />
                    <p className="text-sm">لا توجد مستندات مرفوعة</p>
                    <p className="text-xs opacity-60">ارفع وثائق الهوية والمستمسكات من الأعلى</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.map(doc => {
                      const ext = (doc.original_filename ?? doc.filename ?? '').split('.').pop()?.toLowerCase() ?? ''
                      const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
                      const isPdf = ext === 'pdf'
                      const viewUrl = getDocumentUrl(doc.filename)
                      return (
                        <div key={doc.id} className="group rounded-xl border border-border/40 bg-bg-surface p-4 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'h-10 w-10 shrink-0 rounded-lg flex items-center justify-center border',
                              isPdf ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    : isImg ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                                    : 'bg-primary/10 border-primary/20 text-primary'
                            )}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate">
                                {getDocumentTypeLabel(doc.document_type)}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {doc.original_filename ?? doc.filename}
                              </p>
                              {doc.uploaded_at && (
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  {formatDate(doc.uploaded_at)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-secondary/30 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary/60 transition-colors"
                            >
                              {isImg ? <Eye className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                              {isImg ? 'عرض' : 'تحميل'}
                            </a>
                            <button
                              type="button"
                              aria-label="حذف المستند"
                              onClick={() => handleDocDelete(doc.id)}
                              className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="px-6 pt-6 pb-16 space-y-6" dir="rtl">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
