'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Car, RefreshCw, Download, AlertTriangle } from 'lucide-react'
import { getVehicleProfitabilityReport } from '@/lib/api/inventory'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function money(v: number | null | undefined) {
  return formatMoney(v ?? 0, 'IQD')
}

function ProfitBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-muted-foreground/40 text-[10px]">—</span>
  const color = pct >= 15 ? 'text-emerald-400' : pct >= 0 ? 'text-amber-400' : 'text-rose-400'
  return <span className={`font-numeric text-xs font-bold ${color}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Available: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    Sold:      'border-rose-500/30    bg-rose-500/10    text-rose-300',
    Reserved:  'border-amber-500/30   bg-amber-500/10   text-amber-300',
  }
  const labelMap: Record<string, string> = { Available: 'متاحة', Sold: 'مباعة', Reserved: 'محجوزة' }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${map[status] ?? 'border-border/30 bg-secondary/30 text-muted-foreground'}`}>
      {labelMap[status] ?? status}
    </span>
  )
}

export default function VehicleProfitabilityPage() {
  const [onlySold, setOnlySold] = useState(false)
  const [sortBy, setSortBy]     = useState<'profit' | 'pct' | 'cost'>('profit')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['vehicle-profitability', onlySold],
    queryFn:  () => getVehicleProfitabilityReport(onlySold),
    staleTime: 60_000,
    retry: 1,
  })

  const cars = [...(data?.cars ?? [])].sort((a, b) => {
    if (sortBy === 'profit') return (b.net_profit_iqd ?? -Infinity) - (a.net_profit_iqd ?? -Infinity)
    if (sortBy === 'pct')    return (b.profit_pct    ?? -Infinity) - (a.profit_pct    ?? -Infinity)
    return b.total_cost_iqd - a.total_cost_iqd
  })

  const s = data?.summary

  function handleExport() {
    if (!cars.length) return
    const rows = [
      ['السيارة', 'الموديل', 'السنة', 'رقم الهيكل', 'الحالة', 'سعر الشراء', 'التكاليف', 'إجمالي التكلفة', 'سعر البيع', 'صافي الربح', 'هامش الربح%'],
      ...cars.map(c => [
        c.brand || c.model,
        c.model,
        c.year,
        c.vin,
        c.status,
        c.purchase_price_iqd,
        c.costs_total_iqd,
        c.total_cost_iqd,
        c.selling_price_iqd ?? '',
        c.net_profit_iqd ?? '',
        c.profit_pct != null ? `${c.profit_pct}%` : '',
      ]),
    ]
    const csv  = rows.map(r => r.join('\t')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/tab-separated-values;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'vehicle-profitability.tsv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="section-title">ربحية السيارات</h1>
            <p className="section-subtitle">صافي الربح وهامش الربح لكل سيارة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={handleExport} disabled={!cars.length} className="gap-2 h-8">
            <Download className="h-3.5 w-3.5" />
            تصدير
          </Button>
          <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/20 p-1">
            {[{ val: false, label: 'كل السيارات' }, { val: true, label: 'المباعة فقط' }].map(opt => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => setOnlySold(opt.val)}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${onlySold === opt.val ? 'bg-secondary/60 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ترتيب حسب:</span>
            <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/20 p-1">
              {[
                { val: 'profit' as const, label: 'الربح' },
                { val: 'pct' as const,    label: 'الهامش%' },
                { val: 'cost' as const,   label: 'التكلفة' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSortBy(opt.val)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${sortBy === opt.val ? 'bg-secondary/60 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : isError ? (
        <div className="glass rounded-xl py-12 text-center text-sm text-muted-foreground">
          تعذر تحميل تقرير الربحية
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">إجمالي السيارات</p>
              <p className="mt-1 font-numeric text-2xl font-black text-foreground">{s?.total_cars ?? 0}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">سيارات مباعة</p>
              <p className="mt-1 font-numeric text-2xl font-black text-emerald-400">{s?.sold_cars ?? 0}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">متوسط الربح</p>
              <p className={`mt-1 font-numeric text-lg font-black ${(s?.avg_profit_iqd ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {money(s?.avg_profit_iqd)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">سيارات خاسرة</p>
              <p className="mt-1 font-numeric text-2xl font-black text-rose-400">
                {s?.losing ? (Array.isArray(s.losing) ? s.losing.length : 0) : 0}
              </p>
            </div>
          </div>

          {/* Table */}
          {!cars.length ? (
            <div className="glass rounded-xl py-16 text-center">
              <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            </div>
          ) : (
            <div className="glass overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-secondary/20">
                      <th className="py-3 pr-4 text-right font-semibold text-muted-foreground">السيارة</th>
                      <th className="py-3 px-3 text-right font-semibold text-muted-foreground">السنة</th>
                      <th className="py-3 px-3 text-right font-semibold text-muted-foreground">الحالة</th>
                      <th className="py-3 px-3 text-left font-semibold text-muted-foreground">سعر الشراء</th>
                      <th className="py-3 px-3 text-left font-semibold text-muted-foreground">تكاليف إضافية</th>
                      <th className="py-3 px-3 text-left font-semibold text-muted-foreground">إجمالي التكلفة</th>
                      <th className="py-3 px-3 text-left font-semibold text-muted-foreground">سعر البيع</th>
                      <th className="py-3 px-3 text-left font-semibold text-emerald-400">صافي الربح</th>
                      <th className="py-3 pl-4 text-left font-semibold text-muted-foreground">الهامش%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map((car, i) => {
                      const isLoss = car.net_profit_iqd != null && car.net_profit_iqd < 0
                      return (
                        <tr key={i} className={`border-b border-border/20 last:border-0 transition-colors hover:bg-secondary/20 ${isLoss ? 'bg-rose-500/[0.03]' : ''}`}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              {isLoss && <AlertTriangle className="h-3 w-3 text-rose-400/70 shrink-0" />}
                              <div>
                                <p className="font-semibold text-foreground">{car.model}</p>
                                <p className="text-[10px] text-muted-foreground/60 font-mono">{car.vin}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">{car.year}</td>
                          <td className="py-3 px-3"><StatusPill status={car.status} /></td>
                          <td className="py-3 px-3 text-left font-numeric text-foreground/80 whitespace-nowrap">{money(car.purchase_price_iqd)}</td>
                          <td className="py-3 px-3 text-left font-numeric text-amber-400/80 whitespace-nowrap">
                            {car.costs_total_iqd > 0 ? money(car.costs_total_iqd) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-3 px-3 text-left font-numeric font-semibold text-foreground whitespace-nowrap">{money(car.total_cost_iqd)}</td>
                          <td className="py-3 px-3 text-left font-numeric text-foreground/80 whitespace-nowrap">
                            {car.selling_price_iqd != null ? money(car.selling_price_iqd) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-3 px-3 text-left font-numeric font-bold whitespace-nowrap">
                            {car.net_profit_iqd != null ? (
                              <span className={car.net_profit_iqd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {car.net_profit_iqd >= 0 ? '+' : ''}{money(car.net_profit_iqd)}
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="py-3 pl-4 text-left whitespace-nowrap">
                            <ProfitBadge pct={car.profit_pct} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border/30 px-4 py-2 text-[11px] text-muted-foreground">
                إجمالي {cars.length} سيارة
              </div>
            </div>
          )}

          {/* Most / Least Profitable */}
          {s && (Array.isArray(s.most_profitable) && s.most_profitable.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="glass rounded-xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-bold text-foreground">الأعلى ربحاً</p>
                </div>
                <div className="space-y-2">
                  {(s.most_profitable as any[]).slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">{c.model} ({c.year})</span>
                      <span className="font-numeric text-xs font-bold text-emerald-400 whitespace-nowrap">+{money(c.net_profit_iqd)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {Array.isArray(s.losing) && s.losing.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                    <p className="text-xs font-bold text-foreground">سيارات بخسارة</p>
                  </div>
                  <div className="space-y-2">
                    {(s.losing as any[]).slice(0, 5).map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{c.model} ({c.year})</span>
                        <span className="font-numeric text-xs font-bold text-rose-400 whitespace-nowrap">{money(c.net_profit_iqd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
