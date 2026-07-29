'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { TrialBalanceAccount } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/utils'
import { AccountTypeBadge } from './AccountTypeBadge'

interface TrialBalanceRowProps {
  account: TrialBalanceAccount
  density: 'comfortable' | 'compact'
}

export function TrialBalanceRow({ account, density }: TrialBalanceRowProps) {
  const rowHeightClass = density === 'comfortable' ? 'h-[60px]' : 'h-[48px]'
  const hasCode = Boolean(account.code && account.code.trim().length > 0)

  return (
    <tr className={`border-b border-[#E2E8F0] hover:bg-slate-50/80 transition-colors ${rowHeightClass}`}>
      {/* Account Code */}
      <td className="px-5 py-2 text-start font-numeric text-sm font-bold text-cyan-700 whitespace-nowrap">
        {hasCode ? (
          <Link
            href={`/chart-of-accounts/${account.code}`}
            className="inline-flex items-center gap-1.5 hover:underline focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
          >
            <span>{account.code}</span>
            <ExternalLink className="h-3 w-3 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ) : (
          <span className="text-[#94A3B8]">—</span>
        )}
      </td>

      {/* Account Name */}
      <td className="px-4 py-2 text-start text-[14px] font-semibold text-[#0F172A]">
        {hasCode ? (
          <Link
            href={`/chart-of-accounts/${account.code}`}
            className="hover:text-emerald-700 transition-colors focus:outline-none"
          >
            {account.name}
          </Link>
        ) : (
          <span>{account.name}</span>
        )}
      </td>

      {/* Account Type Badge */}
      <td className="px-4 py-2 text-start whitespace-nowrap">
        <AccountTypeBadge type={account.type} />
      </td>

      {/* Debit */}
      <td className="px-4 py-2 text-end font-numeric text-[14px] font-bold text-emerald-700 whitespace-nowrap">
        {account.debit > 0 ? formatMoney(account.debit, 'IQD') : <span className="text-[#94A3B8] font-normal">0 د.ع</span>}
      </td>

      {/* Credit */}
      <td className="px-4 py-2 text-end font-numeric text-[14px] font-bold text-rose-600 whitespace-nowrap">
        {account.credit > 0 ? formatMoney(account.credit, 'IQD') : <span className="text-[#94A3B8] font-normal">0 د.ع</span>}
      </td>

      {/* Balance */}
      <td className="px-5 py-2 text-end font-numeric text-[14px] font-extrabold text-[#0F172A] whitespace-nowrap">
        {formatMoney(account.balance, 'IQD')}
      </td>
    </tr>
  )
}
