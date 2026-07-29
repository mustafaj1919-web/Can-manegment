import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ButtonGroup({ className, children, ...props }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-0.5 shadow-2xs',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
