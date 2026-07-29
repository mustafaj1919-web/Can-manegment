import React from 'react'
import { cn } from '@/lib/utils'

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: React.ReactNode
}

export function Panel({ title, action, className, children, ...props }: PanelProps) {
  return (
    <div className={cn('bg-white border border-[var(--ds-border)] rounded-[var(--ds-radius-panel)] shadow-2xs overflow-hidden', className)} {...props}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ds-border)] bg-[var(--ds-background)]">
          <h3 className="text-xs font-bold text-[var(--ds-text-primary)]">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
