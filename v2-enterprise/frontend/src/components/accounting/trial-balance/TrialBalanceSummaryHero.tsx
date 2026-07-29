'use client'

import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { TrialBalanceStatusAdapter } from './trialBalanceAdapter'

interface TrialBalanceSummaryHeroProps {
  totalDebit: number
  totalCredit: number
  difference: number
  statusAdapter: TrialBalanceStatusAdapter
  isLoading: boolean
}

export function TrialBalanceSummaryHero({
  totalDebit,
  totalCredit,
  difference,
  statusAdapter,
  isLoading,
}: TrialBalanceSummaryHeroProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  const isBalanced = statusAdapter.isBalanced

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {/* Total Debit Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-2 text-start">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">إجمالي المدين الرسمي</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="text-[28px] md:text-[36px] xl:text-[40px] font-extrabold text-[#0F172A] font-numeric tabular-nums leading-none tracking-tight">
          {formatMoney(totalDebit, 'IQD')}
        </div>
        <span className="text-[11px] font-semibold text-[#64748B] block">مجموع الجانب المدين</span>
      </div>

      {/* Total Credit Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-2 text-start">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">إجمالي الدائن الرسمي</span>
          <span className="h-2 w-2 rounded-full bg-rose-500" />
        </div>
        <div className="text-[28px] md:text-[36px] xl:text-[40px] font-extrabold text-[#0F172A] font-numeric tabular-nums leading-none tracking-tight">
          {formatMoney(totalCredit, 'IQD')}
        </div>
        <span className="text-[11px] font-semibold text-[#64748B] block">مجموع الجانب الدائن</span>
      </div>

      {/* Difference Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-2 text-start">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">الفرق بين الجانبين</span>
          <span className={`h-2 w-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        </div>
        <div className={`text-[26px] md:text-[32px] xl:text-[36px] font-extrabold font-numeric tabular-nums leading-none tracking-tight ${
          isBalanced === true ? 'text-emerald-700' : isBalanced === false ? 'text-rose-600' : 'text-slate-700'
        }`}>
          {formatMoney(difference, 'IQD')}
        </div>
        <span className="text-[11px] font-semibold text-[#64748B] block">
          {isBalanced ? 'لا يوجد فرق محاسبي' : 'قيمة الفارق المحاسبي'}
        </span>
      </div>

      {/* Balanced Status Badge Card */}
      <div className={`border rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between text-start transition-all ${
        isBalanced === true
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          : isBalanced === false
          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
          : 'bg-slate-50 border-[#E2E8F0] text-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">حالة الميزان المحاسبية</span>
          {isBalanced === true ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          ) : isBalanced === false ? (
            <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
          ) : (
            <HelpCircle className="h-6 w-6 text-slate-400 shrink-0" />
          )}
        </div>

        <div className="py-2 space-y-1">
          <div className={`text-[24px] font-extrabold leading-none ${
            isBalanced === true ? 'text-emerald-800' : isBalanced === false ? 'text-rose-700' : 'text-slate-700'
          }`}>
            {statusAdapter.statusLabel}
          </div>
          <p className="text-[11px] font-semibold opacity-80">
            {isBalanced === true
              ? 'تساوي إجمالي المدين والدائن بنجاح'
              : isBalanced === false
              ? `يوجد فارق قدره ${formatMoney(difference, 'IQD')}`
              : 'الحالة غير متوفرة من الخادم'}
          </p>
        </div>
      </div>
    </div>
  )
}
