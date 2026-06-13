import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'app-field flex h-10 w-full px-3 py-1.5 text-sm',
        'placeholder:text-muted-foreground/60',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
