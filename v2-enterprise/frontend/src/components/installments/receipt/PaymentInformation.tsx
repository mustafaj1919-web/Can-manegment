import React from 'react'
import type { CurrentPaymentInfo } from '../installmentReceiptTypes'
import { Field } from './Field'

interface PaymentInformationProps {
  payment: CurrentPaymentInfo
  cashierName?: string | null
}

/** Detailed transaction references — bank, transaction id, approval code, cashier.
 *  Renders nothing for a plain cash payment with no reference on file; an empty row of
 *  labels is worse than no row at all. */
export function PaymentInformation({ payment, cashierName }: PaymentInformationProps) {
  const hasExtra = Boolean(payment.transactionId || payment.bankName || payment.approvalCode || payment.referenceNumber)
  if (!hasExtra) return null

  return (
    <section className="py-1 border-t border-[#E5E7EB]">
      <span className="block text-[8px] font-bold text-[#081F4D] uppercase tracking-[0.1em] mb-0.5 leading-none">
        تفاصيل العملية
      </span>
      <div className="grid grid-cols-5 gap-x-3">
        <Field label="رقم المرجع" value={payment.referenceNumber} mono dir="ltr" />
        <Field label="رقم العملية" value={payment.transactionId} mono dir="ltr" />
        <Field label="اسم البنك" value={payment.bankName} />
        <Field label="رمز الموافقة" value={payment.approvalCode} mono dir="ltr" />
        <Field label="أمين الصندوق" value={cashierName} />
      </div>
    </section>
  )
}
