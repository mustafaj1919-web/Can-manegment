'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface Step {
  label: string
  done: boolean
  active: boolean
}

interface StepIndicatorProps {
  steps: Step[]
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1" dir="rtl">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center min-w-0 flex-1">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-[12px] font-bold whitespace-nowrap',
            step.done   && 'text-emerald-400',
            step.active && !step.done && 'text-primary bg-primary/10',
            !step.done && !step.active && 'text-muted-foreground/50',
          )}>
            <div className={cn(
              'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-black transition-all',
              step.done   ? 'border-emerald-500 bg-emerald-500 text-white' : '',
              step.active && !step.done ? 'border-primary bg-primary text-white' : '',
              !step.done && !step.active ? 'border-muted-foreground/30 text-muted-foreground/40' : '',
            )}>
              {step.done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </div>
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-px min-w-[20px] transition-colors', step.done ? 'bg-emerald-500/40' : 'bg-border/30')} />
          )}
        </div>
      ))}
    </div>
  )
}
