import * as React from 'react'
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  /** Singular Arabic label shown in the count, e.g. 'فاتورة' or 'سيارة' */
  label?: string
  compact?: boolean
  className?: string
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  label = 'عنصر',
  compact = false,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft  : ChevronRight
  const FirstIcon = isRtl ? ChevronsRight : ChevronsLeft
  const LastIcon  = isRtl ? ChevronsLeft  : ChevronsRight

  return (
    <div className={cn('table-pagination', className)}>
      {/* Count label */}
      <span className="text-xs text-muted-foreground tabular-nums">
        {compact ? (
          <>{page} / {totalPages}</>
        ) : (
          <>صفحة {page} من {totalPages} · {total.toLocaleString('ar-EG')} {label}</>
        )}
      </span>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* First page */}
        {!compact && (
          <Button
            variant="ghost" size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            aria-label="الصفحة الأولى"
          >
            <FirstIcon className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          variant="ghost" size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 gap-1 px-2.5 text-xs"
          aria-label="الصفحة السابقة"
        >
          <PrevIcon className="h-3 w-3" />
          {!compact && 'السابق'}
        </Button>

        {/* Page number pills — show up to 5 */}
        {!compact && totalPages <= 7 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'h-7 min-w-[28px] rounded-md px-2 text-xs font-medium transition-colors',
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <Button
          variant="ghost" size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-7 gap-1 px-2.5 text-xs"
          aria-label="الصفحة التالية"
        >
          {!compact && 'التالي'}
          <NextIcon className="h-3 w-3" />
        </Button>

        {/* Last page */}
        {!compact && (
          <Button
            variant="ghost" size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="الصفحة الأخيرة"
          >
            <LastIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
