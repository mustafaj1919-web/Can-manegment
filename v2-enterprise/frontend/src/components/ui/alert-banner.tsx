'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'warning' | 'success' | 'error'

interface AlertBannerProps {
  variant?: AlertVariant
  title: string
  description?: string
  dismissible?: boolean
  action?: { label: string; onClick: () => void }
  className?: string
}

const VARIANTS: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  info:    { icon: Info,          classes: 'border-sky-500/20 bg-sky-500/[0.06] text-sky-400' },
  warning: { icon: AlertTriangle, classes: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400' },
  success: { icon: CheckCircle,   classes: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400' },
  error:   { icon: AlertTriangle, classes: 'border-rose-500/20 bg-rose-500/[0.06] text-rose-400' },
}

export function AlertBanner({ variant = 'info', title, description, dismissible = true, action, className }: AlertBannerProps) {
  const [visible, setVisible] = useState(true)
  const { icon: Icon, classes } = VARIANTS[variant]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('overflow-hidden', className)}
        >
          <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', classes)} dir="rtl">
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold font-family-cairo">{title}</p>
              {description && <p className="text-[11px] opacity-75 mt-0.5">{description}</p>}
            </div>
            {action && (
              <button
                onClick={action.onClick}
                className="text-[11px] font-bold underline-offset-2 hover:underline shrink-0"
              >
                {action.label}
              </button>
            )}
            {dismissible && (
              <button onClick={() => setVisible(false)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
