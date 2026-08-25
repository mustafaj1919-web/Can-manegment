import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  count?: number
  filtered?: boolean
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  icon,
  count,
  filtered = false,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 pb-1', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border)] bg-white text-[var(--ds-primary)] shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-[var(--ds-text-primary)] tracking-tight">{title}</h1>
            {typeof count === 'number' && (
              <span className="inline-flex items-center rounded-md border border-[var(--ds-border)] bg-[var(--ds-background)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ds-text-secondary)]">
                {count.toLocaleString('ar-IQ')}
                {filtered && <span className="ms-1 text-[var(--ds-primary)] font-bold">•</span>}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
