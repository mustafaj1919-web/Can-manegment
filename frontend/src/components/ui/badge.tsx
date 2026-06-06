import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/10 text-primary',
        secondary: 'border-secondary/50 bg-secondary/30 text-secondary-foreground',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
        info: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
