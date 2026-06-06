'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart2 } from 'lucide-react'
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
  return (
    <div className="dash-card px-3 py-2 text-xs" style={{ minWidth: 160 }}>
      <p className="dash-sub mb-1">{label}</p>
      <p className="font-semibold money" style={{ color: payload[0]?.fill }}>
        {formatMoney(Math.abs(payload[0]?.value ?? 0), 'IQD')}
      </p>
    </div>
  )
}

const CHART_ITEMS = [
  { key: 'sales',    label: 'مبيعات الشهر',   color: '#10b981' },
  { key: 'purch',    label: 'مشتريات الشهر',  color: '#cc2118' },
  { key: 'profit',   label: 'صافي الربح',     color: '#d4a44c' },
  { key: 'cashbox',  label: 'رصيد الصندوق',   color: '#22d3ee' },
]

export function FinancialChartWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 60_000, retry: 1,
  })

  const salesM   = data?.monthly_sales_paid     ?? data?.monthly_summary?.sales_paid    ?? 0
  const purchM   = data?.monthly_purchases_paid ?? data?.monthly_summary?.purchases_paid ?? 0
  const profitM  = data?.monthly_profit         ?? data?.monthly_summary?.profit         ?? 0
  const cashbox  = data?.cashbox_balance        ?? 0
  const hasData  = salesM > 0 || purchM > 0 || cashbox > 0

  const chartData = [
    { label: 'مبيعات',   value: salesM,  color: '#10b981', key: 'sales'  },
    { label: 'مشتريات', value: purchM,  color: '#cc2118', key: 'purch'  },
    { label: 'الربح',   value: profitM, color: '#d4a44c', key: 'profit' },
    { label: 'الصندوق', value: cashbox, color: '#22d3ee', key: 'cashbox'},
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
          <div className="h-44 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top:4, right:4, left:4, bottom:4 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.04)', radius:4 }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
                <Bar dataKey="value" radius={[5,5,0,0]} maxBarSize={52}>
                  {chartData.map((e) => <Cell key={e.key} fill={e.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop:'1px solid var(--border-inner)' }}>
            {[
              { label:'مبيعات',   value:salesM,  color:'text-emerald-400' },
              { label:'مشتريات', value:purchM,  color:'text-red-400'     },
              { label:'الربح',   value:profitM, color: profitM >= 0 ? 'text-amber-400' : 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center py-2 rounded-lg" style={{ background:'var(--s2)' }}>
                <p className="text-[10px] text-muted-foreground/60 mb-1">{label}</p>
                <p className={cn('text-[11px] font-bold money truncate px-1', color)}>{formatMoney(value,'IQD')}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardWidget>
  )
}
