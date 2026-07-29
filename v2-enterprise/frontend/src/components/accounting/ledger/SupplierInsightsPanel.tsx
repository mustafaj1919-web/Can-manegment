'use client'

import { ClipboardCheck, Sparkles, FileText, CheckCircle2 } from 'lucide-react'
import { formatMoney, formatDate } from '@/lib/utils'

interface LedgerEntry {
  date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  running_balance: number
  reference_type: string
  currency: 'USD' | 'IQD'
}

interface Props {
  currency: 'USD' | 'IQD'
  balance: number
  entries: LedgerEntry[]
  onExport: () => void
  onPrint: () => void
}

export function SupplierInsightsPanel({
  currency,
  balance,
  entries,
  onExport,
  onPrint,
}: Props) {
  const filtered = entries.filter(e => e.currency === currency)

  // Last movement calculation
  const lastMovement = filtered.length > 0 ? filtered[filtered.length - 1] : null

  // System Insights calculations
  const totalPaid = filtered.reduce((acc, curr) => acc + curr.debit, 0)
  const totalPurchases = filtered.reduce((acc, curr) => acc + curr.credit, 0)
  
  const insights = []
  if (totalPaid === 0 && filtered.length > 0) {
    insights.push('لم يتم تسجيل أي مدفوعات خلال الفترة المحددة.')
  }
  if (balance > 0 && totalPurchases > totalPaid) {
    insights.push('الرصيد المستحق للمورد تزايد خلال هذه الفترة.')
  }
  if (lastMovement) {
    const isPurchase = lastMovement.reference_type === 'Purchase' || lastMovement.credit > 0
    insights.push(`آخر حركة تم تسجيلها كانت ${isPurchase ? 'شراء' : 'سداد دفعة'}.`)
  }
  insights.push(`يوجد عدد ${filtered.length} حركات مسجلة بالـ ${currency} في هذه الفترة.`)

  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      
      {/* System Insights */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-blue-500" />
          <h3 className="text-xs font-bold text-slate-700">الملخص المالي للنظام</h3>
        </div>
        
        <ul className="space-y-2.5">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[11px] text-slate-500 leading-normal">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 mt-1.5" />
              <span>{ins}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Review / Checklist */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4.5 w-4.5 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-700">المطابقة والتسوية للمورد</h3>
        </div>
        
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>مطابقة حركات المشتريات المرفوعة</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>تسوية المدفوعات النقدية والبنكية</span>
          </div>
          {balance > 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-amber-600 font-semibold bg-amber-50/50 border border-amber-100 rounded-xl px-2.5 py-1.5">
              <span>مستحسن: مراجعة الرصيد المتبقي البالغ {formatMoney(balance, currency)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-semibold bg-emerald-50/50 border border-emerald-100 rounded-xl px-2.5 py-1.5">
              <span>الحساب متطابق ومسدد بالكامل</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick statement reports */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-700">التقارير السريعة</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onExport} 
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-200 text-slate-600 text-center transition-all gap-1.5"
          >
            <span className="text-[10px] font-bold text-emerald-600 leading-none">تصدير إكسل</span>
            <span className="text-[9px] text-slate-400">Statement Excel</span>
          </button>
          
          <button 
            onClick={onPrint} 
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-200 text-slate-600 text-center transition-all gap-1.5"
          >
            <span className="text-[10px] font-bold text-blue-600 leading-none">طباعة ورقية</span>
            <span className="text-[9px] text-slate-400">Print A4 Report</span>
          </button>
        </div>
      </div>

    </div>
  )
}
