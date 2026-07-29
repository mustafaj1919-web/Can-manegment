'use client'

import React from 'react'
import { GeneralLedgerRow } from '@/lib/api/general-ledger'
import { formatMoney } from '@/lib/design-system/formatting'
import { TableDensity } from './GeneralLedgerToolbar'
import { Eye, FileText, MoreHorizontal, AlertCircle, FileSpreadsheet } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface GeneralLedgerTableProps {
  rows: GeneralLedgerRow[]
  onSelectRow: (row: GeneralLedgerRow) => void
  selectedRowId?: string | null
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  density: TableDensity
  columnsVisibility: Record<string, boolean>
}

export function GeneralLedgerTable({
  rows,
  onSelectRow,
  selectedRowId,
  isLoading = false,
  isError = false,
  onRetry,
  density,
  columnsVisibility,
}: GeneralLedgerTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-[#F9FAFB] animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs">
        <AlertCircle className="mx-auto h-8 w-8 text-[#B42318]" />
        <p className="mt-2 text-sm font-semibold text-[#101828]">تعذر تحميل سجل الحركة المحاسبية</p>
        <p className="mt-1 text-xs text-[#667085]">يرجى التحقق من اتصال الشبكة وإعادة المحاولة</p>
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

  // Row Height by density
  let rowHeightClass = 'h-[44px]'
  if (density === 'compact') rowHeightClass = 'h-[38px]'
  else if (density === 'comfortable') rowHeightClass = 'h-[50px]'

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white shadow-xs overflow-hidden text-right dir-rtl" dir="rtl">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[520px]">
        <table className="w-full min-w-[1300px] border-collapse text-xs">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10 bg-[#F2F4F7] border-b border-[#D0D5DD]">
            <tr className="text-[#475467] font-semibold text-xs h-11">
              <th className="px-3 py-2 text-right w-[110px]">التاريخ</th>
              <th className="px-2.5 py-2 text-right w-[110px]">رقم القيد</th>
              <th className="px-2.5 py-2 text-right w-[110px]">رقم المستند</th>
              {columnsVisibility.doc_type !== false && <th className="px-2 py-2 text-right w-[100px]">نوع المستند</th>}
              <th className="px-3 py-2 text-right min-w-[240px]">الحساب المحاسبي</th>
              <th className="px-3 py-2 text-right min-w-[260px]">الوصف والبيان</th>
              {columnsVisibility.branch !== false && <th className="px-2 py-2 text-right w-[100px]">الفرع</th>}
              <th className="px-2 py-2 text-center w-[60px]">العملة</th>
              <th className="px-2.5 py-2 text-left w-[125px]">مدين</th>
              <th className="px-2.5 py-2 text-left w-[125px]">دائن</th>
              <th className="px-2.5 py-2 text-left w-[135px]">الرصيد الجاري</th>
              {columnsVisibility.user !== false && <th className="px-2 py-2 text-right w-[100px]">المستخدم</th>}
              {columnsVisibility.status !== false && <th className="px-2 py-2 text-center w-[80px]">الحالة</th>}
              <th className="px-2 py-2 text-center w-[52px]">الإجراءات</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#EAECF0]">
            {rows.length > 0 ? (
              rows.map(row => {
                const isSelected = selectedRowId === row.id

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectRow(row)}
                    className={cn(
                      'border-b border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors cursor-pointer group bg-white',
                      rowHeightClass,
                      isSelected && 'bg-[#EFF8FF] border-r-4 border-r-[#1570EF]'
                    )}
                  >
                    {/* Date */}
                    <td className="px-3 py-1 text-[#344054] font-medium whitespace-nowrap text-right w-[110px]">
                      {new Date(row.date).toLocaleDateString('ar-IQ')}
                    </td>

                    {/* Journal Reference Number */}
                    <td className="px-2.5 py-1 font-mono font-bold text-[#175CD3] whitespace-nowrap text-right w-[110px]">
                      <span className="dir-ltr inline-block tracking-tight text-[13px]" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                        {row.journal_ref}
                      </span>
                    </td>

                    {/* Document Number */}
                    <td className="px-2.5 py-1 font-mono text-[#475467] whitespace-nowrap text-right w-[110px]">
                      <span className="dir-ltr inline-block tracking-tight text-[12.5px]" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                        {row.document_number}
                      </span>
                    </td>

                    {/* Document Type */}
                    {columnsVisibility.doc_type !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-right w-[100px] text-xs text-[#344054] font-medium">
                        {row.document_type}
                      </td>
                    )}

                    {/* Account Name & Code */}
                    <td className="px-3 py-1 min-w-[240px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-[#175CD3] text-xs shrink-0" style={{ direction: 'ltr' }}>
                          [{row.account_code}]
                        </span>
                        <span className="font-semibold text-[#101828] text-xs truncate">
                          {row.account_name}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-1 min-w-[260px] text-xs text-[#475467] truncate">
                      {row.description}
                    </td>

                    {/* Branch */}
                    {columnsVisibility.branch !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-right w-[100px] text-xs text-[#667085]">
                        {row.branch_name}
                      </td>
                    )}

                    {/* Currency */}
                    <td className="px-2 py-1 whitespace-nowrap text-center w-[60px] text-xs text-[#475467] font-medium">
                      د.ع
                    </td>

                    {/* Debit Amount */}
                    <td className={cn(
                      'px-2.5 py-1 whitespace-nowrap text-left w-[125px] font-numeric text-[13.5px] tabular-nums dir-ltr',
                      row.debit === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#175CD3] font-semibold'
                    )}>
                      {row.debit === 0 ? '0 د.ع' : formatMoney(row.debit, 'IQD')}
                    </td>

                    {/* Credit Amount */}
                    <td className={cn(
                      'px-2.5 py-1 whitespace-nowrap text-left w-[125px] font-numeric text-[13.5px] tabular-nums dir-ltr',
                      row.credit === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#067647] font-semibold'
                    )}>
                      {row.credit === 0 ? '0 د.ع' : formatMoney(row.credit, 'IQD')}
                    </td>

                    {/* Running Balance */}
                    <td className={cn(
                      'px-2.5 py-1 whitespace-nowrap text-left w-[135px] font-numeric text-[13.5px] tabular-nums dir-ltr',
                      row.running_balance < 0 ? 'text-[#B42318] font-bold' : row.running_balance === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#101828] font-bold'
                    )}>
                      {row.running_balance === 0 ? '0 د.ع' : formatMoney(row.running_balance, 'IQD')}
                    </td>

                    {/* Created By User */}
                    {columnsVisibility.user !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-right w-[100px] text-xs text-[#667085] truncate">
                        {row.created_by}
                      </td>
                    )}

                    {/* Status */}
                    {columnsVisibility.status !== false && (
                      <td className="px-2 py-1 whitespace-nowrap text-center w-[80px]">
                        {row.status === 'posted' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#027A48]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#12B76A]" />
                            <span>مرحل</span>
                          </span>
                        ) : row.status === 'reversed' ? (
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
                            aria-label="خيارات الحراك"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-right">
                          <DropdownMenuItem onClick={() => onSelectRow(row)} className="gap-2 text-xs font-semibold cursor-pointer py-2">
                            <Eye className="h-4 w-4 text-[#175CD3]" />
                            <span>عرض التفاصيل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSelectRow(row)} className="gap-2 text-xs font-semibold cursor-pointer py-2">
                            <FileText className="h-4 w-4 text-[#344054]" />
                            <span>معاينة القيد المحاسبي</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={15} className="py-20 text-center text-[#667085]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileSpreadsheet className="h-9 w-9 text-[#98A2B3]" />
                    <span className="text-sm font-semibold text-[#101828]">لا توجد حركات محاسبية مطابقة للبحث</span>
                    <span className="text-xs text-[#667085]">جرب تعديل مصطلحات البحث أو تحديد نطاق زمني أوسع</span>
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
