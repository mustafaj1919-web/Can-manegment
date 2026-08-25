'use client'

import { FileText, Download, Printer } from 'lucide-react'

interface Props {
  onExport: () => void
  onPrint: () => void
  hasEntries: boolean
}

export function LedgerQuickReports({ onExport, onPrint, hasEntries }: Props) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4 no-print">
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
        <FileText className="h-5 w-5 text-slate-500" />
        <h3 className="text-base font-bold text-[#0F172A]">التقارير السريعة</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onExport} 
          disabled={!hasEntries}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 text-center transition-all gap-2"
        >
          <Download className="h-5 w-5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 leading-none">تصدير Excel</span>
        </button>
        
        <button 
          onClick={onPrint} 
          disabled={!hasEntries}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 text-center transition-all gap-2"
        >
          <Printer className="h-5 w-5 text-blue-600" />
          <span className="text-xs font-bold text-slate-700 leading-none">طباعة ورقية</span>
        </button>
      </div>
    </div>
  )
}
