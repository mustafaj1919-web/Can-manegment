'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InstallmentPaymentWorkflowState } from './workflowTypes'

interface PaymentWorkflowProgressProps {
  currentState: InstallmentPaymentWorkflowState
}

const STEPS = [
  { id: 1, label: 'بيانات الدفعة', states: ['payment_entry'] },
  { id: 2, label: 'المراجعة والتأكيد', states: ['reviewing', 'submitting', 'submission_unknown'] },
  { id: 3, label: 'الوصل والنتائج', states: ['payment_posted', 'receipt_loading', 'receipt_ready', 'receipt_failed'] },
  { id: 4, label: 'الأرشفة والإنهاء', states: ['archive_pending', 'archiving', 'archive_failed', 'completed'] },
]

export function PaymentWorkflowProgress({ currentState }: PaymentWorkflowProgressProps) {
  const getStepIndex = (state: InstallmentPaymentWorkflowState) => {
    if (state === 'idle' || state === 'payment_entry') return 1
    if (state === 'reviewing' || state === 'submitting' || state === 'submission_unknown') return 2
    if (state === 'payment_posted' || state === 'receipt_loading' || state === 'receipt_ready' || state === 'receipt_failed') return 3
    return 4
  }

  const activeIndex = getStepIndex(currentState)

  return (
    <div className="w-full bg-slate-50/80 border-b border-slate-100 px-8 py-4 select-none" dir="rtl">
      <div className="max-w-3xl mx-auto flex items-center justify-between relative">
        {/* Subtle Horizontal Progress Line */}
        <div className="absolute top-1/2 start-6 end-6 h-[2px] bg-slate-200 -translate-y-1/2 z-0" />

        {STEPS.map((step) => {
          const isCompleted = step.id < activeIndex
          const isActive = step.id === activeIndex

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 bg-white border shadow-sm',
                  isCompleted && 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/10',
                  isActive && 'bg-white text-emerald-600 border-emerald-500 ring-4 ring-emerald-500/10 font-bold',
                  !isCompleted && !isActive && 'text-slate-400 border-slate-200'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : step.id}
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors tracking-tight',
                  isActive ? 'text-emerald-700 font-bold' : isCompleted ? 'text-slate-700 font-semibold' : 'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
