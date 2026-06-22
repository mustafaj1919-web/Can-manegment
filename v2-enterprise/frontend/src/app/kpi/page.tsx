'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Wallet, Banknote, AlertTriangle,
  Car, RefreshCw, Calendar, ShoppingBag, Minus, BarChart3
} from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { getKpiDashboard } from '@/lib/api/kpi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

function StatCard({
  label, value, sub, icon: Icon, color, trend, linkTo
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: number; linkTo?: string
}) {
  const isPositive = trend !== undefined && trend > 0
  const isNeutral  = trend === undefined || Math.abs(trend) < 1

  const inner = (
    <div className={cn('flex items-start gap-3 rounded-2xl border p-5 transition-all', color, linkTo && 'hover:scale-[1.01] cursor-pointer')}>
      <div className="mt-0.5 rounded-xl bg-white/5 p-2.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 font-numeric text-2xl font-black text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
        {trend !== undefined && !isNeutral && (
          <div className={cn('mt-1.5 flex items-center gap-1 text-[11px] font-bold', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}% مقارنة بالشهر الماضي
          </div>
        )}
      </div>
    </div>
  )
  return linkTo ? <Link href={linkTo}>{inner}</Link> : inner
}

function AlertBadge({ count, label, severity }: { count: number; label: string; severity: 'error' | 'warning' }) {
  if (count === 0) return null
  return (
    <div className={cn('flex items-center gap-2 rounded-xl border p-3',
      severity === 'error' ? 'border-rose-500/20 bg-rose-500/5' : 'border-amber-500/20 bg-amber-500/5'
    )}>
      <AlertTriangle className={cn('h-4 w-4 shrink-0', severity === 'error' ? 'text-rose-400' : 'text-amber-400')} />
      <span className="text-xs text-foreground">
        <strong className={severity === 'error' ? 'text-rose-400' : 'text-amber-400'}>{count}</strong> {label}
      </span>
    </div>
  )
}

export default function KpiPage() {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['kpi-dashboard'],
    queryFn: getKpiDashboard,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('ar-IQ') : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <BarChart3 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold text-foreground">لوحة المؤشرات الرئيسية</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lastUpdated ? `آخر تحديث: ${lastUpdated}` : 'مؤشرات الأداء اليومية والشهرية'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-border/30 bg-secondary/10 p-8 text-center">
          <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
        </div>
      ) : (
        <>
          {/* Alerts row */}
          {(data.alerts.overdue_installments_count > 0 || data.alerts.unpaid_suppliers_count > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AlertBadge count={data.alerts.overdue_installments_count} label={`قسط متأخر — ${formatMoney(data.alerts.overdue_installments_amount, 'IQD')} إجمالي`} severity="error" />
              <AlertBadge count={data.alerts.unpaid_suppliers_count} label={`فاتورة مورد غير مسددة — ${formatMoney(data.alerts.unpaid_suppliers_amount, 'IQD')} إجمالي`} severity="warning" />
            </div>
          )}

          {/* Today */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">اليوم</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="مبيعات اليوم" value={data.today.sales_count} sub="صفقة" icon={TrendingUp} color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400" linkTo="/sales" />
              <StatCard label="إيرادات اليوم" value={formatMoney(data.today.sales_revenue, 'IQD')} icon={Banknote} color="border-cyan-500/20 bg-cyan-500/5 text-cyan-400" linkTo="/sales" />
              <StatCard label="أقساط مستحقة اليوم" value={data.today.due_installments_count} sub="قسط" icon={Calendar} color="border-amber-500/20 bg-amber-500/5 text-amber-400" linkTo="/installments" />
            </div>
          </div>

          {/* This month */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">هذا الشهر</p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="إيرادات المبيعات" value={formatMoney(data.this_month.sales_revenue, 'IQD')} sub={`${data.this_month.sales_count} سيارة`} icon={TrendingUp} color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400" trend={data.this_month.revenue_vs_last_month_pct} linkTo="/sales" />
              <StatCard label="صافي الربح الإجمالي" value={formatMoney(data.this_month.gross_profit, 'IQD')} sub={`هامش ${data.this_month.profit_margin_pct}%`} icon={BarChart3} color="border-violet-500/20 bg-violet-500/5 text-violet-400" />
              <StatCard label="المصروفات" value={formatMoney(data.this_month.expenses, 'IQD')} icon={ShoppingBag} color="border-rose-500/20 bg-rose-500/5 text-rose-400" linkTo="/accounting" />
              <StatCard label="المخزون المتاح" value={data.balances.inventory_count} sub="سيارة" icon={Car} color="border-indigo-500/20 bg-indigo-500/5 text-indigo-400" linkTo="/inventory" />
            </div>
          </div>

          {/* Balances */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">السيولة الحالية</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="رصيد الصندوق" value={formatMoney(data.balances.cash, 'IQD')} icon={Wallet} color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400" linkTo="/cashbox" />
              <StatCard label="رصيد البنك" value={formatMoney(data.balances.bank, 'IQD')} icon={Banknote} color="border-blue-500/20 bg-blue-500/5 text-blue-400" linkTo="/cashbox" />
              <StatCard label="إجمالي السيولة" value={formatMoney(data.balances.total_liquid, 'IQD')} sub="نقد + بنك" icon={Wallet} color={cn('border', data.balances.total_liquid > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300')} />
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: '/reports', label: 'التقارير المالية' },
              { href: '/installments', label: 'الأقساط' },
              { href: '/suppliers', label: 'الموردون' },
              { href: '/accounting', label: 'الرؤى المالية' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="rounded-xl border border-border/30 bg-secondary/10 p-3 text-center text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
