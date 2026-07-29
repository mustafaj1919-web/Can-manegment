'use client'

import { Download, RefreshCw, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TrialBalanceHeaderProps {
  filteredCount: number
  totalCount: number
  isFilterActive: boolean
  isLoading: boolean
  isFetching: boolean
  exporting: boolean
  onRefresh: () => void
  onExport: () => void
}

export function TrialBalanceHeader({
  filteredCount,
  totalCount,
  isFilterActive,
  isLoading,
  isFetching,
  exporting,
  onRefresh,
  onExport,
}: TrialBalanceHeaderProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <Scale className="h-5 w-5" />
        </div>
        <div className="space-y-0.5 text-start">
          <h1 className="text-[26px] md:text-[30px] font-bold text-[#0F172A] leading-tight tracking-tight">
            ميزان المراجعة
          </h1>
          <p className="text-[13px] font-medium text-[#64748B]">
            {isLoading ? (
              'جاري تحميل بيانات الميزان...'
            ) : (
              <>
                عرض ودراسة موازنة الحسابات ({filteredCount} من أصل {totalCount} حساب)
                {isFilterActive && <span className="text-emerald-700 font-bold ms-1">(تصفية نشطة)</span>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching || isLoading}
          className="h-10 px-3.5 border-[#E2E8F0] bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#0F172A] rounded-xl gap-2 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </Button>

        <Button
          type="button"
          onClick={onExport}
          disabled={exporting || isLoading || filteredCount === 0}
          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl gap-2 transition-colors shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span>{exporting ? 'جاري التصدير...' : 'تصدير الميزان (XLSX)'}</span>
        </Button>
      </div>
    </div>
  )
}
