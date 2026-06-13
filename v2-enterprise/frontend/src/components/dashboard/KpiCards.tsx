'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, RefreshCw, TrendingUp, Wallet, ArrowUpLeft } from 'lucide-react'
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
}

const GRADIENTS = {
  red: 'bg-gradient-to-br from-[#e63946] to-[#e63946]/20 border border-[#e63946]/30 text-white',
  emerald: 'bg-gradient-to-br from-[#10b981] to-[#10b981]/20 border border-[#10b981]/30 text-[#10b981]',
  amber: 'bg-gradient-to-br from-[#f4a522] to-[#f4a522]/20 border border-[#f4a522]/30 text-[#f4a522]',
  blue: 'bg-gradient-to-br from-[#e63946] to-[#e63946]/20 border border-[#e63946]/30 text-white',
}

const BORDERS = {
  red: 'border-s-[#e63946]',
  emerald: 'border-s-[#10b981]',
  amber: 'border-s-[#f4a522]',
  blue: 'border-s-[#e63946]',
}

function KpiCard({ label, value, note, href, icon: Icon, tone, critical, rawNumber, formatNumber: fmt }: KpiCardProps) {
  const animated = useCountUp({ end: rawNumber ?? 0, duration: 1000, enabled: rawNumber !== undefined })
  const displayValue = rawNumber !== undefined && fmt ? fmt(animated) : value
  return (
    <Link
      href={href}
      className={cn(
        'group relative min-h-[148px] overflow-hidden rounded-xl border border-border-default border-s-[3px] bg-bg-surface/60 backdrop-blur-md p-5 transition-all duration-200 ease-out',
        BORDERS[tone],
        critical ? 'hover:border-rose-500/50' : 'hover:border-border-strong',
        'hover:bg-bg-surface hover:scale-[1.01] shadow-sm hover:shadow-md'
      )}
    >
      {/* Top Gradient Overlay Line */}
      <div className={cn(
        "absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/20 to-transparent",
        tone === 'red' && "via-[#e63946]/25",
        tone === 'emerald' && "via-[#10b981]/25",
        tone === 'amber' && "via-[#f4a522]/25",
        tone === 'blue' && "via-[#e63946]/25"
      )} />

      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', GRADIENTS[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {tone === 'red' && (
          <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 border border-rose-500/20 text-[9px] font-black text-rose-500 uppercase tracking-wider animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>مخاطر عالية</span>
          </div>
        )}
        <ArrowUpLeft className={cn(
          "h-4 w-4 transition-all group-hover:-translate-x-0.5 group-hover:-translate-y-0.5",
          tone === 'emerald' && "text-[#10b981]/40 group-hover:text-[#10b981]",
          tone === 'red' && "text-rose-500/40 group-hover:text-rose-500",
          tone === 'amber' && "text-[#f4a522]/40 group-hover:text-[#f4a522]",
          tone === 'blue' && "text-[#e63946]/40 group-hover:text-[#e63946]"
        )} />
      </div>
      <div className="mt-5">
        <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
        <p className={cn('mt-1.5 text-[40px] font-black font-numeric leading-none tracking-tight text-white', critical && 'text-[#e63946]')}>
          {displayValue}
        </p>
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground/75">{note}</p>
        
        {/* RevAuto Engine Progress Meter */}
        <div className="mt-4 w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              tone === 'red' && "bg-[#e63946] shadow-[0_0_8px_#e63946]",
              tone === 'emerald' && "bg-[#10b981] shadow-[0_0_8px_#10b981]",
              tone === 'amber' && "bg-[#f4a522] shadow-[0_0_8px_#f4a522]",
              tone === 'blue' && "bg-[#e63946] shadow-[0_0_8px_#e63946]"
            )}
            style={{ width: tone === 'red' ? '25%' : tone === 'emerald' ? '75%' : tone === 'amber' ? '50%' : '65%' }}
          />
        </div>
      </div>
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="min-h-[154px] rounded-xl border border-border-subtle bg-bg-surface/60 backdrop-blur-md p-5">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-5 h-3 w-24 rounded" />
      <Skeleton className="mt-2 h-7 w-32 rounded" />
      <Skeleton className="mt-2 h-3 w-36 rounded" />
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
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}
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
  const cards: KpiCardProps[] = [
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
      {cards.map((card) => <KpiCard key={card.label} {...card} />)}
    </div>
  )
}
