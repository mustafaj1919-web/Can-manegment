'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageCircle,
  User,
  List,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getInstallments, getInstallmentPlan, payInstallmentSchedule, type InstallmentFilter } from '@/lib/api/installments'
import type { InstallmentListItem } from '@/lib/api/installments'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterBar } from '@/components/shared/FilterBar'
import { DataTable } from '@/components/shared/DataTable'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

// ── Constants ────────────────────────────────────────────────────────────────

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

const ARABIC_MONTHS = [
  'كانون الثاني (1)',
  'شباط (2)',
  'آذار (3)',
  'نيسان (4)',
  'أيار (5)',
  'حزيران (6)',
  'تموز (7)',
  'آب (8)',
  'أيلول (9)',
  'تشرين الأول (10)',
  'تشرين الثاني (11)',
  'كانون الأول (12)'
]

const WEEKDAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayIndex(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return (d + 1) % 7 // Saturday is the first day of our grid
}

function getDaysOverdue(dueDateStr: string | null) {
  if (!dueDateStr) return 0
  const due = new Date(dueDateStr)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffTime = today.getTime() - due.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

function KpiCard({ icon, label, value, iconColor, iconBg, accentGlow, active, onClick }: {
  icon: React.ReactNode; label: string; value: number | string
  iconColor: string; iconBg: string; accentGlow?: string
  active?: boolean; onClick?: () => void
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card border rounded-xl p-4 relative overflow-hidden group transition-all duration-300 shadow-sm cursor-pointer select-none",
        active 
          ? "border-primary ring-1 ring-primary bg-primary/[0.02]" 
          : "border-border/60 hover:border-primary/20 hover:shadow-md"
      )}
    >
      {accentGlow && (
        <div className={cn('absolute -top-8 -end-8 w-24 h-24 rounded-full blur-[40px] opacity-[0.03] dark:opacity-20 group-hover:opacity-[0.06] dark:group-hover:opacity-35 transition-opacity', accentGlow)} />
      )}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="mt-0.5 text-xs text-muted-foreground/60 font-semibold">{label}</p>
          <p className="font-numeric text-2xl font-bold tabular-nums text-foreground mt-1.5">
            {typeof value === 'number' ? value.toLocaleString('en-US') : value}
          </p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

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

function progressBar(paid: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((paid / total) * 100))
}

function StatusBadge({ plan }: { plan: InstallmentListItem }) {
  if (plan.status === 'Paid')
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.06)]">
        مسدد
      </span>
    )
  if (plan.overdue_count > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.06)]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
        </span>
        {plan.overdue_count} متأخر
      </span>
    )
  if (plan.due_today_count > 0)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.06)]">
        يستحق اليوم
      </span>
    )
  if (plan.partial_count > 0)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.06)]">
        مدفوع جزئيا
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.06)]">
      نشط
    </span>
  )
}

