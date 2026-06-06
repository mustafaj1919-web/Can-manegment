'use client'

import { cn } from '@/lib/utils'

/* ─── DashboardWidget ────────────────────────────────────────────────────── *
 * The ONE card wrapper used by every dashboard widget.
 * Guarantees identical surface, header, icon, and body treatment everywhere.
 * ─────────────────────────────────────────────────────────────────────────── */

interface DashboardWidgetProps {
  title:      string
  subtitle?:  string
  icon:       React.ElementType
  iconColor?: string
  action?:    React.ReactNode
  children:   React.ReactNode
  className?: string
  noPadding?: boolean
}

export function DashboardWidget({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-slate-400',
  action,
  children,
  className,
  noPadding = false,
}: DashboardWidgetProps) {
  return (
    <div className={cn('dash-card h-full flex flex-col', className)}>
      {/* Header — identical for every widget */}
      <div className="dash-header shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="dash-icon-well">
            <Icon className={cn('h-3.5 w-3.5', iconColor)} />
          </div>
          <div className="min-w-0">
            <p className="dash-title truncate">{title}</p>
            {subtitle && <p className="dash-sub truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 flex items-center">{action}</div>}
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
  return (
    <div className="flex items-center gap-1.5">
      {children}
    </div>
  )
}
