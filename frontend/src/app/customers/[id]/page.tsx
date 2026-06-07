'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit,
  ExternalLink,
  FileText,
  Hash,
  Image,
  MapPin,
  Phone,
  Printer,
} from 'lucide-react'
import { cn, formatDate, formatDateArabic, formatMoney, photoUrl } from '@/lib/utils'
import { getCustomerById, getCustomerStatement, DOC_TYPE_LABEL } from '@/lib/api/customers'
import type { CustomerDocument, StatementSaleItem } from '@/lib/api/customers'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { StatStrip } from '@/components/shared/StatStrip'

const TYPE_LABEL: Record<string, string> = {
  Buyer: 'مشتري',
  Seller: 'بائع',
}

const TYPE_COLOR: Record<string, string> = {
  Buyer: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Seller: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
}

const ID_TYPE_LABEL: Record<string, string> = {
  'National ID': 'البطاقة الوطنية',
  Passport: 'جواز السفر',
  'Residence Card': 'بطاقة السكن',
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
}) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3 border-b border-border/20 py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = Number.parseInt(rawId, 10)

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !Number.isNaN(id),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-rose-400/60" />
        <p className="text-muted-foreground">تعذر تحميل بيانات العميل</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">العودة للعملاء</Link>
        </Button>
      </div>
    )
  }

  const displayName    = customer.full_name || customer.name
  const salesCount     = customer.sales_count ?? 0
  const purchasesCount = customer.purchases_count ?? 0

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      <DetailHeader
        backHref="/customers"
        backLabel="العملاء"
        title={displayName}
        subtitle={[
          customer.phone || null,
          customer.created_at ? `عميل منذ ${formatDateArabic(customer.created_at)}` : null,
        ].filter(Boolean).join(' · ')}
        status={
          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', TYPE_COLOR[customer.customer_type])}>
            {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
          </span>
        }
        actions={
          <Button asChild size="sm" className="gap-1.5 bg-cyan-600 text-white hover:bg-cyan-500">
            <Link href={`/customers/${id}/edit`}>
              <Edit className="h-4 w-4" />
              تعديل
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="البيانات الشخصية" contentClassName="px-5 py-0">
          <InfoRow icon={Phone}    label="رقم الهاتف"   value={customer.phone} />
          <InfoRow icon={MapPin}   label="العنوان"       value={customer.address} />
          <InfoRow icon={Calendar} label="تاريخ الميلاد" value={customer.date_of_birth ? formatDate(customer.date_of_birth) : null} />
          <InfoRow icon={Hash}     label="الجنسية"       value={customer.nationality} />
          <InfoRow icon={FileText} label="ملاحظات"       value={customer.notes} />
        </SectionCard>

        <SectionCard title="الوثيقة الرسمية" contentClassName="px-5 py-0">
          <InfoRow icon={FileText} label="نوع الهوية"    value={customer.id_type ? (ID_TYPE_LABEL[customer.id_type] ?? customer.id_type) : null} />
          <InfoRow icon={Hash}     label="رقم الهوية"    value={customer.id_number} />
          <InfoRow icon={Calendar} label="تاريخ الإصدار" value={customer.id_issue_date ? formatDate(customer.id_issue_date) : null} />
          <InfoRow icon={Calendar} label="تاريخ الانتهاء" value={customer.id_expiry_date ? formatDate(customer.id_expiry_date) : null} />
        </SectionCard>
      </div>

      <StatStrip
        stats={[
          { label: 'فواتير البيع كـمشتري',  value: salesCount,     color: 'info' },
          { label: 'فواتير الشراء كـبائع',  value: purchasesCount, color: 'info' },
        ]}
      />

      {customer.customer_type === 'Buyer' && (
        <CustomerStatement customerId={id} customerName={displayName} />
      )}

      <DocumentGallery docs={customer.documents ?? []} customerId={id} />
    </div>
  )
}

