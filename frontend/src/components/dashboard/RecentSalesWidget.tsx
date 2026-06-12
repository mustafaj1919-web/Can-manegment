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

const COL_HEADERS = ['# الفاتورة', 'السيارة / العميل', 'المبلغ', 'الحالة']

export function RecentSalesWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => getSales({ per_page: 8 }),
    staleTime: 60_000,
    retry: 1,
  })
  const sales = data?.items ?? []

  const viewAll = (
    <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
      <Link href="/sales">
        كل المبيعات
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </Button>
  )

  return (
    <DashboardWidget
      title="آخر المبيعات"
      subtitle="أحدث فواتير البيع"
      icon={TrendingUp}
      iconColor="text-emerald-400"
      action={viewAll}
      noPadding
    >
      {isLoading ? (
        <div className="dash-body space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : isError || sales.length === 0 ? (
        <div className="dash-body flex flex-col items-center justify-center gap-2 py-10">
          <TrendingUp className="h-8 w-8 text-muted-foreground/15" />
          <p className="text-sm text-muted-foreground/50">
            {isError ? 'تعذّر تحميل المبيعات' : 'لا توجد مبيعات بعد'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="app-table">
            <thead>
              <tr>
                {COL_HEADERS.map((h, i) => (
                  <th
                    key={h}
                    className={cn(i >= 1 && i <= 1 && 'hidden sm:table-cell', i >= 3 && 'hidden sm:table-cell')}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any, i: number) => {
                const carLabel   = s.car    ? `${s.car.brand} ${s.car.model}` : s.car_name    ?? (s.car_id    ? `#${s.car_id}` : '—')
                const buyerLabel = s.buyer?.name ?? s.buyer_name ?? (s.buyer_id ? `#${s.buyer_id}` : '—')

                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    data-clickable
                  >
                    <td>
                      <Link
                        href={`/sales/${s.id}`}
                        className="font-code text-xs font-semibold text-primary hover:underline"
                      >
                        {s.invoice_number}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                        {formatDate(s.sale_date)}
                      </p>
                    </td>
                    <td className="hidden max-w-[160px] sm:table-cell">
                      <p className="truncate text-xs font-medium text-foreground/85">{carLabel}</p>
                      <p className="truncate text-[10px] text-muted-foreground/50">{buyerLabel}</p>
                    </td>
                    <td>
                      <p className="money font-numeric text-xs font-bold text-amber-400">
                        {formatMoney(s.selling_price, s.currency)}
                      </p>
                      {s.remaining_amount > 0 && (
                        <p className="font-numeric text-[10px] text-rose-400/80">
                          متبقي: {formatMoney(s.remaining_amount, s.currency)}
                        </p>
                      )}
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                        getStatusVariant(s.status)
                      )}>
                        {translateStatus(s.status)}
                      </span>
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
