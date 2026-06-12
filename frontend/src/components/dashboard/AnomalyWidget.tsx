'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ShieldAlert, Zap, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { get } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardWidget } from './DashboardWidget'

interface Anomaly {
  type:      string
  severity:  'high' | 'warning' | 'info'
  title:     string
  body:      string
  link?:     string
  date?:     string
}

interface AnomalyResponse {
  anomalies: Anomaly[]
  count:     number
}

function SevIcon({ s }: { s: string }) {
  if (s === 'high')    return <ShieldAlert  className="h-3.5 w-3.5 text-rose-400 shrink-0"  />
  if (s === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
  return <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
}

const SEV_ACCENT: Record<string, string> = {
  high:    'border-s-rose-500',
  warning: 'border-s-amber-400',
  info:    'border-s-cyan-400',
}

export function AnomalyWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn:  () => get<AnomalyResponse>('/reports/anomalies'),
    staleTime: 300_000,
    retry: 1,
  })

  const countBadge = data && data.count > 0 ? (
    <span className="rounded-full border border-rose-500/25 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-400">
      {data.count}
    </span>
  ) : undefined

  return (
    <DashboardWidget
      title="كشف الشذوذ"
      subtitle="معاملات غير معتادة تستحق المراجعة"
      icon={ShieldAlert}
      iconColor="text-amber-400"
      action={countBadge}
      noPadding
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !data || data.count === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <CheckCircle2 className="h-7 w-7 text-emerald-400/50" />
          <p className="text-xs text-muted-foreground">لا توجد شذوذات — كل المعاملات طبيعية</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {data.anomalies.map((a, i) => {
            const inner = (
              <div className={cn(
                'group flex items-start gap-3 px-4 py-3 border-s-2 transition-colors hover:bg-secondary/40',
                SEV_ACCENT[a.severity] ?? 'border-s-cyan-400'
              )}>
                <SevIcon s={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80 leading-relaxed">{a.body}</p>
                </div>
                {a.link && (
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5 rtl:rotate-180" />
                )}
              </div>
            )
            return a.link
              ? <Link key={i} href={a.link}>{inner}</Link>
              : <div key={i}>{inner}</div>
          })}
        </div>
      )}
    </DashboardWidget>
  )
}
