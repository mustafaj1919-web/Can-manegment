'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber } from '@/lib/utils'
import { getDashboardStats } from '@/lib/api/dashboard'

/* ─── Animated number counter ────────────────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const ref  = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)
  const rm   = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || value === prev.current) return
    if (rm) { el.textContent = formatNumber(value); prev.current = value; return }
    const start = prev.current
    const t0    = performance.now()
    const dur   = 900
    const tick  = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      el.textContent = formatNumber(Math.round(start + (value - start) * e))
      if (p < 1) requestAnimationFrame(tick)
      else prev.current = value
    }
    requestAnimationFrame(tick)
  }, [value, rm])

  return <span ref={ref}>{formatNumber(value)}</span>
}

/* ─── Full-width sparkline ───────────────────────────────────────────────── */
const PATHS: Record<string, string> = {
  revenue: 'M0,18 C8,14 14,9 22,11 C30,13 36,6 44,8 C52,10 56,3 64,4',
  sales:   'M0,20 C8,17 14,12 22,9 C30,6 36,10 44,7 C52,4 56,8 64,5',
  fleet:   'M0,14 C8,16 14,18 22,15 C30,12 36,14 44,11 C52,8 56,12 64,9',
  overdue: 'M0,8 C8,11 14,14 22,16 C30,18 36,16 44,19 C52,20 56,18 64,21',
}

function SparklineFull({ id, color }: { id: string; color: string }) {
  const d   = PATHS[id] ?? PATHS.sales
  const gid = `sg-kpi-${id}`
  return (
    <svg
      width="100%"
      height="40"
      viewBox="0 0 64 24"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      className="block w-full"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.40" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${d} L64,24 L0,24 Z`} fill={`url(#${gid})`} />
      <path
        d={d}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ─── Animation variants ─────────────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
}
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
}

/* ─── Card definition ────────────────────────────────────────────────────── */
interface KpiCardDef {
  id:           string
  label:        string
  sublabel:     string
  href:         string
  icon:         React.ElementType
  iconColor:    string
  iconBg:       string
  accentBg:     string
  hoverShadow:  string
  sparkColor:   string
  value:        number
  currency?:    string
  isAlert?:     boolean
}

/* ─── Single card ────────────────────────────────────────────────────────── */
function KpiCard({
  id, label, sublabel, href, icon: Icon, iconColor, iconBg,
  accentBg, hoverShadow, sparkColor, value, currency, isAlert,
}: KpiCardDef) {
  const alertMode = isAlert && value > 0

  return (
    <motion.div variants={cardVariants} className="h-full">
      <Link
        href={href}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-xl border transition-all duration-200',
          'bg-[var(--s1)]',
          alertMode
            ? 'border-rose-500/25 hover:border-rose-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/[0.08]'
            : cn(
                'border-[var(--border-card)] hover:border-[hsl(var(--primary)/0.22)]',
                'hover:-translate-y-0.5 hover:shadow-lg',
                hoverShadow,
              ),
        )}
      >
        {/* Colored accent strip */}
        <div
          className={cn(
            'h-[3px] w-full shrink-0',
            alertMode ? 'bg-rose-600 dark:bg-rose-500' : accentBg,
          )}
        />

        {/* Card body */}
        <div className="flex flex-1 flex-col p-5">
          {/* Icon + label */}
          <div className="mb-4 flex items-center gap-2.5">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
              alertMode ? 'border-rose-500/20 bg-rose-500/10' : iconBg,
            )}>
              <Icon className={cn('h-4 w-4', alertMode ? 'text-rose-600 dark:text-rose-400' : iconColor)} />
            </div>
            <p className="text-[11px] font-semibold leading-tight text-muted-foreground">
              {label}
            </p>
            {alertMode && (
              <span className="relative ms-auto flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            )}
          </div>

          {/* Value */}
          <div className="flex-1">
            {currency && (
              <p className="mb-1 font-code text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/35 leading-none">
                {currency}
              </p>
            )}
            <p className={cn(
              'font-numeric text-[2rem] font-black leading-none tracking-tight',
              alertMode ? 'text-rose-600 dark:text-rose-300' : 'text-foreground',
            )}>
              <AnimatedNumber value={value} />
            </p>
            <p className="mt-2 text-[11px] leading-tight text-muted-foreground/50">
              {sublabel}
            </p>
          </div>
        </div>

        {/* Sparkline footer */}
        <div className="overflow-hidden opacity-60 transition-opacity duration-200 group-hover:opacity-80">
          <SparklineFull id={id} color={alertMode ? '#dc2626' : sparkColor} />
        </div>
      </Link>
    </motion.div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border-card)] bg-[var(--s1)]">
      <div className="h-[3px] w-full shrink-0 bg-[var(--border-card)]" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-7 rounded" />
          <Skeleton className="h-8 w-28 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      <Skeleton className="h-10 rounded-none" />
    </div>
  )
}

