'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity, Car, Users, TrendingUp, ShoppingBag, Receipt, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatRelativeDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getNotifications } from '@/lib/api/dashboard'
import { DashboardWidget } from './DashboardWidget'

const META: Record<string, { icon: React.ElementType; color: string }> = {
  car:      { icon: Car,         color: 'text-slate-400'   },
  sale:     { icon: TrendingUp,  color: 'text-emerald-400' },
  customer: { icon: Users,       color: 'text-slate-400'   },
  purchase: { icon: ShoppingBag, color: 'text-slate-400'   },
  expense:  { icon: Receipt,     color: 'text-red-400'     },
  settings: { icon: Settings,    color: 'text-slate-500'   },
}

const ACTION_AR: Record<string, string> = {
  create:'إضافة', add:'إضافة', update:'تعديل', edit:'تعديل',
  delete:'حذف', login:'دخول', logout:'خروج', sell:'بيع',
  cancel:'إلغاء', payment:'دفعة', reset:'إعادة',
}

function arabicAction(action: string) {
  const l = action.toLowerCase()
  for (const [k,v] of Object.entries(ACTION_AR)) if (l.includes(k)) return v
  return action
}

export function ActivityTimelineWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'], queryFn: getNotifications, staleTime: 60_000, retry: 1,
  })
  const logs = data?.audit_logs?.slice(0, 8) ?? []

  return (
    <DashboardWidget title="سجل النشاط" subtitle="آخر العمليات" icon={Activity}>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({length:5}).map((_,i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-6 w-6 rounded shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4 rounded" /><Skeleton className="h-2 w-1/3 rounded" /></div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Activity className="h-7 w-7 text-muted-foreground/15" />
          <p className="text-xs text-muted-foreground/50">لا توجد بيانات بعد</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline track */}
          <div className="absolute start-[11px] top-2 bottom-2 w-px" style={{ background:'var(--border-inner)' }} />
          <div className="space-y-0">
            {logs.map((log, i) => {
              const key  = (log.entity_type ?? '').toLowerCase()
              const meta = META[key] ?? { icon: Activity, color:'text-slate-500' }
              const Icon = meta.icon
              return (
                <motion.div key={log.id} initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.03 }}
                  className="relative flex gap-3 pb-3 last:pb-0">
                  <div className="relative z-10 h-6 w-6 rounded flex items-center justify-center shrink-0"
                    style={{ background:'var(--s1)', border:'1px solid var(--border-inner)' }}>
                    <Icon className={cn('h-3 w-3', meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      <span className="font-medium">{arabicAction(log.action)}</span>
                      {log.entity_type && <span className="text-muted-foreground/50"> · {log.entity_type}</span>}
                    </p>
                    {log.details && <p className="text-[10px] text-muted-foreground/40 truncate">{log.details}</p>}
                    <p className="text-[10px] text-muted-foreground/35 mt-0.5">{formatRelativeDate(log.created_at)}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </DashboardWidget>
  )
}
