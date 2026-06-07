import React from 'react'
import { cn } from '@/lib/utils'

export interface SectionCardProps {
  /** Section heading */
  title: string
  /** Optional subtitle below the heading */
  description?: string
  /** Action slot in the card header trailing edge (e.g. a link or button) */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Extra classes applied to the content area */
  contentClassName?: string
  /** Skip the default p-5 padding on the content area */
  noPadding?: boolean
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noPadding = false,
}: SectionCardProps) {
  return (
    <div className={cn('dash-card overflow-hidden', className)}>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold leading-none text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="ms-3 shrink-0">{action}</div>}
      </div>

      {/* Content */}
      <div className={cn(!noPadding && 'p-5', contentClassName)}>
        {children}
      </div>
    </div>
  )
}
