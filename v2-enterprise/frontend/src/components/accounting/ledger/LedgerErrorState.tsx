'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onRetry: () => void
}

export function LedgerErrorState({ onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border border-rose-100 rounded-3xl bg-rose-50/20">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
        <AlertCircle className="h-6 w-6 text-rose-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-rose-700">فشل في تحميل حركات الحساب</p>
        <p className="text-xs text-rose-500 mt-1">تأكد من الاتصال بالشبكة وأعد المحاولة</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-1.5 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
        <RefreshCw className="h-3.5 w-3.5" />
        إعادة المحاولة
      </Button>
    </div>
  )
}
