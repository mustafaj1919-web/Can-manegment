'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getMonthlyProfitReport } from '@/lib/api/reports'
import { cn, formatNumber } from '@/lib/utils'

/* ─── Custom Tooltip ────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-default bg-bg-overlay px-4 py-3 shadow-xl text-xs space-y-1.5 min-w-[160px]" dir="rtl">
      <p className="font-bold text-foreground/80 pb-1 border-b border-subtle">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-numeric font-semibold text-foreground tabular-nums">
            {formatNumber(Math.round(p.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Trend Pill ────────────────────────────────────────────────────────── */
function TrendPill({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  const up = pct > 0
  const flat = pct === 0
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border',
      flat
        ? 'text-muted-foreground border-subtle bg-bg-elevated'
        : up
          ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
          : 'text-rose-400 border-rose-500/20 bg-rose-500/10',
    )}>
      {flat ? <Minus className="h-2.5 w-2.5" /> : up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {flat ? 'مستقر' : `${up ? '+' : ''}${pct}%`}
    </span>
  )
}

/* ─── Main Widget ───────────────────────────────────────────────────────── */
export function RevenueChartWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['monthly-profit-chart', 12],
    queryFn: () => getMonthlyProfitReport(12),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const months = data?.months ?? []

  /* Most-recent two months for the trend pill */
  const last  = months[months.length - 1]
  const prev  = months[months.length - 2]

  const chartData = months.map(m => ({
    name: m.label,
    'الإيرادات': Math.round(m.revenue / 1_000_000),
    'صافي الربح': Math.round(m.net_profit / 1_000_000),
  }))

  return (
    <div className="border border-subtle rounded-xl overflow-hidden bg-bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-subtle bg-bg-surface">
        <div>
          <p className="text-sm font-semibold text-foreground">مؤشر الإيرادات والأرباح السنوي</p>
          <p className="text-xs text-muted-foreground mt-0.5">آخر 12 شهراً — بالمليون دينار</p>
        </div>
        {last && prev && (
          <TrendPill current={last.revenue} previous={prev.revenue} />
        )}
      </div>

      {/* Chart */}
      <div className="p-4 pt-3">
        {isLoading ? (
          <div className="h-[220px] flex flex-col justify-end gap-2 px-2">
            {[60, 80, 55, 90, 70, 100, 60, 85, 45, 95, 75, 110].map((h, i) => (
              <div key={i} className="flex-1" style={{ height: `${h}%` }}>
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : isError || months.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50">
              {isError ? 'تعذر تحميل بيانات المخطط' : 'لا توجد بيانات شهرية بعد'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e63946" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#e63946" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <filter id="revenueGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="profitGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-tajawal), sans-serif' }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-inter), sans-serif' }}
                axisLine={false}
                tickLine={false}
                width={32}
                tickFormatter={v => `${v}M`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontFamily: 'var(--font-tajawal), sans-serif' }}
              />
              <Area
                type="monotone"
                dataKey="الإيرادات"
                stroke="#e63946"
                strokeWidth={2}
                fill="url(#gradRevenue)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#e63946' }}
                style={{ filter: 'url(#revenueGlow)' }}
              />
              <Area
                type="monotone"
                dataKey="صافي الربح"
                stroke="#10b981"
                strokeWidth={1.8}
                fill="url(#gradProfit)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                style={{ filter: 'url(#profitGlow)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
