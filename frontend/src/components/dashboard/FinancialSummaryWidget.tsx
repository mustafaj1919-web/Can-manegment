'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, TrendingDown, Wallet, CalendarDays, AlertTriangle } from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'
import { DashboardWidget } from './DashboardWidget'

interface RowItem { icon: React.ElementType; label: string; value: number; color: string }

function MetricRow({ icon: Icon, label, value, color }: RowItem) {
  return (
    <div className="flex items-center gap-2.5 py-2" style={{ borderBottom:'1px solid var(--border-inner)' }}>
      <div className="h-6 w-6 rounded flex items-center justify-center shrink-0" style={{ background:'var(--s3)' }}>
        <Icon className={cn('h-3 w-3', color)} />
      </div>
      <span className="flex-1 text-[11px] text-muted-foreground/70 truncate">{label}</span>
      <span className={cn('text-[11px] font-bold money shrink-0', value === 0 ? 'text-muted-foreground/40' : color)}>
        {value === 0 ? '—' : formatMoney(value,'IQD')}
      </span>
    </div>
  )
}

export function FinancialSummaryWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 60_000, retry: 1,
  })

  const salesTotal    = data?.total_sales_amount    ?? 0
  const purchTotal    = data?.total_purchases_amount ?? 0
  const cashbox       = data?.cashbox_balance        ?? 0
  const receivables   = data?.receivables            ?? 0
  const todayPay      = data?.today_payments         ?? 0
  const overdueAmt    = data?.overdue_amount         ?? 0
  const monthlyProfit = data?.monthly_profit         ?? data?.monthly_summary?.profit ?? 0

  const profitBadge = !isLoading && monthlyProfit !== 0 ? (
    <span className={cn('text-[10px] font-bold money px-1.5 py-0.5 rounded border', monthlyProfit >= 0 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/8' : 'text-red-400 border-red-500/20 bg-red-500/8')}>
      {monthlyProfit >= 0 ? '+' : ''}{formatMoney(monthlyProfit,'IQD')}
    </span>
  ) : null

  const rows: RowItem[] = [
    { icon:TrendingUp,  label:'إجمالي المبيعات',   value:salesTotal, color:'text-emerald-400' },
    { icon:TrendingDown,label:'إجمالي المشتريات',  value:purchTotal, color:'text-red-400'     },
    { icon:Wallet,      label:'رصيد الصندوق',       value:cashbox,    color:cashbox >= 0 ? 'text-cyan-400' : 'text-red-400' },
    { icon:DollarSign,  label:'الذمم المستحقة',     value:receivables,color:'text-amber-400'  },
    { icon:CalendarDays,label:'دفعات اليوم',        value:todayPay,   color:'text-blue-400'   },
  ]
  if (overdueAmt > 0) rows.push({ icon:AlertTriangle, label:'أقساط متأخرة', value:overdueAmt, color:'text-orange-400' })

  return (
    <DashboardWidget title="الملخص المالي" subtitle="بالدينار العراقي" icon={DollarSign} iconColor="text-amber-400" action={profitBadge ?? undefined}>
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-9 rounded-lg" />)}</div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground/60 text-center py-6">تعذّر التحميل</p>
      ) : (
        <div className="-my-px">
          {rows.map((r) => <MetricRow key={r.label} {...r} />)}
        </div>
      )}
    </DashboardWidget>
  )
}
