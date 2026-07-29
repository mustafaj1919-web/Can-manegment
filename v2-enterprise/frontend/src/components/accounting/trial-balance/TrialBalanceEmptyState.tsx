'use client'

import { Scale, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TrialBalanceEmptyStateProps {
  isFilterActive: boolean
  onResetFilters: () => void
}

export function TrialBalanceEmptyState({ isFilterActive, onResetFilters }: TrialBalanceEmptyStateProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
        <Scale className="h-6 w-6" />
      </div>
      
      <h3 className="text-base font-bold text-[#0F172A]">
        {isFilterActive ? 'لا توجد حسابات تطابق خيارات التصفية' : 'لا توجد حسابات مسجلة في ميزان المراجعة'}
      </h3>
      
      <p className="text-xs text-[#64748B] max-w-md mx-auto">
        {isFilterActive
          ? 'جرب البحث برمز حساب آخر أو قم بتعديل خيارات التصفية الحالية'
          : 'لم يتم تسجيل حركات أو حسابات خاضعة للميزان بعد'}
      </p>

      {isFilterActive && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="h-10 px-4 text-xs font-bold border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] rounded-xl gap-2"
          >
            <X className="h-4 w-4" />
            <span>مسح جميع الفلاتر</span>
          </Button>
        </div>
      )}
    </div>
  )
}
