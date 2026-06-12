'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  helperText?: string
}

const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      success,
      leftIcon,
      rightIcon,
      helperText,
      id,
      placeholder,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const inputId = React.useId()
    const finalId = id || inputId

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3 text-muted-foreground/50 pointer-events-none select-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={finalId}
            placeholder={placeholder || ' '} // Required for peer-placeholder-shown logic to work properly
            className={cn(
              'app-field peer w-full font-medium text-foreground transition-all duration-150 focus:outline-none',
              // Dynamic height and padding based on label existence
              label
                ? 'h-11 pt-[18px] pb-[4px] px-3.5 text-xs leading-tight'
                : 'h-9 px-3.5 text-xs',
              // Padding left & right for icons using logical properties
              leftIcon && 'ps-9',
              rightIcon && 'pe-9',
              // Error and Success borders
              error && 'border-destructive focus:border-destructive/80 focus:ring-destructive/20',
              success && 'border-emerald-600 focus:border-emerald-600/80 focus:ring-emerald-600/20',
              className
            )}
            onFocus={onFocus}
            onBlur={onBlur}
            {...props}
          />
          {label && (
            <label
              htmlFor={finalId}
              className={cn(
                'absolute text-[11px] text-muted-foreground/80 pointer-events-none transition-all duration-150 select-none origin-top-left rtl:origin-top-right',
                // Float position
                'top-1.5 start-3.5 scale-90',
                // Center position (when placeholder is shown, i.e., empty and not focused)
                'peer-placeholder-shown:top-3 peer-placeholder-shown:start-3.5 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-xs',
                // Float up on focus
                'peer-focus:top-1.5 peer-focus:start-3.5 peer-focus:scale-90 peer-focus:text-primary',
                // Adjust position if leftIcon is present
                leftIcon && 'start-9 peer-placeholder-shown:start-9 peer-focus:start-9',
                // State coloring
                error && 'text-destructive/80 peer-focus:text-destructive',
                success && 'text-emerald-600/80 peer-focus:text-emerald-600'
              )}
            >
              {label}
            </label>
          )}
          {rightIcon && (
            <div className="absolute end-3 text-muted-foreground/50 pointer-events-none select-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[10px] font-semibold text-destructive mt-1.5 ps-1 select-none">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-[10px] text-muted-foreground/60 mt-1.5 ps-1 select-none">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
ModernInput.displayName = 'ModernInput'

export { ModernInput }
