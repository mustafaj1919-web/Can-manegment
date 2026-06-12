'use client'

import { useQuery } from '@tanstack/react-query'
import { Brain, TrendingUp, Wallet, CalendarDays, Car, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { get } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardWidget } from './DashboardWidget'

interface SmartSummaryKpis {
  today_sales_count:   number
  today_revenue_iqd:   number
  today_cash_iqd:      number
  today_expenses_iqd:  number
  week_sales_count:    number
  due_today_count:     number
  overdue_count:       number
  overdue_amount_iqd:  number
  available_cars:      number
  trial_balanced:      boolean | null
}

interface SmartSummaryResponse {
  date:         string
  summary_text: string
  kpis:         SmartSummaryKpis
}

async function fetchSmartSummary(): Promise<SmartSummaryResponse> {
  return get<SmartSummaryResponse>('/reports/smart-summary')
}

function KpiChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string
  tone: string
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="mt-0.5 font-numeric text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function SmartDailySummaryWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['smart-summary'],
    queryFn:  fetchSmartSummary,
    staleTime: 60_000,
    refetchInterval: 180_000,
    retry: 1,
  })

  const k = data?.kpis

  return (
    <DashboardWidget
      title="الملخص الذكي اليومي"
      subtitle={data?.date}
      icon={Brain}
      iconColor="text-emerald-400"
      noPadding
    >
      {isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-12 rounded-lg w-full" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
      ) : !data ? null : (
        <div className="p-4 space-y-4">
          {/* Summary text */}
          <div className="rounded-lg border border-border/40 bg-secondary/20 px-4 py-3">
            <p className="text-xs leading-relaxed text-foreground/80">{data.summary_text}</p>
          </div>

          {/* KPI chips */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <KpiChip icon={TrendingUp}    label="مبيعات اليوم"  value={`${k?.today_sales_count ?? 0} فاتورة`}        tone="border-emerald-500/15 bg-emerald-500/5"  />
            <KpiChip icon={Wallet}        label="إيرادات اليوم" value={formatMoney(k?.today_revenue_iqd ?? 0, 'IQD')} tone="border-cyan-500/15 bg-cyan-500/5"        />
            <KpiChip icon={Wallet}        label="نقد مستلم"     value={formatMoney(k?.today_cash_iqd ?? 0, 'IQD')}    tone="border-violet-500/15 bg-violet-500/5"    />
            <KpiChip icon={CalendarDays}  label="أقساط اليوم"   value={`${k?.due_today_count ?? 0} قسط`}              tone="border-amber-500/15 bg-amber-500/5"      />
            <KpiChip icon={AlertTriangle} label="أقساط متأخرة"  value={`${k?.overdue_count ?? 0} قسط`}               tone={`border-rose-500/15 ${(k?.overdue_count ?? 0) > 0 ? 'bg-rose-500/10' : 'bg-rose-500/5'}`} />
            <KpiChip icon={Car}           label="سيارات متاحة"  value={`${k?.available_cars ?? 0} سيارة`}             tone="border-sky-500/15 bg-sky-500/5"          />
          </div>

          {/* Accounting health */}
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${k?.trial_balanced === false ? 'border-rose-500/25 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
            {k?.trial_balanced === false
              ? <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              : <CheckCircle2  className="h-4 w-4 text-emerald-400 shrink-0" />}
            <p className="text-xs font-medium">
              {k?.trial_balanced === false
                ? 'ميزان المراجعة غير متوازن — راجع القيود المحاسبية'
                : 'الحسابات المحاسبية متوازنة ✓'}
            </p>
          </div>
        </div>
      )}
    </DashboardWidget>
  )
}
