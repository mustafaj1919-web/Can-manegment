'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber } from '@/lib/utils'
import { getDashboardStats } from '@/lib/api/dashboard'

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)

  useEffect(() => {
    const element = ref.current
    if (!element || value === previous.current) return

    const start = previous.current
    const duration = 800
    const startedAt = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      element.textContent = prefix + formatNumber(Math.round(start + (value - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else previous.current = value
    }

    requestAnimationFrame(tick)
  }, [value, prefix])

  return <span ref={ref}>{prefix}{formatNumber(value)}</span>
}

const SPARKS: Record<string, string> = {
  revenue: 'M0,18 C8,14 14,9 22,11 C30,13 36,6 44,8 C52,10 56,3 64,4',
  sales: 'M0,20 C8,17 14,12 22,9 C30,6 36,10 44,7 C52,4 56,8 64,5',
  fleet: 'M0,14 C8,16 14,18 22,15 C30,12 36,14 44,11 C52,8 56,12 64,9',
  overdue: 'M0,8 C8,11 14,14 22,16 C30,18 36,16 44,19 C52,20 56,18 64,21',
}

function Sparkline({ id, color }: { id: string; color: string }) {
  const d = SPARKS[id] ?? SPARKS.sales
  return (
    <svg width="60" height="22" viewBox="0 0 64 24" fill="none" aria-hidden className="opacity-25">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L64,24 L0,24 Z`} fill={`url(#sg-${id})`} />
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

interface KpiDef {
  id: string
  label: string
  sub: string
  icon: React.ElementType
  iconColor: string
  valueColor: string
  accentShadow: string
  sparkColor: string
  isMonetary?: boolean
  isAlert?: boolean
}

const CARDS: KpiDef[] = [
  {
    id: 'revenue',
    label: 'إجمالي الإيرادات',
    sub: 'مجموع مبالغ المبيعات',
    icon: Wallet,
    iconColor: 'text-amber-400',
    valueColor: 'text-amber-400',
    accentShadow: 'kpi-accent-gold',
    sparkColor: '#d4a44c',
    isMonetary: true,
  },
  {
    id: 'sales',
    label: 'فواتير المبيعات',
    sub: 'إجمالي صفقات البيع',
    icon: TrendingUp,
    iconColor: 'text-emerald-400',
    valueColor: 'text-emerald-400',
    accentShadow: 'kpi-accent-emerald',
    sparkColor: '#10b981',
  },
  {
    id: 'fleet',
    label: 'السيارات المتاحة',
    sub: 'جاهزة للبيع الآن',
    icon: Car,
    iconColor: 'text-cyan-400',
    valueColor: 'text-cyan-400',
    accentShadow: 'kpi-accent-cyan',
    sparkColor: '#22d3ee',
  },
  {
    id: 'overdue',
    label: 'أقساط متأخرة',
    sub: 'تتطلب متابعة فورية',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    valueColor: 'text-red-400',
    accentShadow: 'kpi-accent-red',
    sparkColor: '#cc2118',
    isAlert: true,
  },
]

function KpiSkeleton() {
  return (
    <div className="dash-card space-y-3 p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <Skeleton className="h-7 w-28 rounded" />
      <div className="flex items-end justify-between">
        <Skeleton className="h-2.5 w-20 rounded" />
        <Skeleton className="h-5 w-14 rounded" />
      </div>
    </div>
  )
}

function KpiCard({ def, value, index }: { def: KpiDef; value: number; index: number }) {
  const Icon = def.icon
  const alert = def.isAlert && value > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('dash-card relative cursor-default p-4 transition-all duration-200 hover:-translate-y-0.5', def.accentShadow)}
      style={{ boxShadow: alert ? 'inset 0 1px 0 rgba(204,33,24,0.65), 0 1px 3px rgba(0,0,0,0.35)' : undefined }}
    >
      <div className="pointer-events-none absolute -bottom-6 -end-6 h-20 w-20 rounded-full opacity-[0.08] blur-2xl" style={{ background: def.sparkColor }} />

      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="flex-1 text-[11px] font-medium leading-relaxed text-muted-foreground">{def.label}</p>
        <div className="dash-icon-well shrink-0 transition-transform duration-200 hover:scale-110">
          {alert ? (
            <div className="relative flex items-center justify-center">
              <AlertTriangle className={cn('h-3.5 w-3.5', def.iconColor)} />
              <span className="absolute inset-0 animate-ping rounded opacity-60" style={{ background: def.sparkColor, animationDuration: '2s' }} />
            </div>
          ) : (
            <Icon className={cn('h-3.5 w-3.5', def.iconColor)} />
          )}
        </div>
      </div>

      {def.isMonetary ? (
        <div className={cn('mb-3 leading-tight', def.valueColor)}>
          <span className="me-1 text-[10px] font-medium opacity-60">IQD</span>
          <span className="money text-xl font-black"><AnimatedNumber value={value} /></span>
        </div>
      ) : (
        <div className={cn('money mb-3 text-3xl font-black leading-tight', def.valueColor)}>
          <AnimatedNumber value={value} />
        </div>
      )}

      <div className="flex items-end justify-between gap-2">
        <p className="text-[10px] leading-tight text-muted-foreground/70">{def.sub}</p>
        <Sparkline id={def.id} color={def.sparkColor} />
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
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="dash-card mb-4 flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-red-400">تعذر تحميل الإحصائيات</p>
          <p className="mt-0.5 text-xs text-muted-foreground">تحقق من تشغيل الخادم</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <RefreshCw className="h-3 w-3" />
          إعادة
        </button>
      </div>
    )
  }

  const values = {
    revenue: data?.total_sales_amount ?? 0,
    sales: data?.sales ?? 0,
    fleet: data?.available_cars ?? 0,
    overdue: data?.overdue_installments ?? 0,
  }

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {CARDS.map((def, i) => (
        <KpiCard key={def.id} def={def} value={values[def.id as keyof typeof values]} index={i} />
      ))}
    </div>
  )
}
