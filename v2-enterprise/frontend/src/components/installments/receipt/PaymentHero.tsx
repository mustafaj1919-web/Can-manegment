import React from 'react'
import { formatNumber } from '@/lib/utils'

interface PaymentHeroProps {
  amount: number
  currency: string
  tafqitText: string
  statusLabel: string
}

/** The document's single focal point — one large tabular-figure amount, framed by
 *  hairline rules like the summary line of a private-bank statement rather than a
 *  dashboard "stat card". */
export function PaymentHero({ amount, currency, tafqitText, statusLabel }: PaymentHeroProps) {
  return (
    <section className="flex items-stretch py-2.5 border-y border-[#081F4D]/15">
      {/* Amount in words + status */}
      <div className="flex-1 min-w-0 flex flex-col justify-center pe-5">
        <span className="text-[8px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1 leading-none">
          المبلغ المدفوع بالحروف
        </span>
        <p className="text-[12px] font-medium text-[#0B1220] leading-snug">
          {tafqitText}
        </p>
        <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold text-[#0B8F55] leading-none">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {statusLabel}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px bg-[#081F4D]/15 mx-1" />

      {/* Large tabular amount */}
      <div className="text-end shrink-0 ps-5 flex flex-col justify-center">
        <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1 block leading-none">
          المبلغ المدفوع الآن
        </span>
        <div className="flex items-baseline justify-end gap-2">
          <span className="text-[46px] font-bold text-[#081F4D] font-numeric leading-none tracking-tight tabular-nums">
            {formatNumber(amount)}
          </span>
          <span className="text-[15px] font-bold text-[#081F4D]">
            {currency === 'IQD' ? 'د.ع' : '$'}
          </span>
        </div>
      </div>
    </section>
  )
}
