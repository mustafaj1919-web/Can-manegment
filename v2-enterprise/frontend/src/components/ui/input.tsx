import React from 'react'
import { inputVariants } from '@/lib/design-system/variants'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md' | 'lg'
  hasError?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', inputSize = 'md', hasError = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ inputSize, hasError, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
