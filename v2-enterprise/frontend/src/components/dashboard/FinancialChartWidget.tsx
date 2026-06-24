'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { BarChart2, TrendingDown, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'
import { cn, formatMoney } from '@/lib/utils'
import { DashboardWidget } from './DashboardWidget'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  return (
    <div className="dash-card min-w-[170px] overflow-hidden px-3 py-2.5 text-xs shadow-2xl">
      <div className="mb-2 h-0.5 w-full rounded-full" style={{ background: item?.color }} />
      <p className="dash-sub mb-1">{label}</p>
      <p className="money text-sm font-bold" style={{ color: item?.color }}>
        {formatMoney(payload[0]?.value ?? 0, 'IQD')}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground/50">اضغط على التقارير للتفاصيل الكاملة</p>
    </div>
  )
}

export function FinancialChartWidget() {
  const reduceMotion = useReducedMotion()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 60_000, retry: 1,
  })

  const salesM   = data?.monthly_sales_paid     ?? data?.monthly_summary?.sales_paid    ?? 0
  const purchM   = data?.monthly_purchases_paid ?? data?.monthly_summary?.purchases_paid ?? 0
  const profitM  = data?.monthly_profit         ?? data?.monthly_summary?.profit         ?? 0
  const cashbox  = data?.cashbox_balance        ?? 0
  const hasData  = salesM > 0 || purchM > 0 || cashbox > 0

  const chartData = [
    { label: 'مبيعات',   value: salesM,  color: '#00d4aa', gradient: 'salesGradient', key: 'sales' },
    { label: 'مشتريات', value: purchM,  color: '#ef4444', gradient: 'purchaseGradient', key: 'purch' },
    { label: 'الربح',   value: profitM, color: profitM >= 0 ? '#7c3aed' : '#ef4444', gradient: profitM >= 0 ? 'profitGradient' : 'lossGradient', key: 'profit' },
    { label: 'الصندوق', value: cashbox, color: '#22d3ee', gradient: 'cashGradient', key: 'cashbox' },
  ]

  const profitBadge = profitM !== 0 ? (
    <span className={cn(
      'text-[10px] font-bold money px-2 py-0.5 rounded-md border',
      profitM >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
    )}>
      {profitM >= 0 ? '+' : ''}{formatMoney(profitM, 'IQD')}
    </span>
  ) : null

  return (
    <DashboardWidget title="الأداء المالي" subtitle="ملخص الشهر الحالي" icon={BarChart2} action={!isLoading ? profitBadge ?? undefined : undefined}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <BarChart2 className="h-9 w-9 text-muted-foreground/15" />
          <p className="text-sm font-medium text-muted-foreground/60">لا توجد بيانات مالية بعد</p>
          <p className="text-xs text-muted-foreground/40">تظهر البيانات بعد أول عملية بيع</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4 h-52 overflow-hidden rounded-xl border border-border/40 bg-gradient-to-b from-white/[0.025] to-transparent px-1 pt-3">
            <div className="pointer-events-none absolute -left-10 top-4 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl" />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 4 }} barCategoryGap="24%">
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4aa" /><stop offset="100%" stopColor="#008f73" stopOpacity={0.4} /></linearGradient>
                  <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#991b1b" stopOpacity={0.4} /></linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} /></linearGradient>
                  <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} /></linearGradient>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0891b2" stopOpacity={0.4} /></linearGradient>
                  <filter id="barGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 6" />
                <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'Cairo, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.04)" />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={58}
                  isAnimationActive={!reduceMotion}
                  animationBegin={120}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={`url(#${entry.gradient})`} stroke={entry.color} strokeOpacity={0.3} style={{ filter: 'url(#barGlow)' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop:'1px solid var(--border-inner)' }}>
            {[
              { label:'مبيعات',   value:salesM,  color:'text-[#00d4aa]' },
              { label:'مشتريات', value:purchM,  color:'text-red-400'     },
              { label:'الربح',   value:profitM, color: profitM >= 0 ? 'text-violet-400' : 'text-red-400' },
            ].map(({ label, value, color }, index) => (
              <motion.div
                key={label}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + index * 0.08, duration: 0.35 }}
                whileHover={reduceMotion ? undefined : { y: -3, scale: 1.015 }}
                className="group relative overflow-hidden rounded-lg border border-border/30 py-2.5 text-center"
                style={{ background:'var(--s2)' }}
              >
                <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="text-[10px] text-muted-foreground/60 mb-1">{label}</p>
                <div className="flex items-center justify-center gap-1">
                  {label === 'الربح' && (value >= 0
                    ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                    : <TrendingDown className="h-3 w-3 text-rose-400" />)}
                  <p className={cn('text-[11px] font-bold money truncate px-1', color)}>{formatMoney(value,'IQD')}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </DashboardWidget>
  )
}
