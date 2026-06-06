'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, Car, User, Receipt, CalendarDays,
  CheckCircle2, Clock, AlertTriangle, AlertCircle,
  ArrowRight, Banknote, FileText,
} from 'lucide-react'
import { cn, formatMoney, formatDate, formatDateArabic, translateStatus, getStatusVariant } from '@/lib/utils'
import { getSaleById } from '@/lib/api/sales'
import type { InstallmentScheduleItem } from '@/lib/api/sales'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

const STATUS_ICON: Record<string, React.ElementType> = {
  Paid:    CheckCircle2,
  Pending: Clock,
  Partial: Clock,
  Overdue: AlertTriangle,
}

const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة مصرفية',
}

function ScheduleRow({ sc, index }: { sc: InstallmentScheduleItem; index: number }) {
  const Icon = STATUS_ICON[sc.status] ?? Clock
  const colorMap: Record<string, string> = {
    Paid:    'text-emerald-400',
    Pending: 'text-muted-foreground',
    Partial: 'text-amber-400',
    Overdue: 'text-rose-400',
  }
  const color = colorMap[sc.status] ?? 'text-muted-foreground'

  return (
    <motion.tr
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]"
    >
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
    </motion.tr>
  )
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = parseInt(rawId)

  const { data: sale, isLoading, isError } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => getSaleById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !isNaN(id),
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

  const plan = sale.installment_plan
  const paidSchedules  = plan?.schedules.filter(s => s.status === 'Paid').length  ?? 0
  const overdueCount   = plan?.schedules.filter(s => s.status === 'Overdue').length ?? 0
  const totalSchedules = plan?.schedules.length ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Receipt className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground font-mono">{sale.invoice_number}</h1>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', getStatusVariant(sale.status))}>
                {translateStatus(sale.status)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateArabic(sale.sale_date)} · {METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            <Link href={`/sales/${id}/receipt`}>
              <FileText className="h-3.5 w-3.5" />
              وصل القبض
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <Link href="/sales"><ArrowRight className="h-3.5 w-3.5" />جميع الفواتير</Link>
          </Button>
        </div>
      </div>

      {/* ── Car + Buyer ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Car */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Car className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <p className="text-sm font-semibold">السيارة</p>
          </div>
          <div className="p-4 space-y-2">
            {sale.car ? (
              <>
                <p className="text-base font-bold text-foreground">
                  {sale.car.brand} {sale.car.model} {sale.car.manufacturing_year}
                </p>
                {sale.car.trim && <p className="text-xs text-muted-foreground">{sale.car.trim}</p>}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                  <span className="text-muted-foreground">اللون</span><span>{sale.car.color}</span>
                  <span className="text-muted-foreground">رقم الشاصي</span><span className="font-mono text-[11px]">{sale.car.vin}</span>
                  <span className="text-muted-foreground">اللوحة</span><span>{sale.car.plate_number}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">سيارة #{sale.car_id}</p>
            )}
          </div>
        </div>

        {/* Buyer */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <p className="text-sm font-semibold">المشتري</p>
          </div>
          <div className="p-4 space-y-2">
            {sale.buyer ? (
              <>
                <p className="text-base font-bold text-foreground">{sale.buyer.name}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
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
              <p className="text-sm text-muted-foreground">عميل #{sale.buyer_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Financial Summary ── */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Banknote className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold">الملخص المالي</p>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'سعر البيع',      value: sale.selling_price,    color: 'text-amber-400' },
            { label: 'الخصم',          value: sale.discount,         color: 'text-rose-400'  },
            { label: 'المدفوع',        value: sale.paid_amount,      color: 'text-emerald-400' },
            { label: 'المتبقي',        value: sale.remaining_amount, color: sale.remaining_amount > 0 ? 'text-rose-400' : 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className={cn('text-sm font-bold money', color)}>
                {formatMoney(value, sale.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment History ── */}
      {sale.payments.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <p className="text-sm font-semibold">سجل الدفعات ({sale.payments.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['التاريخ', 'المبلغ', 'الطريقة', 'ملاحظات'].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((p, i) => (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-white/[0.03] last:border-0">
                    <td className="px-4 py-3 text-xs">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-xs font-semibold money text-emerald-400">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.notes ?? '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Installment Plan ── */}
      {plan && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">خطة الأقساط</p>
                <p className="text-xs text-muted-foreground">
                  {paidSchedules}/{totalSchedules} دفعة
                  {overdueCount > 0 && <span className="text-rose-400 ms-2">· {overdueCount} متأخرة</span>}
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1 text-cyan-400 hover:text-cyan-300">
              <Link href={`/installments/${plan.id}`}>
                تفاصيل الأقساط
              </Link>
            </Button>
          </div>

          {/* Plan summary */}
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/[0.06] border-b border-white/[0.06]">
            {[
              { label: 'إجمالي الأقساط', value: plan.total_amount, color: 'text-foreground' },
              { label: 'مدفوع',           value: plan.paid_amount,  color: 'text-emerald-400' },
              { label: 'متبقي',           value: plan.remaining_amount, color: plan.remaining_amount > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="py-3 px-4 text-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={cn('text-sm font-bold money mt-0.5', color)}>
                  {formatMoney(value, plan.currency)}
                </p>
              </div>
            ))}
          </div>

          {/* Schedules table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['#', 'تاريخ الاستحقاق', 'المبلغ', 'مدفوع', 'متبقي', 'الحالة', 'تاريخ الدفع'].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.schedules.map((sc, i) => (
                  <ScheduleRow key={sc.id} sc={sc} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
