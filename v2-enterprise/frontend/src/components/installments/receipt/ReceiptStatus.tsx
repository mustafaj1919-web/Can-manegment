import React from 'react'

interface ReceiptStatusProps {
  label: string
  isError?: boolean
}

/** Restrained status tag — a thin-bordered seal rather than a filled UI pill, matching
 *  the "PAID" / "VOID" stamps on a formal financial document. */
export function ReceiptStatus({ label, isError }: ReceiptStatusProps) {
  const color = isError ? '#DC2626' : '#0B8F55'

  return (
    <span
      className="inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-[2px] text-[7.5px] font-bold uppercase tracking-[0.08em] whitespace-nowrap"
      style={{ borderColor: color, color }}
    >
      <span className="h-[4px] w-[4px] rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
