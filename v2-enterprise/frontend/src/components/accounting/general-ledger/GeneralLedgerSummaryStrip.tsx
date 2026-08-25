'use client'

import React from 'react'
import { formatMoney } from '@/lib/design-system/formatting'

interface GeneralLedgerSummaryStripProps {
  openingBalance: number
  totalDebit: number
  totalCredit: number
  netMovement: number
  closingBalance: number
  totalEntries: number
  isLoading?: boolean
}

export function GeneralLedgerSummaryStrip({
  openingBalance,
  totalDebit,
  totalCredit,
  netMovement,
  closingBalance,
  totalEntries,
  isLoading = false,
}: GeneralLedgerSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="h-[92px] w-full rounded-xl border border-[#EAECF0] bg-white p-4 animate-pulse flex items-center justify-between" />
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-3.5 shadow-xs text-right dir-rtl" dir="rtl">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center divide-x divide-x-reverse divide-[#EAECF0]">
        
        {/* Metric 1: Opening Balance */}
        <div className="px-3 py-1 flex flex-col justify-center">
          <span className="text-xs font-medium text-[#667085]">الرصيد الافتتاحي</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#344054] mt-1 dir-ltr text-right tabular-nums">
            {formatMoney(openingBalance, 'IQD')}
          </span>
        </div>

        {/* Metric 2: Total Debit */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-semibold text-[#175CD3]">إجمالي المدين</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#175CD3] mt-1 dir-ltr text-right tabular-nums">
            {formatMoney(totalDebit, 'IQD')}
          </span>
        </div>

        {/* Metric 3: Total Credit */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-semibold text-[#067647]">إجمالي الدائن</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#067647] mt-1 dir-ltr text-right tabular-nums">
            {formatMoney(totalCredit, 'IQD')}
          </span>
        </div>

        {/* Metric 4: Net Movement */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-medium text-[#667085]">صافي الحركة</span>
          <span className={`text-base sm:text-lg font-bold font-numeric mt-1 dir-ltr text-right tabular-nums ${
            netMovement < 0 ? 'text-[#B42318]' : netMovement > 0 ? 'text-[#027A48]' : 'text-[#344054]'
          }`}>
            {formatMoney(netMovement, 'IQD')}
          </span>
        </div>

        {/* Metric 5: Closing Balance */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-semibold text-[#101828]">الرصيد الختامي</span>
          <span className="text-base sm:text-lg font-extrabold font-numeric text-[#101828] mt-1 dir-ltr text-right tabular-nums">
            {formatMoney(closingBalance, 'IQD')}
          </span>
        </div>

        {/* Metric 6: Total Entries */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-medium text-[#667085]">عدد القيود والحركات</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#344054] mt-1 tabular-nums">
            {totalEntries.toLocaleString('en-US')}
          </span>
        </div>

      </div>
    </div>
  )
}
