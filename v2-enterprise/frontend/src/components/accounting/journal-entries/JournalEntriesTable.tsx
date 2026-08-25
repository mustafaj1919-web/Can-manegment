'use client'

import React from 'react'
import { JournalEntryItem } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/design-system/formatting'
import { TableDensity } from './JournalEntriesToolbar'
import { Eye, RotateCcw, MoreHorizontal, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface JournalEntriesTableProps {
  items: JournalEntryItem[]
  onSelectRow: (item: JournalEntryItem) => void
  selectedEntryId?: string | number | null
  onReverseEntry: (item: JournalEntryItem) => void
  isReversing?: boolean
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  density: TableDensity
  columnsVisibility: Record<string, boolean>
}

export function JournalEntriesTable({
  items,
  onSelectRow,
  selectedEntryId,
  onReverseEntry,
  isReversing = false,
  isLoading = false,
  isError = false,
  onRetry,
  density,
  columnsVisibility,
}: JournalEntriesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-11 w-full rounded bg-[#F9FAFB] animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs">
        <AlertCircle className="mx-auto h-8 w-8 text-[#B42318]" />
        <p className="mt-2 text-sm font-semibold text-[#101828]">تعذر تحميل سجل القيود اليومية</p>
        <p className="mt-1 text-xs text-[#667085]">يرجى التحقق من اتصال الشبكة ثم إرسال الطلب مجدداً</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#175CD3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1570EF]"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    )
  }

  let rowHeightClass = 'h-[46px]'
  if (density === 'compact') rowHeightClass = 'h-[38px]'
  else if (density === 'comfortable') rowHeightClass = 'h-[52px]'

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white shadow-xs overflow-hidden text-right dir-rtl" dir="rtl">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[520px]">
        <table className="w-full min-w-[1150px] border-collapse text-xs">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10 bg-[#F2F4F7] border-b border-[#D0D5DD]">
            <tr className="text-[#475467] font-semibold text-xs h-11">
              <th className="px-3 py-2 text-right w-[110px]">تاريخ القيد</th>
              <th className="px-2.5 py-2 text-right w-[130px]">رقم القيد</th>
              {columnsVisibility.ref_type !== false && <th className="px-2 py-2 text-right w-[110px]">نوع القيد</th>}
              <th className="px-3 py-2 text-right min-w-[280px]">الوصف والبيان</th>
              <th className="px-2.5 py-2 text-right w-[120px]">المرجع</th>
              {columnsVisibility.lines_count !== false && <th className="px-2 py-2 text-center w-[80px]">عدد البنود</th>}
              <th className="px-2.5 py-2 text-left w-[130px]">إجمالي المدين</th>
              <th className="px-2.5 py-2 text-left w-[130px]">إجمالي الدائن</th>
              {columnsVisibility.status !== false && <th className="px-2 py-2 text-center w-[85px]">الحالة</th>}
              <th className="px-2 py-2 text-center w-[52px]">الإجراءات</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#EAECF0]">
            {items.length > 0 ? (
              items.map(item => {
                const isSelected = selectedEntryId === item.id

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectRow(item)}
                    className={cn(
                      'border-b border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors cursor-pointer group bg-white',
                      rowHeightClass,
                      isSelected && 'bg-[#EFF8FF] border-r-4 border-r-[#1570EF]'
                    )}
                  >
                    {/* Date */}
                    <td className="px-3 py-1 text-[#344054] font-medium whitespace-nowrap text-right w-[110px]">
                      {item.entry_date ? new Date(item.entry_date).toLocaleDateString('ar-IQ') : '—'}
                    </td>

                    {/* Entry Number */}
                    <td className="px-2.5 py-1 font-mono font-bold text-[#175CD3] whitespace-nowrap text-right w-[130px]">
                      <span className="dir-ltr inline-block tracking-tight text-[13px]" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                        {item.reference_number}
                      </span>
                    </td>

                    {/* Ref Type */}
                    {columnsVisibility.ref_type !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-right w-[110px] text-xs text-[#344054] font-medium">
                        {(item as any).ref_type || item.reference_type || 'قيد عام'}
                      </td>
                    )}

                    {/* Description */}
                    <td className="px-3 py-1 min-w-[280px] text-xs text-[#101828] font-medium truncate">
                      {item.description || 'بدون بيان'}
                    </td>

                    {/* Reference ID / Code */}
                    <td className="px-2.5 py-1 font-mono text-[#667085] whitespace-nowrap text-right w-[120px] truncate">
                      {(item as any).ref_id || item.reference_number || '—'}
                    </td>

                    {/* Line Count */}
                    {columnsVisibility.lines_count !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-center w-[80px] font-numeric font-semibold text-[#344054]">
                        {item.lines?.length || item.line_count || 0}
                      </td>
                    )}

                    {/* Debit Total */}
                    <td className="px-2.5 py-1 whitespace-nowrap text-left w-[130px] font-numeric text-[13.5px] font-semibold text-[#175CD3] tabular-nums dir-ltr">
                      {formatMoney(item.total_debit, 'IQD')}
                    </td>

                    {/* Credit Total */}
                    <td className="px-2.5 py-1 whitespace-nowrap text-left w-[130px] font-numeric text-[13.5px] font-semibold text-[#067647] tabular-nums dir-ltr">
                      {formatMoney(item.total_credit, 'IQD')}
                    </td>

                    {/* Status Badge */}
                    {columnsVisibility.status !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-center w-[85px]">
                        {item.status === 'posted' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#027A48]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
                            <span>مرحل</span>
                          </span>
                        ) : item.status === 'reversed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B42318]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F04438]" />
                            <span>معكوس</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#667085]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#98A2B3]" />
                            <span>مسودة</span>
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions Menu */}
                    <td className="px-2 py-1 whitespace-nowrap text-center w-[52px]" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu dir="rtl">
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D0D5DD] bg-white text-[#667085] hover:text-[#101828] transition-colors mx-auto"
                            aria-label="خيارات القيد"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-right">
                          <DropdownMenuItem onClick={() => onSelectRow(item)} className="gap-2 text-xs font-semibold cursor-pointer py-2">
                            <Eye className="h-4 w-4 text-[#175CD3]" />
                            <span>عرض التفاصيل والبنود</span>
                          </DropdownMenuItem>

                          {item.status !== 'reversed' && (
                            <DropdownMenuItem
                              onClick={() => onReverseEntry(item)}
                              className="gap-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] cursor-pointer py-2"
                            >
                              <RotateCcw className="h-4 w-4 text-[#B42318]" />
                              <span>عكس هذا القيد</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={11} className="py-20 text-center text-[#667085]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-9 w-9 text-[#98A2B3]" />
                    <span className="text-sm font-semibold text-[#101828]">لا توجد قيود يومية مطابقة للبحث</span>
                    <span className="text-xs text-[#667085]">جرب تعديل مصطلحات البحث أو تصفية التاريخ</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
