'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, ExternalLink, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber } from '@/lib/utils'
import { getDashboardStats } from '@/lib/api/dashboard'

function AnimatedNumber({ value }: { value: number }) {
  const ref      = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el || value === previous.current) return
    const start     = previous.current
    const startedAt = performance.now()
    const duration  = 900

    const tick = (now: number) => {
      const p     = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      el.textContent = formatNumber(Math.round(start + (value - start) * eased))
      if (p < 1) requestAnimationFrame(tick)
      else previous.current = value
    }
    requestAnimationFrame(tick)
  }, [value])

  return <span ref={ref}>{formatNumber(value)}</span>
}

const SPARKS: Record<string, string> = {
  revenue: 'M0,18 C8,14 14,9 22,11 C30,13 36,6 44,8 C52,10 56,3 64,4',
  sales:   'M0,20 C8,17 14,12 22,9 C30,6 36,10 44,7 C52,4 56,8 64,5',
  fleet:   'M0,14 C8,16 14,18 22,15 C30,12 36,14 44,11 C52,8 56,12 64,9',
  overdue: 'M0,8 C8,11 14,14 22,16 C30,18 36,16 44,19 C52,20 56,18 64,21',
}

function Sparkline({ id, color, wide = false }: { id: string; color: string; wide?: boolean }) {
  const d      = SPARKS[id] ?? SPARKS.sales
  const gradId = wide ? `sg-${id}-w` : `sg-${id}`

  if (wide) {
    return (
      <svg
        width="100%"
        height="38"
        viewBox="0 0 64 24"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
        className="opacity-55 block w-full"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L64,24 L0,24 Z`} fill={`url(#${gradId})`} />
        <path
          d={d}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  return (
    <svg width="56" height="22" viewBox="0 0 64 24" fill="none" aria-hidden className="opacity-45 shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L64,24 L0,24 Z`} fill={`url(#${gradId})`} />
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

interface KpiDef {
  id: string
  label: string
  sub: string
  href: string
  icon: React.ElementType
  iconColor: string
  valueColor: string
  sparkColor: string
  isMonetary?: boolean
  isAlert?: boolean
}

const REVENUE_DEF: KpiDef = {
  id: 'revenue', href: '/sales',
  label: 'إجمالي الإيرادات', sub: 'مجموع مبالغ البيع',
  icon: Wallet,
  iconColor: 'text-amber-400', valueColor: 'text-amber-300',
  sparkColor: '#d4a44c',
  isMonetary: true,
}

const SECONDARY_DEFS: KpiDef[] = [
  {
    id: 'sales', href: '/sales',
    label: 'فواتير المبيعات', sub: 'إجمالي صفقات البيع',
    icon: TrendingUp,
    iconColor: 'text-emerald-400', valueColor: 'text-emerald-300',
    sparkColor: '#10b981',
  },
  {
    id: 'fleet', href: '/inventory',
    label: 'السيارات المتاحة', sub: 'جاهزة للبيع الآن',
    icon: Car,
    iconColor: 'text-cyan-400', valueColor: 'text-cyan-300',
    sparkColor: '#22d3ee',
  },
  {
    id: 'overdue', href: '/installments',
    label: 'أقساط متأخرة', sub: 'تتطلب متابعة فورية',
    icon: AlertTriangle,
    iconColor: 'text-rose-400', valueColor: 'text-rose-300',
    sparkColor: '#ef4444',
    isAlert: true,
  },
]

function KpiPrimaryCard({ def, value, index }: { def: KpiDef; value: number; index: number }) {
  const Icon = def.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-full"
    >
      <Link href={def.href} className="kpi-primary-card group relative flex h-full flex-col p-5 transition-colors duration-200">

        {/* Label row */}
        <div className="mb-4 flex items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', def.iconColor)} />
          <p className="text-[12px] font-semibold text-muted-foreground">{def.label}</p>
        </div>

        {/* Value */}
        <div className="flex-1">
          {def.isMonetary && (
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/38 leading-none select-none">
              IQD
            </p>
          )}
          <p className={cn('money text-[2rem] font-bold leading-none tracking-tight', def.valueColor)}>
            <AnimatedNumber value={value} />
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/50">{def.sub}</p>
        </div>

        {/* Full-width sparkline */}
        <div className="mt-4 overflow-hidden rounded">
          <Sparkline id={def.id} color={def.sparkColor} wide />
        </div>

        {/* Hover link */}
        <p className="mt-3 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/35 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <ExternalLink className="h-2.5 w-2.5" />
          عرض التفاصيل
        </p>
      </Link>
    </motion.div>
  )
}

function KpiSecondaryCard({ def, value, index }: { def: KpiDef; value: number; index: number }) {
  const Icon  = def.icon
  const alert = def.isAlert && value > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        href={def.href}
        className={cn(
          'dash-card group relative block p-4 transition-colors duration-200',
          alert && 'border-rose-500/20 hover:border-rose-500/35',
        )}
      >
        {/* Label */}
        <div className="mb-3 flex items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5 shrink-0', def.iconColor)} />
          <p className="text-xs font-medium leading-none text-muted-foreground">{def.label}</p>
          {alert && (
            <span className="relative ms-auto flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
          )}
        </div>

        {/* Value + mini sparkline */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className={cn('money text-[1.5rem] font-bold leading-none tracking-tight', def.valueColor)}>
              <AnimatedNumber value={value} />
            </p>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground/50">{def.sub}</p>
          </div>
          <Sparkline id={def.id} color={def.sparkColor} />
        </div>

        {/* Hover link */}
        <p className="mt-2.5 flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/35 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <ExternalLink className="h-2.5 w-2.5" />
          عرض التفاصيل
        </p>
      </Link>
    </motion.div>
  )
}

function PrimaryCardSkeleton() {
  return (
    <div className="kpi-primary-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-28 rounded" />
      </div>
      <Skeleton className="h-9 w-36 rounded" />
      <Skeleton className="h-2.5 w-20 rounded" />
      <Skeleton className="h-9 w-full rounded mt-4" />
    </div>
  )
}

function SecondaryCardSkeleton() {
  return (
    <div className="dash-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-7 w-24 rounded" />
      <Skeleton className="h-2 w-16 rounded" />
    </div>
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4"><PrimaryCardSkeleton /></div>
        <div className="xl:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SecondaryCardSkeleton />
          <SecondaryCardSkeleton />
          <SecondaryCardSkeleton />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="dash-card flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-rose-400">تعذر تحميل الإحصائيات</p>
          <p className="mt-0.5 text-xs text-muted-foreground">تحقق من تشغيل الخادم</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const values = {
    revenue: data?.total_sales_amount   ?? 0,
    sales:   data?.sales                ?? 0,
    fleet:   data?.available_cars       ?? 0,
    overdue: data?.overdue_installments ?? 0,
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <KpiPrimaryCard def={REVENUE_DEF} value={values.revenue} index={0} />
      </div>
      <div className="xl:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SECONDARY_DEFS.map((def, i) => (
          <KpiSecondaryCard
            key={def.id}
            def={def}
            value={values[def.id as keyof typeof values]}
            index={i + 1}
          />
        ))}
      </div>
    </div>
  )
}
