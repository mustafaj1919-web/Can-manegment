'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, Info, RefreshCw,
  ShieldAlert, Sparkles, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { get } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardWidget } from './DashboardWidget'

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface SmartAlert {
  type:         string
  severity:     'critical' | 'high' | 'warning' | 'info'
  title:        string
  body:         string
  link?:        string
  count?:       number
  days_overdue?: number
  amount?:      number
  currency?:    string
}

interface SmartAlertsResponse {
  alerts: SmartAlert[]
  counts: {
    total:    number
    critical: number
    high:     number
    warning:  number
    info:     number
  }
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-rose-500',
  high:     'bg-orange-400',
  warning:  'bg-amber-400',
  info:     'bg-cyan-400',
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'critical') return <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0"   />
  if (severity === 'high')     return <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
  if (severity === 'warning')  return <Zap className="h-4 w-4 text-amber-400 shrink-0"           />
  return <Info className="h-4 w-4 text-cyan-400 shrink-0" />
}

async function fetchSmartAlerts(): Promise<SmartAlertsResponse> {
  return get<SmartAlertsResponse>('/smart-alerts')
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function SmartAlertsWidget() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn:  fetchSmartAlerts,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  const alerts = data?.alerts ?? []
  const counts = data?.counts

  const subtitle = counts?.total
    ? `${counts.total} تنبيه${counts.critical > 0 ? ` · ${counts.critical} حرج` : ''}`
    : undefined

  const refreshBtn = (
    <button
      type="button"
      onClick={() => refetch()}
      disabled={isFetching}
      aria-label="تحديث التنبيهات"
      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-secondary/70 hover:text-muted-foreground transition-colors"
    >
      <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
    </button>
  )

  return (
    <DashboardWidget
      title="مركز التنبيهات الذكية"
      subtitle={subtitle}
      icon={Sparkles}
      iconColor="text-violet-400"
      action={refreshBtn}
      noPadding
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="px-5 py-8 text-center text-xs text-muted-foreground">
          تعذر تحميل التنبيهات
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-8">
          <CheckCircle2 className="h-8 w-8 text-emerald-400/50" />
          <p className="text-sm font-medium text-emerald-400">كل شيء على ما يرام</p>
          <p className="text-xs text-muted-foreground">لا توجد تنبيهات تحتاج انتباهاً</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30 max-h-[420px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {alerts.map((alert, i) => {
              const inner = (
                <motion.div
                  key={`${alert.type}-${i}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/40',
                    alert.link && 'cursor-pointer'
                  )}
                >
                  {/* Severity dot */}
                  <div className="mt-1.5 shrink-0">
                    <span className={cn('block h-2 w-2 rounded-full', SEVERITY_DOT[alert.severity] ?? 'bg-slate-500')} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-snug">{alert.title}</p>
                      <SeverityIcon severity={alert.severity} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80 leading-relaxed">{alert.body}</p>
                  </div>

                  {/* Arrow */}
                  {alert.link && (
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-0.5 rtl:rotate-180" />
                  )}
                </motion.div>
              )

              return alert.link ? (
                <Link key={`${alert.type}-${i}`} href={alert.link}>{inner}</Link>
              ) : (
                <div key={`${alert.type}-${i}`}>{inner}</div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="border-t border-border/30 px-5 py-2.5">
          <p className="text-[10px] text-muted-foreground/50">
            يحدّث كل دقيقتين تلقائياً
          </p>
        </div>
      )}
    </DashboardWidget>
  )
}
