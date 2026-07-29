'use client'

import React from 'react'
import { formatMoney } from '@/lib/design-system/formatting'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface TrialBalanceSummaryStripProps {
  openingDebit: number
  openingCredit: number
  periodDebit: number
  periodCredit: number
  closingDebit: number
  closingCredit: number
  difference: number
  isBalanced: boolean
  accountCount: number
  isLoading?: boolean
}

export function TrialBalanceSummaryStrip({
  openingDebit,
  openingCredit,
  periodDebit,
  periodCredit,
  closingDebit,
  closingCredit,
  difference,
  isBalanced,
  accountCount,
  isLoading = false,
}: TrialBalanceSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="h-[96px] w-full rounded-xl border border-[#EAECF0] bg-white p-4 animate-pulse flex items-center justify-between" />
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-3.5 shadow-xs text-right dir-rtl" dir="rtl">
      <div className="flex flex-col xl:flex-row items-stretch justify-between gap-4">
        
        {/* 6 Financial Balance Columns Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center divide-x divide-x-reverse divide-[#EAECF0]">
          
          {/* 1. Opening Debit */}
          <div className="px-3 py-1 flex flex-col justify-center">
            <span className="text-xs font-medium text-[#667085]">افتتاحي مدين</span>
            <span className="text-sm sm:text-base font-bold font-numeric text-[#344054] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(openingDebit, 'IQD')}
            </span>
          </div>

          {/* 2. Opening Credit */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-medium text-[#667085]">افتتاحي دائن</span>
            <span className="text-sm sm:text-base font-bold font-numeric text-[#344054] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(openingCredit, 'IQD')}
            </span>
          </div>

          {/* 3. Period Debit */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-semibold text-[#175CD3]">حركة الفترة مدين</span>
            <span className="text-sm sm:text-base font-bold font-numeric text-[#175CD3] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(periodDebit, 'IQD')}
            </span>
          </div>

          {/* 4. Period Credit */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-semibold text-[#067647]">حركة الفترة دائن</span>
            <span className="text-sm sm:text-base font-bold font-numeric text-[#067647] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(periodCredit, 'IQD')}
            </span>
          </div>

          {/* 5. Closing Debit */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-bold text-[#101828]">ختامي مدين</span>
            <span className="text-sm sm:text-base font-extrabold font-numeric text-[#101828] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(closingDebit, 'IQD')}
            </span>
          </div>

          {/* 6. Closing Credit */}
          <div className="px-3 py-1 flex flex-col justify-center pr-4">
            <span className="text-xs font-bold text-[#101828]">ختامي دائن</span>
            <span className="text-sm sm:text-base font-extrabold font-numeric text-[#101828] mt-1 dir-ltr text-right tabular-nums">
              {formatMoney(closingCredit, 'IQD')}
            </span>
          </div>

        </div>

        {/* Vertical Divider */}
        <div className="hidden xl:block w-[1px] bg-[#D0D5DD] self-stretch my-1" />

        {/* Balance Status Badge & Total Accounts Indicator */}
        <div className="flex items-center gap-4 shrink-0 justify-between xl:justify-end">
          
          {/* Total Accounts Count */}
          <div className="text-right">
            <span className="text-xs font-medium text-[#667085] block">الحسابات الظاهرة</span>
            <span className="text-sm font-bold font-numeric text-[#101828] tabular-nums mt-0.5 block">
              {accountCount.toLocaleString('en-US')} حساب
            </span>
          </div>

          {/* Explicit Balance Status */}
          <div>
            {isBalanced ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-[#ECFDF3] border border-[#ABE5C5] px-3.5 py-2 text-xs font-bold text-[#027A48]">
                <CheckCircle2 className="h-4 w-4 text-[#12B76A]" />
                <span>الميزان متوازن (0.00 د.ع)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] px-3.5 py-2 text-xs font-bold text-[#B42318]">
                <AlertTriangle className="h-4 w-4 text-[#F04438]" />
                <span>غير متوازن (الفرق: {formatMoney(difference, 'IQD')})</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
