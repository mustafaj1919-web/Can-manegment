import React from 'react'
import type { ContractProgressInfo } from '../installmentReceiptTypes'
import { formatCurrencyAmount, formatPercent } from '../installmentReceiptFormatters'

interface FinancialSummaryProps {
  progress?: ContractProgressInfo | null
  currency: string
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 leading-tight">
      <span className="text-[9px] text-[#667085] font-medium">{label}</span>
      <span
        className="text-[11px] font-numeric font-semibold tabular-nums shrink-0"
        style={{ color: color ?? '#111827' }}
        dir="ltr"
      >
        {value}
      </span>
    </div>
  )
}

/** Opposite side of the payment hero — the contract's running balance. Three lines,
 *  one thin bar. Discount/penalty/tax only ever appear as one extra muted line each,
 *  and only when the backend actually reports a non-zero adjustment. */
export function FinancialSummary({ progress, currency }: FinancialSummaryProps) {
  if (!progress) {
    return (
      <div className="flex items-center justify-center min-w-0 text-[9.5px] text-[#667085]">
        لا توجد بيانات ملخص متاحة لهذا العقد
      </div>
    )
  }

  const fmt = (v: number) => formatCurrencyAmount(v, currency)
  // Defensive clamp only — the backend is the source of truth for this number; this just
  // stops a transient out-of-range value from drawing a bar wider than its own track.
  const pct = Math.min(100, Math.max(0, progress.completionPercentage))

  return (
    <div className="flex flex-col justify-center min-w-0 gap-[2px]">
      <Row label="قيمة العقد الإجمالية" value={fmt(progress.totalAmount)} />
      <Row label="المدفوع حتى الآن" value={fmt(progress.totalPaid)} color="#059669" />
      {progress.discount ? <Row label="الخصم" value={`- ${fmt(progress.discount)}`} /> : null}
      {progress.penalty ? <Row label="الغرامة" value={`+ ${fmt(progress.penalty)}`} color="#DC2626" /> : null}
      {progress.tax ? <Row label="الضريبة" value={fmt(progress.tax)} /> : null}

      <div className="flex items-baseline justify-between gap-3 leading-tight pt-[3px] mt-[1px] border-t border-[#E5E7EB]">
        <span className="text-[9.5px] text-[#111827] font-bold">المبلغ المتبقي</span>
        <span className="text-[16px] font-numeric font-bold tabular-nums shrink-0 text-[#059669]" dir="ltr">
          {fmt(progress.remainingBalance)}
        </span>
      </div>

      <div className="mt-[3px]">
        <div className="flex items-center justify-between text-[8px] font-bold text-[#667085] mb-[3px] leading-none">
          <span>نسبة السداد</span>
          <span className="font-numeric tabular-nums" dir="ltr">{formatPercent(pct)}</span>
        </div>
        <div className="w-full h-[4px] bg-[#E5E7EB] rounded-full overflow-hidden">
          <div className="h-full bg-[#059669] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[7.5px] text-[#9CA3AF] font-medium mt-[3px] leading-none">
          <span className="font-numeric tabular-nums" dir="ltr">{formatPercent(pct)} مدفوع</span>
          <span className="font-numeric tabular-nums" dir="ltr">{formatPercent(100 - pct)} متبقي</span>
        </div>
      </div>
    </div>
  )
}
