import React from 'react'
import type { NextInstallmentInfo, ContractProgressInfo } from '../installmentReceiptTypes'
import { formatCurrencyAmount } from '../installmentReceiptFormatters'

interface NextInstallmentStripProps {
  next?: NextInstallmentInfo | null
  progress?: ContractProgressInfo | null
  currency: string
}

/** One compact, quiet horizontal strip — visually recognizable but never competing with
 *  the payment hero above it. Renders nothing once the contract is fully settled. */
export function NextInstallmentStrip({ next, progress, currency }: NextInstallmentStripProps) {
  if (progress?.isCompleted) {
    return (
      <div className="flex items-center justify-center gap-2 py-1 leading-none">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#059669]">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-bold text-[#059669]">اكتمل سداد العقد</span>
        <span className="text-[7px] font-bold text-[#059669] uppercase tracking-[0.12em] border border-[#059669] rounded-[3px] px-1 py-[1px]">
          PAID IN FULL
        </span>
      </div>
    )
  }

  if (!next) return null

  return (
    <div className="flex items-center py-1">
      <div className="flex items-baseline gap-1.5 pe-4">
        <span className="text-[8px] font-bold text-[#667085]">القسط القادم</span>
        <span className="text-[13px] font-numeric font-extrabold text-[#0B2347] tabular-nums" dir="ltr">
          #{String(next.installmentNumber).padStart(2, '0')}
        </span>
      </div>
      <div className="w-px self-stretch bg-[#E5E7EB]" />
      <div className="flex items-baseline gap-1.5 px-4">
        <span className="text-[8px] font-bold text-[#667085]">قيمة القسط</span>
        <span className="text-[10.5px] font-numeric font-bold text-[#111827] tabular-nums" dir="ltr">
          {formatCurrencyAmount(next.amount, currency)}
        </span>
      </div>
      <div className="w-px self-stretch bg-[#E5E7EB]" />
      <div className="flex items-baseline gap-1.5 px-4">
        <span className="text-[8px] font-bold text-[#667085]">تاريخ الاستحقاق</span>
        <span className="text-[10.5px] font-numeric font-bold text-[#111827] tabular-nums" dir="ltr">
          {next.dueDate}
        </span>
        {next.overdueDays ? (
          <span className="text-[8px] font-bold text-[#DC2626]">متأخر {next.overdueDays} يوم</span>
        ) : null}
      </div>
      <div className="w-px self-stretch bg-[#E5E7EB]" />
      <div className="flex items-center gap-1 ps-4 text-[8px] text-[#9CA3AF] font-medium">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        يرجى الالتزام بتاريخ الاستحقاق لتجنب الغرامات
      </div>
    </div>
  )
}
