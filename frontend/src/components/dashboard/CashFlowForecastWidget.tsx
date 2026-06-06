'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, Wallet, AlertTriangle } from 'lucide-react'
import { get } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ForecastWeek {
  week: number
  week_start: string
  week_end: string
  expected_inflow: number
  expected_outflow: number
  net: number
  risk: 'low' | 'warning' | 'critical'
  installments_due: number
}

interface ForecastResponse {
  weeks: ForecastWeek[]
  total_inflow: number
  total_outflow: number
  net_60_days: number
  critical_weeks: number[]
  avg_weekly_expense: number
}

const RISK_BAR: Record<string, string> = {
  low:      'bg-emerald-500',
  warning:  'bg-amber-400',
  critical: 'bg-rose-500',
}

const RISK_TEXT: Record<string, string> = {
  low:      'text-emerald-400',
  warning:  'text-amber-400',
  critical: 'text-rose-400',
}

function money(v: number) { return formatMoney(v, 'IQD') }

function WeekBar({ week }: { week: ForecastWeek }) {
  const maxBar = 100
  const inflowPct  = Math.min((week.expected_inflow  / Math.max(week.expected_inflow, week.expected_outflow, 1)) * 100, 100)
  const outflowPct = Math.min((week.expected_outflow / Math.max(week.expected_inflow, week.expected_outflow, 1)) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">أسبوع {week.week}</span>
        <span className={`font-numeric font-bold ${RISK_TEXT[week.risk]}`}>
          {week.net >= 0 ? '+' : ''}{money(week.net)}
        </span>
      </div>
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-white/5">
        <div className="bg-emerald-500/70 rounded-full transition-all" style={{ width: `${inflowPct}%` }} />
        <div className="bg-rose-500/50 rounded-full transition-all" style={{ width: `${outflowPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/60">
        <span>↑{money(week.expected_inflow)}</span>
        <span>↓{money(week.expected_outflow)}</span>
      </div>
    </div>
  )
}

export function CashFlowForecastWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow-forecast'],
    queryFn: () => get<ForecastResponse>('/reports/cash-flow-forecast'),
    staleTime: 300_000,
    retry: 1,
  })

  const isPositive = (data?.net_60_days ?? 0) >= 0

  return (
    <div className="dash-card overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${isPositive ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}>
            <Wallet className={`h-4 w-4 ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">توقع التدفق النقدي</h2>
            <p className="text-[10px] text-muted-foreground">8 أسابيع قادمة</p>
          </div>
        </div>
        {data && (
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground">صافي 60 يوم</p>
            <p className={`font-numeric text-base font-black ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isPositive ? '+' : ''}{money(data.net_60_days)}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
      ) : !data ? null : (
        <div className="p-4 space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 py-2">
              <p className="text-[10px] text-muted-foreground">توقع الدخل</p>
              <p className="font-numeric text-sm font-bold text-emerald-300">{money(data.total_inflow)}</p>
            </div>
            <div className="rounded-lg bg-rose-500/[0.06] border border-rose-500/15 py-2">
              <p className="text-[10px] text-muted-foreground">توقع الخروج</p>
              <p className="font-numeric text-sm font-bold text-rose-300">{money(data.total_outflow)}</p>
            </div>
            <div className={`rounded-lg border py-2 ${isPositive ? 'bg-emerald-500/[0.04] border-emerald-500/15' : 'bg-rose-500/[0.08] border-rose-500/25'}`}>
              <p className="text-[10px] text-muted-foreground">الصافي</p>
              <p className={`font-numeric text-sm font-black ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>{isPositive ? '+' : ''}{money(data.net_60_days)}</p>
            </div>
          </div>

          {/* Critical weeks warning */}
          {data.critical_weeks.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-rose-300">
                تحذير: أسابيع {data.critical_weeks.join('، ')} توقع تدفق سلبي — تحتاج سيولة احتياطية
              </p>
            </div>
          )}

          {/* Week bars */}
          <div className="space-y-3">
            {data.weeks.map(week => <WeekBar key={week.week} week={week} />)}
          </div>
        </div>
      )}
    </div>
  )
}