/* ─── Customer Statement Component ───────────────────────────────────────── */
const STATUS_BADGE: Record<string, string> = {
  Paid:      'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Overdue:   'bg-rose-500/10 text-rose-300 border-rose-500/20',
  Partial:   'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Pending:   'bg-slate-500/10 text-slate-300 border-slate-500/20',
  Active:    'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Cancelled: 'bg-slate-600/10 text-slate-400 border-slate-600/20',
}
const STATUS_LABEL: Record<string, string> = {
  Paid: 'مسدد', Overdue: 'متأخر', Partial: 'جزئي',
  Pending: 'معلق', Active: 'نشط', Cancelled: 'ملغاة',
}
const METHOD_LABEL: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة',
}

function SaleCard({ sale }: { sale: StatementSaleItem }) {
  const [open, setOpen] = useState(false)
  const plan = sale.installment_plan

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      {/* Sale header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-secondary/20 cursor-pointer"
        onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          <Car className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{sale.car_name ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{sale.invoice_number} · {sale.sale_date ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <p className="font-numeric text-xs font-bold text-foreground">{formatMoney(sale.selling_price, sale.currency)}</p>
            {sale.remaining_amount > 0 && (
              <p className="text-[10px] text-rose-400">متبقي: {formatMoney(sale.remaining_amount, sale.currency)}</p>
            )}
          </div>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', STATUS_BADGE[sale.status] ?? STATUS_BADGE.Active)}>
            {STATUS_LABEL[sale.status] ?? sale.status}
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-3 space-y-3">

              {/* Payment method */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                <span>طريقة الدفع: {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}</span>
              </div>

              {/* Installment schedule */}
              {plan && plan.schedules.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-cyan-300 mb-2">
                    جدول الأقساط ({plan.number_of_months} شهر)
                    {plan.overdue_amount > 0 && (
                      <span className="ms-2 text-rose-400">· متأخر: {formatMoney(plan.overdue_amount, 'IQD')}</span>
                    )}
                  </p>
                  <div className="rounded-lg overflow-hidden border border-border/30">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary/20 text-[10px] text-muted-foreground">
                          <th className="px-3 py-2 text-start">#</th>
                          <th className="px-3 py-2 text-start">الاستحقاق</th>
                          <th className="px-3 py-2 text-end">المبلغ</th>
                          <th className="px-3 py-2 text-end">المدفوع</th>
                          <th className="px-3 py-2 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.schedules.map(sch => (
                          <tr key={sch.id} className="border-t border-border/20">
                            <td className="px-3 py-1.5 text-muted-foreground">{sch.installment_number}</td>
                            <td className="px-3 py-1.5">{sch.due_date ?? '—'}</td>
                            <td className="px-3 py-1.5 text-end font-numeric">{formatMoney(sch.amount, sch.currency)}</td>
                            <td className="px-3 py-1.5 text-end font-numeric text-emerald-400/80">{formatMoney(sch.paid_amount, sch.currency)}</td>
                            <td className="px-3 py-1.5 text-center">
                              <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px]', STATUS_BADGE[sch.status] ?? '')}>
                                {STATUS_LABEL[sch.status] ?? sch.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment history */}
              {sale.payments.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-violet-300 mb-2">سجل الدفعات</p>
                  <div className="space-y-1">
                    {sale.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-secondary/20">
                        <span className="text-muted-foreground">{p.payment_date ?? '—'}</span>
                        <span className="text-muted-foreground">{METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method}</span>
                        <span className="font-numeric text-emerald-400 font-medium">{formatMoney(p.amount, p.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CustomerStatement({ customerId, customerName }: { customerId: number; customerName: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-statement', customerId],
    queryFn:  () => getCustomerStatement(customerId),
    staleTime: 30_000,
    retry: 1,
  })

  return (
    <SectionCard
      title="كشف حساب العميل"
      action={
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Link href={`/customers/${customerId}/statement`} target="_blank">
            <Printer className="h-3 w-3" />طباعة
          </Link>
        </Button>
      }
      noPadding
    >
      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : isError || !data ? (
        <div className="py-8 text-center text-xs text-muted-foreground/50">تعذر تحميل كشف الحساب</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="divide-y divide-border/30 rounded-lg border border-border/40 overflow-hidden">
            {[
              { label: 'إجمالي الشراء', value: data.summary.total_sales_amount, color: 'text-foreground' },
              { label: 'المدفوع',        value: data.summary.total_paid_amount,  color: 'text-emerald-400' },
              { label: 'المتبقي',        value: data.summary.total_remaining,    color: 'text-amber-400' },
              { label: 'المتأخر',        value: data.summary.total_overdue,      color: 'text-rose-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn('font-numeric text-sm font-semibold tabular-nums', item.color)}>
                  {formatMoney(item.value, 'IQD')}
                </span>
              </div>
            ))}
          </div>

          {data.summary.last_payment_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>آخر دفعة: <span className="text-foreground">{data.summary.last_payment_date}</span></span>
            </div>
          )}

          {/* Sales list */}
          {data.sales.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-4">لا توجد فواتير مبيعات لهذا العميل</p>
          ) : (
            <div className="space-y-2">
              {data.sales.map(sale => <SaleCard key={sale.id} sale={sale} />)}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

function DocumentGallery({ docs, customerId }: { docs: CustomerDocument[]; customerId: number }) {
  const SLOTS = [
    { type: 'id_front',       label: 'وجه الهوية' },
    { type: 'id_back',        label: 'ظهر الهوية' },
    { type: 'residence_card', label: 'بطاقة السكن' },
    { type: 'passport',       label: 'جواز السفر' },
    { type: 'document_photo', label: 'مستمسك آخر' },
  ] as const

  const allDocs: Array<{ doc?: CustomerDocument; label: string }> = []

  for (const slot of SLOTS) {
    const matching = docs.filter((d) => d.document_type === slot.type)
    if (matching.length > 0) {
      matching.forEach((doc) => allDocs.push({ doc, label: slot.label }))
    } else {
      allDocs.push({ label: slot.label })
    }
  }

  return (
    <SectionCard
      title="وثائق العميل"
      action={<span className="text-xs text-muted-foreground">{docs.length} وثيقة</span>}
      noPadding
    >
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-5">
        {allDocs.map(({ doc, label }, index) => {
          if (!doc) {
            return (
              <div key={`empty-${index}`} className="flex flex-col items-center gap-2">
                <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-border/40 bg-secondary/20">
                  <Image className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <p className="text-center text-[11px] text-muted-foreground/50">{label}</p>
              </div>
            )
          }

          const url   = photoUrl(doc.filename, 'customers')
          const isPdf = doc.filename.endsWith('.pdf')

          return (
            <div key={doc.id} className="flex flex-col items-center gap-2">
              <a href={url} target="_blank" rel="noreferrer"
                className="group relative block h-28 w-full overflow-hidden rounded-lg border border-border/40 bg-secondary/20 hover:border-violet-500/40 transition-colors">
                {isPdf ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
                    <FileText className="h-8 w-8 text-violet-400/70" />
                    <p className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                      {doc.original_filename ?? 'PDF'}
                    </p>
                  </div>
                ) : (
                  <img src={url} alt={label}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-5 w-5 text-white" />
                </div>
              </a>
              <p className="text-center text-[11px] text-muted-foreground">{DOC_TYPE_LABEL[doc.document_type] ?? label}</p>
            </div>
          )
        })}
      </div>

      {docs.length === 0 && (
        <div className="px-5 pb-4 text-center">
          <p className="text-xs text-muted-foreground/50">
            لا توجد وثائق مرفوعة — يمكن إضافتها من صفحة{' '}
            <a href={`/customers/${customerId}/edit`} className="text-cyan-400 hover:underline">تعديل العميل</a>
          </p>
        </div>
      )}
    </SectionCard>
  )
}
