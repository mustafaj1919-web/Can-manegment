'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getDashboardStats } from '@/lib/api/dashboard'
import { cn, formatMoney } from '@/lib/utils'
import { DashboardWidget } from './DashboardWidget'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

function RiskTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="dash-card px-3 py-2 text-xs">
      <p style={{ color: d.payload.color }} className="font-semibold">{d.payload.label}</p>
      <p className="dash-sub mt-0.5">{d.value} قسط</p>
      <p className="text-[10px] text-muted-foreground/60 money">{formatMoney(d.payload.amount, 'IQD')}</p>
    </div>
  )
}

const BUCKETS = [
  { key:'overdue',  label:'متأخرة',    countKey:'overdue_count',       amtKey:'overdue_amount',       color:'#e63946', text:'text-red-400',    bg:'bg-red-500/8',    border:'border-red-500/15'    },
  { key:'today',    label:'اليوم',      countKey:'due_today_count',     amtKey:'due_today_amount',     color:'#f4a522', text:'text-amber-400',  bg:'bg-amber-500/8',  border:'border-amber-500/15'  },
  { key:'tomorrow', label:'غداً',       countKey:'due_tomorrow_count',  amtKey:'due_tomorrow_amount',  color:'#f97316', text:'text-orange-400', bg:'bg-orange-500/8', border:'border-orange-500/15' },
  { key:'two_days', label:'بعد يومين', countKey:'due_in_2_days_count', amtKey:'due_in_2_days_amount', color:'#8b5cf6', text:'text-violet-400', bg:'bg-violet-500/8', border:'border-violet-500/15' },
] as const

export function InstallmentRiskWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'], queryFn: getDashboardStats,
    staleTime: 60_000, refetchInterval: 120_000, retry: 1,
  })

  const s = data?.installment_summary
  const buckets = BUCKETS.map(b => ({
    ...b,
    count:  (s as any)?.[b.countKey] ?? 0,
    amount: (s as any)?.[b.amtKey]   ?? 0,
  }))

  const totalCount = buckets.reduce((a, b) => a + b.count, 0)
  const pieData    = buckets.filter(b => b.count > 0).map(b => ({ ...b, value: b.count }))
  const allClear   = totalCount === 0

  const viewAllBtn = (
    <Button asChild variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2">
      <Link href="/installments">كل الأقساط<ArrowUpRight className="h-2.5 w-2.5" /></Link>
    </Button>
  )

  return (
    <DashboardWidget
      title="مخاطر الأقساط"
      subtitle={allClear ? 'لا متأخرات' : `${totalCount} قسط يحتاج متابعة`}
      icon={allClear ? CheckCircle2 : AlertTriangle}
      iconColor={allClear ? 'text-emerald-400' : 'text-red-400'}
      action={viewAllBtn}
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-36 w-full rounded-lg" />
          {Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : allClear ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background:'var(--s2)', border:'1px solid var(--border-card)' }}>
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">جميع الأقساط منتظمة</p>
          <p className="text-xs text-muted-foreground/50">لا مدفوعات متأخرة</p>
        </div>
      ) : (
        <>
          {/* Donut */}
          {pieData.length > 0 && (
            <div className="relative h-36 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="value" strokeWidth={1.5} stroke="var(--bg-card)">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.82} />)}
                  </Pie>
                  <Tooltip content={<RiskTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black money text-foreground">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground/60">قسط</p>
              </div>
            </div>
          )}

          {/* Bucket rows */}
          <div className="space-y-1.5" style={{ borderTop:'1px solid var(--border-inner)', paddingTop:'0.75rem' }}>
            {buckets.map(({ key, label, count, amount, color, text, bg, border }) => {
              if (count === 0) return null
              const pct = totalCount > 0 ? (count / totalCount) * 100 : 0
              return (
                <motion.div key={key} initial={{ opacity:0, x:6 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.25 }}
                  className={cn('rounded-lg p-2.5 border', bg, border)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background:color }} />
                      <span className={cn('text-[11px] font-semibold', text)}>{label}</span>
                    </div>
                    <span className={cn('text-[11px] font-bold money', text)}>{count} قسط</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6, delay:0.1 }}
                        className="h-full rounded-full" style={{ background:color }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 money shrink-0">{formatMoney(amount,'IQD')}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </DashboardWidget>
  )
}
