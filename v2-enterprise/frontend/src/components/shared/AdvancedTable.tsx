'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  EyeOff, ChevronDown, Download, Search, RefreshCw, Printer, Database,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Layers
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
  minWidth?: number
  maxWidth?: number
  isNumeric?: boolean
  sortable?: boolean
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
  storageKey?: string
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  onSortChange?: (key: string) => void
  density?: 'compact' | 'comfortable'
  onDensityChange?: (density: 'compact' | 'comfortable') => void
  onFilterDrawerToggle?: () => void
  activeFilterCount?: number
  primaryAction?: React.ReactNode
  quickFilterControl?: React.ReactNode
}

const STORAGE_KEY_DEFAULT = 'car_showroom_v2_sales_table_config_v1'

function getStatusBorderClass(status: string | undefined) {
  if (!status) return 'border-r-[3px] border-r-transparent';
  switch (status) {
    case 'Available':
    case 'Paid':
    case 'Active':
      return 'border-r-[3px] border-r-emerald-600 transition-colors duration-150';
    case 'Reserved':
    case 'Pending':
    case 'Partial':
      return 'border-r-[3px] border-r-amber-500 transition-colors duration-150';
    case 'Sold':
    case 'Cancelled':
      return 'border-r-[3px] border-r-rose-600 transition-colors duration-150';
    case 'Overdue':
      return 'border-r-[3px] border-r-rose-600 transition-colors duration-150';
    default:
      return 'border-r-[3px] border-r-transparent';
  }
}

/**
 * @deprecated Use canonical `DataTable` from `@/components/enterprise/data-table/DataTable` for all new pages.
 * `AdvancedTable` is maintained strictly as a legacy compatibility layer for unmigrated ERP pages.
 */
