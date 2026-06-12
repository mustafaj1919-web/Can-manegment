'use client'

import React, { useState, useMemo } from 'react'
import { 
  EyeOff, ChevronDown, Download, Search, RefreshCw, Printer
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  defaultVisible?: boolean
  width?: number
  isNumeric?: boolean
}

export interface AdvancedTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onRowClick?: (row: T) => void
  selectedRows?: T[]
  onRowSelectionChange?: (selected: T[]) => void
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (val: string) => void
  exportFilename?: string
  footer?: React.ReactNode
}

export function AdvancedTable<T extends { id: number | string }>({
  data,
  columns,
  isLoading = false,
  isError = false,
  onRetry,
  onRowClick,
  selectedRows,
  onRowSelectionChange,
  searchPlaceholder = 'بحث...',
  searchValue,
  onSearchChange,
  exportFilename = 'report',
  footer,
}: AdvancedTableProps<T>) {
  // Column visibility state
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    columns.forEach(col => {
      initial[col.key] = col.defaultVisible !== false
    })
    return initial
  })

  // Column width resize state
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    columns.forEach(col => {
      if (col.width) initial[col.key] = col.width
    })
    return initial
  })

  const [showColMenu, setShowColMenu] = useState(false)

  // Resizing handler
  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.pageX
    const startWidth = colWidths[key] || 150

    const onMouseMove = (moveEvent: MouseEvent) => {
      // For RTL, pageX direction is inverted, so we subtract instead of adding
      const isRtl = document.documentElement.dir === 'rtl'
      const diff = moveEvent.pageX - startX
      const newWidth = Math.max(80, startWidth + (isRtl ? -diff : diff))
      setColWidths(prev => ({ ...prev, [key]: newWidth }))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Row selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onRowSelectionChange) return
    if (e.target.checked) {
      onRowSelectionChange(data)
    } else {
      onRowSelectionChange([])
    }
  }

  const handleSelectRow = (row: T, checked: boolean) => {
    if (!selectedRows || !onRowSelectionChange) return
    if (checked) {
      onRowSelectionChange([...selectedRows, row])
    } else {
      onRowSelectionChange(selectedRows.filter(r => r.id !== row.id))
    }
  }

  const isAllSelected = selectedRows && data.length > 0 && selectedRows.length === data.length

  // Columns that are actually visible
  const activeCols = useMemo(() => {
    return columns.filter(c => visibleCols[c.key])
  }, [columns, visibleCols])

  // Excel export handler
  const handleExportExcel = async () => {
    try {
      const headers = activeCols.map(c => c.header)
      const rows = data.map(row => {
        return activeCols.map(c => {
          // Simple stringify helper
          const renderedVal = c.render ? c.render(row) : (row as any)[c.key]
          if (typeof renderedVal === 'string' || typeof renderedVal === 'number') {
            return renderedVal
          }
          // fallback to string
          return String((row as any)[c.key] ?? '')
        })
      })
      await exportXlsx(exportFilename, headers, rows)
      toast.success('تم تصدير ملف Excel بنجاح')
    } catch (err) {
      toast.error('فشل تصدير ملف Excel')
    }
  }

  return (
    <div className="space-y-3.5 w-full print:bg-white print:p-0">
      
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/60 rounded-xl p-3.5 shadow-sm print:hidden">
        
        {/* Search */}
        <div className="relative min-w-[260px] flex-1 sm:flex-initial">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            value={searchValue ?? ''}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="ps-9 bg-background border-border/80 h-9 text-xs rounded-lg"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Column toggler */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-9 gap-1.5 text-xs border-border/80 hover:bg-secondary/50 rounded-lg px-3"
            >
              <EyeOff className="h-3.5 w-3.5" />
              الأعمدة
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
            
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColMenu(false)} />
                <div className="absolute end-0 mt-1.5 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 py-1 select-none">إظهار/إخفاء الأعمدة</p>
                  <div className="max-h-56 overflow-y-auto mt-1 space-y-0.5">
                    {columns.map(col => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer text-xs font-medium text-foreground select-none"
                      >
                        <input
                          type="checkbox"
                          checked={!!visibleCols[col.key]}
                          onChange={e => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))}
                          className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                        />
                        <span>{col.header}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export options */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 text-xs border-border/80 hover:bg-secondary/50 rounded-lg px-3"
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 text-xs border-border/80 hover:bg-secondary/50 rounded-lg px-3"
          >
            <Printer className="h-3.5 w-3.5" />
            PDF / طباعة
          </Button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm print:border-0 print:shadow-none w-full">
        {isLoading ? (
          <div className="divide-y divide-border/30 w-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3 rounded" />
                  <Skeleton className="h-2.5 w-1/5 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-rose-600">حدث خطأ أثناء تحميل البيانات</p>
            {onRetry && (
              <Button onClick={onRetry} variant="ghost" size="sm" className="mt-3 border border-border gap-1.5 text-xs rounded-lg">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs text-muted-foreground">لا توجد سجلات لعرضها حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-sm table-fixed">
              <thead>
                <tr className="bg-secondary/35 border-b border-border/60 text-xs text-muted-foreground sticky top-0 z-10 select-none">
                  {/* Row selection checkbox header */}
                  {selectedRows && onRowSelectionChange && (
                    <th className="w-10 px-4 py-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                      />
                    </th>
                  )}

                  {/* Dynamic column headers */}
                  {activeCols.map(col => {
                    const width = colWidths[col.key] || 150
                    return (
                      <th
                        key={col.key}
                        style={{ width }}
                        className={cn(
                          "px-5 py-3 font-semibold relative select-none group/th text-start align-middle",
                          col.isNumeric && "text-end"
                        )}
                      >
                        {col.header}
                        
                        {/* Drag handle resize */}
                        <div
                          onMouseDown={e => startResize(col.key, e)}
                          className="absolute top-0 bottom-0 end-0 w-1 cursor-col-resize hover:bg-primary/55 group-hover/th:bg-border/60 transition-colors"
                        />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.map(row => {
                  const isSelected = selectedRows?.some(r => r.id === row.id) ?? false
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "hover:bg-secondary/15 transition-all duration-150 cursor-pointer",
                        isSelected && "bg-primary/[0.02] hover:bg-primary/[0.04]",
                        onRowClick ? "cursor-pointer" : "cursor-default"
                      )}
                    >
                      {/* Checkbox cell */}
                      {selectedRows && onRowSelectionChange && (
                        <td
                          className="px-4 py-3 text-center align-middle"
                          onClick={e => e.stopPropagation()} // Prevent triggering onRowClick
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectRow(row, e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                          />
                        </td>
                      )}

                      {/* Data cells */}
                      {activeCols.map(col => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-5 py-3 text-xs leading-normal align-middle truncate font-medium text-foreground/80",
                            col.isNumeric && "text-end font-numeric font-semibold"
                          )}
                        >
                          {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination/Footer */}
        {footer && (
          <div className="border-t border-border/50 bg-secondary/5 px-4 py-2.5 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
