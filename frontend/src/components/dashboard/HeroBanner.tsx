'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, Car, TrendingUp, Users } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { getDashboardStats, getNotifications } from '@/lib/api/dashboard'
import { useBranchStore } from '@/lib/stores/branch-store'

function getCurrentPeriod() {
  return new Intl.DateTimeFormat('ar-IQ', { month: 'long', year: 'numeric' }).format(new Date())
}

const ACTIONS = [
  { label: 'بيعة جديدة',  href: '/sales/new',    icon: TrendingUp, variant: 'primary'   },
  { label: 'سيارة جديدة', href: '/inventory/new', icon: Car,        variant: 'secondary' },
  { label: 'عميل جديد',   href: '/customers/new', icon: Users,      variant: 'secondary' },
  { label: 'التقارير',    href: '/reports',        icon: BarChart3,  variant: 'ghost'     },
] as const

function CommandStat({ label, value, unit, alert = false }: {
  label: string; value: string; unit: string; alert?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-medium leading-none text-muted-foreground/45 mb-1">{label}</p>
      <p className={cn(
        'font-numeric text-[1.35rem] font-bold leading-tight tabular-nums',
        alert ? 'text-rose-400' : 'text-foreground/85',
      )}>
        {value}
      </p>
      <p className="text-[10px] leading-none mt-0.5 text-muted-foreground/35">{unit}</p>
    </div>
  )
}

export function HeroBanner() {
  const period = useMemo(getCurrentPeriod, [])
  const branch = useBranchStore((s) => s.activeBranch)

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })
  const { data: notif } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
    retry: 1,
  })

  const urgentCount = (notif?.overdue?.length ?? 0) + (notif?.due_today?.length ?? 0)
  const revenue     = stats?.total_sales_amount ?? 0
  const profit      = stats?.monthly_profit     ?? 0
  const salesCount  = stats?.sales              ?? 0
  const fleetCount  = stats?.available_cars     ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="command-center relative overflow-hidden rounded-xl"
    >
      <div className="command-center-mesh" aria-hidden />

      <div className="relative px-6 py-5">

        {/* ── Row 1: Context + Actions ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">

          {/* Branch + period + alert */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
                {branch?.name ?? 'الفرع الرئيسي'}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-muted-foreground/40">{period}</p>
            </div>
            {urgentCount > 0 && (
              <Link
                href="/installments"
                className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/[0.10] px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/[0.16]"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {urgentCount} تنبيه عاجل
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {ACTIONS.map(({ label, href, icon: Icon, variant }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150',
                  variant === 'primary'   && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                  variant === 'secondary' && 'border border-white/10 bg-white/[0.05] text-foreground/80 hover:bg-white/[0.09] hover:text-foreground',
                  variant === 'ghost'     && 'text-muted-foreground/55 hover:text-muted-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Row 2: Primary metric + secondary stats ── */}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6 border-t border-[var(--border-inner)] pt-5">

          {/* Primary: Monthly revenue */}
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground/50">
              إجمالي المبيعات — هذا الشهر
            </p>
            <div className="flex items-baseline gap-2">
              <span className="pb-1 text-[11px] font-semibold leading-none text-muted-foreground/38 select-none">
                IQD
              </span>
              <span className="money text-[2.25rem] font-bold leading-none tracking-tight text-foreground">
                {stats ? formatNumber(revenue) : '—'}
              </span>
            </div>
            {stats && profit > 0 && (
              <p className="mt-2 text-[12px] text-muted-foreground/50">
                صافي الربح:
                <span className="ms-1.5 font-semibold text-emerald-400">
                  {formatNumber(profit)} IQD
                </span>
              </p>
            )}
          </div>

          {/* Secondary stats */}
          <div className="flex shrink-0 items-end gap-7">
            <CommandStat
              label="مبيعات مكتملة"
              value={stats ? formatNumber(salesCount) : '—'}
              unit="صفقة"
            />
            <CommandStat
              label="متاح للبيع"
              value={stats ? formatNumber(fleetCount) : '—'}
              unit="سيارة"
            />
            {urgentCount > 0 && (
              <CommandStat
                label="أقساط متأخرة"
                value={String(urgentCount)}
                unit="قسط"
                alert
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
