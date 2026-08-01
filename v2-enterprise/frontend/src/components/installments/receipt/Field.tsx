import React from 'react'

interface FieldProps {
  label: string
  value: React.ReactNode
  mono?: boolean
  dir?: 'ltr' | 'rtl'
  span?: 1 | 2
  emphasis?: boolean
}

/** A single label/value pair in the statement's information matrix. Renders nothing when
 *  the value is empty so optional ERP fields never leave a blank row on the printed page. */
export function Field({ label, value, mono, dir, span = 1, emphasis }: FieldProps) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className={span === 2 ? 'col-span-2 min-w-0' : 'min-w-0'}>
      <p className="text-[7.5px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em] leading-none mb-1 truncate">
        {label}
      </p>
      <p
        className={`leading-tight truncate text-[#111827] ${emphasis ? 'text-[13px] font-bold' : 'text-[11px] font-medium'} ${mono ? 'font-numeric tabular-nums' : ''}`}
        dir={dir}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
    </div>
  )
}
