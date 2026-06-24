'use client'

import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Car, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardStats } from '@/lib/api/dashboard'

const SEGMENTS = [
  { key: 'available_cars', label: 'متاحة',  color: '#00d4aa', glow: 'text-[#00d4aa]' },
  { key: 'sold_cars',      label: 'مباعة',   color: '#8888aa', glow: 'text-[#8888aa]'  },
  { key: 'reserved_cars',  label: 'محجوزة', color: '#7c3aed', glow: 'text-[#7c3aed]'   },
] as const

function PieTooltipContent({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="glass rounded-lg px-2.5 py-1.5 text-xs text-foreground">
      <span className="font-semibold">{payload[0].name}</span>: {payload[0].value}
    </div>
  )
}

export function InventoryStatusWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })

  const segments = SEGMENTS.map((s) => ({
    ...s,
    value: Number((data as Record<string, number> | undefined)?.[s.key] ?? 0),
  }))

  const total = segments.reduce((acc, s) => acc + s.value, 0)
  const activeSegments = segments.filter((s) => s.value > 0)
  const isEmpty = !isLoading && !isError && total === 0

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50">
        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Car className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">حالة المخزون</p>
          <p className="text-xs text-muted-foreground">
            {isLoading ? '...' : isError ? 'خطأ' : isEmpty ? 'لا توجد بيانات' : `${total} سيارة`}
          </p>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-40 w-40 rounded-full" />
            <div className="w-full space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
            </div>
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-7 w-7 mx-auto text-rose-400/50 mb-2" />
            <p className="text-sm text-muted-foreground">تعذّر تحميل بيانات المخزون</p>
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="relative h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeSegments.length > 0 ? activeSegments : [{ label: '', color: '#1e293b', value: 1, key: 'available_cars', glow: '' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={activeSegments.length > 1 ? 3 : 0}
                    dataKey="value"
                    nameKey="label"
                    strokeWidth={1.5}
                    stroke="var(--bg-surface)"
                  >
                    {(activeSegments.length > 0 ? activeSegments : [{ color: '#1e293b' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {isEmpty ? (
                  <>
                    <span className="text-2xl font-black text-muted-foreground/40">0</span>
                    <span className="text-[11px] text-muted-foreground/40">لا توجد بيانات</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-black text-foreground money">{total}</span>
                    <span className="text-[11px] text-muted-foreground">إجمالي</span>
                  </>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-2">
              {segments.map((s, i) => (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center justify-between rounded-lg bg-secondary/20 border border-border/30 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-bold money', s.glow)}>{s.value}</span>
                    {total > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">{Math.round((s.value / total) * 100)}%</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
