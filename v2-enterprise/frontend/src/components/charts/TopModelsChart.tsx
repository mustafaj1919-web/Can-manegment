'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getCars } from '@/lib/api/inventory'
import { ChartSkeleton } from './ChartSkeleton'
import { ChartError } from './ChartError'
import { ChartTooltip } from './ChartTooltip'

export function TopModelsChart() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory-top-models'],
    queryFn: () => getCars({ per_page: 100 }),
    staleTime: 120_000,
  })

  if (isLoading) return <ChartSkeleton height={200} label="أكثر الموديلات" />
  if (isError) return <ChartError onRetry={refetch} height={200} />

  const counts: Record<string, number> = {}
  for (const car of data?.items ?? []) {
    const key = [car.brand, car.model].filter(Boolean).join(' ')
    counts[key] = (counts[key] ?? 0) + 1
  }

  const chartData = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  return (
    <div className="rounded-xl border border-subtle bg-bg-surface p-5 shadow-sm" dir="rtl">
      <p className="text-xs font-bold text-muted-foreground mb-4 font-family-cairo">أكثر الموديلات في المخزون</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" barSize={16} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="violetGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={80} />
          <Tooltip content={(props) => (
            <ChartTooltip {...props} formatter={(v: number) => `${v} سيارة`} />
          )} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Bar dataKey="count" fill="url(#violetGrad)" stroke="#8b5cf6" strokeOpacity={0.4} radius={[0, 6, 6, 0]} name="العدد" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
