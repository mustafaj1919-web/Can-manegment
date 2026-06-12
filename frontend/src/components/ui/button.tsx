import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'app-button inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-45 active:translate-y-px active:scale-[0.985] motion-reduce:transition-none motion-reduce:transform-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /* Solid primary — blue */
        default:
          'rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 active:shadow-none aria-pressed:bg-primary/80',

        /* Destructive — red */
        destructive:
          'rounded-lg bg-destructive font-semibold text-destructive-foreground shadow-sm shadow-destructive/25 hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20 active:shadow-none',

        /* Outline — bordered transparent */
        outline:
          'rounded-lg border border-input bg-transparent text-foreground shadow-xs hover:border-primary/30 hover:bg-primary/[0.06] active:bg-primary/[0.10] aria-pressed:border-primary/35 aria-pressed:bg-primary/10',

        /* Secondary — muted surface */
        secondary:
          'rounded-lg border border-transparent bg-secondary text-secondary-foreground hover:border-border hover:bg-secondary/75 active:bg-secondary/60 aria-pressed:border-primary/25 aria-pressed:bg-primary/10',

        /* Ghost — minimal */
        ghost:
          'rounded-lg text-muted-foreground hover:bg-primary/[0.07] hover:text-foreground active:bg-primary/[0.12] aria-pressed:bg-primary/10 aria-pressed:text-foreground',

        /* Link */
        link:
          'rounded text-primary underline-offset-4 hover:underline p-0 h-auto',

        /* Glass — for elevated surfaces */
        glass:
          'rounded-lg glass-interactive text-foreground active:translate-y-0',

        /* Accent — emerald */
        accent:
          'rounded-lg bg-accent font-semibold text-accent-foreground shadow-sm shadow-accent/20 hover:bg-accent/90 hover:shadow-md hover:shadow-accent/15 active:shadow-none',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm [&_svg]:size-4',
        sm:      'h-7 rounded-md px-3 text-xs [&_svg]:size-3.5',
        lg:      'h-10 rounded-lg px-5 text-sm [&_svg]:size-4',
        xl:      'h-11 rounded-lg px-7 text-base [&_svg]:size-5',
        icon:    'h-9 w-9 rounded-lg [&_svg]:size-4',
        'icon-sm':'h-7 w-7 rounded-md [&_svg]:size-3.5',
        'icon-lg':'h-10 w-10 rounded-lg [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
