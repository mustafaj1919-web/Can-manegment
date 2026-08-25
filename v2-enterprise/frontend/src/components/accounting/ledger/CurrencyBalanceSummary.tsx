'use client'

import { formatNumber } from '@/lib/utils'

interface CurrencySummary {
  currency: 'USD' | 'IQD'
  total_debit: number
  total_credit: number
  balance: number
  unpaid_purchases: number
}

interface Props {
  byCurrency: CurrencySummary[]
  movementCountByCurrency: Record<'USD' | 'IQD', number>
}

export function CurrencyBalanceSummary({ byCurrency, movementCountByCurrency }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
      {byCurrency.map((c) => {
        const hasOwed = c.balance > 0
        const mCount = movementCountByCurrency[c.currency] ?? 0

        return (
          <div 
            key={c.currency} 
            className={`bg-white border rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] relative overflow-hidden flex flex-col justify-between ${
              hasOwed ? 'border-amber-200' : 'border-[#E2E8F0]'
            }`}
          >
            {hasOwed && <div className="absolute top-0 start-0 end-0 h-1 bg-amber-400" />}

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <span className="text-xs font-bold text-[#475569]">
                {c.currency === 'USD' ? 'الحساب بالدولار الأمريكي (USD)' : 'الحساب بالدينار العراقي (IQD)'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                hasOwed ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hasOwed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {hasOwed ? 'ذمة مستحقة' : 'خالص الرصيد'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[13px] font-medium text-[#64748B] mb-1.5">الرصيد المستحق</p>
                <div className="flex items-baseline gap-1" dir="rtl">
                  <span className="font-numeric text-base font-extrabold text-[#0F172A] tabular-nums">
                    {formatNumber(Math.abs(c.balance))}
                  </span>
                  <span className="text-xs font-bold text-slate-400 self-end mb-0.5">
                    {c.currency === 'USD' ? '$' : 'د.ع'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-medium text-[#64748B] mb-1.5">إجمالي المشتريات</p>
                <div className="flex items-baseline gap-1" dir="rtl">
                  <span className="font-numeric text-sm font-bold text-[#475569] tabular-nums">
                    {formatNumber(c.total_credit)}
                  </span>
                  <span className="text-xs font-bold text-slate-400 self-end mb-0.5">
                    {c.currency === 'USD' ? '$' : 'د.ع'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-medium text-[#64748B] mb-1.5">إجمالي المدفوعات</p>
                <div className="flex items-baseline gap-1" dir="rtl">
                  <span className="font-numeric text-sm font-bold text-[#475569] tabular-nums">
                    {formatNumber(c.total_debit)}
                  </span>
                  <span className="text-xs font-bold text-slate-400 self-end mb-0.5">
                    {c.currency === 'USD' ? '$' : 'د.ع'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-medium text-[#64748B] mb-1.5">حركات الفترة</p>
                <div className="flex items-baseline gap-1" dir="rtl">
                  <span className="font-numeric text-sm font-bold text-[#475569] tabular-nums">
                    {mCount}
                  </span>
                  <span className="text-xs font-bold text-slate-400">حركة</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
