import React from 'react'
import type { CurrentPaymentInfo, VerificationInfo } from '../installmentReceiptTypes'
import { mapPaymentMethodArabic } from '../installmentReceiptFormatters'

interface TransactionDetailProps {
  label: string
  value?: string | null
  dir?: 'ltr' | 'rtl'
}

function Detail({ label, value, dir = 'ltr' }: TransactionDetailProps) {
  if (!value) return null
  return (
    <div className="px-3 first:ps-0 min-w-0">
      <p className="text-[7px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em] leading-none mb-[3px]">{label}</p>
      <p className="text-[9.5px] font-semibold text-[#111827] font-numeric truncate leading-none" dir={dir}>{value}</p>
    </div>
  )
}

interface TransactionStripProps {
  payment: CurrentPaymentInfo
  cashierName?: string | null
  verification?: VerificationInfo | null
}

/** One thin transaction-information row. Text groups separated by hairlines, QR anchored
 *  at the far end — never six separate cards. */
export function TransactionStrip({ payment, cashierName, verification }: TransactionStripProps) {
  return (
    <div className="flex items-center py-1 border-t border-[#E5E7EB]">
      <div className="flex-1 min-w-0 flex items-center divide-x divide-[#E5E7EB]">
        <Detail label="رقم العملية" value={payment.referenceNumber} />
        <Detail label="طريقة الدفع" value={mapPaymentMethodArabic(payment.paymentMethod)} dir="rtl" />
        {payment.bankName && <Detail label="البنك" value={payment.bankName} dir="rtl" />}
        {payment.transactionId && <Detail label="رقم الحوالة" value={payment.transactionId} />}
        {payment.approvalCode && <Detail label="رمز الموافقة" value={payment.approvalCode} />}
        <Detail label="أمين الصندوق" value={cashierName} dir="rtl" />
        <Detail label="تاريخ العملية" value={`${payment.paymentDate}${payment.paymentTime ? ' - ' + payment.paymentTime : ''}`} />
      </div>

      {verification?.qrCodeUrl && (
        <div className="flex items-center gap-2 ps-3 shrink-0 border-s border-[#E5E7EB]">
          <div className="text-end leading-tight">
            <p className="text-[7px] font-bold text-[#0B2347] uppercase tracking-[0.06em]">تحقق إلكتروني</p>
            <p className="text-[7px] text-[#9CA3AF] max-w-[24mm]">امسح رمز QR للتحقق من صحة الوصل</p>
          </div>
          {/* White quiet-zone padding — the source QR image itself has no built-in margin
              (margin=0 upstream), so the border around it must never sit flush against
              the modules or a scanner can misread the edge. Sized to the image's native
              120x120 resolution (not stretched further) to stay crisp on a real printer. */}
          <div className="shrink-0 bg-white p-[1.2mm]" style={{ width: '18mm', height: '18mm' }}>
            <img
              src={verification.qrCodeUrl}
              alt="رمز التحقق"
              width={120}
              height={120}
              className="w-full h-full block"
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
