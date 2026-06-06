'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

/**
 * Generic loading skeleton for tables and lists
 */
export function LoadingSkeleton({ rows = 5, columns = 4, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

interface CardSkeletonProps {
  count?: number
  className?: string
}

/**
 * Loading skeleton for card grids
 */
export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}

interface DetailSkeletonProps {
  className?: string
}

/**
 * Loading skeleton for detail pages
 */
export function DetailSkeleton({ className }: DetailSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <Skeleton className="h-10 w-1/2" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Empty state component when no data exists
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] py-12 px-4 text-center',
        className
      )}
    >
      {icon && <div className="text-6xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  error?: Error | string
  retry?: () => void
  action?: React.ReactNode
  className?: string
}

/**
 * Error state component when data loading fails
 */
export function ErrorState({
  title = 'حدث خطأ',
  description = 'لم نتمكن من تحميل البيانات',
  error,
  retry,
  action,
  className,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : String(error)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] py-12 px-4 text-center',
        className
      )}
    >
      <div className="text-6xl mb-4">❌</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-6 max-w-sm text-sm text-destructive">
          {errorMessage}
        </div>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        {retry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            إعادة المحاولة
          </button>
        )}
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

interface DataStatusProps {
  isLoading?: boolean
  isEmpty?: boolean
  isError?: boolean
  error?: Error | string
  onRetry?: () => void
  children: React.ReactNode
  emptyMessage?: string
  errorTitle?: string
}

/**
 * Wrapper component that handles loading/empty/error states
 * Shows appropriate state based on data fetching status
 */
export function DataStatus({
  isLoading,
  isEmpty,
  isError,
  error,
  onRetry,
  children,
  emptyMessage = 'لا توجد بيانات',
  errorTitle = 'خطأ في تحميل البيانات',
}: DataStatusProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isError) {
    return <ErrorState title={errorTitle} error={error} retry={onRetry} />
  }

  if (isEmpty) {
    return <EmptyState title={emptyMessage} icon="📭" />
  }

  return <>{children}</>
}
