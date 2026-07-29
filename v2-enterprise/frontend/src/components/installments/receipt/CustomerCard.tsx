import React from 'react'
import type { CustomerReceiptInfo } from '../installmentReceiptTypes'
import { InfoCard } from './InfoCard'
import { Field } from './Field'

interface CustomerCardProps {
  customer: CustomerReceiptInfo
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <InfoCard title="العميل">
      <Field label="اسم العميل" value={customer.name} span={2} emphasis />
      <Field label="رقم الهاتف" value={customer.phone} mono dir="ltr" />
      <Field label="الرقم الوطني" value={customer.nationalIdMasked} mono dir="ltr" />
      {customer.salesRepName && (
        <p className="col-span-2 text-[8.5px] text-[#9CA3AF] font-medium truncate mt-0.5">
          المندوب: {customer.salesRepName}
        </p>
      )}
    </InfoCard>
  )
}
