'use client'

import React from 'react'
import { formatMoney } from '@/lib/design-system/formatting'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface AccountingSummaryStripProps {
  totalAccounts: number
  mainAccounts: number
  branchAccounts: number
  detailAccounts: number
  totalDebit: number
  totalCredit: number
  difference: number
  isBalanced: boolean
  isLoading?: boolean
}

export function AccountingSummaryStrip({
  totalAccounts,
  mainAccounts,
  branchAccounts,
  detailAccounts,
  totalDebit,
  totalCredit,
  difference,
  isBalanced,
  isLoading = false,
}: AccountingSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="h-[96px] w-full rounded-xl border border-[#EAECF0] bg-white p-4 animate-pulse flex items-center justify-between" />
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-3.5 shadow-xs text-right dir-rtl" dir="rtl">
      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4">
        
        {/* Visual Group 1: Account Structure Metrics */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center divide-x divide-x-reverse divide-[#EAECF0]">
          {/* Metric 1: Total Accounts */}
          <div className="px-3 py-1 flex flex-col justify-center">
            <span className="text-xs font-medium text-[#667085]">إجمالي الحسابات</span>
            <span className="text-lg sm:text-xl font-bold font-numeric text-[#101828] mt-1 tabular-nums">
              {totalAccounts.toLocaleString('en-US')}
            </span>
          </div>

          {/* Metric 2: Main Accounts */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-medium text-[#667085]">حسابات رئيسية</span>
            <span className="text-lg sm:text-xl font-bold font-numeric text-[#344054] mt-1 tabular-nums">
              {mainAccounts.toLocaleString('en-US')}
            </span>
          </div>

          {/* Metric 3: Branch Accounts */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-medium text-[#667085]">حسابات فرعية</span>
            <span className="text-lg sm:text-xl font-bold font-numeric text-[#344054] mt-1 tabular-nums">
              {branchAccounts.toLocaleString('en-US')}
            </span>
          </div>

          {/* Metric 4: Detail Accounts */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-medium text-[#667085]">حسابات تفصيلية</span>
            <span className="text-lg sm:text-xl font-bold font-numeric text-[#344054] mt-1 tabular-nums">
              {detailAccounts.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Central Divider Line on Desktop */}
        <div className="hidden lg:block w-[1px] bg-[#D0D5DD] self-stretch my-1" />

        {/* Visual Group 2: Financial Balance Metrics */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center divide-x divide-x-reverse divide-[#EAECF0]">
          {/* Metric 5: Total Debit */}
          <div className="px-3 py-1 flex flex-col justify-center">
            <span className="text-xs font-semibold text-[#175CD3]">إجمالي المدين</span>
            <span className="text-base sm:text-lg font-bold font-numeric text-[#175CD3] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(totalDebit, 'IQD')}
            </span>
          </div>

          {/* Metric 6: Total Credit */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-semibold text-[#067647]">إجمالي الدائن</span>
            <span className="text-base sm:text-lg font-bold font-numeric text-[#067647] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(totalCredit, 'IQD')}
            </span>
          </div>

          {/* Metric 7: Balance Difference */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-medium text-[#667085]">الفرق التوازني</span>
            <span className={`text-base sm:text-lg font-bold font-numeric mt-1 dir-ltr text-right tabular-nums ${
              Math.abs(difference) > 0.01 ? 'text-[#B42318]' : 'text-[#475467]'
            }`}>
              {formatMoney(Math.abs(difference), 'IQD')}
            </span>
          </div>

          {/* Metric 8: Balance Status Pill */}
          <div className="px-3 py-1 flex flex-col justify-center items-start pr-4">
            <span className="text-xs font-medium text-[#667085] mb-1">حالة التوازن</span>
            <div>
              {isBalanced ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ABE5C6] bg-[#ECFDF3] px-3 py-1 text-xs font-bold text-[#027A48]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#027A48]" />
                  <span>متوازن</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FECDCA] bg-[#FEF3F2] px-3 py-1 text-xs font-bold text-[#B42318]">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#B42318]" />
                  <span>غير متوازن</span>
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
