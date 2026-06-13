'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/* ─── DashboardWidget ────────────────────────────────────────────────────── *
 * The ONE card wrapper used by every dashboard widget.
 * Guarantees identical surface, header, icon-well, and body treatment.
 * ─────────────────────────────────────────────────────────────────────────── */

interface DashboardWidgetProps {
  title:      string
  /** Accepts a string or any ReactNode (colored counts, badges, etc.) */
  subtitle?:  React.ReactNode
  icon:       React.ElementType
  /** Tailwind text-color class for the icon only; the well itself is always neutral */
  iconColor?: string
  /** Trailing element in the header (buttons, badges, refresh icon, etc.) */
  action?:    React.ReactNode
  children:   React.ReactNode
  className?: string
  noPadding?: boolean
}

export function DashboardWidget({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  action,
  children,
  className,
  noPadding = false,
}: DashboardWidgetProps) {
  return (
    <div className={cn('dash-card h-full flex flex-col', className)}>

      {/* Header — identical for every widget */}
      <div className="dash-header shrink-0">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Neutral icon well — color lives on the icon, never the well */}
          <div className="dash-icon-well shrink-0">
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <div className="min-w-0">
            <p className="dash-title truncate">{title}</p>
            {subtitle != null && (
              <p className="dash-sub truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex shrink-0 items-center">{action}</div>
        )}
      </div>

      {/* Body */}
      <div className={cn('flex-1', !noPadding && 'dash-body')}>
        {children}
      </div>
    </div>
  )
}

/* ─── Shared action button pattern ──────────────────────────────────────── */
export function WidgetAction({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5">{children}</div>
}