function QuickPayRow({ planId, currency, onCancel, onSuccess }: {
  planId: string
  currency: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  const prevUnpaidRef = useRef<number | null>(null)

  // Fetch plan details to get the schedules and find the first unpaid one
  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['installment-plan-quick', planId],
    queryFn: () => getInstallmentPlan(planId),
    staleTime: 5000,
  })

  // Once plan is loaded, find the first unpaid schedule
  const unpaidSchedule = plan?.schedules?.find((s: any) => s.status !== 'Paid' && s.remaining_amount > 0)

  useEffect(() => {
    if (unpaidSchedule && unpaidSchedule.id !== prevUnpaidRef.current) {
      setAmount(String(unpaidSchedule.remaining_amount))
      prevUnpaidRef.current = unpaidSchedule.id
    }
  }, [unpaidSchedule])

  const mutation = useMutation({
    mutationFn: () => {
      if (!unpaidSchedule) throw new Error('No unpaid schedule found')
      return payInstallmentSchedule(unpaidSchedule.id, {
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        notes: notes || undefined,
      })
    },
    onSuccess: () => {
      toast.success(`تم تسجيل السداد السريع بنجاح (القسط #${unpaidSchedule?.installment_number})`)
      onSuccess()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? 'حدث خطأ أثناء السداد'
      toast.error(msg)
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-secondary/20 rounded-lg text-xs text-muted-foreground mt-2" onClick={(e) => e.stopPropagation()}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>جاري تحميل تفاصيل خطة الأقساط...</span>
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="text-xs text-rose-400 py-3 px-4 bg-rose-500/10 rounded-lg mt-2" onClick={(e) => e.stopPropagation()}>
        حدث خطأ أثناء تحميل تفاصيل الأقساط.
      </div>
    )
  }

  if (!unpaidSchedule) {
    return (
      <div className="text-xs text-emerald-400 py-3 px-4 bg-emerald-500/10 rounded-lg mt-2" onClick={(e) => e.stopPropagation()}>
        جميع أقساط هذه الخطة مسددة بالكامل.
      </div>
    )
  }

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="mt-3 p-4 bg-secondary/20 border border-border/40 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
        <span className="font-bold text-foreground">
          سداد سريع للقسط #{unpaidSchedule.installment_number} (يستحق في {formatDate(unpaidSchedule.due_date)})
        </span>
        <span className="text-muted-foreground">
          المتبقي للقسط: <span className="font-bold text-rose-400 font-numeric">{formatMoney(unpaidSchedule.remaining_amount, currency as 'IQD' | 'USD' | undefined)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block font-semibold">المبلغ المستلم</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-xs bg-card border-border/50 font-numeric"
            placeholder="المبلغ"
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block font-semibold">طريقة الدفع</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            aria-label="طريقة الدفع"
            className="w-full h-8 text-xs bg-card border border-border/50 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Cash">نقداً</option>
            <option value="Bank transfer">حوالة مصرفية</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block font-semibold">ملاحظات</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-8 text-xs bg-card border-border/50"
            placeholder="ملاحظات اختيارية..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          disabled={mutation.isPending}
          className="h-7 text-xs px-3"
        >
          إلغاء
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > unpaidSchedule.remaining_amount}
          onClick={() => mutation.mutate()}
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 font-semibold"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              جاري التسجيل...
            </span>
          ) : (
            'تأكيد السداد السريع'
          )}
        </Button>
      </div>
    </div>
  )
}

