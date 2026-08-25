import React from 'react'
import type { CompanyInfo } from '../installmentReceiptTypes'

interface ReceiptFooterProps {
  company: CompanyInfo
}

export function ReceiptFooter({ company }: ReceiptFooterProps) {
  const year = new Date().getFullYear()
  const contactLine = [company.address, company.website, company.phone, company.email].filter(Boolean).join('   ·   ')

  return (
    <footer className="flex items-center gap-2 pt-1.5 border-t border-[#E5E7EB] text-[7.5px] text-[#9CA3AF] font-medium">
      <span className="flex-1 min-w-0 truncate font-semibold text-[#667085]">شكراً لاختياركم {company.name}</span>
      <span className="font-numeric shrink-0 max-w-[45mm] truncate" dir="ltr">{contactLine}</span>
      <span className="font-numeric shrink-0" dir="ltr">© {year}</span>
    </footer>
  )
}
