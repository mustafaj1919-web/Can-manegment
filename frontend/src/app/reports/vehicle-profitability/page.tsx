'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, RefreshCw, Car, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getVehicleProfitabilityReport, type VehicleProfitability } from '@/lib/api/inventory'

function ProfitBadge({ pct, profit }: { pct: number | null; profit: number | null }) {
  if (profit === null) return <span className="text-[10px] text-muted-foreground/40">لم يُباع</span>
  const isProfit = (profit ?? 0) >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
      isProfit
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
    )}>
      {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct !== null ? `${pct.toFixed(1)}%` : '—'}
    </span>
  )
}

function CarRow({ car }: { car: VehicleProfitability }) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="text-xs font-semibold text-foreground">{car.brand} {car.model} {car.year}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{car.vin}</div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-medium',
          car.status === 'Sold' ? 'bg-violet-500/10 text-violet-300' :
          car.status === 'Available' ? 'bg-emerald-500/10 text-emerald-300' :
          'bg-amber-500/10 text-amber-300'
        )}>
          {car.status === 'Sold' ? 'مباع' : car.status === 'Available' ? 'متاح' : 'محجوز'}
        </span>
      </td>
      <td className="hidden md:table-cell px-4 py-3 font-numeric text-xs text-foreground/80">
        {formatMoney(car.total_cost_iqd, 'IQD')}
      </td>
      <td className="px-4 py-3 font-numeric text-xs">
        {car.selling_price_iqd !== null ? (
          <span className="text-amber-300">{formatMoney(car.selling_price_iqd, 'IQD')}</span>
        ) : <span className="text-muted-foreground/40">—</span>}
      </td>
      <td className="px-4 py-3 font-numeric text-xs">
        {car.net_profit_iqd !== null ? (
          <span className={car.net_profit_iqd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {formatMoney(car.net_profit_iqd, 'IQD')}
          </span>
        ) : <span className="text-muted-foreground/40">—</span>}
      </td>
      <td className="px-4 py-3">
        <ProfitBadge pct={car.profit_pct} profit={car.net_profit_iqd} />
      </td>
    </tr>
  )
}

export default function VehicleProfitabilityPage() {
  const [onlySold, setOnlySold] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['vehicle-profitability', onlySold],
    queryFn: () => getVehicleProfitabilityReport(onlySold),
    staleTime: 60_000,
    retry: 1,
  })

  const s = data?.summary

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="section-title">ربحية السيارات</h1>
            <p className="section-subtitle">
              {isLoading ? 'جاري التحميل...' : `${s?.total_cars ?? 0} سيارة • ${s?.sold_cars ?? 0} مباعة`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={onlySold ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOnlySold(v => !v)}
            className="h-8 text-xs"
          >
            {onlySold ? 'المباعة فقط ✓' : 'كل السيارات'}
          </Button>
          <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400/60" />
          <p className="mt-3 text-sm text-muted-foreground">تعذر تحميل تقرير الربحية</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {s && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="dash-card p-4">
                <p className="text-xs text-muted-foreground mb-1">متوسط الربح</p>
                <p className="text-lg font-bold font-numeric text-emerald-400">{formatMoney(s.avg_profit_iqd, 'IQD')}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.avg_profit_pct.toFixed(1)}% هامش</p>
              </div>
              <div className="dash-card p-4">
                <p className="text-xs text-muted-foreground mb-1">أعلى ربح</p>
                {s.most_profitable[0] ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">{s.most_profitable[0].brand} {s.most_profitable[0].model}</p>
                    <p className="text-xs font-numeric text-emerald-400">{formatMoney(s.most_profitable[0].net_profit_iqd ?? 0, 'IQD')}</p>
                  </>
                ) : <p className="text-xs text-muted-foreground/40">—</p>}
              </div>
              <div className="dash-card p-4">
                <p className="text-xs text-muted-foreground mb-1">أقل ربح</p>
                {s.least_profitable[0] ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">{s.least_profitable[0].brand} {s.least_profitable[0].model}</p>
                    <p className="text-xs font-numeric text-amber-400">{formatMoney(s.least_profitable[0].net_profit_iqd ?? 0, 'IQD')}</p>
                  </>
                ) : <p className="text-xs text-muted-foreground/40">—</p>}
              </div>
              <div className="dash-card p-4 border-rose-500/20">
                <p className="text-xs text-muted-foreground mb-1">سيارات خاسرة</p>
                <p className="text-2xl font-bold text-rose-400">{s.losing.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">من {s.sold_cars} مباعة</p>
              </div>
            </div>
          )}

          {/* Full table */}
          <section className="dash-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-white/[0.02]">
                  <tr>
                    {['السيارة', 'الحالة', 'إجمالي التكلفة', 'سعر البيع', 'صافي الربح', 'النسبة'].map(h => (
                      <th key={h} className={cn(
                        'px-4 py-3 text-start text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
                        ['الحالة', 'إجمالي التكلفة'].includes(h) ? 'hidden sm:table-cell' : '',
                        h === 'إجمالي التكلفة' ? 'hidden md:table-cell' : '',
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cars.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground/50">
                        <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
                        لا توجد سيارات
                      </td>
                    </tr>
                  ) : data.cars.map(car => <CarRow key={car.car_id} car={car} />)}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
