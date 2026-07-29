'use client'

import { List, CalendarDays } from 'lucide-react'

interface Props {
  activeView: 'timeline' | 'table'
  onChange: (view: 'timeline' | 'table') => void
}

export function LedgerViewSwitcher({ activeView, onChange }: Props) {
  return (
    <div className="flex p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl no-print">
      <button
        onClick={() => onChange('timeline')}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          activeView === 'timeline'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-[#475569] hover:bg-slate-200/50'
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        الخط الزمني
      </button>
      
      <button
        onClick={() => onChange('table')}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          activeView === 'table'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-[#475569] hover:bg-slate-200/50'
        }`}
      >
        <List className="h-4 w-4" />
        جدول كشف الحساب
      </button>
    </div>
  )
}
