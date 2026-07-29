'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { TrialBalanceAccount } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/utils'
import { AccountTypeBadge } from './AccountTypeBadge'

interface TrialBalanceMobileCardProps {
  account: TrialBalanceAccount
}

export function TrialBalanceMobileCard({ account }: TrialBalanceMobileCardProps) {
  const hasCode = Boolean(account.code && account.code.trim().length > 0)

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3 text-start" dir="rtl">
      {/* Header Row: Code, Name, Type */}
      <div className="flex items-start justify-between gap-2 border-b border-[#E2E8F0] pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-numeric text-xs font-bold text-cyan-700">{account.code}</span>
            <AccountTypeBadge type={account.type} />
          </div>
          <h4 className="text-sm font-bold text-[#0F172A] leading-tight">
            {hasCode ? (
              <Link href={`/chart-of-accounts/${account.code}`} className="hover:text-emerald-700 transition-colors">
                {account.name}
              </Link>
            ) : (
              account.name
            )}
          </h4>
        </div>

        {hasCode && (
          <Link
            href={`/chart-of-accounts/${account.code}`}
            className="text-xs text-cyan-600 font-bold flex items-center gap-1 shrink-0 pt-0.5"
          >
            <span>كشف</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Financial Amounts Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs font-numeric">
        <div className="bg-slate-50 border border-[#E2E8F0] p-2 rounded-xl text-center">
          <span className="text-[10px] font-medium text-[#64748B] block mb-0.5">مدين</span>
          <span className="font-bold text-emerald-700 block">
            {account.debit > 0 ? formatMoney(account.debit, 'IQD') : '0 د.ع'}
          </span>
        </div>

        <div className="bg-slate-50 border border-[#E2E8F0] p-2 rounded-xl text-center">
          <span className="text-[10px] font-medium text-[#64748B] block mb-0.5">دائن</span>
          <span className="font-bold text-rose-600 block">
            {account.credit > 0 ? formatMoney(account.credit, 'IQD') : '0 د.ع'}
          </span>
        </div>

        <div className="bg-slate-50 border border-[#E2E8F0] p-2 rounded-xl text-center">
          <span className="text-[10px] font-medium text-[#64748B] block mb-0.5">الرصيد النهائي</span>
          <span className="font-extrabold text-[#0F172A] block">
            {formatMoney(account.balance, 'IQD')}
          </span>
        </div>
      </div>
    </div>
  )
}
