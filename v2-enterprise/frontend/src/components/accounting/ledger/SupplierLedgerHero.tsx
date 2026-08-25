'use client'

import { MapPin, Phone, UserCheck, Calendar, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/utils'

interface Props {
  supplierName: string
  supplierPhone: string
  accountCode: string
  branchName?: string
  isActive?: boolean
  startDate: string
  endDate: string
  balances: { currency: 'USD' | 'IQD'; balance: number }[]
  onPayClick: () => void
}

export function SupplierLedgerHero({
  supplierName,
  supplierPhone,
  accountCode,
  branchName = 'الفرع الرئيسي',
  isActive = true,
  startDate,
  endDate,
  balances,
  onPayClick,
}: Props) {
  const initials = supplierName ? supplierName.split(' ').slice(0, 2).map(n => n[0]).join('') : 'م'

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-6 no-print">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 border border-[#E2E8F0] text-slate-700 font-bold text-lg">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-[36px] font-bold text-[#0F172A] leading-tight tracking-tight">
                {supplierName}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {isActive ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium text-[#64748B]">
              {supplierPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span dir="ltr">{supplierPhone}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {branchName}
              </span>
              <span className="text-slate-300">·</span>
              <span>رقم الحساب: <span className="font-mono text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-xs font-semibold">{accountCode}</span></span>
            </div>
          </div>
        </div>

        {/* Date Scope */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] bg-slate-50/80 border border-[#E2E8F0] rounded-xl px-3.5 py-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>نطاق الفترة:</span>
            <span className="font-bold text-slate-800 font-numeric">{startDate}</span>
            <span className="text-slate-400">إلى</span>
            <span className="font-bold text-slate-800 font-numeric">{endDate}</span>
          </div>
        </div>
      </div>

      {/* Bottom Exposure Row: Outstanding IQD & USD Balances + CTA */}
      <div className="pt-5 border-t border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Balances Block */}
        <div className="flex flex-wrap gap-4 flex-1">
          {balances.map(b => {
            const hasOwed = b.balance > 0
            return (
              <div 
                key={b.currency} 
                className={`flex-1 min-w-[240px] max-w-[340px] p-5 rounded-[22px] border bg-white relative overflow-hidden flex flex-col justify-between ${
                  hasOwed ? 'border-amber-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]' : 'border-[#E2E8F0]'
                }`}
              >
                {hasOwed && <div className="absolute top-0 start-0 end-0 h-1 bg-amber-400" />}
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-[#64748B]">
                    {b.currency === 'USD' ? 'الرصيد المستحق بالدولار (USD)' : 'الرصيد المستحق بالدينار (IQD)'}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${hasOwed ? 'bg-amber-400' : 'bg-slate-300'}`} />
                </div>
                
                <div className="flex items-baseline gap-1.5" dir="rtl">
                  <span className="text-[42px] font-extrabold text-[#0F172A] tracking-tight font-numeric tabular-nums leading-none">
                    {formatNumber(Math.abs(b.balance))}
                  </span>
                  <span className="text-sm font-bold text-slate-400 self-end mb-1">
                    {b.currency === 'USD' ? '$' : 'د.ع'}
                  </span>
                </div>
                
                {b.balance < 0 && (
                  <p className="text-xs font-semibold text-emerald-600 mt-1.5">رصيد مدفوع مقدماً للمورد</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Primary Action Button */}
        <div className="self-end lg:self-center">
          <Button
            size="lg"
            onClick={onPayClick}
            className="h-12 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm px-6 shadow-sm transition-all"
          >
            <Banknote className="h-4.5 w-4.5" />
            سداد للمورد
          </Button>
        </div>

      </div>

    </div>
  )
}
