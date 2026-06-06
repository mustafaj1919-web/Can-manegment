'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatMoney, formatDate, translateStatus, getStatusVariant } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getSales } from '@/lib/api/sales'
import { DashboardWidget } from './DashboardWidget'

export function RecentSalesWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-sales'], queryFn: () => getSales({ per_page: 8 }), staleTime: 60_000, retry: 1,
  })
  const sales = data?.items ?? []

  const viewAll = (
    <Button asChild variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2">
      <Link href="/sales">كل المبيعات<ArrowUpRight className="h-2.5 w-2.5" /></Link>
    </Button>
  )

  return (
    <DashboardWidget title="آخر المبيعات" subtitle="أحدث فواتير البيع" icon={TrendingUp} iconColor="text-emerald-400" action={viewAll} noPadding>
      {isLoading ? (
        <div className="dash-body space-y-2.5">
          {Array.from({length:5}).map((_,i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /></div>
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : isError || sales.length === 0 ? (
        <div className="dash-body flex flex-col items-center justify-center py-10 gap-2">
          <TrendingUp className="h-8 w-8 text-muted-foreground/15" />
          <p className="text-sm text-muted-foreground/60">{isError ? 'تعذّر تحميل المبيعات' : 'لا توجد بيانات بعد'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border-inner)' }}>
                {['#الفاتورة', 'السيارة / العميل', 'المبلغ', 'الحالة'].map((h, i) => (
                  <th key={h} className={cn('px-4 py-2.5 text-start text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50', i >= 2 && 'hidden sm:table-cell')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any, i: number) => {
                const car   = s.car    ? `${s.car.brand} ${s.car.model}` : s.car_id    ? `#${s.car_id}` : '—'
                const buyer = s.buyer?.name ?? (s.buyer_id ? `#${s.buyer_id}` : '—')
                return (
                  <motion.tr key={s.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}
                    className="group transition-colors" style={{ borderBottom:'1px solid rgba(255,255,255,0.025)' }}
                    onMouseEnter={e => (e.currentTarget.style.background='var(--s2)')}
                    onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                    <td className="px-4 py-2.5">
                      <Link href={`/sales/${s.id}`} className="text-[11px] font-mono text-primary hover:underline underline-offset-2">{s.invoice_number}</Link>
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">{formatDate(s.sale_date)}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell max-w-[160px]">
                      <p className="text-xs font-medium text-foreground/85 truncate">{car}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{buyer}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-bold money text-amber-400">{formatMoney(s.selling_price, s.currency)}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', getStatusVariant(s.status))}>{translateStatus(s.status)}</span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardWidget>
  )
}
