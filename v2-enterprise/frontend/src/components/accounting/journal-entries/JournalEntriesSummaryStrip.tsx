'use client'

import React from 'react'
import { formatMoney } from '@/lib/design-system/formatting'

interface JournalEntriesSummaryStripProps {
  totalEntries: number
  draftEntries: number
  postedEntries: number
  reversedEntries: number
  totalDebit: number
  totalCredit: number
  isLoading?: boolean
}

export function JournalEntriesSummaryStrip({
  totalEntries,
  draftEntries,
  postedEntries,
  reversedEntries,
  totalDebit,
  totalCredit,
  isLoading = false,
}: JournalEntriesSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="h-[92px] w-full rounded-xl border border-[#EAECF0] bg-white p-4 animate-pulse flex items-center justify-between" />
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-3.5 shadow-xs text-right dir-rtl" dir="rtl">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center divide-x divide-x-reverse divide-[#EAECF0]">
        
        {/* Metric 1: Total Entries */}
        <div className="px-3 py-1 flex flex-col justify-center">
          <span className="text-xs font-medium text-[#667085]">إجمالي القيود</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#101828] mt-1 tabular-nums">
            {totalEntries.toLocaleString('en-US')}
          </span>
        </div>

        {/* Metric 2: Draft Entries */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-medium text-[#667085]">قيود مسودة</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#344054] mt-1 tabular-nums">
            {draftEntries.toLocaleString('en-US')}
          </span>
        </div>

        {/* Metric 3: Posted Entries */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-semibold text-[#027A48]">القيود المرحلة</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#027A48] mt-1 tabular-nums">
            {postedEntries.toLocaleString('en-US')}
          </span>
        </div>

        {/* Metric 4: Reversed Entries */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
          <span className="text-xs font-semibold text-[#B42318]">القيود المعكوسة</span>
          <span className="text-base sm:text-lg font-bold font-numeric text-[#B42318] mt-1 tabular-nums">
            {reversedEntries.toLocaleString('en-US')}
          </span>
        </div>

        {/* Metric 5: Total Debit */}
        <div className="px-3 py-1 flex flex-col justify-center pr-4">
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

      </div>
    </div>
  )
}
