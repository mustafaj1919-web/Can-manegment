import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors border leading-none',
  {
    variants: {
      variant: {
        default:     'border-primary/30     bg-primary/10     text-primary',
        secondary:   'border-border         bg-secondary/50   text-secondary-foreground',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
        outline:     'border-border         bg-transparent    text-foreground',
        success:     'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
        warning:     'border-amber-500/25   bg-amber-500/10   text-amber-400',
        danger:      'border-rose-500/25    bg-rose-500/10    text-rose-400',
        info:        'border-blue-500/25    bg-blue-500/10    text-blue-400',
        accent:      'border-accent/25      bg-accent/10      text-accent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
