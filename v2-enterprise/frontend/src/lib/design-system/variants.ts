/**
 * Enterprise Design System v1 — CVA Variants
 * Class Variance Authority configurations utilizing CSS variable semantic tokens.
 */

import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-ring)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--ds-primary)] text-white hover:bg-[var(--ds-primary-hover)] shadow-2xs',
        secondary: 'bg-[var(--ds-background)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] border border-[var(--ds-border)]',
        ghost: 'bg-transparent text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] border border-[var(--ds-border)]',
        danger: 'bg-[var(--ds-danger)] text-white hover:opacity-90 shadow-2xs',
        link: 'text-[var(--ds-primary)] underline-offset-4 hover:underline p-0 h-auto',

        // Backward-compatible aliases for unmigrated ERP pages
        outline: 'bg-[var(--ds-background)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] border border-[var(--ds-border)]',
        destructive: 'bg-[var(--ds-danger)] text-white hover:opacity-90 shadow-2xs',
        glass: 'bg-transparent text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] border border-[var(--ds-border)]',
        default: 'bg-[var(--ds-primary)] text-white hover:bg-[var(--ds-primary-hover)] shadow-2xs',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-xs',
        lg: 'h-10 px-4 text-sm',
        icon: 'h-8 w-8 p-0 justify-center',
        'icon-sm': 'h-7 w-7 p-0 justify-center',
        default: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
)

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border select-none',
  {
    variants: {
      variant: {
        success: 'bg-[var(--ds-success-subtle)] text-[var(--ds-success)] border-[var(--ds-success)]/30',
        warning: 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning)] border-[var(--ds-warning)]/30',
        danger:  'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger)] border-[var(--ds-danger)]/30',
        info:    'bg-[var(--ds-info-subtle)] text-[var(--ds-info)] border-[var(--ds-info)]/30',
        neutral: 'bg-[var(--ds-background)] text-[var(--ds-text-secondary)] border-[var(--ds-border)]',
        outline: 'bg-[var(--ds-background)] text-[var(--ds-text-secondary)] border-[var(--ds-border)]',
        default: 'bg-[var(--ds-success-subtle)] text-[var(--ds-success)] border-[var(--ds-success)]/30',
        destructive: 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger)] border-[var(--ds-danger)]/30',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export const inputVariants = cva(
  'w-full bg-[var(--ds-background)] border border-[var(--ds-border)] rounded-lg px-3 text-xs text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus:bg-white focus:border-[var(--ds-primary)] focus:ring-1 focus:ring-[var(--ds-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  {
    variants: {
      inputSize: {
        sm: 'h-7 text-xs',
        md: 'h-8 text-xs',
        lg: 'h-10 text-sm',
      },
      hasError: {
        true: 'border-[var(--ds-danger)] focus:border-[var(--ds-danger)] focus:ring-[var(--ds-danger)]',
        false: '',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      hasError: false,
    },
  }
)

export const cardVariants = cva(
  'bg-white border border-[var(--ds-border)] rounded-xl shadow-2xs transition-colors',
  {
    variants: {
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      hoverable: {
        true: 'hover:border-[var(--ds-primary)] cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      padding: 'md',
      hoverable: false,
    },
  }
)
