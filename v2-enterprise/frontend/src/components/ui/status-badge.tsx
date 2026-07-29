import React from 'react'
import { getDomainStatusConfig, type DomainType, type SemanticStatus } from '@/lib/design-system/status-maps'
import { badgeVariants } from '@/lib/design-system/variants'
import { cn } from '@/lib/utils'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: SemanticStatus
  status?: string | null
  domain?: DomainType
  customLabel?: string
  showDot?: boolean
}

export function StatusBadge({
  variant,
  status,
  domain = 'sales',
  customLabel,
  showDot = true,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  const config = status ? getDomainStatusConfig(status, domain) : { variant: variant ?? 'neutral', label: customLabel ?? '', dot: showDot }
  const effectiveVariant = variant ?? config.variant
  const label = children ?? customLabel ?? config.label

  const dotColors: Record<SemanticStatus, string> = {
    success: 'bg-[var(--ds-success)]',
    warning: 'bg-[var(--ds-warning)]',
    danger:  'bg-[var(--ds-danger)]',
    info:    'bg-[var(--ds-info)]',
    neutral: 'bg-[var(--ds-text-muted)]',
  }

  return (
    <span
      className={cn(badgeVariants({ variant: effectiveVariant }), className)}
      {...props}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[effectiveVariant])} />
      )}
      <span>{label}</span>
    </span>
  )
}
