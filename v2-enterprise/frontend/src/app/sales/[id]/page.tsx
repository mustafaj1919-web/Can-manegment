'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, Clock, AlertTriangle, AlertCircle, FileText,
} from 'lucide-react'
import { cn, formatMoney, formatDate, formatDateArabic, translateStatus, getStatusVariant } from '@/lib/utils'
import { getSaleById } from '@/lib/api/sales'
import type { InstallmentScheduleItem } from '@/lib/api/sales'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'

const STATUS_ICON: Record<string, React.ElementType> = {
  Paid:    CheckCircle2,
  Pending: Clock,
  Partial: Clock,
  Overdue: AlertTriangle,
}

const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة مصرفية',
}

function ScheduleRow({ sc }: { sc: InstallmentScheduleItem }) {
  const Icon = STATUS_ICON[sc.status] ?? Clock
  const colorMap: Record<string, string> = {
    Paid:    'text-emerald-400',
    Pending: 'text-muted-foreground',
    Partial: 'text-amber-400',
    Overdue: 'text-rose-400',
  }
  const color = colorMap[sc.status] ?? 'text-muted-foreground'

  return (
    <tr className="border-b border-border/20 last:border-0 hover:bg-secondary/20">
      <td className="px-4 py-3 text-xs text-muted-foreground">#{sc.installment_number}</td>
      <td className="px-4 py-3 text-xs">{formatDate(sc.due_date)}</td>
      <td className="px-4 py-3 text-xs money text-foreground font-medium">
        {formatMoney(sc.amount, sc.currency)}
      </td>
      <td className="px-4 py-3 text-xs money text-emerald-400">
        {sc.paid_amount > 0 ? formatMoney(sc.paid_amount, sc.currency) : '—'}
      </td>
      <td className="px-4 py-3 text-xs money text-rose-400">
        {sc.remaining_amount > 0 ? formatMoney(sc.remaining_amount, sc.currency) : '—'}
      </td>
      <td className="px-4 py-3">
        <div className={cn('flex items-center gap-1.5', color)}>
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">{translateStatus(sc.status)}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60">
        {sc.payment_date ? formatDate(sc.payment_date) : '—'}
      </td>
    </tr>
  )
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = rawId

  const { data: sale, isLoading, isError } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSaleById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (isError || !sale) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400/50" />
        <p className="text-muted-foreground">تعذّر تحميل الفاتورة</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sales">العودة للمبيعات</Link>
        </Button>
      </div>
    )
  }

  const plan          = sale.installment_plan
  const paidSchedules  = plan?.schedules.filter(s => s.status === 'Paid').length  ?? 0
  const overdueCount   = plan?.schedules.filter(s => s.status === 'Overdue').length ?? 0
  const totalSchedules = plan?.schedules.length ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      <DetailHeader
        backHref="/sales"
        backLabel="المبيعات"
        title={sale.invoice_number}
        subtitle={`${formatDateArabic(sale.sale_date)} · ${METHOD_LABELS[sale.payment_method] ?? sale.payment_method}`}
        status={
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', getStatusVariant(sale.status))}>
            {translateStatus(sale.status)}
          </span>
        }
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            <Link href={`/sales/${id}/receipt`}>
              <FileText className="h-3.5 w-3.5" />
              وصل القبض
            </Link>
          </Button>
        }
      />

      {/* ── Car + Buyer ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="السيارة" contentClassName="px-5 py-2">
          {sale.car ? (
            <>
              <div className="py-2.5 border-b border-border/30">
                <p className="text-sm font-bold text-foreground">
                  {sale.car.brand} {sale.car.model} {sale.car.manufacturing_year}
                </p>
                {sale.car.trim && <p className="text-xs text-muted-foreground mt-0.5">{sale.car.trim}</p>}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 py-2.5 text-xs">
                <span className="text-muted-foreground">اللون</span><span>{sale.car.color}</span>
                <span className="text-muted-foreground">رقم الشاصي</span><span className="font-mono text-[11px]">{sale.car.vin}</span>
                <span className="text-muted-foreground">اللوحة</span><span>{sale.car.plate_number}</span>
              </div>
            </>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">سيارة #{sale.car_id}</p>
          )}
        </SectionCard>

        <SectionCard title="المشتري" contentClassName="px-5 py-2">
          {sale.buyer ? (
            <>
              <div className="py-2.5 border-b border-border/30">
                <p className="text-sm font-bold text-foreground">{sale.buyer.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 py-2.5 text-xs">
                <span className="text-muted-foreground">الهاتف</span><span>{sale.buyer.phone}</span>
                {sale.buyer.id_type && (<>
                  <span className="text-muted-foreground">نوع الهوية</span><span>{sale.buyer.id_type}</span>
                </>)}
                <span className="text-muted-foreground">رقم الهوية</span><span>{sale.buyer.id_number}</span>
                {sale.buyer.address && (<>
                  <span className="text-muted-foreground">العنوان</span><span>{sale.buyer.address}</span>
                </>)}
              </div>
            </>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">عميل #{sale.buyer_id}</p>
          )}
        </SectionCard>
      </div>

      {/* ── Financial Summary ── */}
      <SectionCard title="الملخص المالي" contentClassName="px-5 py-1">
        <div className="divide-y divide-border/30">
          {[
            { label: 'سعر البيع', value: sale.selling_price,    color: 'text-foreground' },
            { label: 'الخصم',     value: sale.discount,         color: 'text-rose-400'   },
            { label: 'المدفوع',   value: sale.paid_amount,      color: 'text-emerald-400' },
            { label: 'المتبقي',   value: sale.remaining_amount, color: sale.remaining_amount > 0 ? 'text-rose-400' : 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={cn('text-sm font-semibold tabular-nums money', color)}>
                {formatMoney(value, sale.currency)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Payment History ── */}
      {sale.payments.length > 0 && (
        <SectionCard title={`سجل الدفعات (${sale.payments.length})`} noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {['التاريخ', 'المبلغ', 'الطريقة', 'ملاحظات'].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 last:border-0">
                    <td className="px-4 py-3 text-xs">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-xs font-semibold money text-emerald-400">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Installment Plan ── */}
      {plan && (
        <SectionCard
          title="خطة الأقساط"
          description={`${paidSchedules}/${totalSchedules} دفعة${overdueCount > 0 ? ` · ${overdueCount} متأخرة` : ''}`}
          action={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-cyan-400 hover:text-cyan-300">
              <Link href={`/installments/${plan.id}`}>تفاصيل الأقساط</Link>
            </Button>
          }
          noPadding
        >
          {/* Plan summary */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/30 px-5 py-3.5">
            {[
              { label: 'إجمالي الأقساط', value: formatMoney(plan.total_amount, plan.currency),    color: 'text-foreground' },
              { label: 'مدفوع',          value: formatMoney(plan.paid_amount, plan.currency),      color: 'text-emerald-400' },
              { label: 'متبقي',          value: formatMoney(plan.remaining_amount, plan.currency), color: plan.remaining_amount > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <span key={label} className="flex items-baseline gap-1.5 text-[11px]">
                <span className="text-muted-foreground/60">{label}</span>
                <span className={cn('font-semibold tabular-nums money', color)}>{value}</span>
              </span>
            ))}
          </div>

          {/* Schedules table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {['#', 'تاريخ الاستحقاق', 'المبلغ', 'مدفوع', 'متبقي', 'الحالة', 'تاريخ الدفع'].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.schedules.map((sc) => (
                  <ScheduleRow key={sc.id} sc={sc} />
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

    </div>
  )
}
