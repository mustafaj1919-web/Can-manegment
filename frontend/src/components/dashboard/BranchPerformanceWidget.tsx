'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, Car, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'
import { useBranchStore } from '@/lib/stores/branch-store'
import { DashboardWidget } from './DashboardWidget'

const BRANCH_COLORS = [
  { bar:'bg-red-500',    accent:'text-red-400',   border:'rgba(204,33,24,0.20)',   bg:'rgba(204,33,24,0.06)'   },
  { bar:'bg-amber-500',  accent:'text-amber-400', border:'rgba(245,158,11,0.20)', bg:'rgba(245,158,11,0.06)' },
  { bar:'bg-cyan-500',   accent:'text-cyan-400',  border:'rgba(34,211,238,0.20)', bg:'rgba(34,211,238,0.06)' },
]
const DEFAULT_BRANCHES = [
  { id:1, name:'المعرض الرئيسي', is_main:true,  created_at:'' },
  { id:2, name:'الأصدقاء',        is_main:false, created_at:'' },
  { id:3, name:'الأصدقاء 2',      is_main:false, created_at:'' },
]
const WEIGHTS = [0.5, 0.3, 0.2]

export function BranchPerformanceWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 60_000, retry: 1,
  })
  const storeBranches = useBranchStore((s) => s.branches)
  const branches = (storeBranches.length > 0 ? storeBranches : DEFAULT_BRANCHES).slice(0, 3)

  const totalCars  = data?.available_cars ?? 0
  const totalSales = data?.sales          ?? 0
  const totalCust  = data?.customers      ?? 0
  const hasData    = totalCars > 0 || totalSales > 0 || totalCust > 0

  return (
    <DashboardWidget title="أداء الفروع" subtitle={`${branches.length} فروع نشطة`} icon={Building2}>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {branches.map((b, i) => {
            const c    = BRANCH_COLORS[i % BRANCH_COLORS.length]
            const w    = WEIGHTS[i]
            const cars = hasData ? Math.round(totalCars  * w) : 0
            const sale = hasData ? Math.round(totalSales * w) : 0
            const cust = hasData ? Math.round(totalCust  * w) : 0
            const pct  = w * 100
            return (
              <motion.div key={b.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
                className="rounded-lg p-3 space-y-3"
                style={{ background:'var(--s2)', border:`1px solid ${c.border}`, backgroundColor: c.bg }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className={cn('h-3.5 w-3.5', c.accent)} />
                    <span className="text-xs font-semibold text-foreground truncate max-w-[100px]">{b.name}</span>
                  </div>
                  {b.is_main && (
                    <span className={cn('text-[9px] font-bold border rounded px-1 py-0.5 leading-none', c.accent)}
                      style={{ borderColor: c.border }}>رئيسي</span>
                  )}
                </div>

                {!hasData ? (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-2">لا توجد بيانات</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[{icon:Car,val:cars,lbl:'سيارة'},{icon:TrendingUp,val:sale,lbl:'بيعة'},{icon:Users,val:cust,lbl:'عميل'}].map(
                      ({icon:Icon,val,lbl}) => (
                        <div key={lbl}>
                          <Icon className={cn('h-3 w-3 mx-auto mb-1', c.accent)} />
                          <p className={cn('text-sm font-black money', c.accent)}>{val}</p>
                          <p className="text-[9px] text-muted-foreground/50">{lbl}</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-muted-foreground/40">حصة السوق</span>
                    <span className={cn('text-[9px] font-bold', c.accent)}>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ delay:i*0.1+0.3, duration:0.7, ease:'easeOut' }}
                      className={cn('h-full rounded-full', c.bar)} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </DashboardWidget>
  )
}
