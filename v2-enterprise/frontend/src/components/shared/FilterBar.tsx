'use client'

import React from 'react'
import { Search, X, RefreshCw, Calendar, Filter } from 'lucide-react'
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
  width?: string
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
  dateRange?: DateRangeConfig
  onReset?: () => void
  onRefresh?: () => void
  hasActiveFilters?: boolean
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
  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-card shadow-sm',
      hasActiveFilters ? 'border-primary/25 bg-primary/[0.015]' : '',
      className,
    )}>

      {/* ── Active filters indicator bar ── */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-3 border-b border-primary/15 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-primary/70 shrink-0" />
            <span className="text-[11px] font-semibold text-primary/80">فلاتر نشطة</span>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="h-3 w-3" />
              مسح الكل
            </button>
          )}
        </div>
      )}

      {/* ── Row 1: search + selects + extra ── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center p-3">
        {search && (
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
            {search.value && (
              <button
                type="button"
                onClick={() => search.onChange('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <Input
              placeholder={search.placeholder ?? 'بحث...'}
              value={search.value}
              onChange={e => search.onChange(e.target.value)}
              className={cn(
                'h-9 text-sm rounded-lg border-border/70 bg-background focus:border-primary/40',
                search.value ? 'pe-8' : '',
                'ps-9',
              )}
            />
          </div>
        )}

        {selects?.map((sel, i) => (
          <Select key={i} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger
              className={cn(
                'h-9 text-sm gap-1.5 rounded-lg border-border/70 bg-background',
                sel.value !== 'all' && sel.value !== '' ? 'border-primary/30 text-primary font-medium' : '',
                sel.width ?? 'w-full sm:w-[160px]',
              )}
            >
              {sel.icon && (
                <span className="shrink-0 text-muted-foreground/60">{sel.icon}</span>
              )}
              <SelectValue placeholder={sel.placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {sel.options.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {extra}

        {!dateRange && onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── Row 2: date range ── */}
      {dateRange && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center border-t border-border/40 px-3 py-2.5">
          <div className="flex flex-1 items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 pointer-events-none" />
            <span className="shrink-0 text-[12px] text-muted-foreground font-medium">من:</span>
            <Input
              type="date"
              value={dateRange.from}
              onChange={e => dateRange.onFromChange(e.target.value)}
              className={cn(
                'h-8 min-w-[130px] flex-1 text-xs rounded-lg border-border/70 bg-background',
                dateRange.from ? 'border-primary/30' : '',
              )}
            />
          </div>

          <div className="flex flex-1 items-center gap-2">
            <span className="shrink-0 text-[12px] text-muted-foreground font-medium">إلى:</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={e => dateRange.onToChange(e.target.value)}
              className={cn(
                'h-8 min-w-[130px] flex-1 text-xs rounded-lg border-border/70 bg-background',
                dateRange.to ? 'border-primary/30' : '',
              )}
            />
          </div>

          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
