'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSales } from '@/lib/api/sales'
import { cn } from '@/lib/utils'

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function getLastNWeeks(n: number) {
  const weeks: string[][] = []
  const now = new Date()
  // Align to Sunday
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0, 0, 0, 0)

  for (let w = n - 1; w >= 0; w--) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfThisWeek)
      date.setDate(startOfThisWeek.getDate() - w * 7 + d)
      week.push(date.toISOString().split('T')[0])
    }
    weeks.push(week)
  }
  return weeks
}

export function WeeklySalesHeatmap() {
  const { data: salesData } = useQuery({
    queryKey: ['sales', { page: 1, per_page: 200 }],
    queryFn: () => getSales({ page: 1, per_page: 200 }),
    staleTime: 5 * 60_000,
  })

  const weeks = useMemo(() => getLastNWeeks(8), [])

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const sale of salesData?.items ?? []) {
      const d = sale.sale_date?.split('T')[0] ?? sale.sale_date
      if (d) map[d] = (map[d] ?? 0) + 1
    }
    return map
  }, [salesData])

  const maxCount = useMemo(() => Math.max(1, ...Object.values(countByDate)), [countByDate])

  const today = new Date().toISOString().split('T')[0]

  function getColor(count: number) {
    if (count === 0) return 'bg-secondary/30 border-border/20'
    const intensity = count / maxCount
    if (intensity < 0.25) return 'bg-emerald-500/20 border-emerald-500/20'
    if (intensity < 0.5)  return 'bg-emerald-500/40 border-emerald-500/30'
    if (intensity < 0.75) return 'bg-emerald-500/65 border-emerald-500/40'
    return 'bg-emerald-500 border-emerald-600/50'
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-foreground">نشاط المبيعات الأسبوعي</h3>
        <span className="text-[10px] text-muted-foreground">آخر 8 أسابيع</span>
      </div>

      {/* Day labels */}
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="grid grid-cols-[auto_1fr] gap-2">
            {/* Y-axis: day labels */}
            <div className="flex flex-col gap-1 pt-0.5">
              {DAYS_AR.map((day) => (
                <div key={day} className="h-6 flex items-center justify-end">
                  <span className="text-[9px] text-muted-foreground/70 whitespace-nowrap">{day}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1 flex-1">
                  {week.map((date, di) => {
                    const count = countByDate[date] ?? 0
                    const isToday = date === today
                    const isFuture = date > today
                    return (
                      <div
                        key={date}
                        title={`${date}: ${count} مبيعة`}
                        className={cn(
                          'h-6 rounded-sm border transition-all cursor-default',
                          isFuture ? 'opacity-20 bg-secondary/20 border-border/10' : getColor(count),
                          isToday && 'ring-1 ring-primary/60'
                        )}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 justify-end text-[9px] text-muted-foreground">
        <span>أقل</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} className={cn('w-4 h-4 rounded-sm border', getColor(Math.round(v * maxCount)))} />
        ))}
        <span>أكثر</span>
      </div>
    </div>
  )
}
