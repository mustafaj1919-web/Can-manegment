'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getDashboardStats } from '@/lib/api/dashboard'

const BUCKETS = [
  { key: 'overdue', label: 'متأخر', countKey: 'overdue_count', amountKey: 'overdue_amount', icon: AlertTriangle, badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  { key: 'today', label: 'اليوم', countKey: 'due_today_count', amountKey: 'due_today_amount', icon: Clock, badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  { key: 'tomorrow', label: 'غدا', countKey: 'due_tomorrow_count', amountKey: 'due_tomorrow_amount', icon: CalendarDays, badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-400' },
  { key: 'two_days', label: 'بعد يومين', countKey: 'due_in_2_days_count', amountKey: 'due_in_2_days_amount', icon: CalendarDays, badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-400' },
] as const

export function InstallmentAlertsWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  const summary = data?.installment_summary
  const totalCount = summary
    ? summary.overdue_count + summary.due_today_count + summary.due_tomorrow_count + summary.due_in_2_days_count
    : 0

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">تنبيهات الأقساط</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : isError ? 'خطأ في التحميل' : totalCount > 0 ? `${totalCount} قسط يحتاج متابعة` : 'لا تنبيهات معلقة'}
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
          <Link href="/installments">عرض الكل<ArrowUpRight className="h-3 w-3" /></Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/2" /></div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="px-5 py-8 text-center">
          <AlertCircle className="h-7 w-7 mx-auto text-rose-400/50 mb-2" />
          <p className="text-sm text-muted-foreground">تعذر تحميل تنبيهات الأقساط</p>
        </div>
      ) : !summary || totalCount === 0 ? (
        <div className="py-10 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400/40 mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد أقساط مستحقة قريبا</p>
          <p className="text-xs text-muted-foreground/50 mt-1">يعتمد العرض على بيانات الأقساط الفعلية</p>
        </div>
      ) : (
        <div>
          {BUCKETS.map((bucket, index) => {
            const count = Number(summary[bucket.countKey] ?? 0)
            const amount = Number(summary[bucket.amountKey] ?? 0)
            const Icon = bucket.icon

            return (
              <motion.div
                key={bucket.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn('flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0', count > 0 && 'hover:bg-white/[0.02]')}
              >
                <div className={cn('h-2 w-2 rounded-full shrink-0', count > 0 ? bucket.dot : 'bg-slate-600')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">{bucket.label}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0', bucket.badge)}>
                      {count} قسط
                    </span>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-semibold money">{amount > 0 ? formatMoney(amount, 'IQD') : '—'}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
