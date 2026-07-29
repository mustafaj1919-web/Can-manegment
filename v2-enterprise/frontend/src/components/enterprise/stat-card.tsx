import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'

export interface RealSparklinePoint {
  date: string
  value: number
}

export interface StatCardProps {
  title: string
  value: React.ReactNode
  subtext?: string
  comparison?: string
  sparklineData?: RealSparklinePoint[]
  sparklineLabel?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function StatCard({
  title,
  value,
  subtext,
  comparison = '— لا تتوفر مقارنة',
  sparklineData,
  sparklineLabel = 'حركة الصفحة الحالية',
  className,
}: StatCardProps) {
  const sparklineSvg = useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return null
    const values = sparklineData.map(s => s.value)
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const range = max - min || 1
    const width = 110
    const height = 22

    const points = sparklineData
      .map((s, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width
        const y = height - ((s.value - min) / range) * (height - 6) - 3
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

    return { width, height, points }
  }, [sparklineData])

  return (
    <div className={cn('bg-white border border-[var(--ds-border)] rounded-xl p-3 shadow-2xs hover:border-[var(--ds-primary)] transition-colors text-right', className)}>
      <span className="text-[11px] font-semibold text-[var(--ds-text-secondary)]">{title}</span>
      <div className="flex items-baseline justify-between mt-1">
        <div className="text-xl font-bold text-[var(--ds-text-primary)]">{value}</div>
        {comparison && <span className="text-[10px] text-[var(--ds-text-secondary)]">{comparison}</span>}
      </div>

      {sparklineSvg && (
        <div className="flex items-center gap-2 mt-1.5" title={sparklineLabel}>
          <svg width={sparklineSvg.width} height={sparklineSvg.height} className="overflow-visible" aria-hidden="true">
            <polyline
              fill="none"
              stroke="var(--ds-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparklineSvg.points}
            />
          </svg>
          <span className="text-[10px] text-[var(--ds-text-secondary)]">{sparklineLabel}</span>
        </div>
      )}

      {subtext && <p className="text-[10px] text-[var(--ds-text-secondary)] mt-1.5">{subtext}</p>}
    </div>
  )
}
