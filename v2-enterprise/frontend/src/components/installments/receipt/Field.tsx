import React from 'react'

interface FieldProps {
  label: string
  value: React.ReactNode
  mono?: boolean
  dir?: 'ltr' | 'rtl'
  span?: 1 | 2
  emphasis?: boolean
  /** Human-readable names (customer, vehicle) get up to 2 lines instead of a hard
   *  single-line ellipsis, so a long Arabic name never disappears mid-word. */
  clamp2?: boolean
}

/** A single label/value pair in the statement's information matrix. Renders nothing when
 *  the value is empty so optional ERP fields never leave a blank row on the printed page. */
export function Field({ label, value, mono, dir, span = 1, emphasis, clamp2 }: FieldProps) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className={span === 2 ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <p className="text-[7.5px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] leading-none mb-1 truncate">
        {label}
      </p>
      <p
        className={`text-[#111827] ${emphasis ? 'text-[13px] font-bold' : 'text-[11px] font-medium'} ${mono ? 'font-numeric tabular-nums' : ''} ${clamp2 ? 'leading-tight' : 'leading-tight truncate'}`}
        style={clamp2 ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
        dir={dir}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
    </div>
  )
}
