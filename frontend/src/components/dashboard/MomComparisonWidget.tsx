'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { get } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface MonthStats {
  label: string
  sales_count: number
  revenue: number
  cost: number
  expenses: number
  gross_profit: number
  net_profit: number
  cash_in: number
}

interface MomResponse {
  this_month: MonthStats
  last_month: MonthStats
  changes: Record<string, number | null>
}

function money(v: number) { return formatMoney(v, 'IQD') }

function ChangeChip({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined) return <span className="text-[10px] text-muted-foreground/40">—</span>
  if (Math.abs(pct) < 0.5) return <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-2.5 w-2.5" />0%</span>
  const up = pct > 0
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function Row({ label, thisVal, lastVal, change, isProfit }: { label: string; thisVal: number; lastVal: number; change: number | null | undefined; isProfit?: boolean }) {
  return (
    <tr className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
      <td className="py-2.5 pr-5 text-xs text-foreground/80">{label}</td>
      <td className={`py-2.5 text-left font-numeric text-xs font-semibold ${isProfit ? (thisVal >= 0 ? 'text-emerald-300' : 'text-rose-300') : 'text-foreground'}`}>
        {money(thisVal)}
      </td>
      <td className="py-2.5 text-left font-numeric text-xs text-muted-foreground/60">{money(lastVal)}</td>
      <td className="py-2.5 pl-5 text-left"><ChangeChip pct={change} /></td>
    </tr>
  )
}

export function MomComparisonWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['mom-comparison'],
    queryFn: () => get<MomResponse>('/reports/mom-comparison'),
    staleTime: 300_000,
    retry: 1,
  })

  return (
    <div className="dash-card overflow-hidden" dir="rtl">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-bold text-foreground">مقارنة الشهر الحالي</h2>
        {data && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {data.this_month.label} مقابل {data.last_month.label}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
      ) : !data ? null : (
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.02] text-[10px] text-muted-foreground/60">
                <th className="py-2 pr-5 text-right">البند</th>
                <th className="py-2 text-left">هذا الشهر</th>
                <th className="py-2 text-left">الشهر الماضي</th>
                <th className="py-2 pl-5 text-left">التغيير</th>
              </tr>
            </thead>
            <tbody>
              <Row label="عدد المبيعات"    thisVal={data.this_month.sales_count}  lastVal={data.last_month.sales_count}  change={data.changes.sales_count} />
              <Row label="الإيرادات"       thisVal={data.this_month.revenue}       lastVal={data.last_month.revenue}       change={data.changes.revenue} />
              <Row label="مجمل الربح"      thisVal={data.this_month.gross_profit}  lastVal={data.last_month.gross_profit}  change={data.changes.gross_profit}  isProfit />
              <Row label="المصاريف"        thisVal={data.this_month.expenses}      lastVal={data.last_month.expenses}      change={data.changes.expenses} />
              <Row label="صافي الربح"      thisVal={data.this_month.net_profit}    lastVal={data.last_month.net_profit}    change={data.changes.net_profit}    isProfit />
              <Row label="النقد المستلم"   thisVal={data.this_month.cash_in}       lastVal={data.last_month.cash_in}       change={data.changes.cash_in} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
