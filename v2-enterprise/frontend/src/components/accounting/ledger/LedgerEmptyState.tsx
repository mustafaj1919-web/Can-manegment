'use client'

import { BookOpen } from 'lucide-react'

export function LedgerEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-20 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100">
        <BookOpen className="h-6 w-6 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">لا توجد حركات في هذه الفترة</p>
        <p className="text-xs text-slate-400 mt-1">جرّب توسيع نطاق التاريخ لرؤية حركات هذا الحساب</p>
      </div>
    </div>
  )
}
