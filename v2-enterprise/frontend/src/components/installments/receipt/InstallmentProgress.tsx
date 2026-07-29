import React from 'react'
import type { ContractProgressInfo, NextInstallmentInfo } from '../installmentReceiptTypes'
import { formatCurrencyAmount } from '../installmentReceiptFormatters'

interface InstallmentProgressProps {
  progress: ContractProgressInfo
  next?: NextInstallmentInfo | null
  currency: string
}

const MAX_SEGMENTS = 24

export function InstallmentProgress({ progress, next, currency }: InstallmentProgressProps) {
  const { paidInstallmentsCount: paid, totalInstallmentsCount: total, completionPercentage: pct } = progress
  const remaining = Math.max(0, total - paid)
  const useSegments = total > 0 && total <= MAX_SEGMENTS

  return (
    <section className="py-1.5">
      <div className="flex items-center justify-between mb-1 leading-none">
        <span className="text-[8px] font-bold text-[#081F4D] uppercase tracking-[0.1em]">حالة الأقساط</span>
        <span className="text-[9px] font-numeric font-bold text-[#0B8F55] tabular-nums">{pct}%</span>
      </div>

      {useSegments ? (
        <div className="flex gap-[3px] mb-1.5" dir="ltr">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[5px] rounded-full"
              style={{ backgroundColor: i < paid ? '#0B8F55' : '#E5E7EB' }}
            />
          ))}
        </div>
      ) : (
        <div className="w-full h-[5px] bg-[#E5E7EB] rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-[#0B8F55] rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between text-[9.5px] leading-tight">
        <span className="font-medium text-[#4B5563]">
          مسدد <b className="font-numeric text-[#0B1220]">{paid}</b> من <b className="font-numeric text-[#0B1220]">{total}</b> قسط
          {remaining > 0 && <> · متبقي <b className="font-numeric text-[#0B1220]">{remaining}</b></>}
        </span>

        {progress.isCompleted ? (
          <span className="font-bold text-[#0B8F55]">العقد مسدد بالكامل</span>
        ) : next ? (
          <span className="font-medium text-[#4B5563]">
            القسط القادم <b className="font-numeric text-[#0B1220]">#{next.installmentNumber}</b> بتاريخ{' '}
            <b className="font-numeric text-[#0B1220]">{next.dueDate}</b> بقيمة{' '}
            <b className="font-numeric text-[#0B1220]">{formatCurrencyAmount(next.amount, currency)}</b>
          </span>
        ) : null}
      </div>
    </section>
  )
}
