'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  ArrowRight, Car, User, Banknote, Loader2, DollarSign, MessageCircle, Printer,
} from 'lucide-react'
import { cn, formatMoney, formatDate, translateStatus } from '@/lib/utils'
import { getInstallmentPlan, payInstallmentSchedule } from '@/lib/api/installments'
import type { InstallmentScheduleItem } from '@/lib/api/sales'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { post } from '@/lib/api/client'
import { InstallmentPaymentWorkflow } from '@/components/installments/workflow/InstallmentPaymentWorkflow'

function toWaPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('964')) return d
  if (d.startsWith('0'))   return '964' + d.slice(1)
  return '964' + d
}

const STATUS_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Paid:    { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  Pending: { icon: Clock,         color: 'text-muted-foreground', bg: 'bg-secondary/30' },
  Partial: { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  Overdue: { icon: AlertTriangle, color: 'text-rose-400',    bg: 'bg-rose-500/10' },
}

const PAYMENT_METHODS = [
  { value: 'Cash',          label: 'نقداً' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]

function PayModal({
  schedule,
  onClose,
  onSuccess,
}: {
  schedule: InstallmentScheduleItem
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount,        setAmount]        = useState(String(schedule.remaining_amount))
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes,         setNotes]         = useState('')

  const mutation = useMutation({
    mutationFn: () => payInstallmentSchedule(schedule.id, {
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      notes: notes || undefined,
    }),
    onSuccess: (res) => {
      toast.success(`تم تسجيل الدفعة — القسط ${res.status === 'Paid' ? 'مسدد بالكامل' : 'جزئي'}`)
      onSuccess()
      onClose()
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { error?: string } } }
      toast.error(axErr?.response?.data?.error ?? 'حدث خطأ أثناء تسجيل الدفعة')
    },
  })

  const amt = parseFloat(amount) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <p className="text-sm font-semibold text-foreground">
            تسجيل دفعة — القسط #{schedule.installment_number}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            المتبقي: <span className="text-rose-400 money">{formatMoney(schedule.remaining_amount, schedule.currency)}</span>
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">المبلغ *</Label>
            <Input
              type="number" min="0.01" step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-secondary/30 border-border/50 money"
            />
            {amt > schedule.remaining_amount && (
              <p className="text-[11px] text-cyan-400 mt-1">
                سيتم سداد هذا القسط وترحيل الفائض ({formatMoney(amt - schedule.remaining_amount, schedule.currency)}) للأقساط القادمة تلقائياً.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">طريقة الدفع *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">ملاحظات</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              className="bg-secondary/30 border-border/50 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/50 bg-secondary/10 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">إلغاء</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || amt <= 0}
            size="sm"
            className="text-xs gap-1.5"
          >
            {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            تسجيل
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default function InstallmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const planId = rawId
  const qc = useQueryClient()
  const [payingSchedule, setPayingSchedule] = useState<InstallmentScheduleItem | null>(null)
  const [isReminderSending, setIsReminderSending] = useState<string | null>(null)

  const handleSendServerReminder = async (installmentId: string) => {
    setIsReminderSending(installmentId)
    try {
      const res = await post<any>('/WhatsApp/send-reminder', {
        installmentId: installmentId
      })
      if (res && res.success) {
        toast.success('تم إرسال تذكير القسط بالواتساب تلقائياً وتوثيقه في سجل CRM!')
      } else {
        toast.error('فشل في إرسال تذكير الواتساب.')
      }
    } catch (err: any) {
      toast.error('خطأ أثناء إرسال تذكير الواتساب: ' + (err?.response?.data?.message ?? err.message))
    } finally {
      setIsReminderSending(null)
    }
  }

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn:  () => getInstallmentPlan(planId),
    staleTime: 30_000,
    retry: 1,
    enabled: !!planId,
  })

  function handlePaySuccess() {
    qc.invalidateQueries({ queryKey: ['installment-plan', planId] })
    qc.invalidateQueries({ queryKey: ['installments'] })
    if (plan?.sale_id) {
      qc.invalidateQueries({ queryKey: ['sale', plan.sale_id] })
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400/50" />
        <p className="text-muted-foreground">تعذّر تحميل خطة الأقساط</p>
        <Button asChild variant="ghost" size="sm"><Link href="/installments">العودة</Link></Button>
      </div>
    )
  }

  const paidCount    = plan.schedules.filter(s => s.status === 'Paid').length
  const overdueCount = plan.schedules.filter(s => s.status === 'Overdue').length
  const pct          = plan.total_amount > 0
    ? Math.min(100, Math.round((plan.paid_amount / plan.total_amount) * 100))
    : 0
  const isPlanPaid   = plan.status === 'Paid'

  return (
    <>
      {payingSchedule && (
        <InstallmentPaymentWorkflow
          open={!!payingSchedule}
          onOpenChange={(open) => { if (!open) setPayingSchedule(null) }}
          plan={plan}
          schedule={payingSchedule}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-foreground">
                  {plan.invoice_number ?? `خطة #${plan.id}`}
                </h1>
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  isPlanPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                )}>
                  {isPlanPaid ? 'مسدد بالكامل' : 'نشط'}
                </span>
                {overdueCount > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                    {overdueCount} متأخرة
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {paidCount} / {plan.schedules.length} دفعة ·{' '}
                {plan.number_of_months ? `${plan.number_of_months} شهر` : 'مفتوح'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold">
              <Link href={`/installments/${plan.id}/receipt`} title="طباعة وصل سداد القسط A5">
                <Printer className="h-3.5 w-3.5" />
                <span>طباعة الوصل A5</span>
              </Link>
            </Button>
            {!isPlanPaid && (
              <Button
                onClick={() => {
                  const firstUnpaid = plan.schedules.find(s => s.status !== 'Paid' && s.remaining_amount > 0);
                  if (firstUnpaid) setPayingSchedule(firstUnpaid);
                }}
                size="sm"
                className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <Banknote className="h-3.5 w-3.5" />
                تسجيل دفعة
              </Button>
            )}
            {plan.sale_id && (
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link href={`/sales/${plan.sale_id}`}>عرض الفاتورة</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link href="/installments"><ArrowRight className="h-3.5 w-3.5" />الأقساط</Link>
            </Button>
          </div>
        </div>

        {/* Car + Buyer + Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Car */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-muted-foreground">السيارة</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{plan.car_name ?? '—'}</p>
          </div>

          {/* Buyer */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-muted-foreground">المشتري</span>
              </div>
              {plan.buyer_phone && (() => {
                const msg = [
                  `مرحباً ${plan.buyer_name ?? ''}،`,
                  `نود تذكيركم بالأقساط المستحقة لسيارة ${plan.car_name ?? ''}.`,
                  `💰 المتبقي الإجمالي: ${formatMoney(plan.remaining_amount, plan.currency)}`,
                  '',
                  'شركة الأصدقاء لتجارة السيارات 🚗',
                ].join('\n')
                return (
                  <a href={`https://wa.me/${toWaPhone(plan.buyer_phone)}?text=${encodeURIComponent(msg)}`}
                    target="_blank" rel="noopener noreferrer" title="تذكير واتساب"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )
              })()}
            </div>
            <p className="text-sm font-semibold text-foreground">{plan.buyer_name ?? '—'}</p>
            {plan.buyer_phone && <p className="text-xs text-muted-foreground mt-0.5">{plan.buyer_phone}</p>}
          </div>

          {/* Monthly amount */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground">القسط الشهري</span>
            </div>
            <p className="text-sm font-semibold money text-amber-400">
              {formatMoney(plan.installment_amount, plan.currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">يوم {plan.installment_due_day} كل شهر</p>
          </div>
        </div>

        {/* Progress */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">تقدم السداد</span>
            <span className={cn('text-sm font-bold', isPlanPaid ? 'text-emerald-400' : 'text-cyan-400')}>
              {pct}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-secondary/30 overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', isPlanPaid ? 'bg-emerald-500' : 'bg-cyan-500')}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'إجمالي', value: plan.total_amount, color: 'text-foreground' },
              { label: 'مدفوع',  value: plan.paid_amount,  color: 'text-emerald-400' },
              { label: 'متبقي',  value: plan.remaining_amount, color: plan.remaining_amount > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-secondary/30 border border-border/40 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={cn('text-sm font-bold money mt-0.5', color)}>
                  {formatMoney(value, plan.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {plan.customer_statement && (
          <div className="glass rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                <User className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">كشف أقساط العميل</p>
                <p className="text-xs text-muted-foreground">{plan.customer_statement.customer_name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {[
                { label: 'عدد الخطط', value: plan.customer_statement.plans_count, money: false, color: 'text-foreground' },
                { label: 'الإجمالي', value: plan.customer_statement.total_amount, money: true, color: 'text-foreground' },
                { label: 'مدفوع', value: plan.customer_statement.paid_amount, money: true, color: 'text-emerald-400' },
                { label: 'متبقي', value: plan.customer_statement.remaining_amount, money: true, color: 'text-rose-400' },
                { label: 'متأخر', value: plan.customer_statement.overdue_amount, money: true, color: 'text-amber-400' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/40 bg-secondary/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className={cn('mt-1 font-numeric text-sm font-bold', item.color)}>
                    {item.money ? formatMoney(item.value as number, plan.customer_statement!.currency) : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Banknote className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold">سجل الدفعات</p>
            </div>
            <span className="text-xs text-muted-foreground">{plan.payments.length} دفعة</span>
          </div>
          {plan.payments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {['التاريخ', 'المبلغ', 'الطريقة', 'القسط', 'ملاحظات'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/20 last:border-0">
                      <td className="px-4 py-3 text-xs">{formatDate(payment.payment_date)}</td>
                      <td className="px-4 py-3 font-numeric text-xs font-semibold text-emerald-400">{formatMoney(payment.amount, payment.currency)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{payment.payment_method ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{payment.schedule_id ? `#${payment.schedule_id}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{payment.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schedules table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
            <p className="text-sm font-semibold">جدول الأقساط ({plan.schedules.length} قسط)</p>
            {!isPlanPaid && (
              <p className="text-xs text-muted-foreground">اضغط على «دفع» لتسجيل دفعة</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {['#', 'تاريخ الاستحقاق', 'المبلغ', 'مدفوع', 'متبقي', 'الحالة', 'تاريخ الدفع', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.schedules.map((sc, i) => {
                  const meta  = STATUS_META[sc.status] ?? STATUS_META.Pending
                  const Icon  = meta.icon
                  const canPay = sc.status !== 'Paid' && sc.remaining_amount > 0

                  return (
                    <motion.tr
                      key={sc.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/20 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">#{sc.installment_number}</td>
                      <td className="px-4 py-3.5 text-xs">{formatDate(sc.due_date)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold money">{formatMoney(sc.amount, sc.currency)}</td>
                      <td className="px-4 py-3.5 text-xs money text-emerald-400">
                        {sc.paid_amount > 0 ? formatMoney(sc.paid_amount, sc.currency) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs money text-rose-400">
                        {sc.remaining_amount > 0 ? formatMoney(sc.remaining_amount, sc.currency) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={cn('flex items-center gap-1.5 w-fit rounded-full px-2 py-1', meta.bg)}>
                          <Icon className={cn('h-3 w-3', meta.color)} />
                          <span className={cn('text-[10px] font-medium', meta.color)}>
                            {translateStatus(sc.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-muted-foreground/60">
                        {sc.payment_date ? formatDate(sc.payment_date) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {canPay && (
                            <Button
                              size="sm"
                              onClick={() => setPayingSchedule(sc)}
                              className="h-7 text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white px-3"
                            >
                              دفع
                            </Button>
                          )}
                          {canPay && plan.buyer_phone && (
                            <button
                              onClick={() => handleSendServerReminder(String(sc.id))}
                              disabled={isReminderSending === String(sc.id)}
                              title="إرسال تذكير تلقائي عبر الواتساب"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                            >
                              {isReminderSending === String(sc.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
