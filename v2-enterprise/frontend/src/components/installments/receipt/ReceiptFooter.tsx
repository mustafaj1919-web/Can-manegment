import React from 'react'
import type { CompanyInfo } from '../installmentReceiptTypes'

interface ReceiptFooterProps {
  company: CompanyInfo
  receiptNumber: string
}

export function ReceiptFooter({ company, receiptNumber }: ReceiptFooterProps) {
  const year = new Date().getFullYear()
  const contactLine = [company.address, company.website, company.phone, company.email].filter(Boolean).join('   ·   ')

  return (
    <footer className="flex items-center justify-between pt-1.5 border-t border-[#E5E7EB] text-[7.5px] text-[#9CA3AF] font-medium">
      <span className="truncate font-semibold text-[#667085]">شكراً لاختياركم {company.name}</span>
      <span className="font-numeric shrink-0 ps-2 truncate" dir="ltr">{contactLine}</span>
      <span className="font-numeric shrink-0 ps-2" dir="ltr">{receiptNumber} · © {year}</span>
    </footer>
  )
}
