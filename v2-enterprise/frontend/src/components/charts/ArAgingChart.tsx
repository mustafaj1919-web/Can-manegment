'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getDashboardStats } from '@/lib/api/dashboard'
import { ChartSkeleton } from './ChartSkeleton'
import { ChartError } from './ChartError'
import { ChartTooltip } from './ChartTooltip'
import { shortenIQD } from '@/lib/charts'

export function ArAgingChart() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  })

  if (isLoading) return <ChartSkeleton height={200} label="الذمم المدينة" />
  if (isError) return <ChartError onRetry={refetch} height={200} />

  const overdueAmount = data?.overdue_amount ?? 0
  const receivables = data?.receivables ?? 0
  const notOverdue = Math.max(0, receivables - overdueAmount)

  const chartData = [
    { name: 'مستحقة', value: notOverdue },
    { name: 'متعثرة', value: overdueAmount },
  ]

  return (
    <div className="rounded-xl border border-subtle bg-bg-surface p-5 shadow-sm" dir="rtl">
      <p className="text-xs font-bold text-muted-foreground mb-4 font-family-cairo">الذمم المدينة — مستحقة مقابل متعثرة</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barSize={48} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="arGood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4aa" />
              <stop offset="100%" stopColor="#00d4aa" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="arBad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={shortenIQD} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={(props) => (
            <ChartTooltip {...props} formatter={(v: number) => `${shortenIQD(v)} IQD`} />
          )} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} name="المبلغ">
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? 'url(#arGood)' : 'url(#arBad)'} stroke={i === 0 ? '#00d4aa' : '#ef4444'} strokeOpacity={0.3} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
