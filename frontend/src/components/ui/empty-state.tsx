import * as React from 'react'
import { AlertCircle, SearchX, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Variant changes the icon container color */
  variant?: 'default' | 'error' | 'search'
  /** Override the icon entirely */
  icon?: React.ReactNode
  title: string
  description?: string
  /** Buttons or links rendered below the description */
  action?: React.ReactNode
  /** Compact presentation for smaller panels and widgets */
  size?: 'default' | 'compact'
  className?: string
}

const DEFAULT_ICONS: Record<string, React.ReactNode> = {
  default: <FolderOpen className="h-6 w-6" />,
  error:   <AlertCircle className="h-6 w-6" />,
  search:  <SearchX className="h-6 w-6" />,
}

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('empty-state', className)}
      data-size={size}
      data-variant={variant}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className={cn('empty-state-icon', variant)}>
        {icon ?? DEFAULT_ICONS[variant]}
      </div>

      <p className="empty-state-title">{title}</p>

      {description && (
        <p className="empty-state-desc mt-1">{description}</p>
      )}

      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  )
}
