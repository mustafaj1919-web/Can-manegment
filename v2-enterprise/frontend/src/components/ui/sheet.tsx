'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  side?: 'right' | 'bottom'
  title?: string
  description?: string
  children: React.ReactNode
  width?: string
}

export function Sheet({ open, onClose, side = 'right', title, description, children, width = 'w-[420px]' }: SheetProps) {
  const isRight = side === 'right'

  const variants = isRight
    ? { hidden: { x: '100%', opacity: 0 }, visible: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } }
    : { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 0 } }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={variants.hidden}
            animate={variants.visible}
            exit={variants.exit}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed z-50 bg-bg-surface border border-subtle shadow-2xl flex flex-col',
              isRight
                ? `top-0 bottom-0 end-0 ${width} max-w-full`
                : 'bottom-0 start-0 end-0 max-h-[85vh] rounded-t-2xl',
            )}
            dir="rtl"
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between p-5 border-b border-subtle shrink-0">
                <div>
                  {title && <h2 className="text-sm font-bold text-foreground font-family-cairo">{title}</h2>}
                  {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
