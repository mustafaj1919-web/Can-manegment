import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { EmptyStateProps } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface LoadingRowsProps {
  count: number
}

function LoadingRows({ count }: LoadingRowsProps) {
  return (
    <div className="divide-y divide-border/40" role="status" aria-label="جاري تحميل البيانات">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export interface DataTableProps {
  /**
   * The <table> element (or any content) to render when data is available.
   * Wrap in a native <table className="app-table"> or use the Table primitive.
   */
  children: React.ReactNode
  /** While the query is in-flight */
  isLoading?: boolean
  /** Query returned an error */
  isError?: boolean
  /** Query succeeded but returned zero rows */
  isEmpty?: boolean
  /** Number of skeleton rows shown during loading */
  loadingRows?: number
  /** Props for the empty EmptyState (variant defaults to 'default') */
  emptyProps?: Partial<EmptyStateProps>
  /** Props for the error EmptyState (variant is always 'error') */
  errorProps?: Partial<Omit<EmptyStateProps, 'variant'>>
  /** Called from both the error retry button and can be wired externally */
  onRetry?: () => void
  /** Content appended below the table — typically a <Pagination /> */
  footer?: React.ReactNode
  className?: string
}

export function DataTable({
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingRows = 6,
  emptyProps,
  errorProps,
  onRetry,
  footer,
  className,
}: DataTableProps) {
  return (
    <div
      className={cn('app-card overflow-hidden rounded-xl', className)}
      aria-busy={isLoading || undefined}
      data-table-state={isLoading ? 'loading' : isError ? 'error' : isEmpty ? 'empty' : 'ready'}
    >
      {isLoading ? (
        <LoadingRows count={loadingRows} />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="تعذّر تحميل البيانات"
          description="تحقق من اتصال الخادم ثم أعد المحاولة"
          action={
            onRetry && (
              <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
                إعادة المحاولة
              </Button>
            )
          }
          {...errorProps}
        />
      ) : isEmpty ? (
        <EmptyState
          variant="default"
          title="لا توجد بيانات"
          {...emptyProps}
        />
      ) : (
        <>
          <div className="overflow-x-auto">{children}</div>
          {footer}
        </>
      )}
    </div>
  )
}
