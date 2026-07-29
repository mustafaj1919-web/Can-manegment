import React from 'react'

interface VerificationSectionProps {
  qrCodeUrl?: string | null
  journalEntryNumber?: string | null
}

export function VerificationSection({ qrCodeUrl, journalEntryNumber }: VerificationSectionProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {qrCodeUrl && (
        <img src={qrCodeUrl} alt="رمز التحقق" className="h-[46px] w-[46px] shrink-0" />
      )}
      <div className="leading-tight">
        <p className="text-[7.5px] font-bold text-[#081F4D] uppercase tracking-[0.08em]">تحقق إلكتروني</p>
        <p className="text-[8px] text-[#9CA3AF] font-numeric mt-0.5" dir="ltr">
          {journalEntryNumber ?? 'JE-N/A'}
        </p>
      </div>
    </div>
  )
}
