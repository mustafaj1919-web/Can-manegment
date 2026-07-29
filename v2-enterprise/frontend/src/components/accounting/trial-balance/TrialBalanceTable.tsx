'use client'

import React from 'react'
import Link from 'next/link'
import { TrialBalanceAccount, TrialBalanceTotals } from '@/lib/api/accounting'
import { formatMoney, formatAccountType } from '@/lib/design-system/formatting'
import { TableDensity, ViewMode } from './TrialBalanceToolbar'
import { Eye, BookOpen, ExternalLink, ChevronDown, ChevronLeft, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrialBalanceTableProps {
  accounts: TrialBalanceAccount[]
  totals: TrialBalanceTotals
  onSelectAccount: (acc: TrialBalanceAccount) => void
  selectedAccountId?: string | null
  viewMode: ViewMode
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  density: TableDensity
  columnsVisibility: Record<string, boolean>
  expandedCodes: Set<string>
  onToggleExpand: (code: string) => void
}

export function TrialBalanceTable({
  accounts,
  totals,
  onSelectAccount,
  selectedAccountId,
  viewMode,
  isLoading = false,
  isError = false,
  onRetry,
  density,
  columnsVisibility,
  expandedCodes,
  onToggleExpand,
}: TrialBalanceTableProps) {
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
        <p className="mt-2 text-sm font-semibold text-[#101828]">تعذر تحميل ميزان المراجعة</p>
        <p className="mt-1 text-xs text-[#667085]">يرجى إعادة المحاولة أو التحقق من الاتصال بالخادم</p>
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

  let rowHeightClass = 'h-[44px]'
  if (density === 'compact') rowHeightClass = 'h-[38px]'
  else if (density === 'comfortable') rowHeightClass = 'h-[50px]'

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white shadow-xs overflow-hidden text-right dir-rtl" dir="rtl">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[520px]">
        <table className="w-full min-w-[1250px] border-collapse text-xs">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10 bg-[#F2F4F7] border-b border-[#D0D5DD]">
            <tr className="text-[#475467] font-semibold text-xs h-11">
              <th className="px-3 py-2 text-right w-[110px]">رقم الحساب</th>
              <th className="px-3 py-2 text-right min-w-[260px]">اسم الحساب المحاسبي</th>
              <th className="px-2.5 py-2 text-right w-[110px]">نوع الحساب</th>
              
              {columnsVisibility.opening !== false && (
                <>
                  <th className="px-2.5 py-2 text-left w-[125px] bg-[#EEF4FF] text-[#175CD3]">افتتاحي مدين</th>
                  <th className="px-2.5 py-2 text-left w-[125px] bg-[#EEF4FF] text-[#175CD3]">افتتاحي دائن</th>
                </>
              )}

              {columnsVisibility.period !== false && (
                <>
                  <th className="px-2.5 py-2 text-left w-[125px]">حركة الفترة مدين</th>
                  <th className="px-2.5 py-2 text-left w-[125px]">حركة الفترة دائن</th>
                </>
              )}

              {columnsVisibility.closing !== false && (
                <>
                  <th className="px-2.5 py-2 text-left w-[130px] bg-[#ECFDF3] text-[#027A48]">ختامي مدين</th>
                  <th className="px-2.5 py-2 text-left w-[130px] bg-[#ECFDF3] text-[#027A48]">ختامي دائن</th>
                </>
              )}

              <th className="px-2.5 py-2 text-left w-[135px]">صافي الرصيد</th>
              <th className="px-2 py-2 text-center w-[80px]">الإجراءات</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#EAECF0]">
            {accounts.length > 0 ? (
              accounts.map(acc => {
                const isSelected = selectedAccountId === acc.id
                const isParentNode = acc.code.length <= 3

                return (
                  <tr
                    key={acc.id || acc.code}
                    onClick={() => onSelectAccount(acc)}
                    className={cn(
                      'border-b border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors cursor-pointer group bg-white',
                      rowHeightClass,
                      isParentNode && 'bg-[#F8FAFC] font-bold',
                      isSelected && 'bg-[#EFF8FF] border-r-4 border-r-[#1570EF]'
                    )}
                  >
                    {/* Account Code */}
                    <td className="px-3 py-1 font-mono font-bold text-[#175CD3] whitespace-nowrap text-right w-[110px]">
                      <span className="dir-ltr inline-block" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                        {acc.code}
                      </span>
                    </td>

                    {/* Account Name */}
                    <td className="px-3 py-1 min-w-[260px]">
                      <div className="flex items-center gap-1.5 truncate">
                        {viewMode === 'hierarchy' && isParentNode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleExpand(acc.code)
                            }}
                            className="p-0.5 text-[#667085] hover:text-[#101828]"
                          >
                            {expandedCodes.has(acc.code) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronLeft className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <span className={cn('text-xs truncate', isParentNode ? 'font-bold text-[#101828]' : 'text-[#344054]')}>
                          {acc.name}
                        </span>
                      </div>
                    </td>

                    {/* Account Type */}
                    <td className="px-2.5 py-1 whitespace-nowrap text-right w-[110px] text-xs text-[#667085]">
                      {formatAccountType(acc.type)}
                    </td>

                    {/* Opening Debit */}
                    {columnsVisibility.opening !== false && (
                      <>
                        <td className="px-2.5 py-1 whitespace-nowrap text-left w-[125px] font-numeric text-[13px] tabular-nums dir-ltr text-[#344054]">
                          {acc.opening_debit === 0 ? '0 د.ع' : formatMoney(acc.opening_debit, 'IQD')}
                        </td>
                        <td className="px-2.5 py-1 whitespace-nowrap text-left w-[125px] font-numeric text-[13px] tabular-nums dir-ltr text-[#344054]">
                          {acc.opening_credit === 0 ? '0 د.ع' : formatMoney(acc.opening_credit, 'IQD')}
                        </td>
                      </>
                    )}

                    {/* Period Debit */}
                    {columnsVisibility.period !== false && (
                      <>
                        <td className="px-2.5 py-1 whitespace-nowrap text-left w-[125px] font-numeric text-[13px] font-semibold text-[#175CD3] tabular-nums dir-ltr">
                          {acc.period_debit === 0 ? '0 د.ع' : formatMoney(acc.period_debit, 'IQD')}
                        </td>
                        <td className="px-2.5 py-1 whitespace-nowrap text-left w-[125px] font-numeric text-[13px] font-semibold text-[#067647] tabular-nums dir-ltr">
                          {acc.period_credit === 0 ? '0 د.ع' : formatMoney(acc.period_credit, 'IQD')}
                        </td>
                      </>
                    )}

                    {/* Closing Debit */}
                    {columnsVisibility.closing !== false && (
                      <>
                        <td className="px-2.5 py-1 whitespace-nowrap text-left w-[130px] font-numeric text-[13.5px] font-bold text-[#101828] tabular-nums dir-ltr bg-[#F6FEF9]">
                          {acc.closing_debit === 0 ? '0 د.ع' : formatMoney(acc.closing_debit, 'IQD')}
                        </td>
                        <td className="px-2.5 py-1 whitespace-nowrap text-left w-[130px] font-numeric text-[13.5px] font-bold text-[#101828] tabular-nums dir-ltr bg-[#F6FEF9]">
                          {acc.closing_credit === 0 ? '0 د.ع' : formatMoney(acc.closing_credit, 'IQD')}
                        </td>
                      </>
                    )}

                    {/* Net Balance */}
                    <td className={cn(
                      'px-2.5 py-1 whitespace-nowrap text-left w-[135px] font-numeric text-[13.5px] font-bold tabular-nums dir-ltr',
                      acc.balance < 0 ? 'text-[#B42318]' : acc.balance === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#027A48]'
                    )}>
                      {acc.balance === 0 ? '0 د.ع' : formatMoney(acc.balance, 'IQD')}
                    </td>

                    {/* Actions: Drill-Down to General Ledger */}
                    <td className="px-2 py-1 whitespace-nowrap text-center w-[80px]" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/general-ledger?account_code=${acc.code}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#175CD3] hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>الأستاذ</span>
                      </Link>
                    </td>

                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={11} className="py-20 text-center text-[#667085]">
                  لا توجد حسابات مطابقة للبحث أو التصفية الحالية
                </td>
              </tr>
            )}
          </tbody>

          {/* Sticky Authoritative Totals Footer */}
          <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC] border-t-2 border-[#D0D5DD] font-bold text-xs h-11">
            <tr className="text-[#101828]">
              <td colSpan={3} className="px-4 py-2 text-right">
                إجمالي ميزان المراجعة النهائي
              </td>

              {columnsVisibility.opening !== false && (
                <>
                  <td className="px-2.5 py-2 text-left font-numeric text-[13px] dir-ltr text-[#344054]">
                    {formatMoney(totals.opening_debit, 'IQD')}
                  </td>
                  <td className="px-2.5 py-2 text-left font-numeric text-[13px] dir-ltr text-[#344054]">
                    {formatMoney(totals.opening_credit, 'IQD')}
                  </td>
                </>
              )}

              {columnsVisibility.period !== false && (
                <>
                  <td className="px-2.5 py-2 text-left font-numeric text-[13px] text-[#175CD3] dir-ltr">
                    {formatMoney(totals.period_debit, 'IQD')}
                  </td>
                  <td className="px-2.5 py-2 text-left font-numeric text-[13px] text-[#067647] dir-ltr">
                    {formatMoney(totals.period_credit, 'IQD')}
                  </td>
                </>
              )}

              {columnsVisibility.closing !== false && (
                <>
                  <td className="px-2.5 py-2 text-left font-numeric text-[13.5px] text-[#101828] dir-ltr bg-[#ECFDF3]">
                    {formatMoney(totals.closing_debit, 'IQD')}
                  </td>
                  <td className="px-2.5 py-2 text-left font-numeric text-[13.5px] text-[#101828] dir-ltr bg-[#ECFDF3]">
                    {formatMoney(totals.closing_credit, 'IQD')}
                  </td>
                </>
              )}

              <td className="px-2.5 py-2 text-left font-numeric text-[13.5px] text-[#027A48] dir-ltr">
                {formatMoney(totals.closing_debit - totals.closing_credit, 'IQD')}
              </td>

              <td className="px-2 py-2 text-center text-[#667085]">
                ✓
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
