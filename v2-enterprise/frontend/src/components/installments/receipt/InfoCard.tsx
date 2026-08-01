import React from 'react'

interface InfoCardProps {
  title: string
  children: React.ReactNode
}

/** One column of the receipt's information matrix (Customer / Vehicle / Contract /
 *  Payment). No border, background, or shadow of its own — columns are separated by the
 *  parent row's `divide-x` hairline, matching a printed statement's column rules rather
 *  than a dashboard card grid. */
export function InfoCard({ title, children }: InfoCardProps) {
  return (
    <div className="flex-1 min-w-0 px-4 first:ps-0 last:pe-0">
      <span className="block text-[8px] font-bold text-[#0B2347] uppercase tracking-[0.1em] mb-1.5 leading-none">
        {title}
      </span>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">{children}</div>
    </div>
  )
}
