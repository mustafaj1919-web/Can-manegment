'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────
   FormGroup — wraps label + control + hint/error with gap
───────────────────────────────────────────────────────── */
export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stretch to full width (default: true) */
  fullWidth?: boolean
}

export function FormGroup({ className, fullWidth = true, ...props }: FormGroupProps) {
  return (
    <div
      className={cn('form-group', fullWidth && 'w-full', className)}
      {...props}
    />
  )
}

/* ─────────────────────────────────────────────────────────
   FormLabel — uppercase micro-label above a field
───────────────────────────────────────────────────────── */
export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function FormLabel({ className, required, children, ...props }: FormLabelProps) {
  return (
    <label
      className={cn('form-label', required && 'form-label-required', className)}
      {...props}
    >
      {children}
    </label>
  )
}

/* ─────────────────────────────────────────────────────────
   FormHint — soft helper text below a field
───────────────────────────────────────────────────────── */
export function FormHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('form-hint', className)} {...props} />
}

/* ─────────────────────────────────────────────────────────
   FormError — red error message with icon
───────────────────────────────────────────────────────── */
export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Hide the leading icon */
  noIcon?: boolean
}

export function FormError({ className, noIcon, children, ...props }: FormErrorProps) {
  if (!children) return null
  return (
    <p className={cn('form-error', className)} role="alert" {...props}>
      {!noIcon && <AlertCircle className="h-3 w-3 shrink-0" />}
      {children}
    </p>
  )
}

/* ─────────────────────────────────────────────────────────
   FormSection — titled divider to group related fields
───────────────────────────────────────────────────────── */
export interface FormSectionProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function FormSection({ title, description, className, children }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="form-section-title">{title}</p>
        {description && <p className="form-hint mt-1">{description}</p>}
      </div>
      {children && <div className="space-y-4">{children}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   FormRow — horizontal flex row for side-by-side fields
───────────────────────────────────────────────────────── */
export function FormRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start', className)}
      {...props}
    />
  )
}
