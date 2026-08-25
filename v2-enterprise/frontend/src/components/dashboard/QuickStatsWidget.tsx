'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Landmark, ShoppingBag, Wallet, ArrowUpLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'
import { formatMoney } from '@/lib/utils'

export function QuickStatsWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="h-full rounded-xl border border-border-subtle bg-bg-surface p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-6 h-10 w-48" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full min-h-[316px] items-center justify-center rounded-xl border border-border-subtle bg-bg-surface p-5 text-xs text-rose-500">
        تعذر تحميل الملخص المالي
      </div>
    )
  }

  const profit = data?.monthly_profit ?? 0
  const positiveProfit = profit >= 0

  return (
    <section className="flex h-full min-h-[316px] flex-col rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black text-foreground">الملخص المالي</p>
          <p className="mt-1 text-[10px] text-muted-foreground">الشهر الحالي حسب القيود المسجلة</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.06] text-primary">
          <Landmark className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-7 border-b border-border-subtle pb-6">
        <p className="text-[11px] font-bold text-muted-foreground">صافي الحركة الشهرية</p>
        <p className={positiveProfit ? 'mt-2 text-3xl font-black text-emerald-600 tabular-nums' : 'mt-2 text-3xl font-black text-rose-600 tabular-nums'}>
          {formatMoney(profit, 'IQD')}
        </p>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          الفرق بين تحصيلات المبيعات ومشتريات الشهر المسجلة.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <Link href="/cashbox" className="group flex items-center justify-between rounded-lg bg-secondary/50 px-3.5 py-3 transition-colors hover:bg-secondary">
          <div className="flex items-center gap-3">
            <Wallet className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">رصيد الصندوق</p>
              <p className="mt-0.5 text-sm font-black text-foreground tabular-nums">{formatMoney(data?.cashbox_balance ?? 0, 'IQD')}</p>
            </div>
          </div>
          <ArrowUpLeft className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary" />
        </Link>

        <Link href="/purchases" className="group flex items-center justify-between rounded-lg bg-secondary/50 px-3.5 py-3 transition-colors hover:bg-secondary">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">مشتريات الشهر</p>
              <p className="mt-0.5 text-sm font-black text-foreground tabular-nums">{formatMoney(data?.monthly_purchases_paid ?? 0, 'IQD')}</p>
            </div>
          </div>
          <ArrowUpLeft className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary" />
        </Link>
      </div>
    </section>
  )
}
