import React from 'react'
import type { ContractDetailsInfo } from '../installmentReceiptTypes'
import { InfoCard } from './InfoCard'
import { Field } from './Field'

interface ContractCardProps {
  contractNumber?: string | null
  contractDetails?: ContractDetailsInfo | null
  currency: string
}

export function ContractCard({ contractNumber, contractDetails, currency }: ContractCardProps) {
  const planLabel = contractDetails?.installmentMonths ? `${contractDetails.installmentMonths} شهر · ${currency}` : currency

  return (
    <InfoCard title="العقد">
      <Field label="رقم العقد" value={contractNumber} mono dir="ltr" span={2} emphasis />
      <Field label="تاريخ العقد" value={contractDetails?.contractDate} mono dir="ltr" />
      <Field label="خطة الأقساط" value={planLabel} />
      {contractDetails?.financingType && (
        <p className="col-span-2 text-[8.5px] text-[#9CA3AF] font-medium truncate mt-0.5">
          {contractDetails.financingType}
        </p>
      )}
    </InfoCard>
  )
}
