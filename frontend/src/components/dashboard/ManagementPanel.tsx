'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/lib/api/dashboard'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle, Car, LayoutGrid, TrendingDown, TrendingUp, Wallet,
  ReceiptText, CalendarDays, DollarSign,
} from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'

interface MetricItem {
  label:      string
  sublabel:   string
  icon:       React.ElementType
  iconColor:  string
  value:      number
  isMonetary: boolean
  isAlert?:   boolean
}

export function ManagementPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  getDashboardStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  const metrics: MetricItem[] = [
    {
      label: 'قيمة المخزون',
      sublabel: 'تكلفة السيارات المتاحة',
      icon: Car,
      iconColor: 'text-violet-600 dark:text-violet-400',
      value: data?.inventory_value ?? 0,
      isMonetary: true,
    },
    {
      label: 'السيارات المتاحة',
      sublabel: 'جاهزة للبيع الآن',
      icon: Car,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      value: data?.available_cars ?? 0,
      isMonetary: false,
    },
    {
      label: 'المبيعات الشهرية',
      sublabel: 'مجموع مدفوعات هذا الشهر',
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      value: data?.monthly_sales_paid ?? 0,
      isMonetary: true,
    },
    {
      label: 'الأرباح الشهرية',
      sublabel: 'مبيعات — مشتريات الشهر',
      icon: DollarSign,
      iconColor: 'text-amber-600 dark:text-amber-400',
      value: data?.monthly_profit ?? 0,
      isMonetary: true,
    },
    {
      label: 'الذمم المدينة',
      sublabel: 'إجمالي الأقساط المستحقة',
      icon: Wallet,
      iconColor: 'text-sky-600 dark:text-sky-400',
      value: data?.receivables ?? 0,
      isMonetary: true,
    },
    {
      label: 'الذمم الدائنة',
      sublabel: 'متبقي على فواتير الشراء',
      icon: ReceiptText,
      iconColor: 'text-orange-600 dark:text-orange-400',
      value: data?.payables ?? 0,
      isMonetary: true,
    },
    {
      label: 'الأقساط المتأخرة',
      sublabel: 'تتطلب متابعة فورية',
      icon: AlertTriangle,
      iconColor: 'text-rose-600 dark:text-rose-400',
      value: data?.overdue_installments ?? 0,
      isMonetary: false,
      isAlert: true,
    },
    {
      label: 'أقساط خلال 7 أيام',
      sublabel: 'تستحق قريباً',
      icon: CalendarDays,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      value: data?.installment_summary?.due_in_7_days_count ?? 0,
      isMonetary: false,
    },
    {
      label: 'الأرباح السنوية',
      sublabel: 'مبيعات — مشتريات هذا العام',
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-300',
      value: data?.annual_profit ?? 0,
      isMonetary: true,
    },
    {
      label: 'مبيعات الشهر',
      sublabel: 'عدد السيارات المباعة',
      icon: Car,
      iconColor: 'text-violet-600 dark:text-violet-300',
      value: data?.cars_sold_month ?? 0,
      isMonetary: false,
    },
  ]

  return (
    <DashboardWidget
      title="لوحة الإدارة"
      subtitle="مؤشرات الأداء الرئيسية"
      icon={LayoutGrid}
      iconColor="text-muted-foreground"
    >
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {metrics.map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.label}
                className={`rounded-lg border p-3 transition-all ${
                  m.isAlert && m.value > 0
                    ? 'border-rose-500/25 bg-rose-500/[0.04] dark:bg-rose-500/[0.06]'
                    : 'border-border/50 bg-secondary/15 hover:bg-secondary/35 dark:bg-secondary/20 dark:hover:bg-secondary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground/75 leading-snug font-semibold">{m.label}</p>
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${m.iconColor}`} />
                </div>
                {m.isMonetary ? (
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 me-0.5 font-bold">IQD</span>
                    <span className={`font-numeric text-lg font-black ${m.isAlert && m.value > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                      {m.value.toLocaleString('en-US')}
                    </span>
                  </div>
                ) : (
                  <p className={`font-numeric text-xl font-black ${m.isAlert && m.value > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                    {m.value.toLocaleString('en-US')}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/50 mt-1 leading-tight font-medium">{m.sublabel}</p>
              </div>
            )
          })}
        </div>
      )}
    </DashboardWidget>
  )
}
