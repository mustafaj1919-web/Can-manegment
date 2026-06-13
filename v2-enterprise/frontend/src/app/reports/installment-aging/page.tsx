'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getInstallmentAgingReport, type AgingBucket, type AgingSchedule } from '@/lib/api/installments'

const BUCKET_COLORS: Record<string, { card: string; text: string; badge: string }> = {
  '1_30':  { card: 'border-amber-500/20 bg-amber-500/5',  text: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  '31_60': { card: 'border-orange-500/20 bg-orange-500/5',text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  '61_90': { card: 'border-rose-500/20 bg-rose-500/5',    text: 'text-rose-400',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  '90p':   { card: 'border-red-700/30 bg-red-900/10',     text: 'text-red-400',    badge: 'bg-red-700/10 text-red-400 border-red-700/20' },
}

export default function InstallmentAgingPage() {
  const [activeBucket, setActiveBucket] = useState<string | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['installment-aging'],
    queryFn:  getInstallmentAgingReport,
    staleTime: 60_000,
  })

  const selectedBucket = data?.buckets.find(b => b.bucket === activeBucket)
  const totalOverdue  = data?.buckets.reduce((s, b) => s + b.total_iqd, 0) ?? 0
  const totalCount    = data?.buckets.reduce((s, b) => s + b.count, 0) ?? 0

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="section-title">تقرير تقادم الديون</h1>
            <p className="section-subtitle">
              {isLoading ? 'جاري التحليل...' : `${totalCount} قسط متأخر · ${formatMoney(totalOverdue, 'IQD')} إجمالي`}
            </p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400/60" />
          <p className="mt-3 text-sm text-muted-foreground">تعذر تحميل تقرير التقادم</p>
        </div>
      ) : (
        <>
          {/* Bucket Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.buckets.map((bucket: AgingBucket) => {
              const c = BUCKET_COLORS[bucket.bucket] ?? BUCKET_COLORS['90p']
              const isActive = activeBucket === bucket.bucket
              return (
                <button
                  key={bucket.bucket}
                  onClick={() => setActiveBucket(isActive ? null : bucket.bucket)}
                  className={cn(
                    'dash-card p-5 text-start transition-all border-2',
                    c.card,
                    isActive ? 'ring-2 ring-white/20' : 'hover:opacity-90'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn('text-sm font-bold', c.text)}>{bucket.label}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', c.badge)}>
                      {bucket.count} قسط
                    </span>
                  </div>
                  <p className={cn('font-numeric text-lg font-black', c.text)}>
                    {formatMoney(bucket.total_iqd, 'IQD')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">{bucket.customer_count} عميل</p>
                </button>
              )
            })}
          </div>

          {/* Detail Table */}
          {selectedBucket && (
            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <p className="dash-title">{selectedBucket.label} — التفصيل</p>
                <p className="dash-sub">{selectedBucket.count} قسط</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/10">
                    <tr>
                      {['العميل', 'السيارة', 'رقم القسط', 'تاريخ الاستحقاق', 'أيام التأخر', 'المتبقي'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-start text-[10px] font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBucket.schedules.map((sch: AgingSchedule) => (
                      <tr key={sch.schedule_id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                        <td className="px-4 py-2.5 text-xs">
                          {sch.customer_id ? (
                            <Link href={`/customers/${sch.customer_id}`} className="text-sky-400 hover:underline">
                              {sch.customer_name}
                            </Link>
                          ) : sch.customer_name}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{sch.car}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {sch.plan_id ? (
                            <Link href={`/installments/${sch.plan_id}`} className="text-indigo-400 hover:underline font-numeric">
                              #{sch.installment_no}
                            </Link>
                          ) : `#${sch.installment_no}`}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-numeric text-muted-foreground">{sch.due_date ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs font-numeric">
                          <span className="text-rose-400 font-semibold">{sch.days_overdue} يوم</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-numeric text-rose-400 font-semibold">
                          {formatMoney(sch.remaining_iqd, 'IQD')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!activeBucket && (
            <p className="text-center text-sm text-muted-foreground/50 py-4">
              اضغط على أي بطاقة لعرض التفاصيل
            </p>
          )}
        </>
      )}
    </div>
  )
}
