'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, AlertCircle, Info, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSmartAlerts, type SmartAlert } from '@/lib/api/accounting'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const SEVERITY_STYLES = {
  error:   { card: 'border-rose-500/20 bg-rose-500/5',   icon: 'text-rose-400',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',   Icon: AlertCircle },
  warning: { card: 'border-amber-500/20 bg-amber-500/5', icon: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', Icon: AlertTriangle },
  info:    { card: 'border-blue-500/20 bg-blue-500/5',   icon: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    Icon: Info },
}

function AlertCard({ alert }: { alert: SmartAlert }) {
  const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
  const { Icon } = style
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3.5', style.card)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.icon)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{alert.title}</p>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', style.badge)}>
            {alert.category}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
      </div>
    </div>
  )
}

export function SmartAlertsPanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn: () => getSmartAlerts(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // كل 5 دقائق
  })

  const alerts = data?.alerts ?? []
  const errorCount = alerts.filter(a => a.severity === 'error').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length

  if (isLoading) return (
    <div className="space-y-2">
      {[0,1].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">التنبيهات الذكية</p>
          {alerts.length > 0 && (
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {warningCount}
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-7 gap-1.5 text-xs">
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">لا توجد تنبيهات — كل شيء على ما يرام</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(compact ? alerts.slice(0, 3) : alerts).map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
          {compact && alerts.length > 3 && (
            <p className="text-center text-xs text-muted-foreground">{alerts.length - 3} تنبيهات أخرى</p>
          )}
        </div>
      )}
    </div>
  )
}
