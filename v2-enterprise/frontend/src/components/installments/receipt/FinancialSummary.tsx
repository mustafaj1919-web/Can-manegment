import React from 'react'
import type { ContractProgressInfo } from '../installmentReceiptTypes'
import { formatCurrencyAmount, formatPercent } from '../installmentReceiptFormatters'

interface FinancialSummaryProps {
  progress?: ContractProgressInfo | null
  currency: string
}

function Row({ label, value, color, muted }: { label: string; value: string; color?: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-[#D1D5DB] py-[1px] leading-tight">
      <span className={`text-[9px] ${muted ? 'text-[#9CA3AF]' : 'text-[#4B5563]'} font-medium truncate`}>{label}</span>
      <span
        className={`text-[10px] font-numeric tabular-nums shrink-0 ${muted ? 'font-medium' : 'font-semibold'}`}
        style={{ color: color ?? '#0B1220' }}
      >
        {value}
      </span>
    </div>
  )
}

export function FinancialSummary({ progress, currency }: FinancialSummaryProps) {
  if (!progress) {
    return (
      <section className="py-2.5 text-center text-[10px] text-[#9CA3AF]">
        لا توجد بيانات ملخص متاحة لهذا العقد
      </section>
    )
  }

  const fmt = (v: number) => formatCurrencyAmount(v, currency)
  const hasAdjustments = Boolean(progress.discount || progress.penalty || progress.tax)

  return (
    <section className="py-1">
      <span className="block text-[8px] font-bold text-[#081F4D] uppercase tracking-[0.1em] mb-0.5 leading-none">
        الملخص المالي
      </span>

      <div className="grid grid-cols-2 gap-x-8">
        <div>
          <Row label="قيمة العقد الإجمالية" value={fmt(progress.totalAmount)} />
          <Row label="المدفوع سابقاً" value={fmt(progress.previouslyPaid)} />
          <Row label="الدفعة الحالية" value={fmt(progress.paidThisTime)} color="#0B8F55" />
          {progress.discount ? <Row label="الخصم" value={`- ${fmt(progress.discount)}`} muted /> : null}
        </div>
        <div>
          <Row label="إجمالي المدفوع" value={fmt(progress.totalPaid)} color="#0B8F55" />
          {progress.penalty ? <Row label="الغرامة" value={`+ ${fmt(progress.penalty)}`} color="#B91C1C" muted /> : null}
          {progress.tax ? <Row label="الضريبة" value={fmt(progress.tax)} muted /> : null}
          {hasAdjustments && (
            <Row label="الصافي المدفوع" value={fmt(progress.netPaid ?? progress.totalPaid)} color="#0B8F55" />
          )}
        </div>
      </div>

      {/* Balance due — the statement's bottom line */}
      <div className="flex items-end justify-between mt-0.5 pt-0.5 border-t-[1.5px] border-[#081F4D]">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold text-[#0B1220] leading-none">الرصيد المتبقي المستحق</span>
          <span className="text-[9px] font-numeric font-semibold text-[#0B8F55] leading-none">
            {formatPercent(progress.completionPercentage)} مسدد
          </span>
        </div>
        <span className="text-[18px] font-bold font-numeric tabular-nums text-[#B45309] leading-none">
          {fmt(progress.remainingBalance)}
        </span>
      </div>
    </section>
  )
}
