'use client'

import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getDashboardStats } from '@/lib/api/dashboard'
import { ChartSkeleton } from './ChartSkeleton'
import { ChartError } from './ChartError'
import { ChartTooltip } from './ChartTooltip'

const COLORS = ['#10B981', '#F59E0B', '#2563EB']
const LABELS = ['متاحة', 'محجوزة', 'مباعة']

export function InventoryDonut() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  })

  if (isLoading) return <ChartSkeleton height={180} label="توزيع المخزون" />
  if (isError) return <ChartError onRetry={refetch} height={180} />

  const chartData = [
    { name: 'متاحة', value: data?.available_cars ?? 0 },
    { name: 'محجوزة', value: data?.reserved_cars ?? 0 },
    { name: 'مباعة', value: data?.sold_cars ?? 0 },
  ].filter(d => d.value > 0)

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-subtle bg-bg-surface p-5 shadow-sm" dir="rtl">
      <p className="text-xs font-bold text-muted-foreground mb-4 font-family-cairo">توزيع حالة المخزون</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, i) => {
              let color = '#10B981'
              if (entry.name === 'محجوزة') color = '#F59E0B'
              else if (entry.name === 'مباعة') color = '#2563EB'
              return <Cell key={i} fill={color} stroke="var(--bg-card)" strokeWidth={2} />
            })}
          </Pie>
          <Tooltip content={(props) => (
            <ChartTooltip
              {...props}
              formatter={(v: number) => `${v} سيارة (${total ? ((v / total) * 100).toFixed(0) : 0}%)`}
            />
          )} />
          <Legend
            formatter={(value) => <span className="text-[11px] text-muted-foreground font-family-cairo">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
