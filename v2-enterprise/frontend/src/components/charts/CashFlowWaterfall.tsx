'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { getDashboardStats } from '@/lib/api/dashboard'
import { ChartSkeleton } from './ChartSkeleton'
import { ChartError } from './ChartError'
import { ChartTooltip } from './ChartTooltip'
import { shortenIQD } from '@/lib/charts'

export function CashFlowWaterfall() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  })

  if (isLoading) return <ChartSkeleton height={200} label="التدفق النقدي" />
  if (isError) return <ChartError onRetry={refetch} height={200} />

  const salesPaid = data?.monthly_sales_paid ?? 0
  const purchasesPaid = data?.monthly_purchases_paid ?? 0
  const netProfit = data?.monthly_profit ?? salesPaid - purchasesPaid

  const chartData = [
    { name: 'مبيعات', value: salesPaid, color: '#10B981' },
    { name: 'مشتريات', value: -purchasesPaid, color: '#F43F5E' },
    { name: 'صافي الربح', value: netProfit, color: netProfit >= 0 ? '#2563EB' : '#F43F5E' },
  ]

  return (
    <div className="rounded-xl border border-subtle bg-bg-surface p-5 shadow-sm" dir="rtl">
      <p className="text-xs font-bold text-muted-foreground mb-4 font-family-cairo">التدفق النقدي الشهري</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barSize={36} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="waterfallGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="waterfallRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="waterfallBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={shortenIQD} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
          <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
          <Tooltip content={(props) => (
            <ChartTooltip
              {...props}
              formatter={(v: number) => `${shortenIQD(Math.abs(v))} IQD`}
            />
          )} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => {
              let fillUrl = 'url(#waterfallGreen)'
              let stroke = '#10B981'
              if (entry.name === 'مشتريات') {
                fillUrl = 'url(#waterfallRed)'
                stroke = '#F43F5E'
              } else if (entry.name === 'صافي الربح') {
                if (entry.value >= 0) {
                  fillUrl = 'url(#waterfallBlue)'
                  stroke = '#2563EB'
                } else {
                  fillUrl = 'url(#waterfallRed)'
                  stroke = '#F43F5E'
                }
              }
              return <Cell key={i} fill={fillUrl} stroke={stroke} strokeOpacity={0.3} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
