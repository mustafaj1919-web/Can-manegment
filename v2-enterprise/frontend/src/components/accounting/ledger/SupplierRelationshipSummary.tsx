'use client'

import { useState } from 'react'
import { ShieldCheck, Coins, History, Copy, Check } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  isActive: boolean
  branchName: string
  accountCode: string
  currencies: string[]
  movementCount: number
  lastMovementDate?: string
}

export function SupplierRelationshipSummary({
  isActive,
  branchName,
  accountCode,
  currencies,
  movementCount,
  lastMovementDate,
}: Props) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accountCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
        <ShieldCheck className="h-5 w-5 text-blue-500" />
        <h3 className="text-base font-bold text-[#0F172A]">ملخص العلاقة المالية</h3>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Status */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/60">
          <span className="text-[13px] font-medium text-[#64748B]">حالة الحساب</span>
          <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
          }`}>
            {isActive ? 'نشط' : 'مؤرشف'}
          </span>
        </div>

        {/* Branch */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/60">
          <span className="text-[13px] font-medium text-[#64748B]">الفرع التابع</span>
          <span className="text-sm font-semibold text-[#475569]">{branchName}</span>
        </div>

        {/* Currencies */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/60">
          <span className="text-[13px] font-medium text-[#64748B]">العملات النشطة</span>
          <span className="text-sm font-semibold text-[#475569] flex items-center gap-1">
            <Coins className="h-4 w-4 text-slate-400" />
            {currencies.join(' ، ')}
          </span>
        </div>

        {/* Movement count */}
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/60">
          <span className="text-[13px] font-medium text-[#64748B]">عدد حركات الفترة</span>
          <span className="text-sm font-semibold text-[#475569] font-numeric">{movementCount} حركة</span>
        </div>

        {/* Last movement */}
        {lastMovementDate && (
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/60">
            <span className="text-[13px] font-medium text-[#64748B]">آخر حركة مسجلة</span>
            <span className="text-sm font-semibold text-[#475569] font-numeric flex items-center gap-1">
              <History className="h-4 w-4 text-slate-400" />
              {formatDate(lastMovementDate)}
            </span>
          </div>
        )}

        {/* Account Code (Secondary row) */}
        <div className="flex items-center justify-between pt-1 bg-slate-50/70 px-3.5 py-2.5 rounded-xl border border-slate-100">
          <span className="text-xs font-semibold text-[#64748B]">رمز الحساب المالي</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-600 font-semibold select-all text-xs">
              {accountCode.length > 14 ? `${accountCode.slice(0, 12)}...` : accountCode}
            </span>
            <button 
              onClick={copyToClipboard}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="نسخ رقم الحساب"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
