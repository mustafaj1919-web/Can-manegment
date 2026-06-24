'use client'

import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getSales } from '@/lib/api/sales'
import { ChartSkeleton } from './ChartSkeleton'
import { ChartError } from './ChartError'
import { ChartTooltip } from './ChartTooltip'
import { shortenIQD } from '@/lib/charts'

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function SalesTrendSparkline() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales-trend'],
    queryFn: () => getSales({ per_page: 30 }),
    staleTime: 120_000,
  })

  if (isLoading) return <ChartSkeleton height={160} label="مسار المبيعات" />
  if (isError) return <ChartError onRetry={refetch} height={160} />

  // Group by date
  const byDate: Record<string, number> = {}
  for (const sale of data?.items ?? []) {
    const date = sale.sale_date?.split('T')[0] ?? ''
    if (!date) continue
    byDate[date] = (byDate[date] ?? 0) + (sale.selling_price ?? 0)
  }

  const chartData = Object.entries(byDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, amount]) => ({ date: formatDateLabel(date), amount }))

  return (
    <div className="rounded-xl border border-subtle bg-bg-surface p-5 shadow-sm" dir="rtl">
      <p className="text-xs font-bold text-muted-foreground mb-4 font-family-cairo">مسار المبيعات (آخر 30 يوم)</p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4aa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={shortenIQD} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={(props) => (
            <ChartTooltip {...props} formatter={(v: number) => `${shortenIQD(v)} IQD`} />
          )} />
          <Area type="monotone" dataKey="amount" stroke="#00d4aa" strokeWidth={2} fill="url(#salesGrad)" name="المبيعات" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
