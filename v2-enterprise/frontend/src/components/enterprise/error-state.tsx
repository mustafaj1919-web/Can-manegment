import React from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'حدث خطأ في تحميل البيانات',
  description = 'تعذر الاتصال بالخادم، يُرجى إعادة المحاولة',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="py-12 text-center space-y-2.5">
      <AlertCircle className="h-6 w-6 text-[var(--ds-danger)] mx-auto opacity-90" />
      <p className="text-xs font-semibold text-[var(--ds-danger)]">{title}</p>
      {description && <p className="text-[11px] text-[var(--ds-text-secondary)]">{description}</p>}
      {onRetry && (
        <Button type="button" onClick={onRetry} variant="ghost" size="sm" className="border border-[var(--ds-border)] gap-1.5 text-xs rounded-lg mt-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>إعادة المحاولة</span>
        </Button>
      )}
    </div>
  )
}
