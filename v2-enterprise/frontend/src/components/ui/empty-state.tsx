import * as React from 'react'
import { AlertCircle, SearchX, FolderOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Variant changes the icon container color */
  variant?: 'default' | 'error' | 'search'
  /** Override the icon entirely */
  icon?: React.ReactNode
  title: string
  description?: string
  /** Buttons or links rendered below the description */
  action?: React.ReactNode
  /** Compact presentation for smaller panels and widgets */
  size?: 'default' | 'compact'
  className?: string
}

const DEFAULT_ICONS: Record<string, React.ReactNode> = {
  default: <FolderOpen className="h-6 w-6" />,
  error:   <AlertCircle className="h-6 w-6" />,
  search:  <SearchX className="h-6 w-6" />,
}

const VARIANT_STYLES: Record<string, { ring: string; glow: string; iconColor: string; bg: string }> = {
  default: {
    ring: 'ring-1 ring-white/10',
    glow: 'bg-red-600/5',
    iconColor: 'text-red-500',
    bg: 'from-red-600/5 via-transparent to-transparent',
  },
  error: {
    ring: 'ring-1 ring-rose-500/20',
    glow: 'bg-rose-600/8',
    iconColor: 'text-rose-400',
    bg: 'from-rose-600/5 via-transparent to-transparent',
  },
  search: {
    ring: 'ring-1 ring-amber-500/20',
    glow: 'bg-amber-600/8',
    iconColor: 'text-amber-400',
    bg: 'from-amber-600/5 via-transparent to-transparent',
  },
}

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default
  const isCompact = size === 'compact'

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center overflow-hidden',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        className,
      )}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {/* Background radial glow */}
      <div className={cn(
        'absolute inset-0 bg-gradient-radial pointer-events-none opacity-60',
        styles.bg,
      )} 
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 40%, ${variant === 'error' ? 'rgba(244,63,94,0.06)' : variant === 'search' ? 'rgba(245,158,11,0.06)' : 'rgba(239,27,45,0.04)'}, transparent)` }}
      />

      {/* Decorative dots */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Icon container with premium styling */}
      <div className={cn(
        'relative z-10 flex items-center justify-center rounded-2xl',
        isCompact ? 'h-14 w-14 mb-3' : 'h-18 w-18 mb-5',
        styles.ring,
        'bg-[var(--s2)] shadow-lg',
      )}
        style={isCompact ? {} : { width: '4.5rem', height: '4.5rem' }}
      >
        {/* Subtle glow behind icon */}
        <div className={cn(
          'absolute inset-0 rounded-2xl blur-xl opacity-40',
          styles.glow,
        )} />
        <div className={cn('relative z-10', styles.iconColor)}>
          {icon ?? DEFAULT_ICONS[variant]}
        </div>
      </div>

      {/* Title */}
      <p className={cn(
        'relative z-10 font-bold text-foreground font-family-cairo',
        isCompact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </p>

      {/* Description */}
      {description && (
        <p className={cn(
          'relative z-10 text-muted-foreground mt-1.5 max-w-sm leading-relaxed',
          isCompact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}

      {/* Action buttons */}
      {action && (
        <div className={cn(
          'relative z-10',
          isCompact ? 'mt-3' : 'mt-5',
        )}>
          {action}
        </div>
      )}
    </div>
  )
}
