'use client'

import { FieldError } from 'react-hook-form'
import { cn } from '@/lib/utils'

export interface FormErrorProps {
  error?: FieldError
  className?: string
}

export interface FormFieldWrapperProps {
  label?: string
  error?: FieldError
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}

export interface FormErrorSummaryProps {
  errors: Record<string, FieldError | undefined>
  title?: string
  className?: string
}

/**
 * Displays field-level validation errors in Arabic
 * Used with react-hook-form
 */
export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null

  return (
    <p
      className={cn(
        'text-sm font-medium text-destructive mt-1 flex items-center gap-1',
        className
      )}
      role="alert"
    >
      <span className="inline-block">⚠️</span>
      {error.message}
    </p>
  )
}

/**
 * Wrapper for form fields with label, error, and hint text
 */
export function FormFieldWrapper({
  label,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className={cn('block text-sm font-medium', required && 'after:content-["_*"] after:text-destructive')}>
          {label}
        </label>
      )}
      <div className={cn('relative', error && 'border-destructive')}>{children}</div>
      {error && <FormError error={error} />}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * Displays all form errors at the top (validation summary)
 */
export function FormErrorSummary({ errors, title, className }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors)
    .filter(([, error]) => error !== undefined)
    .map(([field, error]) => ({
      field,
      message: error?.message,
    }))

  if (errorList.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/5 p-4 mb-6',
        className
      )}
      role="alert"
    >
      <h3 className="font-medium text-destructive mb-2 flex items-center gap-2">
        <span>⚠️</span>
        {title || 'يوجد أخطاء في النموذج:'}
      </h3>
      <ul className="space-y-1 text-sm text-destructive list-disc list-inside">
        {errorList.map(({ field, message }) => (
          <li key={field}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
