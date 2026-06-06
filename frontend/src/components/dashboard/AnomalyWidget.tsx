'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ShieldAlert, Zap, ChevronLeft } from 'lucide-react'
import { get } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'

interface Anomaly {
  type: string
  severity: 'high' | 'warning' | 'info'
  title: string
  body: string
  link?: string
  date?: string
}

interface AnomalyResponse {
  anomalies: Anomaly[]
  count: number
}

const SEV_STYLE: Record<string, string> = {
  high:    'border-rose-500/25 bg-rose-500/[0.06]',
  warning: 'border-amber-500/25 bg-amber-500/[0.06]',
  info:    'border-cyan-500/20 bg-cyan-500/[0.04]',
}

function SevIcon({ s }: { s: string }) {
  if (s === 'high')    return <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
  if (s === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
  return <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
}

export function AnomalyWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => get<AnomalyResponse>('/reports/anomalies'),
    staleTime: 300_000,
    retry: 1,
  })

  return (
    <div className="dash-card overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">كشف الشذوذ</h2>
            <p className="text-[10px] text-muted-foreground">معاملات غير معتادة تستحق المراجعة</p>
          </div>
        </div>
        {data && data.count > 0 && (
          <span className="rounded-full bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 text-[11px] font-bold text-rose-300">
            {data.count}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : !data || data.count === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <CheckCircle2 className="h-7 w-7 text-emerald-400/50" />
          <p className="text-xs text-muted-foreground">لا توجد شذوذات — كل المعاملات طبيعية</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {data.anomalies.map((a, i) => {
            const inner = (
              <div className={`flex items-start gap-3 px-4 py-3 border-r-2 ${a.severity === 'high' ? 'border-rose-500' : a.severity === 'warning' ? 'border-amber-400' : 'border-cyan-400'} group hover:bg-white/[0.025] transition-colors`}>
                <SevIcon s={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80 leading-relaxed">{a.body}</p>
                </div>
                {a.link && <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-0.5 rtl:rotate-180" />}
              </div>
            )
            return a.link
              ? <Link key={i} href={a.link}>{inner}</Link>
              : <div key={i}>{inner}</div>
          })}
        </div>
      )}
    </div>
  )
}
