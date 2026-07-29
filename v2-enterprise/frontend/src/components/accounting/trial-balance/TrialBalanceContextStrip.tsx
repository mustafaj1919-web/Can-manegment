'use client'

import { Coins, Eye, EyeOff, Layers, ListFilter, Maximize2, Minimize2 } from 'lucide-react'

interface TrialBalanceContextStripProps {
  totalAccountsCount: number
  visibleAccountsCount: number
  hideZero: boolean
  density: 'comfortable' | 'compact'
  isFilterActive: boolean
}

export function TrialBalanceContextStrip({
  totalAccountsCount,
  visibleAccountsCount,
  hideZero,
  density,
  isFilterActive,
}: TrialBalanceContextStripProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-wrap items-center justify-between gap-4 text-xs" dir="rtl">
      {/* Context Facts */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-500" />
          <span className="text-[#64748B] font-medium">إجمالي الحسابات:</span>
          <span className="font-bold text-[#0F172A] font-numeric">{totalAccountsCount} حساب</span>
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-emerald-600" />
          <span className="text-[#64748B] font-medium">الحسابات المعروضة:</span>
          <span className="font-bold text-[#0F172A] font-numeric">{visibleAccountsCount} حساب</span>
          {isFilterActive && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">مفلترة</span>}
        </div>

        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-[#64748B] font-medium">العملة الأساسية:</span>
          <span className="font-bold text-[#0F172A]">دينار عراقي (IQD د.ع)</span>
        </div>
      </div>

      {/* Mode Indicators */}
      <div className="flex items-center gap-4 text-[#64748B]">
        <div className="flex items-center gap-1.5">
          {hideZero ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
          <span>{hideZero ? 'إخفاء الحسابات الصفرية' : 'إظهار الحسابات الصفرية'}</span>
        </div>

        <div className="flex items-center gap-1.5 border-s border-[#E2E8F0] ps-4">
          {density === 'comfortable' ? <Maximize2 className="h-3.5 w-3.5 text-slate-400" /> : <Minimize2 className="h-3.5 w-3.5 text-emerald-600" />}
          <span>{density === 'comfortable' ? 'نمط عرض مريح (60px)' : 'نمط عرض مكثف (48px)'}</span>
        </div>
      </div>
    </div>
  )
}