/* ─── Export ─────────────────────────────────────────────────────────────── */
export function KpiCards() {
  const rm = useReducedMotion()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  getDashboardStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-card)] bg-[var(--s1)] p-4">
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

  const cards: KpiCardDef[] = [
    {
      id:          'revenue',
      label:       'إجمالي الإيرادات',
      sublabel:    'مجموع مبالغ البيع',
      href:        '/sales',
      icon:        Wallet,
      iconBg:      'bg-primary/10 border-primary/20 dark:bg-red-500/10 dark:border-red-500/20',
      iconColor:   'text-primary dark:text-red-400',
      accentBg:    'bg-[hsl(var(--primary))]',
      hoverShadow: 'hover:shadow-primary/[0.04] dark:hover:shadow-red-500/[0.08]',
      sparkColor:  'hsl(var(--primary))',
      value:       data?.total_sales_amount ?? 0,
      currency:    'IQD',
    },
    {
      id:          'sales',
      label:       'فواتير المبيعات',
      sublabel:    'إجمالي صفقات البيع',
      href:        '/sales',
      icon:        TrendingUp,
      iconBg:      'bg-emerald-500/10 border-emerald-500/20',
      iconColor:   'text-emerald-600 dark:text-emerald-400',
      accentBg:    'bg-emerald-600 dark:bg-emerald-500',
      hoverShadow: 'hover:shadow-emerald-500/[0.04] dark:hover:shadow-emerald-500/[0.07]',
      sparkColor:  '#16a34a',
      value:       data?.sales ?? 0,
    },
    {
      id:          'fleet',
      label:       'السيارات المتاحة',
      sublabel:    'جاهزة للبيع الآن',
      href:        '/inventory',
      icon:        Car,
      iconBg:      'bg-amber-500/10 border-amber-500/20',
      iconColor:   'text-amber-600 dark:text-amber-400',
      accentBg:    'bg-amber-600 dark:bg-amber-500',
      hoverShadow: 'hover:shadow-amber-500/[0.04] dark:hover:shadow-amber-500/[0.07]',
      sparkColor:  '#d97706',
      value:       data?.available_cars ?? 0,
    },
    {
      id:          'overdue',
      label:       'أقساط متأخرة',
      sublabel:    'تتطلب متابعة فورية',
      href:        '/installments',
      icon:        AlertTriangle,
      iconBg:      'bg-rose-500/10 border-rose-500/15',
      iconColor:   'text-rose-600 dark:text-rose-400',
      accentBg:    'bg-rose-600 dark:bg-rose-500',
      hoverShadow: 'hover:shadow-rose-500/[0.04] dark:hover:shadow-rose-500/[0.08]',
      sparkColor:  '#dc2626',
      value:       data?.overdue_installments ?? 0,
      isAlert:     true,
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      variants={rm ? undefined : containerVariants}
      initial={rm ? undefined : 'hidden'}
      animate={rm ? undefined : 'show'}
    >
      {cards.map((def) => <KpiCard key={def.id} {...def} />)}
    </motion.div>
  )
}
