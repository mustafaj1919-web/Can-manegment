import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DetailHeaderProps {
  /** href for the back link (e.g. '/sales') */
  backHref: string
  /** Label shown next to the back arrow */
  backLabel?: string
  /** Main record title */
  title: string
  /** Secondary line below the title */
  subtitle?: string
  /** Status badge — pass a <StatusBadge /> or any ReactNode */
  status?: React.ReactNode
  /** Buttons / links on the trailing edge */
  actions?: React.ReactNode
  className?: string
}

export function DetailHeader({
  backHref,
  backLabel = 'رجوع',
  title,
  subtitle,
  status,
  actions,
  className,
}: DetailHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>

      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground"
      >
        {/* rtl-flip flips the arrow direction in RTL layouts */}
        <ArrowRight className="rtl-flip h-3 w-3" />
        {backLabel}
      </Link>

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold leading-none text-foreground">{title}</h1>
            {status}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
