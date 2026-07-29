import React from 'react'
import type { CurrentPaymentInfo } from '../installmentReceiptTypes'
import { mapPaymentMethodArabic } from '../installmentReceiptFormatters'
import { InfoCard } from './InfoCard'
import { Field } from './Field'

interface PaymentSummaryColumnProps {
  payment: CurrentPaymentInfo
  remainingInstallments?: number | null
}

/** Fourth column of the information matrix — a brief "how was this paid" summary.
 *  Detailed transaction references (bank, approval code, collector) live further down
 *  in PaymentInformation; this column only orients the reader at a glance. */
export function PaymentSummaryColumn({ payment, remainingInstallments }: PaymentSummaryColumnProps) {
  const installmentLabel = payment.installmentNumber
    ? `${payment.installmentNumber} / ${payment.totalInstallments ?? '—'}`
    : null

  return (
    <InfoCard title="الدفعة">
      <Field label="طريقة الدفع" value={mapPaymentMethodArabic(payment.paymentMethod)} span={2} emphasis />
      <Field label="رقم القسط" value={installmentLabel} mono dir="ltr" />
      <Field label="تاريخ الاستحقاق" value={payment.dueDate} mono dir="ltr" />
      {remainingInstallments !== null && remainingInstallments !== undefined && remainingInstallments > 0 && (
        <p className="col-span-2 text-[8.5px] text-[#9CA3AF] font-medium truncate mt-0.5">
          الأقساط المتبقية: {remainingInstallments}
        </p>
      )}
    </InfoCard>
  )
}
