import React from 'react'
import { Button, type ButtonProps } from './button'
import { cn } from '@/lib/utils'

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  'aria-label': string
  icon: React.ReactNode
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, 'aria-label': ariaLabel, variant = 'ghost', size = 'icon', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn('h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg', className)}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'
