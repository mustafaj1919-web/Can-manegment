import React from 'react'
import { cn } from '@/lib/utils'

export type StatColor = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface StatItem {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: StatColor
}

export interface StatStripProps {
  stats: StatItem[]
  className?: string
}

const VALUE_COLOR: Record<StatColor, string> = {
  default: 'text-foreground',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger:  'text-rose-400',
  info:    'text-foreground',
}

export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2',
        className
      )}
    >
      {stats.map((stat, i) => {
        const color = stat.color ?? 'default'
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="pointer-events-none select-none text-border" aria-hidden>·</span>
            )}
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">{stat.label}</span>
              <span className={cn('font-semibold tabular-nums', VALUE_COLOR[color])}>
                {typeof stat.value === 'number'
                  ? stat.value.toLocaleString('ar-EG')
                  : stat.value}
              </span>
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}
