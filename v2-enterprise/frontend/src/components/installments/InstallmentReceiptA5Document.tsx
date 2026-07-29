'use client'

import React, { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { InstallmentReceiptViewModel } from './installmentReceiptTypes'
import { tafqitArabic } from './installmentReceiptFormatters'
import {
  claimPrintOwnership,
  releasePrintOwnership,
  subscribePrintOwnership,
  getPrintOwnerSnapshot,
  getPrintOwnerServerSnapshot,
} from './receiptPrintOwnership'
import { ReceiptHeader } from './receipt/ReceiptHeader'
import { CustomerCard } from './receipt/CustomerCard'
import { VehicleCard } from './receipt/VehicleCard'
import { ContractCard } from './receipt/ContractCard'
import { PaymentSummaryColumn } from './receipt/PaymentSummaryColumn'
import { PaymentHero } from './receipt/PaymentHero'
import { FinancialSummary } from './receipt/FinancialSummary'
import { InstallmentProgress } from './receipt/InstallmentProgress'
import { PaymentInformation } from './receipt/PaymentInformation'
import { VerificationSection } from './receipt/VerificationSection'
import { SignatureSection } from './receipt/SignatureSection'
import { ReceiptFooter } from './receipt/ReceiptFooter'

export { printInstallmentReceipt } from './receiptPrintOwnership'

function ReceiptPrintPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    setTarget(document.getElementById('print-root'))
  }, [])

  if (!target) return null
  return createPortal(children, target)
}

interface InstallmentReceiptA5DocumentProps {
  data: InstallmentReceiptViewModel
}

function shortenId(value?: string | null): string | undefined {
  if (!value) return value ?? undefined
  if (value.length > 18 && value.includes('-')) {
    const [prefix, suffix] = value.split('-')
    return `${prefix}-${suffix?.toUpperCase()}`
  }
  return value
}

export function InstallmentReceiptA5Document({ data }: InstallmentReceiptA5DocumentProps) {
  const {
    receiptNumber,
    issuedAtDate,
    issuedAtTime,
    branchName,
    customer,
    vehicle,
    contractDetails,
    payment,
    contractProgress,
    nextInstallment,
    verification,
    company,
    statusLabel,
    isCancelledOrReversed,
  } = data

  const cleanReceiptNumber = shortenId(receiptNumber) || receiptNumber
  const cleanContractNumber = shortenId(customer.contractNumber) || customer.contractNumber

  const instanceId = useId()
  const activeOwnerId = useSyncExternalStore(
    subscribePrintOwnership,
    getPrintOwnerSnapshot,
    getPrintOwnerServerSnapshot
  )

  useEffect(() => {
    claimPrintOwnership(instanceId)
    return () => releasePrintOwnership(instanceId)
  }, [instanceId])

  const isPrintOwner = activeOwnerId === instanceId
  const tafqitText = tafqitArabic(payment.amount, payment.currency)

  const remainingInstallments = contractProgress
    ? Math.max(0, contractProgress.totalInstallmentsCount - contractProgress.paidInstallmentsCount)
    : null

  const receipt = (
    <article
      dir="rtl"
      lang="ar"
      data-receipt-id={receiptNumber}
      className="a5-document-root relative bg-white text-[#0B1220] font-receipt select-none w-full sm:w-[210mm] h-[148mm] min-h-[148mm] max-h-[148mm] border border-[#E5E7EB] sm:rounded-[10px] p-4 box-border flex flex-col"
    >
      <div className="absolute inset-x-0 top-0 z-50 bg-[#DC2626] text-white text-[10px] font-black text-center py-0.5 tracking-widest">
        NEW A5 RECEIPT BUILD
      </div>

      <ReceiptHeader
        company={company}
        receiptNumber={cleanReceiptNumber}
        issuedAtDate={issuedAtDate}
        issuedAtTime={issuedAtTime}
        branchName={branchName}
        statusLabel={statusLabel}
        isError={isCancelledOrReversed}
      />

      <section className="flex divide-x divide-[#E5E7EB] py-2 border-b border-[#E5E7EB]">
        <CustomerCard customer={customer} />
        <VehicleCard vehicle={vehicle} />
        <ContractCard
          contractNumber={cleanContractNumber}
          contractDetails={contractDetails}
          currency={payment.currency}
        />
        <PaymentSummaryColumn payment={payment} remainingInstallments={remainingInstallments} />
      </section>

      <PaymentHero
        amount={payment.amount}
        currency={payment.currency}
        tafqitText={tafqitText}
        statusLabel={statusLabel}
      />

      <FinancialSummary progress={contractProgress} currency={payment.currency} />

      {contractProgress && (
        <InstallmentProgress progress={contractProgress} next={nextInstallment} currency={payment.currency} />
      )}

      <PaymentInformation payment={payment} cashierName={verification?.receivedBy} />

      <section className="flex items-center justify-between gap-4 pt-1.5 mt-auto border-t border-[#E5E7EB]">
        <VerificationSection
          qrCodeUrl={verification?.qrCodeUrl}
          journalEntryNumber={verification?.journalEntryNumber}
        />
        <SignatureSection
          cashierName={verification?.receivedBy}
          customerName={customer.name}
          managerName={verification?.approvedBy}
        />
      </section>

      <ReceiptFooter company={company} receiptNumber={cleanReceiptNumber} />
    </article>
  )

  return (
    <>
      {receipt}
      {isPrintOwner && <ReceiptPrintPortal>{receipt}</ReceiptPrintPortal>}

      <style jsx global>{`
        @media print {
          @page {
            size: 210mm 148mm landscape;
            margin: 0;
          }

          html, body {
            background: #ffffff !important;
            color: #0B1220 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 148mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body > *:not(#print-root) {
            display: none !important;
          }

          #print-root {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 148mm !important;
          }

          #print-root .a5-document-root {
            position: static !important;
            display: block !important;
            visibility: visible !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 5mm 7mm !important;
            width: 210mm !important;
            height: 148mm !important;
            min-height: 148mm !important;
            max-height: 148mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            transform: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  )
}
