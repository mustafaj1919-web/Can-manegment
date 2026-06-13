'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { getDashboardStats } from '@/lib/api/dashboard'
import { cn } from '@/lib/utils'


export function DashboardStatusBar() {
  const queryClient = useQueryClient()
  // Query stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
  })

  // Counter since last update
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    setSeconds(0)
    const interval = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [stats])

  const handleManualRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    setSeconds(0)
  }

  const formatLastUpdated = () => {
    if (seconds < 10) return 'الآن'
    if (seconds < 60) return `منذ ${seconds} ثانية`
    const mins = Math.floor(seconds / 60)
    if (mins === 1) return 'منذ دقيقة واحدة'
    if (mins === 2) return 'منذ دقيقتين'
    if (mins < 11) return `منذ ${mins} دقائق`
    return `منذ ${mins} دقيقة`
  }

  const available = stats?.available_cars ?? 0
  const overdue = stats?.overdue_installments ?? 0
  const todayContracts = stats?.sales ?? 0
  const overdueAmount = stats?.overdue_amount ?? 0

  // Urgency logic:
  // Red if overdue installments count > 3 or overdue amount > 5M IQD
  // Amber if there are any overdue installments
  // Green if zero overdue installments
  const isRed = overdue > 3 || overdueAmount > 5_000_000
  const isAmber = overdue > 0 && !isRed

  const bgClass = isRed
    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    : isAmber
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'

  const IndicatorIcon = isRed || isAmber ? ShieldAlert : ShieldCheck

  return (
    <div 
      className={cn(
        'w-full h-11 border rounded-xl flex items-center justify-between px-4 text-xs font-semibold select-none shadow-xs transition-colors duration-300',
        bgClass
      )}
      dir="rtl"
    >
      {/* Right side: Urgent metrics */}
      <div className="flex items-center gap-3">
        <IndicatorIcon className="h-4.5 w-4.5 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
            {available} سيارة متاحة للبيع
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
            {todayContracts} عقود مسجلة اليوم
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
            {overdue} أقساط متأخرة
          </span>
        </div>
      </div>

      {/* Left side: Time counter and refresh button */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-family-cairo">آخر تحديث: {formatLastUpdated()}</span>
        <button
          onClick={handleManualRefresh}
          className="p-1 rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all duration-150"
          title="تحديث البيانات"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
