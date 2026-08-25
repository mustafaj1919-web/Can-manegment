import React from 'react'
import type { CurrentPaymentInfo } from '../installmentReceiptTypes'
import { mapPaymentMethodArabic } from '../installmentReceiptFormatters'
import { InfoCard } from './InfoCard'
import { Field } from './Field'

interface PaymentSummaryColumnProps {
  payment: CurrentPaymentInfo
}

/** Fourth column of the identity strip — "which installment is this" at a glance.
 *  Detailed transaction references (bank, approval code, collector) live in the
 *  transaction strip further down; this column only orients the reader. */
export function PaymentSummaryColumn({ payment }: PaymentSummaryColumnProps) {
  const installmentLabel = payment.installmentNumber
    ? `${String(payment.installmentNumber).padStart(2, '0')} / ${payment.totalInstallments ?? '—'}`
    : null

  return (
    <InfoCard title="القسط الحالي">
      <Field label="رقم القسط" value={installmentLabel} mono dir="ltr" span={2} emphasis />
      <Field label="طريقة الدفع" value={mapPaymentMethodArabic(payment.paymentMethod)} />
      <Field label="تاريخ الاستحقاق" value={payment.dueDate} mono dir="ltr" />
    </InfoCard>
  )
}
