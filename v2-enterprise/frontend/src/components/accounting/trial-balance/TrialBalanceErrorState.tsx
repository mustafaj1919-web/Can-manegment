'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TrialBalanceErrorStateProps {
  onRetry: () => void
}

export function TrialBalanceErrorState({ onRetry }: TrialBalanceErrorStateProps) {
  return (
    <div className="bg-rose-50/60 border border-rose-200 rounded-[22px] p-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
      <div className="h-12 w-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      
      <h3 className="text-base font-bold text-rose-950">تعذر تحميل بيانات ميزان المراجعة</h3>
      
      <p className="text-xs text-rose-800/80 max-w-md mx-auto">
        حدث خطأ أثناء الاتصال بالخادم للحصول على الميزان الحسابي الرسمي. يمكنك إعادة المحاولة.
      </p>

      <div className="pt-2">
        <Button
          type="button"
          onClick={onRetry}
          className="h-10 px-5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl gap-2 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>إعادة المحاولة الان</span>
        </Button>
      </div>
    </div>
  )
}
