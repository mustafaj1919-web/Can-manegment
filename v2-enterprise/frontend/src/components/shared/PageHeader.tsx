import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  icon?: React.ReactNode
  count?: number
  subtitle?: string
  filtered?: boolean
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  icon,
  count,
  subtitle,
  filtered = false,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>

      {/* Leading */}
      <div className="flex min-w-0 items-center gap-3.5">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary shadow-sm">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[18px] font-extrabold leading-none tracking-tight text-foreground font-family-cairo">
              {title}
            </h1>
            {typeof count === 'number' && (
              <span className="inline-flex items-center rounded-md border border-border/60 bg-secondary/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground shadow-sm shrink-0">
                {count.toLocaleString('ar-EG')}
                {filtered && <span className="ms-0.5 text-primary font-bold">•</span>}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Trailing: actions */}
      {actions && (
        <div className="flex shrink-0 items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
