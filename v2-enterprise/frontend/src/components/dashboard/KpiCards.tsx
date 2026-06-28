'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, RefreshCw, TrendingUp, Wallet, ArrowUpLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getDashboardStats } from '@/lib/api/dashboard'
import { useCountUp } from '@/hooks/useCountUp'

interface KpiCardProps {
  label: string
  value: string
  note: string
  href: string
  icon: React.ElementType
  tone: 'red' | 'emerald' | 'amber' | 'blue'
  critical?: boolean
  rawNumber?: number
  formatNumber?: (n: number) => string
  index: number
}

const TONE = {
  red: {
    accent:    '#F43F5E', // Rose danger accent
    glow:      'rgba(244,63,94,0.02)',
    hoverGlow: 'rgba(244,63,94,0.08)',
    iconBg:    'rgba(244,63,94,0.08)',
    iconBorder:'rgba(244,63,94,0.15)',
    topLine:   'linear-gradient(90deg, transparent 0%, rgba(244,63,94,0.4) 50%, transparent 100%)',
    bottomFog: 'linear-gradient(to top, rgba(244,63,94,0.02) 0%, transparent 100%)',
    numColor:  '#F43F5E',
  },
  emerald: {
    accent:    '#10B981', // Emerald primary accent
    glow:      'rgba(16,185,129,0.02)',
    hoverGlow: 'rgba(16,185,129,0.08)',
    iconBg:    'rgba(16,185,129,0.08)',
    iconBorder:'rgba(16,185,129,0.15)',
    topLine:   'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.4) 50%, transparent 100%)',
    bottomFog: 'linear-gradient(to top, rgba(16,185,129,0.02) 0%, transparent 100%)',
    numColor:  '#10B981',
  },
  amber: {
    accent:    '#F59E0B', // Amber warning accent
    glow:      'rgba(245,158,11,0.02)',
    hoverGlow: 'rgba(245,158,11,0.08)',
    iconBg:    'rgba(245,158,11,0.08)',
    iconBorder:'rgba(245,158,11,0.15)',
    topLine:   'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 50%, transparent 100%)',
    bottomFog: 'linear-gradient(to top, rgba(245,158,11,0.02) 0%, transparent 100%)',
    numColor:  '#F59E0B',
  },
  blue: {
    accent:    '#2563EB', // Blue secondary accent
    glow:      'rgba(37,99,235,0.02)',
    hoverGlow: 'rgba(37,99,235,0.08)',
    iconBg:    'rgba(37,99,235,0.08)',
    iconBorder:'rgba(37,99,235,0.15)',
    topLine:   'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.4) 50%, transparent 100%)',
    bottomFog: 'linear-gradient(to top, rgba(37,99,235,0.02) 0%, transparent 100%)',
    numColor:  '#2563EB',
  },
}

function KpiCard({ label, value, note, href, icon: Icon, tone, critical, rawNumber, formatNumber: fmt, index }: KpiCardProps) {
  const animated = useCountUp({ end: rawNumber ?? 0, duration: 900, enabled: rawNumber !== undefined })
  const displayValue = rawNumber !== undefined && fmt ? fmt(animated) : value
  const t = TONE[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      <Link
        href={href}
        className="group relative flex min-h-[160px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-200"
        style={{
          boxShadow: `0 2px 8px rgba(0,0,0,0.01), 0 4px 16px ${t.glow}`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            `0 0 0 1px ${t.accent}20 inset, 0 8px 24px ${t.hoverGlow}`
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            `0 2px 8px rgba(0,0,0,0.01), 0 4px 16px ${t.glow}`
        }}
      >
        {/* Top shimmer line */}
        <div
          className="absolute inset-x-0 top-0 h-[1.5px]"
          style={{ background: t.topLine }}
        />

        {/* Bottom ambient fog */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: t.bottomFog }}
        />

        {/* Header: icon + arrow */}
        <div className="flex items-start justify-between">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: t.iconBg, border: `1px solid ${t.iconBorder}` }}
          >
            <Icon className="h-4.5 w-4.5" style={{ color: t.accent }} />
          </div>

          {critical && tone === 'red' && (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-500">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              تنبيه
            </div>
          )}
          {!critical && (
            <ArrowUpLeft
              className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:opacity-60 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
              style={{ color: t.accent }}
            />
          )}
        </div>

        {/* Label */}
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>

        {/* Big number — the hero */}
        <p
          className="mt-1 font-black leading-none tracking-tight transition-colors duration-200"
          style={{
            color: 'hsl(var(--foreground))',
            fontSize: 'clamp(28px, 3.5vw, 46px)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayValue}
        </p>

        {/* Note */}
        <p className="mt-auto pt-3 text-[10px] leading-relaxed text-muted-foreground/50">
          {note}
        </p>
      </Link>
    </motion.div>
  )
}

function CardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="min-h-[160px] rounded-2xl border border-border/50 bg-card p-5 space-y-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="mt-4 h-2.5 w-20 rounded" />
        <Skeleton className="mt-1 h-9 w-28 rounded" />
        <Skeleton className="mt-auto h-2 w-36 rounded" />
      </div>
    </motion.div>
  )
}

export function KpiCards() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} index={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
        <div>
          <p className="text-sm font-bold text-rose-600">تعذر تحميل مؤشرات الإدارة</p>
          <p className="mt-1 text-xs text-muted-foreground">تحقق من اتصال الخادم ثم أعد المحاولة.</p>
        </div>
        <button type="button" onClick={() => refetch()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold">
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const overdue = data?.overdue_installments ?? 0
  const cards: Omit<KpiCardProps, 'index'>[] = [
    {
      label: 'السيارات المتاحة',
      value: `${data?.available_cars ?? 0}`,
      rawNumber: data?.available_cars ?? 0,
      formatNumber: (n) => `${Math.round(n)}`,
      note: `قيمة المخزون المتاح: ${formatMoney(data?.inventory_value ?? 0, 'IQD')}`,
      href: '/inventory',
      icon: Car,
      tone: 'amber',
    },
    {
      label: 'تحصيلات الشهر',
      value: formatMoney(data?.monthly_sales_paid ?? 0, 'IQD'),
      rawNumber: data?.monthly_sales_paid ?? 0,
      formatNumber: (n) => formatMoney(n, 'IQD'),
      note: `${data?.cars_sold_month ?? 0} سيارة مباعة خلال الشهر الحالي`,
      href: '/sales',
      icon: TrendingUp,
      tone: 'emerald',
    },
    {
      label: 'الذمم المدينة',
      value: formatMoney(data?.receivables ?? 0, 'IQD'),
      rawNumber: data?.receivables ?? 0,
      formatNumber: (n) => formatMoney(n, 'IQD'),
      note: `${data?.installments ?? 0} خطة تقسيط نشطة قيد التحصيل`,
      href: '/installments',
      icon: Wallet,
      tone: 'blue',
    },
    {
      label: 'أقساط تحتاج متابعة',
      value: `${overdue}`,
      rawNumber: overdue,
      formatNumber: (n) => `${Math.round(n)}`,
      note: `متأخرات بقيمة ${formatMoney(data?.overdue_amount ?? 0, 'IQD')}`,
      href: '/installments?filter=overdue',
      icon: AlertTriangle,
      tone: 'red',
      critical: overdue > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((card, i) => <KpiCard key={card.label} {...card} index={i} />)}
    </div>
  )
}
