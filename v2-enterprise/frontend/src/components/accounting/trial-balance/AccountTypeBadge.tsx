'use client'

import { getAccountTypeInfo } from './trialBalanceAdapter'

interface AccountTypeBadgeProps {
  type?: string | null
}

export function AccountTypeBadge({ type }: AccountTypeBadgeProps) {
  const info = getAccountTypeInfo(type)

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-colors ${info.bgClass} ${info.colorClass} ${info.borderClass}`}
    >
      {info.label}
    </span>
  )
}