export function AdvancedTable<T extends { id: number | string }>({
  data,
  columns,
  isLoading = false,
  isError = false,
  onRetry,
  onRowClick,
  selectedRows,
  onRowSelectionChange,
  searchPlaceholder = 'بحث في السجلات...',
  rowActions,
  searchValue,
  onSearchChange,
  exportFilename = 'تقرير-المبيعات',
  footer,
  renderExpandedRow,
  storageKey = STORAGE_KEY_DEFAULT,
  sortKey,
  sortDir,
  onSortChange,
  density: externalDensity,
  onDensityChange,
  onFilterDrawerToggle,
  activeFilterCount = 0,
  primaryAction,
  quickFilterControl,
}: AdvancedTableProps<T>) {
  // ── Client-side state & LocalStorage hydration ──
  const [internalDensity, setInternalDensity] = useState<'compact' | 'comfortable'>('compact')
  const density = externalDensity ?? internalDensity

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
  const [showDensityMenu, setShowDensityMenu] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string | number, boolean>>({})

  // Hydrate preferences from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.density && !externalDensity) setInternalDensity(parsed.density)
        if (parsed.visibleCols) setVisibleCols(prev => ({ ...prev, ...parsed.visibleCols }))
        if (parsed.colWidths) setColWidths(prev => ({ ...prev, ...parsed.colWidths }))
      }
    } catch {
      // LocalStorage access safe fallback
    }
  }, [storageKey, externalDensity])

  // Persist preferences to LocalStorage
  const saveConfig = (newDensity?: 'compact' | 'comfortable', newCols?: Record<string, boolean>, newWidths?: Record<string, number>) => {
    try {
      const config = {
        density: newDensity ?? density,
        visibleCols: newCols ?? visibleCols,
        colWidths: newWidths ?? colWidths,
      }
      localStorage.setItem(storageKey, JSON.stringify(config))
    } catch {
      // ignore write errors
    }
  }

  const handleDensitySelect = (mode: 'compact' | 'comfortable') => {
    if (onDensityChange) onDensityChange(mode)
    else setInternalDensity(mode)
    saveConfig(mode)
    setShowDensityMenu(false)
  }

  const handleColumnToggle = (key: string, checked: boolean) => {
    const updated = { ...visibleCols, [key]: checked }
    setVisibleCols(updated)
    saveConfig(undefined, updated)
  }

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.pageX
    const startWidth = colWidths[key] || 140
    const colDef = columns.find(c => c.key === key)
    const minW = colDef?.minWidth ?? 80
    const maxW = colDef?.maxWidth ?? 450

    const onMouseMove = (moveEvent: MouseEvent) => {
      const isRtl = document.documentElement.dir === 'rtl'
      const diff = moveEvent.pageX - startX
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + (isRtl ? -diff : diff)))
      setColWidths(prev => {
        const next = { ...prev, [key]: newWidth }
        saveConfig(undefined, undefined, next)
        return next
      })
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
          const val = (row as any)[c.key]
          return typeof val === 'string' || typeof val === 'number' ? val : String(val ?? '')
        })
      )
      await exportXlsx(exportFilename, headers, rows)
      toast.success('تم تصدير ملف Excel بنجاح')
    } catch {
      toast.error('فشل تصدير ملف Excel')
    }
  }

  // Row height & padding classes based on density constraint
  // Compact: 44-48px height (`h-11`, `py-2 px-3`)
  // Comfortable: 56-60px height (`h-14`, `py-3.5 px-3.5`)
  const rowHeightClass = density === 'compact' ? 'h-11 py-2 px-3' : 'h-14 py-3.5 px-3.5'
  const headerPaddingClass = density === 'compact' ? 'py-2 px-3' : 'py-3 px-3.5'

  return (
    <div className="space-y-3 w-full print:bg-white print:p-0">

      {/* ── Enterprise Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 shadow-2xs print:hidden">
        
        {/* Leading: Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
            <Input
              value={searchValue ?? ''}
              onChange={e => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="ps-8 pe-12 bg-[#F8FAFC] border-[#E5E7EB] h-8 text-xs rounded-lg text-[#111827] focus:bg-white focus:border-[#0F766E] focus:ring-[#0F766E]"
            />
            <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 inline-flex h-4 select-none items-center gap-0.5 rounded border border-[#E5E7EB] bg-white px-1 text-[9px] font-medium text-[#6B7280]">
              ⌘K
            </kbd>
          </div>

          {quickFilterControl}
        </div>

        {/* Trailing Controls: Secondary Ghost Buttons & Primary CTA */}
        <div className="flex items-center gap-1.5 flex-wrap ms-auto">
          {/* Advanced Filter Drawer Button */}
          {onFilterDrawerToggle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFilterDrawerToggle}
              className="h-8 gap-1.5 text-xs text-[#374151] hover:bg-[#F1F5F9] hover:text-[#111827] border border-[#E5E7EB] rounded-lg px-2.5"
            >
              <Filter className="h-3.5 w-3.5 text-[#0F766E]" />
              <span>تصفية</span>
              {activeFilterCount > 0 && (
                <span className="ms-0.5 inline-flex items-center justify-center rounded-full bg-[#0F766E] text-white text-[10px] font-bold h-4 w-4">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}

          {/* Density Switcher */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDensityMenu(!showDensityMenu)}
              className="h-8 gap-1 text-xs text-[#374151] hover:bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg px-2.5"
            >
              <Layers className="h-3.5 w-3.5 text-[#6B7280]" />
              <span className="hidden md:inline">{density === 'compact' ? 'كثيف (44px)' : 'مريح (56px)'}</span>
            </Button>
            {showDensityMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDensityMenu(false)} />
                <div className="absolute end-0 mt-1 w-40 rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg z-40 text-right" dir="rtl">
                  <p className="px-2 py-1 text-[10px] font-semibold text-[#6B7280]">ارتفاع الصفوف</p>
                  <button
                    type="button"
                    onClick={() => handleDensitySelect('compact')}
                    className={cn(
                      'w-full text-right px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors',
                      density === 'compact' ? 'bg-[#F0FDFA] text-[#0F766E] font-bold' : 'text-[#374151] hover:bg-[#F8FAFC]'
                    )}
                  >
                    كثيف (44px)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDensitySelect('comfortable')}
                    className={cn(
                      'w-full text-right px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors',
                      density === 'comfortable' ? 'bg-[#F0FDFA] text-[#0F766E] font-bold' : 'text-[#374151] hover:bg-[#F8FAFC]'
                    )}
                  >
                    مريح (56px)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Column Visibility Toggler */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-8 gap-1.5 text-xs text-[#374151] hover:bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg px-2.5"
            >
              <EyeOff className="h-3.5 w-3.5 text-[#6B7280]" />
              <span className="hidden sm:inline">الأعمدة</span>
              <ChevronDown className="h-3 w-3 text-[#6B7280]" />
            </Button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColMenu(false)} />
                <div className="absolute end-0 mt-1 w-48 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-xl z-40 text-right" dir="rtl">
                  <p className="px-2 py-1.5 text-[10px] font-semibold text-[#6B7280]">
                    إظهار الأعمدة
                  </p>
                  <div className="mt-0.5 max-h-52 overflow-y-auto space-y-0.5">
                    {columns.map(col => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#F8FAFC] cursor-pointer text-xs font-medium text-[#111827]"
                      >
                        <input
                          type="checkbox"
                          checked={!!visibleCols[col.key]}
                          onChange={e => handleColumnToggle(col.key, e.target.checked)}
                          className="rounded border-[#E5E7EB] text-[#0F766E] focus:ring-[#0F766E] h-3.5 w-3.5"
                        />
                        <span>{col.header}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Excel Export */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 gap-1.5 text-xs text-[#374151] hover:bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg px-2.5"
          >
            <Download className="h-3.5 w-3.5 text-[#6B7280]" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          {/* Print */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 text-xs text-[#374151] hover:bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg px-2.5"
          >
            <Printer className="h-3.5 w-3.5 text-[#6B7280]" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>

          {/* Primary Action Button */}
          {primaryAction}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-2xs print:border-0 print:shadow-none w-full">
        {isLoading ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-xs table-fixed">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC]">
                  {renderExpandedRow && <th className="w-9 px-3 py-2.5" />}
                  {selectedRows && onRowSelectionChange && <th className="w-9 px-3 py-2.5" />}
                  {activeCols.map(col => (
                    <th key={col.key} style={{ width: colWidths[col.key] || 140 }} className="px-3 py-2.5" />
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E5E7EB] last:border-0">
                    {renderExpandedRow && (
                      <td className="px-3 py-3 text-center align-middle">
                        <Skeleton className="h-3.5 w-3.5 rounded mx-auto" />
                      </td>
                    )}
                    {selectedRows && onRowSelectionChange && (
                      <td className="px-3 py-3 text-center align-middle">
                        <Skeleton className="h-3.5 w-3.5 rounded mx-auto" />
                      </td>
                    )}
                    {activeCols.map(col => (
                      <td key={col.key} className="px-3 py-3 align-middle">
                        <Skeleton className={cn("h-3 rounded", col.isNumeric ? "ms-auto w-16" : "w-2/3")} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="py-12 text-center space-y-2.5">
            <p className="text-xs font-semibold text-[#DC2626]">حدث خطأ في تحميل بيانات الجدول</p>
            {onRetry && (
              <Button type="button" onClick={onRetry} variant="ghost" size="sm" className="border border-[#E5E7EB] gap-1.5 text-xs rounded-lg">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="py-14 text-center">
            <Database className="h-7 w-7 text-[#9CA3AF] mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-[#374151]">لا توجد سجلات مطابقة</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">جرّب تعديل معايير البحث أو التصفية الحالية</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-xs table-fixed">
              {/* ── Sticky Header ── */}
              <thead>
                <tr className="select-none sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E5E7EB]">
                  {renderExpandedRow && (
                    <th className={cn("w-9 text-center align-middle sticky top-0 z-10 bg-[#F8FAFC]", headerPaddingClass)} />
                  )}
                  {selectedRows && onRowSelectionChange && (
                    <th className={cn("w-9 text-center align-middle sticky top-0 z-10 bg-[#F8FAFC]", headerPaddingClass)}>
                      <input
                        type="checkbox"
                        checked={!!isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-[#E5E7EB] text-[#0F766E] focus:ring-[#0F766E] h-3.5 w-3.5"
                      />
                    </th>
                  )}
                  {activeCols.map(col => {
                    const width = colWidths[col.key] || 140
                    const isSorted = sortKey === col.key
                    return (
                      <th
                        key={col.key}
                        style={{ width }}
                        onClick={() => col.sortable !== false && onSortChange?.(col.key)}
                        className={cn(
                          'relative text-start align-middle group/th sticky top-0 z-10 bg-[#F8FAFC] font-semibold text-[#374151] transition-colors',
                          headerPaddingClass,
                          col.sortable !== false && 'cursor-pointer hover:bg-[#F1F5F9]',
                          col.isNumeric && 'text-end',
                        )}
                      >
                        <div className={cn("flex items-center gap-1.5", col.isNumeric && "justify-end")}>
                          <span className="text-xs font-semibold text-[#374151]">
                            {col.header}
                          </span>
                          {col.sortable !== false && (
                            <span className="text-[#9CA3AF] group-hover/th:text-[#0F766E] transition-colors">
                              {isSorted ? (
                                sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-[#0F766E]" /> : <ArrowDown className="h-3 w-3 text-[#0F766E]" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                              )}
                            </span>
                          )}
                        </div>
                        {/* RTL Resizer: handle on left border of th (end of cell in RTL) */}
                        <div
                          onMouseDown={e => startResize(col.key, e)}
                          onClick={e => e.stopPropagation()}
                          className="absolute top-0 bottom-0 start-0 w-1 cursor-col-resize opacity-0 group-hover/th:opacity-100 hover:!opacity-100 bg-[#0F766E] transition-opacity"
                        />
                      </th>
                    )
                  })}
                  {rowActions && (
                    <th className={cn("w-28 sticky top-0 z-10 bg-[#F8FAFC] print:hidden text-end", headerPaddingClass)} />
                  )}
                </tr>
              </thead>

              {/* ── Table Body ── */}
              <tbody>
                <AnimatePresence initial={false}>
                  {data.map((row, idx) => {
                    const isSelected = selectedRows?.some(r => r.id === row.id) ?? false
                    const isExpanded = !!expandedRows[row.id]
                    const rowStatus = (row as any).status
                    const statusBorderClass = getStatusBorderClass(rowStatus)

                    return (
                      <React.Fragment key={row.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -2 }}
                          transition={{ duration: 0.12 }}
                          layout="position"
                          tabIndex={0}
                          onClick={() => {
                            if (renderExpandedRow) {
                              setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))
                            } else {
                              onRowClick?.(row)
                            }
                          }}
                          className={cn(
                            'group/row relative border-b border-[#E5E7EB] last:border-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-1',
                            idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white',
                            isSelected
                              ? 'bg-[#F0FDFA] hover:bg-[#CCFBF1]'
                              : isExpanded
                              ? 'bg-[#F8FAFC]'
                              : 'hover:bg-[#F1F5F9]',
                            (onRowClick || renderExpandedRow) && 'cursor-pointer',
                          )}
                        >
                          {renderExpandedRow && (
                            <td
                              className={cn("text-center align-middle", rowHeightClass, statusBorderClass)}
                              onClick={e => {
                                e.stopPropagation()
                                setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))
                              }}
                            >
                              <ChevronDown className={cn("h-3.5 w-3.5 text-[#6B7280] transition-transform cursor-pointer mx-auto", isExpanded && "rotate-180")} />
                            </td>
                          )}
                          {selectedRows && onRowSelectionChange && (
                            <td
                              className={cn("text-center align-middle", rowHeightClass, !renderExpandedRow && statusBorderClass)}
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => handleSelectRow(row, e.target.checked)}
                                className="rounded border-[#E5E7EB] text-[#0F766E] focus:ring-[#0F766E] h-3.5 w-3.5"
                              />
                            </td>
                          )}
                          {activeCols.map((col, colIdx) => (
                            <td
                              key={col.key}
                              className={cn(
                                'align-middle truncate text-xs text-[#111827]',
                                rowHeightClass,
                                (!renderExpandedRow && (!selectedRows || !onRowSelectionChange) && colIdx === 0) && statusBorderClass,
                                col.isNumeric && 'text-end font-numeric font-semibold',
                              )}
                            >
                              {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                            </td>
                          ))}
                          {rowActions && (
                            <td className={cn("align-middle w-28 print:hidden text-end", rowHeightClass)} onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1 justify-end opacity-0 group-hover/row:opacity-100 transition-opacity duration-150">
                                {rowActions(row).map((action, ai) => (
                                  <button
                                    key={ai}
                                    type="button"
                                    onClick={() => action.onClick(row)}
                                    title={action.label}
                                    className={cn(
                                      'flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap',
                                      action.variant === 'danger'
                                        ? 'text-[#DC2626] hover:bg-rose-50'
                                        : 'text-[#4B5563] hover:bg-[#E5E7EB] hover:text-[#111827]',
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

                        {/* Expanded Payment Row Details */}
                        {isExpanded && renderExpandedRow && (
                          <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB] select-text">
                            <td colSpan={activeCols.length + (selectedRows ? 1 : 0) + 1 + (rowActions ? 1 : 0)} className="p-3.5">
                              <div className="animate-in fade-in duration-150">
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
          <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] px-3.5 py-2 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
