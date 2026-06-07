'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageCircle,
  User,
} from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getInstallments, type InstallmentFilter } from '@/lib/api/installments'
import type { InstallmentListItem } from '@/lib/api/installments'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatStrip } from '@/components/shared/StatStrip'
import { FilterBar } from '@/components/shared/FilterBar'
import { DataTable } from '@/components/shared/DataTable'

function toWaPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('964')) return d
  if (d.startsWith('0'))   return '964' + d.slice(1)
  return '964' + d
}

function waUrl(phone: string, msg: string) {
  return `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(msg)}`
}

function WaButton({ phone, msg }: { phone: string; msg: string }) {
  return (
    <a
      href={waUrl(phone, msg)}
      target="_blank"
      rel="noopener noreferrer"
      title="إرسال تذكير واتساب"
      onClick={(e) => e.stopPropagation()}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20"
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  )
}

const FILTERS: { value: InstallmentFilter; label: string }[] = [
  { value: 'all',           label: 'الكل' },
  { value: 'overdue',       label: '⚠ متأخرة' },
  { value: 'due_today',     label: 'اليوم' },
  { value: 'due_tomorrow',  label: 'غدا' },
  { value: 'due_in_2_days', label: 'بعد يومين' },
  { value: 'due_in_7_days', label: 'خلال 7 أيام' },
  { value: 'partial',       label: 'جزئية' },
  { value: 'unpaid',        label: 'غير مدفوعة' },
  { value: 'paid',          label: 'مسددة' },
]

function progressBar(paid: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((paid / total) * 100))
}

function StatusBadge({ plan }: { plan: InstallmentListItem }) {
  if (plan.status === 'Paid')
    return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">مسدد</span>
  if (plan.overdue_count > 0)
    return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">{plan.overdue_count} متأخر</span>
  if (plan.due_today_count > 0)
    return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">يستحق اليوم</span>
  if (plan.partial_count > 0)
    return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">مدفوع جزئيا</span>
  return <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">نشط</span>
}

export default function InstallmentsPage() {
  const [filter, setFilter] = useState<InstallmentFilter>('all')
  const [page,   setPage]   = useState(1)
  const perPage = 20

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['installments', page, filter],
    queryFn: () => getInstallments({ page, per_page: perPage, filter }),
    staleTime: 30_000,
    retry: 1,
  })

  const items      = data?.items ?? []
  const summary    = data?.summary
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const isFiltered = filter !== 'all'

  return (
    <div className="space-y-5" dir="rtl">

      <PageHeader
        title="إدارة الأقساط"
        icon={<CalendarDays className="h-4 w-4" />}
        count={isLoading ? undefined : total}
        filtered={isFiltered}
      />

      <StatStrip
        stats={[
          {
            label: 'متأخرة',
            value: isLoading ? '...' : (summary?.overdue_count ?? 0),
            icon: <AlertTriangle className="h-4 w-4" />,
            color: 'danger',
          },
          {
            label: 'تستحق اليوم',
            value: isLoading ? '...' : (summary?.due_today_count ?? 0),
            icon: <Clock className="h-4 w-4" />,
            color: 'warning',
          },
          {
            label: 'الخطط النشطة',
            value: isLoading ? '...' : (summary?.active_plans ?? 0),
            icon: <CreditCard className="h-4 w-4" />,
            color: 'info',
          },
          {
            label: 'مسددة',
            value: isLoading ? '...' : (summary?.paid_schedule_count ?? 0),
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'success',
          },
        ]}
      />

      <FilterBar
        selects={[
          {
            value: filter,
            onChange: v => { setFilter(v as InstallmentFilter); setPage(1) },
            options: FILTERS as { value: string; label: string }[],
            width: 'w-full sm:w-[180px]',
          },
        ]}
        hasActiveFilters={isFiltered}
        onReset={() => { setFilter('all'); setPage(1) }}
        onRefresh={() => refetch()}
      />

      <DataTable
        isLoading={isLoading}
        isError={isError}
        isEmpty={items.length === 0}
        onRetry={() => refetch()}
        emptyProps={{
          icon: <CalendarDays className="h-5 w-5" />,
          title: 'لا توجد خطط مطابقة',
          description: 'تظهر خطط الأقساط عند إنشاء فاتورة بيع بالتقسيط',
        }}
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            label="خطة"
            compact
          />
        }
      >
        <div className="divide-y divide-border/40">
          {items.map((plan) => {
            const pct    = progressBar(plan.paid_amount, plan.total_amount)
            const isPaid = plan.status === 'Paid'

            return (
              <div
                key={plan.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/40"
              >
                {/* Status icon well — semantic colors retained */}
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  isPaid
                    ? 'bg-emerald-500/10'
                    : plan.overdue_count > 0
                      ? 'bg-rose-500/10'
                      : 'bg-secondary/60'
                )}>
                  {isPaid
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    : plan.overdue_count > 0
                      ? <AlertTriangle className="h-5 w-5 text-rose-300" />
                      : <Clock className="h-5 w-5 text-muted-foreground" />
                  }
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {plan.invoice_number ?? `فاتورة #${plan.sale_id}`}
                    </p>
                    <StatusBadge plan={plan} />
                    {plan.number_of_months && (
                      <span className="rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {plan.number_of_months} شهر
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{plan.car_name ?? 'سيارة غير محددة'}</span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {plan.buyer_name ?? 'عميل غير محدد'}
                    </span>
                    {plan.next_due_date && (
                      <span>القادم: {formatDate(plan.next_due_date)}</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
                      <div
                        className={cn('h-full rounded-full', isPaid ? 'bg-emerald-500' : 'bg-primary/70')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{pct}%</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground">
                      مدفوع: <span className="font-numeric text-emerald-300">{formatMoney(plan.paid_amount, plan.currency)}</span>
                    </span>
                    {plan.remaining_amount > 0 && (
                      <span className="text-muted-foreground">
                        متبقي: <span className="font-numeric text-rose-300">{formatMoney(plan.remaining_amount, plan.currency)}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      الأقساط: {plan.paid_schedule_count}/{plan.schedule_count}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {plan.buyer_phone && (() => {
                    const msg = [
                      `مرحباً ${plan.buyer_name ?? ''}،`,
                      `نود تذكيركم بموعد قسطكم لسيارة ${plan.car_name ?? ''}.`,
                      plan.next_due_date ? `📅 تاريخ الاستحقاق: ${formatDate(plan.next_due_date)}` : '',
                      `💰 المبلغ المستحق: ${formatMoney(plan.next_due_amount || plan.installment_amount, plan.currency)}`,
                      '',
                      'شركة الأصدقاء لتجارة السيارات 🚗',
                    ].filter(Boolean).join('\n')
                    return <WaButton phone={plan.buyer_phone} msg={msg} />
                  })()}
                  <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8">
                    <Link href={`/installments/${plan.id}`} aria-label="عرض خطة الأقساط">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </DataTable>

    </div>
  )
}
