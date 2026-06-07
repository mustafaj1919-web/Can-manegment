import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface PageHeaderProps {
  title: string
  icon?: React.ReactNode
  /** Total count shown as an inline badge next to the title */
  count?: number
  /** Additional text line below the title */
  subtitle?: string
  /** Whether the count reflects a filtered result set */
  filtered?: boolean
  /** Buttons / links rendered on the trailing edge */
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
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>

      {/* Leading: icon + text */}
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/60 text-muted-foreground">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold leading-none text-foreground">
              {title}
            </h1>
            {typeof count === 'number' && (
              <Badge
                variant="secondary"
                className="shrink-0 rounded-md px-1.5 py-px text-[10px] font-medium tabular-nums"
              >
                {count.toLocaleString('ar-EG')}
                {filtered && <span className="ms-0.5 text-primary/70">*</span>}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Trailing: actions */}
      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
