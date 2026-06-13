'use client'

import React, { useState, useMemo } from 'react'
import {
  EyeOff, ChevronDown, Download, Search, RefreshCw, Printer, Database
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

export interface RowAction<T> {
  label: string
  icon: React.ReactNode
  onClick: (row: T) => void
  variant?: 'default' | 'danger'
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
  renderExpandedRow?: (row: T) => React.ReactNode
  rowActions?: (row: T) => RowAction<T>[]
}

function getStatusBorderClass(status: string | undefined) {
  if (!status) return 'border-r-[3px] border-r-transparent';
  switch (status) {
    case 'Available':
    case 'Paid':
    case 'Active':
      return 'border-r-[3px] border-r-emerald-500/80 group-hover/row:border-r-emerald-400 transition-colors duration-150';
    case 'Reserved':
    case 'Pending':
    case 'Partial':
      return 'border-r-[3px] border-r-amber-500/80 group-hover/row:border-r-amber-400 transition-colors duration-150';
    case 'Sold':
    case 'Cancelled':
      return 'border-r-[3px] border-r-rose-500/60 group-hover/row:border-r-rose-400 transition-colors duration-150';
    case 'Overdue':
      return 'border-r-[3px] border-r-rose-500 animate-pulse-border-red group-hover/row:border-r-rose-400 transition-colors duration-150';
    default:
      return 'border-r-[3px] border-r-transparent';
  }
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
  rowActions,
  searchValue,
  onSearchChange,
  exportFilename = 'report',
  footer,
  renderExpandedRow,
}: AdvancedTableProps<T>) {
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    columns.forEach(col => { initial[col.key] = col.defaultVisible !== false })
    return initial
  })

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    columns.forEach(col => { if (col.width) initial[col.key] = col.width })
    return initial
  })

  const [showColMenu, setShowColMenu] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string | number, boolean>>({})
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null)

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.pageX
    const startWidth = colWidths[key] || 150
    const onMouseMove = (moveEvent: MouseEvent) => {
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onRowSelectionChange) return
    onRowSelectionChange(e.target.checked ? data : [])
  }

  const handleSelectRow = (row: T, checked: boolean) => {
    if (!selectedRows || !onRowSelectionChange) return
    onRowSelectionChange(checked
      ? [...selectedRows, row]
      : selectedRows.filter(r => r.id !== row.id))
  }

  const isAllSelected = selectedRows && data.length > 0 && selectedRows.length === data.length

  const activeCols = useMemo(() => columns.filter(c => visibleCols[c.key]), [columns, visibleCols])

  const handleExportExcel = async () => {
    try {
      const headers = activeCols.map(c => c.header)
      const rows = data.map(row =>
        activeCols.map(c => {
          const val = c.render ? c.render(row) : (row as any)[c.key]
          return typeof val === 'string' || typeof val === 'number' ? val : String((row as any)[c.key] ?? '')
        })
      )
      await exportXlsx(exportFilename, headers, rows)
      toast.success('تم تصدير ملف Excel بنجاح')
    } catch {
      toast.error('فشل تصدير ملف Excel')
    }
  }

  return (
    <div className="space-y-3 w-full print:bg-white print:p-0">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm print:hidden">
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={searchValue ?? ''}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="ps-9 bg-background border-border/70 h-8 text-xs rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Column toggler */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-8 gap-1.5 text-xs border border-border/60 hover:bg-secondary/60 rounded-lg px-3"
            >
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">الأعمدة</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
            </Button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColMenu(false)} />
                <div className="absolute end-0 mt-1.5 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50 select-none">
                    إظهار الأعمدة
                  </p>
                  <div className="mt-0.5 max-h-52 overflow-y-auto space-y-0.5">
                    {columns.map(col => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer text-xs font-medium text-foreground select-none"
                      >
                        <input
                          type="checkbox"
                          checked={!!visibleCols[col.key]}
                          onChange={e => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))}
                          className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                        />
                        {col.header}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 gap-1.5 text-xs border border-border/60 hover:bg-secondary/60 rounded-lg px-3"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 text-xs border border-border/60 hover:bg-secondary/60 rounded-lg px-3"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm print:border-0 print:shadow-none w-full">
        {isLoading ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-sm table-fixed">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50 select-none">
                  {renderExpandedRow && <th className="w-10 px-4 py-3" />}
                  {selectedRows && onRowSelectionChange && <th className="w-10 px-4 py-3" />}
                  {activeCols.map(col => (
                    <th key={col.key} style={{ width: colWidths[col.key] || 150 }} className="px-4 py-3" />
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    {renderExpandedRow && (
                      <td className="px-4 py-3 text-center align-middle">
                        <Skeleton className="h-3.5 w-3.5 rounded mx-auto" />
                      </td>
                    )}
                    {selectedRows && onRowSelectionChange && (
                      <td className="px-4 py-3 text-center align-middle">
                        <Skeleton className="h-3.5 w-3.5 rounded mx-auto" />
                      </td>
                    )}
                    {activeCols.map(col => (
                      <td key={col.key} className="px-4 py-3.5 align-middle">
                        <Skeleton className={cn("h-3 rounded", col.isNumeric ? "ms-auto w-16" : "w-2/3")} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-600">حدث خطأ أثناء تحميل البيانات</p>
            {onRetry && (
              <Button onClick={onRetry} variant="ghost" size="sm" className="border border-border gap-1.5 text-xs rounded-lg">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center">
            <Database className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد سجلات</p>
            <p className="text-xs text-muted-foreground/50 mt-1">جرّب تعديل معايير البحث أو الفلترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-sm table-fixed">
              {/* ── Header ── */}
              <thead>
                <tr className="select-none sticky top-0 z-10">
                  {renderExpandedRow && (
                    <th className="w-10 px-4 py-3 text-center align-middle sticky top-0 z-10 backdrop-blur-md bg-muted/65 border-b border-border/60" />
                  )}
                  {selectedRows && onRowSelectionChange && (
                    <th className="w-10 px-4 py-3 text-center align-middle sticky top-0 z-10 backdrop-blur-md bg-muted/65 border-b border-border/60">
                      <input
                        type="checkbox"
                        checked={!!isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5 animate-in fade-in"
                      />
                    </th>
                  )}
                  {activeCols.map(col => {
                    const width = colWidths[col.key] || 150
                    return (
                      <th
                        key={col.key}
                        style={{ width }}
                        className={cn(
                          'relative px-4 py-3 text-start align-middle group/th sticky top-0 z-10 backdrop-blur-md bg-muted/65 border-b border-border/60 transition-colors duration-150',
                          col.isNumeric && 'text-end',
                        )}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70">
                          {col.header}
                        </span>
                        <div
                          onMouseDown={e => startResize(col.key, e)}
                          className="absolute top-0 bottom-0 end-0 w-1 cursor-col-resize opacity-0 group-hover/th:opacity-100 hover:!opacity-100 bg-primary/40 transition-opacity"
                        />
                      </th>
                    )
                  })}
                  {rowActions && <th className="w-[110px] px-3 py-3 sticky top-0 z-10 backdrop-blur-md bg-muted/65 border-b border-border/60 print:hidden text-end" />}
                </tr>
              </thead>

              {/* ── Body ── */}
              <tbody className="relative">
                <AnimatePresence initial={false}>
                  {data.map((row, idx) => {
                    const isSelected = selectedRows?.some(r => r.id === row.id) ?? false
                    const isExpanded = !!expandedRows[row.id]
                    const rowStatus = (row as any).status
                    const statusBorderClass = getStatusBorderClass(rowStatus)

                    return (
                      <React.Fragment key={row.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          layout="position"
                          onMouseEnter={() => setHoveredRow(row.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={() => {
                            if (renderExpandedRow) {
                              setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))
                            } else {
                              onRowClick?.(row)
                            }
                          }}
                          className={cn(
                            'group/row relative border-b border-border/30 last:border-0 transition-colors duration-150',
                            idx % 2 === 1 && 'bg-secondary/[0.025]',
                            isSelected
                              ? 'bg-primary/[0.04] hover:bg-primary/[0.06]'
                              : isExpanded
                              ? 'bg-bg-elevated'
                              : 'hover:bg-white/[0.03]',
                            (onRowClick || renderExpandedRow) && 'cursor-pointer',
                          )}
                        >
                          {renderExpandedRow && (
                            <td
                              className={cn("px-4 py-4 text-center align-middle h-14", statusBorderClass)}
                              onClick={e => {
                                e.stopPropagation()
                                setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))
                              }}
                            >
                              <ChevronDown className={cn("h-4 w-4 text-muted-foreground/60 transition-transform cursor-pointer", isExpanded && "rotate-180")} />
                            </td>
                          )}
                          {selectedRows && onRowSelectionChange && (
                            <td
                              className={cn("px-4 py-4 text-center align-middle h-14", !renderExpandedRow && statusBorderClass)}
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => handleSelectRow(row, e.target.checked)}
                                className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                              />
                            </td>
                          )}
                          {activeCols.map((col, colIdx) => (
                            <td
                              key={col.key}
                              className={cn(
                                'px-4 py-4 align-middle truncate h-14',
                                (!renderExpandedRow && (!selectedRows || !onRowSelectionChange) && colIdx === 0) && statusBorderClass,
                                col.isNumeric
                                  ? 'text-end font-numeric font-bold text-xs text-foreground'
                                  : 'text-xs text-foreground/85',
                              )}
                            >
                              {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                            </td>
                          ))}
                          {rowActions && (
                            <td className="px-3 py-2 align-middle w-[110px] print:hidden h-14" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity duration-150">
                                {rowActions(row).map((action, ai) => (
                                  <button
                                    key={ai}
                                    onClick={() => action.onClick(row)}
                                    title={action.label}
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors duration-100 whitespace-nowrap',
                                      action.variant === 'danger'
                                        ? 'text-rose-400 hover:bg-rose-500/10'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                                    )}
                                  >
                                    {action.icon}
                                    <span>{action.label}</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          )}
                        </motion.tr>
                        {isExpanded && renderExpandedRow && (
                          <tr className="bg-bg-page/50 border-b border-border-subtle select-text">
                            <td colSpan={activeCols.length + (selectedRows ? 1 : 0) + 1} className="px-6 py-4">
                              <div className="animate-fade-in">
                                {renderExpandedRow(row)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        {footer && (
          <div className="border-t border-border/50 bg-muted/20 px-4 py-2.5 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

