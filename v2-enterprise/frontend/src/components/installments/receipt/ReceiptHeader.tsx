import React from 'react'
import type { CompanyInfo } from '../installmentReceiptTypes'
import { ReceiptStatus } from './ReceiptStatus'

interface ReceiptHeaderProps {
  company: CompanyInfo
  receiptNumber: string
  issuedAtDate: string
  issuedAtTime?: string
  branchName?: string
  statusLabel: string
  isError: boolean
}

export function ReceiptHeader({
  company,
  receiptNumber,
  issuedAtDate,
  issuedAtTime,
  branchName,
  statusLabel,
  isError,
}: ReceiptHeaderProps) {
  return (
    // Plain div, not <header> — a global print stylesheet (tokens.css) hides any
    // header/nav/aside tag app-wide to strip the app shell's chrome when printing from
    // any page; the semantic tag would get caught by that same rule here.
    <div className="pb-1.5 leading-none">
      <div className="flex items-start justify-between">
        {/* Brand block */}
        <div className="flex items-center gap-2 min-w-0">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="" className="h-7 w-7 rounded-md object-contain shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-md bg-[#0B2347] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              {company.name?.[0] ?? 'M'}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <h2 className="text-[13px] font-bold text-[#111827] truncate">{company.name}</h2>
            <p className="text-[7.5px] text-[#667085] font-medium tracking-wide truncate mt-0.5">{company.subtitle}</p>
          </div>
        </div>

        {/* Document title */}
        <div className="text-center shrink-0 px-3">
          <h1 className="text-[24px] font-extrabold text-[#0B2347] tracking-tight leading-none">
            وصل سداد قسط
          </h1>
          <p className="text-[6.5px] font-bold text-[#667085] tracking-[0.22em] uppercase mt-1 leading-none">
            Official Installment Payment Receipt
          </p>
        </div>

        {/* Document control metadata */}
        <div className="text-end shrink-0 space-y-[2px] min-w-0 max-w-[38mm] leading-none">
          <div className="flex justify-end mb-0.5">
            <ReceiptStatus label={statusLabel} isError={isError} />
          </div>
          <div className="text-[9.5px] font-numeric font-semibold text-[#111827] truncate" dir="ltr">
            {receiptNumber}
          </div>
          <div className="text-[8.5px] font-numeric text-[#667085] truncate" dir="ltr">
            {issuedAtDate}{issuedAtTime ? ` — ${issuedAtTime}` : ''}
          </div>
          {branchName && (
            <div className="text-[8.5px] text-[#667085] truncate">{branchName}</div>
          )}
        </div>
      </div>

      {/* Letterhead rule */}
      <div className="mt-1.5 h-[1.5px] bg-[#0B2347]" />
    </div>
  )
}