export default function InstallmentsPage() {
  const [filter, setFilter] = useState<InstallmentFilter>('all')
  const [view, setView]     = useState<'list' | 'calendar'>('list')
  const [page,   setPage]   = useState(1)
  const [riskFilter, setRiskFilter] = useState<'all' | 'on_time' | 'late_week' | 'late_month'>('all')
  const [quickPayPlanId, setQuickPayPlanId] = useState<string | null>(null)
  const perPage = view === 'calendar' ? 100 : 20
  const router = useRouter()
  const qc = useQueryClient()

  // Calendar dates state
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['installments', page, filter, view],
    queryFn: () => getInstallments({ page, per_page: perPage, filter }),
    staleTime: 30_000,
    retry: 1,
  })

  const items      = data?.items ?? []
  const summary    = data?.summary
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const isFiltered = filter !== 'all' || riskFilter !== 'all'

  // Risk count computations
  const onTimeCount = summary ? (summary.active_plans - summary.overdue_count) : 0
  const lateWeekCount = items.filter(p => p.overdue_count > 0 && getDaysOverdue(p.next_due_date) <= 30).length
  const lateMonthCount = items.filter(p => p.overdue_count > 0 && getDaysOverdue(p.next_due_date) > 30).length

  // Filter items based on selected risk category
  const filteredItems = items.filter(plan => {
    if (riskFilter === 'on_time') {
      return plan.overdue_count === 0 && plan.status === 'Active'
    }
    if (riskFilter === 'late_week') {
      return plan.overdue_count > 0 && getDaysOverdue(plan.next_due_date) <= 30
    }
    if (riskFilter === 'late_month') {
      return plan.overdue_count > 0 && getDaysOverdue(plan.next_due_date) > 30
    }
    return true
  })

  // Generate calendar days
  const calendarDays = (() => {
    const arr = []
    const totalD = daysInMonth(currentYear, currentMonth)
    const firstIdx = firstDayIndex(currentYear, currentMonth)
    for (let i = 0; i < firstIdx; i++) {
      arr.push(null)
    }
    for (let i = 1; i <= totalD; i++) {
      arr.push(new Date(currentYear, currentMonth, i))
    }
    return arr
  })()

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const viewToggle = (
    <div className="flex rounded-lg border border-border/60 bg-secondary/30 p-0.5">
      {([['list', List], ['calendar', CalendarDays]] as const).map(([v, Icon]) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          aria-label={v === 'list' ? 'عرض القائمة' : 'عرض التقويم'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            view === v ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )

  const handleQuickPaySuccess = () => {
    setQuickPayPlanId(null)
    refetch()
    qc.invalidateQueries({ queryKey: ['installments'] })
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir="rtl">

      <PageHeader
        title="إدارة الأقساط"
        icon={<CalendarDays className="h-4 w-4" />}
        count={isLoading ? undefined : filteredItems.length}
        filtered={isFiltered}
        actions={viewToggle}
      />

      {/* ── Status Funnel Grid ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="في الموعد (نشط)"
          value={isLoading ? '...' : onTimeCount}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          accentGlow="bg-emerald-500"
          active={riskFilter === 'on_time'}
          onClick={() => setRiskFilter(riskFilter === 'on_time' ? 'all' : 'on_time')}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="متأخر (أسبوع/لغاية شهر)"
          value={isLoading ? '...' : lateWeekCount}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 border-amber-500/20"
          accentGlow="bg-amber-500"
          active={riskFilter === 'late_week'}
          onClick={() => setRiskFilter(riskFilter === 'late_week' ? 'all' : 'late_week')}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="متأخر (شهر+)"
          value={isLoading ? '...' : lateMonthCount}
          iconColor="text-rose-500"
          iconBg="bg-rose-500/10 border-rose-500/20"
          accentGlow="bg-rose-500"
          active={riskFilter === 'late_month'}
          onClick={() => setRiskFilter(riskFilter === 'late_month' ? 'all' : 'late_month')}
        />
      </div>

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
        onReset={() => { setFilter('all'); setRiskFilter('all'); setPage(1) }}
        onRefresh={() => refetch()}
      />

      {view === 'list' && (
        <DataTable
          isLoading={isLoading}
          isError={isError}
          isEmpty={filteredItems.length === 0}
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
            {filteredItems.map((plan) => {
              const pct    = progressBar(plan.paid_amount, plan.total_amount)
              const isPaid = plan.status === 'Paid'
              const isOverdue = plan.overdue_count > 0
              const isDueToday = plan.due_today_count > 0

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col px-5 py-4 transition-all border-b border-border/30 last:border-0",
                    isOverdue
                      ? "border-r-[3px] border-r-rose-500 animate-pulse-border-red bg-rose-500/[0.02] hover:bg-white/[0.03] hover:border-r-rose-400"
                      : isDueToday
                        ? "border-r-[3px] border-r-amber-500 bg-amber-500/[0.02] hover:bg-white/[0.03] hover:border-r-amber-400"
                        : "border-r-[3px] border-r-emerald-500 bg-emerald-500/[0.01] hover:bg-white/[0.03] hover:border-r-emerald-400"
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/installments/${plan.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/installments/${plan.id}`)}
                    className="flex cursor-pointer items-center gap-4 focus-visible:outline-none"
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      isPaid
                        ? 'bg-emerald-500/10'
                        : isOverdue
                          ? 'bg-rose-500/10'
                          : 'bg-secondary/60'
                    )}>
                      {isPaid
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        : isOverdue
                          ? <AlertTriangle className="h-5 w-5 text-rose-400" />
                          : <Clock className="h-5 w-5 text-muted-foreground" />
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-foreground">
                          {plan.invoice_number ?? (plan.plan_type === 'purchase' ? 'مستحقات مورد' : `خطة #${plan.id.slice(0, 8)}`)}
                        </p>
                        {plan.plan_type === 'purchase' && (
                          <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-300 border border-violet-500/30">
                            مورد
                          </span>
                        )}
                        <StatusBadge plan={plan} />
                        {plan.number_of_months && (
                          <span className="rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground font-semibold">
                            {plan.number_of_months} شهر
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground/80">{plan.car_name ?? 'سيارة غير محددة'}</span>
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3 w-3" />
                          {plan.buyer_name ?? 'عميل غير محدد'}
                        </span>
                        {plan.next_due_date && (
                          <span>القادم: {formatDate(plan.next_due_date)}</span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/55">
                          <div
                            className={cn('h-full rounded-full', isPaid ? 'bg-emerald-500' : 'bg-primary')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-muted-foreground font-numeric">{pct}%</span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="text-muted-foreground">
                          مدفوع: <span className="font-numeric text-emerald-400 font-bold">{formatMoney(plan.paid_amount, plan.currency)}</span>
                        </span>
                        {plan.remaining_amount > 0 && (
                          <span className="text-muted-foreground">
                            متبقي: <span className="font-numeric text-rose-400 font-bold">{formatMoney(plan.remaining_amount, plan.currency)}</span>
                          </span>
                        )}
                        <span className="text-muted-foreground font-numeric">
                          الأقساط: {plan.paid_schedule_count}/{plan.schedule_count}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {!isPaid && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickPayPlanId(quickPayPlanId === plan.id ? null : plan.id)
                          }}
                          className="h-8 text-xs gap-1 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-semibold"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>سداد سريع</span>
                        </Button>
                      )}
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
                      <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Link href={`/installments/${plan.id}`} aria-label="عرض خطة الأقساط">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {quickPayPlanId === plan.id && (
                    <QuickPayRow
                      planId={plan.id}
                      currency={plan.currency}
                      onCancel={() => setQuickPayPlanId(null)}
                      onSuccess={handleQuickPaySuccess}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </DataTable>
      )}


      {view === 'calendar' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/60 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                جدول الاستحقاقات لشهر:{' '}
                <span className="text-primary font-extrabold">{ARABIC_MONTHS[currentMonth]} {currentYear}</span>
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 text-xs gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <span>الشهر السابق</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 text-xs">
                اليوم
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 text-xs gap-1">
                <span>الشهر التالي</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px] grid grid-cols-7 gap-1 bg-border/20 rounded-xl overflow-hidden border border-border/60">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center py-2 text-xs font-bold text-muted-foreground bg-secondary/30 border-b border-border/40 select-none">
                  {day}
                </div>
              ))}
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="bg-secondary/[0.02] min-h-[110px] border-b border-e border-border/30 last:border-e-0" />

                const dayStr = date.toISOString().slice(0, 10)
                const dueInstallments = items.filter(plan => plan.next_due_date && plan.next_due_date.slice(0, 10) === dayStr)
                const isToday = date.toDateString() === new Date().toDateString()

                return (
                  <div key={dayStr} className={cn(
                    "bg-card min-h-[110px] p-2 border-b border-e border-border/30 last:border-e-0 flex flex-col justify-between transition-colors hover:bg-secondary/10",
                    isToday && "ring-1 ring-primary/40 bg-primary/[0.02]"
                  )}>
                    <span className={cn(
                      "text-xs font-bold font-numeric",
                      isToday ? "text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center font-extrabold" : "text-muted-foreground"
                    )}>
                      {date.getDate()}
                    </span>
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px]">
                      {dueInstallments.map(plan => (
                        <div
                          key={plan.id}
                          onClick={() => router.push(`/installments/${plan.id}`)}
                          className={cn(
                            "text-[10px] p-1 rounded border cursor-pointer truncate font-semibold leading-tight transition-colors",
                            plan.overdue_count > 0
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/15"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
                          )}
                          title={`${plan.buyer_name} - ${plan.car_name} - ${formatMoney(plan.next_due_amount || plan.installment_amount, plan.currency)}`}
                        >
                          <span className="block truncate">{plan.buyer_name?.split(' ')[0]}</span>
                          <span className="font-numeric text-[9px] block text-foreground/80 mt-0.5">
                            {formatMoney(plan.next_due_amount || plan.installment_amount, plan.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
