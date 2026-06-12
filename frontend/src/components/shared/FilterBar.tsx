'use client'

import React from 'react'
import { Search, X, RefreshCw, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FilterSelectConfig {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  /** Tailwind width class, defaults to 'w-full sm:w-[150px]' */
  width?: string
  /** Icon shown inside the trigger before the selected value */
  icon?: React.ReactNode
}

export interface DateRangeConfig {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}

export interface FilterBarProps {
  search?: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
  }
  selects?: FilterSelectConfig[]
  /** Optional date range row; when provided, reset/refresh move to this row */
  dateRange?: DateRangeConfig
  onReset?: () => void
  onRefresh?: () => void
  hasActiveFilters?: boolean
  /** Extra controls appended in the main row (e.g. view toggle buttons) */
  extra?: React.ReactNode
  className?: string
}

export function FilterBar({
  search,
  selects,
  dateRange,
  onReset,
  onRefresh,
  hasActiveFilters,
  extra,
  className,
}: FilterBarProps) {
  const resetRefreshButtons = (
    <>
      {hasActiveFilters && onReset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          مسح
        </Button>
      )}
      {onRefresh && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          تحديث
        </Button>
      )}
    </>
  )

  return (
    <div className={cn('app-card rounded-xl p-3.5 space-y-2.5', className)}>

      {/* ── Row 1: search + selects + extra ─────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {search && (
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
            <Input
              placeholder={search.placeholder ?? 'بحث...'}
              value={search.value}
              onChange={e => search.onChange(e.target.value)}
              className="ps-9 h-8 text-sm"
            />
          </div>
        )}

        {selects?.map((sel, i) => (
          <Select key={i} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger
              className={cn('h-8 text-sm gap-1.5', sel.width ?? 'w-full sm:w-[150px]')}
            >
              {sel.icon && (
                <span className="shrink-0 text-muted-foreground/60">{sel.icon}</span>
              )}
              <SelectValue placeholder={sel.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {sel.options.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {extra}

        {/* Reset/refresh in main row only when there is no date range row */}
        {!dateRange && (hasActiveFilters || onRefresh) && (
          <div className="flex shrink-0 items-center gap-0.5">
            {resetRefreshButtons}
          </div>
        )}
      </div>

      {/* ── Row 2: date range (optional) ─────────────────────────────── */}
      {dateRange && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 pointer-events-none" />
            <span className="shrink-0 text-xs text-muted-foreground">من:</span>
            <Input
              type="date"
              value={dateRange.from}
              onChange={e => dateRange.onFromChange(e.target.value)}
              className="h-8 min-w-[130px] flex-1 text-xs"
            />
          </div>

          <div className="flex flex-1 items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">إلى:</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={e => dateRange.onToChange(e.target.value)}
              className="h-8 min-w-[130px] flex-1 text-xs"
            />
          </div>

          {(hasActiveFilters || onRefresh) && (
            <div className="flex shrink-0 items-center gap-0.5">
              {resetRefreshButtons}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
