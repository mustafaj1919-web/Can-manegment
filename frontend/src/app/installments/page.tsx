'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  User,
} from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getInstallments, type InstallmentFilter } from '@/lib/api/installments'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function InstallmentsPage() {
  const [filter, setFilter] = useState<InstallmentFilter>('all')
  const [page, setPage] = useState(1)
  const perPage = 20

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['installments', page, filter],
    queryFn: () => getInstallments({ page, per_page: perPage, filter }),
    staleTime: 30_000,
    retry: 1,
  })

  const items = data?.items ?? []
  const summary = data?.summary
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <CalendarDays className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">إدارة الأقساط</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${total} خطة`}
            </p>
          </div>
        </div>
        <Select value={filter} onValueChange={(value) => { setFilter(value as InstallmentFilter); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] border-white/10 bg-white/5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={AlertTriangle} label="متأخرة" count={summary.overdue_count} amount={summary.overdue_amount} tone="rose" />
          <SummaryCard icon={Clock} label="تستحق اليوم" count={summary.due_today_count} amount={summary.due_today_amount} tone="amber" />
          <SummaryCard icon={CalendarDays} label="غدا" count={summary.due_tomorrow_count} amount={summary.due_tomorrow_amount} tone="cyan" />
          <SummaryCard icon={CalendarDays} label="بعد يومين" count={summary.due_in_2_days_count} amount={summary.due_in_2_days_amount} tone="violet" />
          <SummaryCard icon={CreditCard} label="إجمالي الذمم" count={summary.active_plans} amount={summary.total_receivables} tone="blue" />
          <SummaryCard icon={CheckCircle2} label="أقساط مدفوعة" count={summary.paid_schedule_count} amount={0} tone="emerald" hideAmount />
          <SummaryCard icon={Clock} label="مدفوع جزئيا" count={summary.partial_count} amount={0} tone="amber" hideAmount />
          <SummaryCard icon={AlertCircle} label="غير مدفوعة" count={summary.unpaid_count} amount={0} tone="slate" hideAmount />
        </div>
      )}

      <div className="glass overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل خطط الأقساط</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">إعادة المحاولة</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">لا توجد خطط مطابقة</p>
            <p className="mt-1 text-xs text-muted-foreground/50">تظهر خطط الأقساط عند إنشاء فاتورة بيع بالتقسيط</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {items.map((plan, index) => {
                const pct = progressBar(plan.paid_amount, plan.total_amount)
                const isPaid = plan.status === 'Paid'
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', isPaid ? 'bg-emerald-500/10' : plan.overdue_count > 0 ? 'bg-rose-500/10' : 'bg-cyan-500/10')}>
                      {isPaid ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : plan.overdue_count > 0 ? <AlertTriangle className="h-5 w-5 text-rose-300" /> : <Clock className="h-5 w-5 text-cyan-300" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">{plan.invoice_number ?? `فاتورة #${plan.sale_id}`}</p>
                        <StatusBadge plan={plan} />
                        {plan.number_of_months && <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">{plan.number_of_months} شهر</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{plan.car_name ?? 'سيارة غير محددة'}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{plan.buyer_name ?? 'عميل غير محدد'}</span>
                        {plan.next_due_date && <span>القادم: {formatDate(plan.next_due_date)}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div className={cn('h-full rounded-full', isPaid ? 'bg-emerald-500' : 'bg-cyan-500')} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="text-muted-foreground">مدفوع: <span className="font-numeric text-emerald-300">{formatMoney(plan.paid_amount, plan.currency)}</span></span>
                        {plan.remaining_amount > 0 && <span className="text-muted-foreground">متبقي: <span className="font-numeric text-rose-300">{formatMoney(plan.remaining_amount, plan.currency)}</span></span>}
                        <span className="text-muted-foreground">الأقساط: {plan.paid_schedule_count}/{plan.schedule_count}</span>
                      </div>
                    </div>

                    <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8 shrink-0">
                      <Link href={`/installments/${plan.id}`} aria-label="عرض خطة الأقساط">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
                <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>السابق</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>التالي</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  count,
  amount,
  tone,
  hideAmount = false,
}: {
  icon: React.ElementType
  label: string
  count: number
  amount: number
  tone: 'rose' | 'amber' | 'cyan' | 'violet' | 'blue' | 'emerald' | 'slate'
  hideAmount?: boolean
}) {
  const colors = {
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  }
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-numeric text-xl font-black text-foreground">{count}</p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', colors[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {!hideAmount && (
        <p className="mt-3 truncate font-numeric text-sm font-semibold text-muted-foreground">
          {formatMoney(amount, 'USD')}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ plan }: { plan: import('@/lib/api/installments').InstallmentListItem }) {
  if (plan.status === 'Paid') return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">مسدد</span>
  if (plan.overdue_count > 0) return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">{plan.overdue_count} متأخر</span>
  if (plan.due_today_count > 0) return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">يستحق اليوم</span>
  if (plan.partial_count > 0) return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">مدفوع جزئيا</span>
  return <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">نشط</span>
}
