'use client'

import { TrendingUp, TrendingDown, Wallet, Hash, Clock } from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'

interface Props {
  currency: 'USD' | 'IQD'
  totalCredit: number
  totalDebit: number
  balance: number
  movementCount: number
  lastPurchaseDate?: string
  lastPaymentDate?: string
}

export function LedgerKpiStrip({
  currency,
  totalCredit,
  totalDebit,
  balance,
  movementCount,
  lastPurchaseDate,
  lastPaymentDate,
}: Props) {
  const isUSD = currency === 'USD'
  const symbol = isUSD ? '$' : 'د.ع'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
      
      {/* Total Purchases */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
          <TrendingUp className="h-4.5 w-4.5 text-rose-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] leading-none mb-1.5">إجمالي المشتريات</p>
          <div className="flex items-baseline gap-1" dir="rtl">
            <span className="font-numeric text-base font-bold text-rose-600 tabular-nums truncate">
              {formatNumber(totalCredit)}
            </span>
            <span className="text-xs font-bold text-rose-400 self-end mb-0.5">
              {symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Total Paid */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
          <TrendingDown className="h-4.5 w-4.5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] leading-none mb-1.5">إجمالي المدفوع</p>
          <div className="flex items-baseline gap-1" dir="rtl">
            <span className="font-numeric text-base font-bold text-emerald-600 tabular-nums truncate">
              {formatNumber(totalDebit)}
            </span>
            <span className="text-xs font-bold text-emerald-500 self-end mb-0.5">
              {symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
          <Wallet className="h-4.5 w-4.5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] leading-none mb-1.5">الرصيد الجاري</p>
          <div className="flex items-baseline gap-1" dir="rtl">
            <span className="font-numeric text-base font-bold text-slate-800 tabular-nums truncate">
              {formatNumber(Math.abs(balance))}
            </span>
            <span className="text-xs font-bold text-slate-400 self-end mb-0.5">
              {symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Movement Count */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
          <Hash className="h-4.5 w-4.5 text-blue-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] leading-none mb-1.5">عدد الحركات</p>
          <div className="flex items-baseline gap-1" dir="rtl">
            <span className="font-numeric text-base font-bold text-slate-800 tabular-nums truncate">
              {movementCount}
            </span>
            <span className="text-xs font-bold text-slate-400">حركة</span>
          </div>
        </div>
      </div>

      {/* Last Purchase */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
          <Clock className="h-4.5 w-4.5 text-slate-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] leading-none mb-1.5">آخر عملية شراء</p>
          <p className="mt-1 font-numeric text-xs font-bold text-slate-700 truncate">
            {lastPurchaseDate ? formatDate(lastPurchaseDate) : 'لا يوجد'}
          </p>
        </div>
      </div>

      {/* Last Payment */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 flex items-start gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
          <Clock className="h-4.5 w-4.5 text-slate-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#64748B] leading-none mb-1.5">آخر دفعة مسددة</p>
          <p className="mt-1 font-numeric text-xs font-bold text-slate-700 truncate">
            {lastPaymentDate ? formatDate(lastPaymentDate) : 'لا يوجد'}
          </p>
        </div>
      </div>
    </div>
  )
}
