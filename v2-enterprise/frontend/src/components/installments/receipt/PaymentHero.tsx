import React from 'react'
import { formatNumber } from '@/lib/utils'

interface PaymentHeroProps {
  amount: number
  currency: string
  tafqitText: string
  statusLabel: string
  isError?: boolean
}

/** Steps the amount's font size down as its formatted length grows, so a nine-figure
 *  purchase price never wraps to a second line inside the fixed-width hero column.
 *  Thresholds are sized against the ~88mm the amount has to work with on an A5 page. */
function amountSizeClass(formatted: string): string {
  const length = formatted.length
  if (length <= 9) return 'text-[44px]'
  if (length <= 11) return 'text-[36px]'
  return 'text-[28px]'
}

/** The document's single focal point — one large tabular-figure amount. Status above,
 *  amount in the middle, amount-in-words + verified mark below. No card, no shadow: the
 *  hairline rules above/below this band (owned by the parent layout) do the framing. */
export function PaymentHero({ amount, currency, tafqitText, statusLabel, isError }: PaymentHeroProps) {
  const accent = isError ? '#DC2626' : '#059669'
  const formattedAmount = formatNumber(amount)

  return (
    <div className="flex flex-col justify-center min-w-0">
      <span className="inline-flex items-center gap-1 text-[9px] font-bold leading-none" style={{ color: accent }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isError ? statusLabel : 'تم استلام'}
      </span>

      <div className="flex items-baseline gap-1.5 mt-1 leading-none" dir="ltr">
        <span className={`${amountSizeClass(formattedAmount)} font-extrabold text-[#0B2347] font-numeric tabular-nums tracking-tight leading-none whitespace-nowrap`}>
          {formattedAmount}
        </span>
        <span className="text-[14px] font-bold text-[#0B2347] shrink-0">{currency === 'IQD' ? 'د.ع' : '$'}</span>
      </div>

      <p
        className="text-[10px] font-medium text-[#111827] leading-snug mt-1 max-w-[80mm] overflow-hidden"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
      >
        {tafqitText}
      </p>

      <span
        className="inline-flex w-fit items-center gap-1 mt-1 rounded-[4px] border px-1.5 py-[2px] text-[7.5px] font-bold uppercase tracking-[0.1em] leading-none"
        style={{ borderColor: accent, color: accent }}
      >
        {isError ? 'REVERSED' : 'PAID & VERIFIED'}
      </span>
    </div>
  )
}
