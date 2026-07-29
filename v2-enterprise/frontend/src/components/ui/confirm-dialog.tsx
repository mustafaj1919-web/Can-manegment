import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 animate-in fade-in duration-150" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="bg-white border border-[var(--ds-border)] rounded-xl shadow-2xl max-w-sm w-full p-4 space-y-4 text-right animate-in zoom-in-95 duration-150"
          dir="rtl"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('h-5 w-5 shrink-0', variant === 'danger' ? 'text-[var(--ds-danger)]' : 'text-[var(--ds-warning)]')} />
              <h3 className="text-sm font-bold text-[var(--ds-text-primary)]">{title}</h3>
            </div>
            <button type="button" aria-label="إغلاق" onClick={onClose} className="text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-[var(--ds-text-secondary)] leading-relaxed">{description}</p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ds-border)]">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              {cancelText}
            </Button>
            <Button type="button" variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
