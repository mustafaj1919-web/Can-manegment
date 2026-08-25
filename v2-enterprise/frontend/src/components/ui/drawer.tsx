import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
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
      <div
        className="fixed inset-0 bg-black/25 z-40 animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-[var(--ds-border)] shadow-2xl p-4 flex flex-col justify-between animate-in slide-in-from-right duration-200"
        dir="rtl"
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--ds-text-primary)]">{title}</h3>
              {subtitle && <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              aria-label="إغلاق"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-subtle)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto space-y-4 text-right">
            {children}
          </div>
        </div>

        {footer && (
          <div className="pt-4 border-t border-[var(--ds-border)] shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </>
  )
}
