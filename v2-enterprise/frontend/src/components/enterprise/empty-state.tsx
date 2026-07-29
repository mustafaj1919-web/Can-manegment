import React from 'react'
import { Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title = 'لا توجد سجلات مطابقة',
  description = 'جرّب تعديل معايير البحث أو التصفية الحالية',
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="py-14 text-center space-y-2">
      {icon ?? <Database className="h-7 w-7 text-[var(--ds-text-muted)] mx-auto opacity-60" />}
      <p className="text-xs font-semibold text-[var(--ds-text-primary)]">{title}</p>
      {description && <p className="text-[11px] text-[var(--ds-text-secondary)]">{description}</p>}
      {actionLabel && onAction && (
        <Button type="button" variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
