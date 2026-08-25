'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { TrendingUp, TrendingDown, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getMonthlyProfitReport, type MonthlyProfitRow } from '@/lib/api/reports'
import { exportXlsx } from '@/lib/export'

const PERIOD_OPTIONS = [
  { value: 6,  label: 'آخر 6 أشهر' },
  { value: 12, label: 'آخر 12 شهر' },
  { value: 24, label: 'آخر 24 شهر' },
]

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="glass group relative overflow-hidden rounded-lg p-4"
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        'font-numeric text-lg font-bold transition-all duration-300',
        positive === true ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.25)]' :
        positive === false ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.25)]' :
        'text-foreground group-hover:text-primary'
      )}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  )
}

function ProfitIcon({ v }: { v: number }) {
  if (v > 0) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
  if (v < 0) return <TrendingDown className="h-3.5 w-3.5 text-rose-400 shrink-0" />
  return null
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-lg space-y-1 min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-numeric font-medium">{Number(p.value).toLocaleString('ar-IQ')} مليون</span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyProfitPage() {
  const [months, setMonths] = useState(12)
  const reduceMotion = useReducedMotion()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['monthly-profit', months],
    queryFn: () => getMonthlyProfitReport(months),
    staleTime: 2 * 60_000,
  })

  async function handleExport() {
    if (!data) return
    const headers = ['الشهر', 'عدد المبيعات', 'الإيرادات (د.ع)', 'تكلفة البضاعة (د.ع)', 'المصاريف (د.ع)', 'الربح الإجمالي (د.ع)', 'الربح الصافي (د.ع)']
    const rows = data.months.map((r) => [
      r.label, r.sales_count, r.revenue, r.cost, r.expenses, r.gross_profit, r.net_profit,
    ])
    rows.push(['الإجمالي', data.totals.sales_count, data.totals.revenue, data.totals.cost, data.totals.expenses, data.totals.gross_profit, data.totals.net_profit])
    await exportXlsx('تقرير-الأرباح-الشهرية', headers, rows)
  }

  const chartData = data?.months.map((r) => ({
    name: r.label.split(' ')[0],
    'الإيرادات':    Math.round(r.revenue      / 1_000_000),
    'تكلفة البضاعة': Math.round(r.cost        / 1_000_000),
    'الربح الصافي':  Math.round(r.net_profit  / 1_000_000),
    'المصاريف':      Math.round(r.expenses     / 1_000_000),
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">تقرير الأرباح الشهرية</h1>
          <p className="text-xs text-muted-foreground">إيرادات، تكاليف، مصاريف، وصافي الربح</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setMonths(o.value)}
                className={cn(
                  'px-3 py-1.5 text-xs transition-colors',
                  months === o.value
                    ? 'bg-primary text-white'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                )}
              >{o.label}</button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!data} className="gap-1.5 border-border/50">
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          فشل تحميل البيانات
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="إجمالي الإيرادات"    value={formatMoney(data.totals.revenue,      'IQD')} />
          <StatCard label="تكلفة البضاعة"        value={formatMoney(data.totals.cost,         'IQD')} />
          <StatCard label="المصاريف التشغيلية"   value={formatMoney(data.totals.expenses,     'IQD')} />
          <StatCard label="الربح الإجمالي"       value={formatMoney(data.totals.gross_profit, 'IQD')} positive={data.totals.gross_profit >= 0} />
          <StatCard label="صافي الربح"           value={formatMoney(data.totals.net_profit,   'IQD')} positive={data.totals.net_profit >= 0} sub={`${data.totals.sales_count} مبيعة`} />
        </div>
      )}

      {/* Chart */}
      <div className="glass relative overflow-hidden rounded-xl p-4 sm:p-5">
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">اتجاه الأداء المالي</p>
            <p className="text-[11px] text-muted-foreground">القيم بالمليون دينار عراقي</p>
          </div>
          <span className="rounded-full border border-border/50 bg-secondary/30 px-2.5 py-1 text-[10px] text-muted-foreground">تفاعلي</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : chartData && (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} barGap={1} barCategoryGap="24%" margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0.35} /></linearGradient>
                <linearGradient id="costBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#d97706" stopOpacity={0.3} /></linearGradient>
                <linearGradient id="expenseBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#be123c" stopOpacity={0.3} /></linearGradient>
                <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                <filter id="profitGlow"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 7" stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 14 }} />
              <Area type="monotone" dataKey="الربح الصافي" fill="url(#profitArea)" stroke="none" isAnimationActive={!reduceMotion} animationDuration={1100} />
              <Bar dataKey="الإيرادات" fill="url(#revenueBar)" radius={[6,6,1,1]} maxBarSize={30} isAnimationActive={!reduceMotion} animationDuration={900} />
              <Bar dataKey="تكلفة البضاعة" fill="url(#costBar)" radius={[6,6,1,1]} maxBarSize={30} isAnimationActive={!reduceMotion} animationBegin={100} animationDuration={900} />
              <Bar dataKey="المصاريف" fill="url(#expenseBar)" radius={[6,6,1,1]} maxBarSize={30} isAnimationActive={!reduceMotion} animationBegin={180} animationDuration={900} />
              <Line type="monotone" dataKey="الربح الصافي" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: 'var(--background)', stroke: '#10B981', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10B981', stroke: '#d1fae5', strokeWidth: 2 }} style={{ filter: 'url(#profitGlow)' }} isAnimationActive={!reduceMotion} animationBegin={250} animationDuration={1200} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">التفاصيل الشهرية</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] text-muted-foreground">
                <th className="px-4 py-2.5 text-start font-medium">الشهر</th>
                <th className="px-4 py-2.5 text-end font-medium">المبيعات</th>
                <th className="px-4 py-2.5 text-end font-medium">الإيرادات</th>
                <th className="hidden sm:table-cell px-4 py-2.5 text-end font-medium">تكلفة البضاعة</th>
                <th className="hidden md:table-cell px-4 py-2.5 text-end font-medium">المصاريف</th>
                <th className="px-4 py-2.5 text-end font-medium">الربح الإجمالي</th>
                <th className="px-4 py-2.5 text-end font-medium">صافي الربح</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  ))
                : data?.months.map((row: MonthlyProfitRow) => (
                    <tr key={row.month} className="border-b border-border/40 last:border-0 hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground text-xs">{row.label}</td>
                      <td className="px-4 py-3 text-end font-numeric text-xs text-muted-foreground">{row.sales_count}</td>
                      <td className="px-4 py-3 text-end font-numeric text-xs">{formatMoney(row.revenue, 'IQD')}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-end font-numeric text-xs text-amber-300/80">{formatMoney(row.cost, 'IQD')}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-end font-numeric text-xs text-rose-300/80">{formatMoney(row.expenses, 'IQD')}</td>
                      <td className="px-4 py-3 text-end font-numeric text-xs">
                        <span className={row.gross_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatMoney(row.gross_profit, 'IQD')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-numeric text-xs">
                        <span className={cn('inline-flex items-center gap-1', row.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          <ProfitIcon v={row.net_profit} />
                          {formatMoney(row.net_profit, 'IQD')}
                        </span>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
            {data && (
              <tfoot className="border-t border-border bg-secondary/10">
                <tr className="text-xs font-semibold">
                  <td className="px-4 py-3 text-foreground">الإجمالي</td>
                  <td className="px-4 py-3 text-end font-numeric text-muted-foreground">{data.totals.sales_count}</td>
                  <td className="px-4 py-3 text-end font-numeric">{formatMoney(data.totals.revenue, 'IQD')}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-end font-numeric text-amber-300">{formatMoney(data.totals.cost, 'IQD')}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-end font-numeric text-rose-300">{formatMoney(data.totals.expenses, 'IQD')}</td>
                  <td className="px-4 py-3 text-end font-numeric">
                    <span className={data.totals.gross_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatMoney(data.totals.gross_profit, 'IQD')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end font-numeric">
                    <span className={data.totals.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatMoney(data.totals.net_profit, 'IQD')}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
