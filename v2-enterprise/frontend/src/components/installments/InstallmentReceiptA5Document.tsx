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
import { NextInstallmentStrip } from './receipt/NextInstallmentStrip'
import { TransactionStrip } from './receipt/TransactionStrip'
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

const RAW_GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Only ever shortens a *raw database GUID* fallback (id with no human-assigned reference
 *  yet) into a compact "12345678-ABCD" form. Real business identifiers — contract/receipt
 *  numbers like "RCPT-20260801-BGD-00000002871" — are returned as-is and left to the
 *  layout's own single-line ellipsis; naively splitting on every hyphen would silently
 *  drop whichever segments come after the second one. */
function shortenId(value?: string | null): string | undefined {
  if (!value) return value ?? undefined
  if (RAW_GUID_PATTERN.test(value)) {
    const [prefix, , , , suffix] = value.split('-')
    return `${prefix}-${suffix?.slice(0, 4).toUpperCase()}`
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

  const receipt = (
    <article
      dir="rtl"
      lang="ar"
      data-receipt-id={receiptNumber}
      className="a5-document-root relative bg-white text-[#111827] font-receipt select-none w-full sm:w-[210mm] h-[148mm] min-h-[148mm] max-h-[148mm] border border-[#E5E7EB] sm:rounded-[6px] p-4 box-border flex flex-col"
    >
      <ReceiptHeader
        company={company}
        receiptNumber={cleanReceiptNumber}
        issuedAtDate={issuedAtDate}
        issuedAtTime={issuedAtTime}
        branchName={branchName}
        statusLabel={statusLabel}
        isError={isCancelledOrReversed}
      />

      {/* Identity strip: customer / vehicle / contract / current installment */}
      <section className="a5-section flex divide-x divide-[#E5E7EB] py-1 border-b border-[#E5E7EB]">
        <CustomerCard customer={customer} />
        <VehicleCard vehicle={vehicle} />
        <ContractCard
          contractNumber={cleanContractNumber}
          contractDetails={contractDetails}
          currency={payment.currency}
        />
        <PaymentSummaryColumn payment={payment} />
      </section>

      {/* Payment hero band: financial summary (right) + amount hero (left) */}
      <section className="a5-section flex items-stretch py-1 border-b border-[#E5E7EB]">
        <div className="flex-1 min-w-0 pe-4">
          <FinancialSummary progress={contractProgress} currency={payment.currency} />
        </div>
        <div className="w-px self-stretch bg-[#E5E7EB]" />
        <div className="flex-1 min-w-0 ps-4">
          <PaymentHero
            amount={payment.amount}
            currency={payment.currency}
            tafqitText={tafqitText}
            statusLabel={statusLabel}
            isError={isCancelledOrReversed}
          />
        </div>
      </section>

      <div className="a5-section">
        <NextInstallmentStrip next={nextInstallment} progress={contractProgress} currency={payment.currency} />
      </div>

      <div className="a5-section">
        <TransactionStrip payment={payment} cashierName={verification?.receivedBy} verification={verification} />
      </div>

      <section className="a5-section pt-1.5 mt-auto border-t border-[#E5E7EB]">
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
            size: A5 landscape;
            margin: 6mm 8mm;
          }

          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body > *:not(#print-root) {
            display: none !important;
          }

          #print-root {
            display: block !important;
            position: static !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }

          #print-root .a5-document-root {
            position: static !important;
            display: flex !important;
            visibility: visible !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 3mm 2mm 2mm 2mm !important;
            width: 100% !important;
            max-width: 194mm !important;
            height: 136mm !important;
            min-height: 136mm !important;
            max-height: 136mm !important;
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

          #print-root .a5-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </>
  )
}
