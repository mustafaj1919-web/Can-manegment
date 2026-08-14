'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Clock3, RefreshCw, Users, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getArAgingReport, type ArAgingBucket, type ArAgingItem } from '@/lib/api/reports'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'

const BUCKET_STYLES: Record<string, { card: string; text: string; badge: string }> = {
  current: { card: 'border-sky-500/20 bg-sky-500/5', text: 'text-sky-300', badge: 'border-sky-500/20 bg-sky-500/10 text-sky-300' },
  '1_30': { card: 'border-amber-500/20 bg-amber-500/5', text: 'text-amber-300', badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
  '31_60': { card: 'border-orange-500/20 bg-orange-500/5', text: 'text-orange-300', badge: 'border-orange-500/20 bg-orange-500/10 text-orange-300' },
  '61_90': { card: 'border-rose-500/20 bg-rose-500/5', text: 'text-rose-300', badge: 'border-rose-500/20 bg-rose-500/10 text-rose-300' },
  '90_plus': { card: 'border-red-700/30 bg-red-900/10', text: 'text-red-300', badge: 'border-red-700/25 bg-red-700/10 text-red-300' },
}

function AgingRow({ item }: { item: ArAgingItem }) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
      <td className="px-4 py-3 text-xs">
        {item.customer_id ? (
          <Link href={`/customers/${item.customer_id}`} className="font-semibold text-sky-300 hover:underline">
            {item.customer_name}
          </Link>
        ) : item.customer_name}
        <p className="mt-0.5 text-[10px] text-muted-foreground">{item.branch?.name ?? '-'}</p>
      </td>
      <td className="px-4 py-3 text-xs">
        {item.sale_id ? (
          <Link href={`/sales/${item.sale_id}`} className="font-mono text-amber-300 hover:underline">
            {item.invoice_number ?? `#${item.sale_id}`}
          </Link>
        ) : item.invoice_number ?? '-'}
        <p className="mt-0.5 text-[10px] text-muted-foreground">{item.car ?? '-'}</p>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {item.source === 'installment_schedule' ? 'قسط' : 'رصيد بيع'}
        {item.installment_number ? <span className="font-numeric"> #{item.installment_number}</span> : null}
      </td>
      <td className="px-4 py-3 text-xs font-numeric text-muted-foreground">{item.due_date ? formatDate(item.due_date) : '-'}</td>
      <td className="px-4 py-3 text-xs font-numeric">
        <span className={item.days_past_due > 0 ? 'font-semibold text-rose-300' : 'text-sky-300'}>
          {item.days_past_due > 0 ? `${item.days_past_due} يوم` : 'غير مستحق'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-numeric font-semibold text-foreground">{formatMoney(item.amount_iqd, 'IQD')}</td>
    </tr>
  )
}

export default function ArAgingPage() {
  const [activeBucket, setActiveBucket] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ar-aging'],
    queryFn: getArAgingReport,
    staleTime: 60_000,
    retry: 1,
  })

  const selectedBucket = data?.buckets.find((bucket) => bucket.bucket === activeBucket)

  const handleExport = async () => {
    if (!data) return
    if (exporting) return
    setExporting(true)

    try {
      const headers = [
        'اسم العميل',
        'عدد المطالبات',
        'أقدم تأخير (أيام)',
        'إجمالي الذمم المدينة (Gross AR)',
        'الأرصدة الدائنة للعملاء',
        'صافي مركز العميل'
      ]

      const rows: (string | number)[][] = []

      data.customers.forEach(c => {
        const grossAr = Number(c.total_iqd || 0)
        const creditBal = grossAr < 0 ? Math.abs(grossAr) : 0
        const positiveAr = grossAr > 0 ? grossAr : 0
        const netPos = positiveAr - creditBal

        rows.push([
          c.customer_name ?? '—',
          Number(c.items_count || 0),
          Number(c.oldest_days_past_due || 0),
          positiveAr,
          creditBal,
          netPos
        ])
      })

      // Authoritative summary row
      const totalGrossAr = data.customers.reduce((s, c) => s + (c.total_iqd > 0 ? c.total_iqd : 0), 0)
      const totalCreditBals = data.customers.reduce((s, c) => s + (c.total_iqd < 0 ? Math.abs(c.total_iqd) : 0), 0)
      const totalNetPos = totalGrossAr - totalCreditBals

      rows.push([
        `إجمالي تقرير أعمار الذمم (${data.customers.length} عميل)`,
        Number(data.total_count || 0),
        '',
        totalGrossAr,
        totalCreditBals,
        totalNetPos
      ])

      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `ar-aging-report-${dateStr}.xlsx`

      await exportXlsx(filename, headers, rows)
      toast.success('تم تصدير تقرير أعمار الذمم المدينة بنجاح!')
    } catch (err) {
      console.error('[ArAging Export Error]:', err)
      toast.error('تعذر إنشاء ملف Excel. يرجى المحاولة مرة أخرى.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <Clock3 className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="section-title">أعمار الذمم المدينة</h1>
            <p className="section-subtitle">
              {isLoading ? 'جاري التحميل...' : `${data?.total_count ?? 0} مطالبة · ${formatMoney(data?.total_iqd ?? 0, 'IQD')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="h-8 gap-2"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{exporting ? 'جاري التصدير...' : 'تصدير Excel'}</span>
          </Button>
          <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-2">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            تحديث
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400/60" />
          <p className="mt-3 text-sm text-muted-foreground">تعذر تحميل تقرير أعمار الذمم</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.buckets.map((bucket: ArAgingBucket) => {
              const style = BUCKET_STYLES[bucket.bucket] ?? BUCKET_STYLES['90_plus']
              const active = activeBucket === bucket.bucket
              return (
                <button
                  key={bucket.bucket}
                  onClick={() => setActiveBucket(active ? null : bucket.bucket)}
                  className={cn('dash-card border-2 p-5 text-start transition-all', style.card, active ? 'ring-2 ring-white/20' : 'hover:opacity-90')}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className={cn('text-sm font-bold', style.text)}>{bucket.label}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', style.badge)}>{bucket.count}</span>
                  </div>
                  <p className={cn('font-numeric text-lg font-black', style.text)}>{formatMoney(bucket.total_iqd, 'IQD')}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{bucket.customer_count} عميل</p>
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <div>
                  <p className="dash-title">{selectedBucket ? selectedBucket.label : 'تفاصيل الذمم'}</p>
                  <p className="dash-sub">{selectedBucket ? `${selectedBucket.count} سجل` : 'اختر بطاقة لعرض تفاصيلها'}</p>
                </div>
              </div>
              {selectedBucket ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="border-b border-border bg-secondary/10">
                      <tr>
                        {['العميل', 'الفاتورة / السيارة', 'النوع', 'تاريخ الاستحقاق', 'التأخير', 'المبلغ'].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-start text-[10px] font-semibold text-muted-foreground">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBucket.items.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">لا توجد تفاصيل ضمن هذه الفئة</td></tr>
                      ) : selectedBucket.items.map((item) => (
                        <AgingRow key={`${item.source}-${item.schedule_id ?? item.sale_id}`} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-muted-foreground">اضغط على إحدى البطاقات أعلاه</div>
              )}
            </section>

            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <div>
                  <p className="dash-title">أعلى العملاء</p>
                  <p className="dash-sub">حسب إجمالي الذمم</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="divide-y divide-border/50">
                {data.customers.length === 0 ? (
                  <p className="p-5 text-center text-sm text-muted-foreground">لا توجد ذمم مفتوحة</p>
                ) : data.customers.slice(0, 10).map((customer) => (
                  <Link key={customer.customer_id} href={`/customers/${customer.customer_id}`} className="block px-5 py-3 hover:bg-secondary/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{customer.customer_name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{customer.items_count} سجل · أقدم تأخير {customer.oldest_days_past_due} يوم</p>
                      </div>
                      <p className="shrink-0 font-numeric text-xs font-bold text-amber-300">{formatMoney(customer.total_iqd, 'IQD')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
