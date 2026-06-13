'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmPopoverProps {
  children: React.ReactNode
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => Promise<void> | void
  variant?: 'danger' | 'warning'
}

export function ConfirmPopover({
  children,
  message = 'هل أنت متأكد من هذا الإجراء؟',
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  onConfirm,
  variant = 'danger',
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try { await onConfirm() }
    finally { setLoading(false); setOpen(false) }
  }

  return (
    <span className="relative inline-block">
      <span onClick={(e) => { e.stopPropagation(); setOpen(true) }}>
        {children}
      </span>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute end-0 top-8 z-50 min-w-[220px] bg-bg-surface border border-subtle rounded-xl shadow-xl p-3.5 text-right"
              dir="rtl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', variant === 'danger' ? 'text-rose-400' : 'text-amber-400')} />
                <p className="text-[12px] text-foreground font-medium font-family-cairo leading-snug">{message}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-secondary/60 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-colors flex items-center gap-1',
                    variant === 'danger'
                      ? 'bg-rose-500 hover:bg-rose-600'
                      : 'bg-amber-500 hover:bg-amber-600',
                  )}
                >
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  )
}
