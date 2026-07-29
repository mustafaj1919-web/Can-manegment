'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatNumber, formatDate } from '@/lib/utils'

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
  entries: LedgerEntry[]
  currency: 'USD' | 'IQD'
  totalDebit: number
  totalCredit: number
  balance: number
}

export function LedgerTable({
  entries,
  currency,
  totalDebit,
  totalCredit,
  balance,
}: Props) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  // Filter entries to only show the selected currency
  const filtered = entries.filter(e => e.currency === currency)

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-[#64748B] text-xs font-medium bg-white border border-[#E2E8F0] rounded-[22px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        لا توجد حركات لعرضها في جدول الحساب لهذه العملة.
      </div>
    )
  }

  const symbol = currency === 'USD' ? '$' : 'د.ع'

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px] border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-slate-50/60 sticky top-0 z-10">
              <th className="w-10 px-4 py-3.5"></th>
              <th className="px-4 py-3.5 text-right text-[13px] font-bold text-[#475569] tracking-tight">التاريخ</th>
              <th className="px-4 py-3.5 text-right text-[13px] font-bold text-[#475569] tracking-tight">رقم الحركة</th>
              <th className="px-4 py-3.5 text-right text-[13px] font-bold text-[#475569] tracking-tight">البيان</th>
              <th className="w-36 px-4 py-3.5 text-left text-[13px] font-bold text-emerald-600 tracking-tight">مدين (سداد)</th>
              <th className="w-36 px-4 py-3.5 text-left text-[13px] font-bold text-rose-600 tracking-tight">دائن (شراء)</th>
              <th className="w-40 px-4 py-3.5 text-left text-[13px] font-bold text-[#475569] tracking-tight">الرصيد المتراكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((entry, index) => {
              const isExpanded = expandedRow === index
              const isPurchase = entry.reference_type === 'Purchase' || entry.credit > 0
              const isPayment = entry.debit > 0
              const bal = entry.running_balance

              return (
                <optgroup key={index} label="" className="p-0 border-0">
                  <tr 
                    className={cn(
                      'transition-colors hover:bg-slate-50/50 cursor-pointer h-14',
                      isExpanded && 'bg-slate-50/30'
                    )}
                    onClick={() => setExpandedRow(isExpanded ? null : index)}
                  >
                    <td className="px-3 py-3 text-center">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                      )}
                    </td>
                    
                    <td className="px-4 py-3 text-xs font-numeric font-bold text-slate-500 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md font-semibold">
                        {entry.entry_number}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                          isPurchase ? 'bg-rose-400' : isPayment ? 'bg-emerald-400' : 'bg-slate-300'
                        )} />
                        <span className="text-xs font-bold text-slate-700 leading-normal">
                          {entry.description}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 text-left font-numeric text-xs font-bold text-emerald-600">
                      {entry.debit > 0 ? (
                        <span dir="rtl" className="inline-flex gap-0.5 items-baseline">
                          <span>{formatNumber(entry.debit)}</span>
                          <span className="text-[10px] text-emerald-400 font-semibold">{symbol}</span>
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3 text-left font-numeric text-xs font-bold text-rose-600">
                      {entry.credit > 0 ? (
                        <span dir="rtl" className="inline-flex gap-0.5 items-baseline">
                          <span>{formatNumber(entry.credit)}</span>
                          <span className="text-[10px] text-rose-400 font-semibold">{symbol}</span>
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    
                    <td className={cn(
                      'px-4 py-3 text-left font-numeric text-xs font-black',
                      bal > 0 ? 'text-amber-600' : bal < 0 ? 'text-emerald-600' : 'text-slate-700'
                    )}>
                      <span dir="rtl" className="inline-flex gap-0.5 items-baseline">
                        <span>{formatNumber(Math.abs(bal))}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{symbol}</span>
                      </span>
                      {bal < 0 && <span className="text-[9px] text-emerald-500 font-bold block">(دفع مقدم)</span>}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/40">
                      <td colSpan={7} className="px-8 py-5 border-t border-slate-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                          <div>
                            <p className="text-[13px] text-[#64748B] font-medium mb-1.5">الرقم المرجعي</p>
                            <p className="font-mono text-slate-700 font-semibold">{entry.entry_number}</p>
                          </div>
                          <div>
                            <p className="text-[13px] text-[#64748B] font-medium mb-1.5">العملة</p>
                            <p className="text-slate-700 font-bold">{entry.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'}</p>
                          </div>
                          <div>
                            <p className="text-[13px] text-[#64748B] font-medium mb-1.5">نوع المعاملة</p>
                            <p className="text-slate-700 font-bold">
                              {entry.reference_type === 'Purchase' ? 'فاتورة مشتريات' : entry.reference_type === 'Payment' ? 'دفعة سداد' : 'قيد تسوية'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[13px] text-[#64748B] font-medium mb-1.5">وصف الحركة التفصيلي</p>
                            <p className="text-slate-700 leading-relaxed font-bold">{entry.description}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </optgroup>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/60 border-t border-[#E2E8F0] h-14">
              <td colSpan={4} className="px-6 py-3.5 text-xs font-bold text-[#0F172A]">
                إجمالي الفترة بالـ {currency}
              </td>
              <td className="px-4 py-3.5 text-left font-numeric text-xs font-extrabold text-emerald-600">
                <span dir="rtl" className="inline-flex gap-0.5 items-baseline">
                  <span>{formatNumber(totalDebit)}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{symbol}</span>
                </span>
              </td>
              <td className="px-4 py-3.5 text-left font-numeric text-xs font-extrabold text-rose-600">
                <span dir="rtl" className="inline-flex gap-0.5 items-baseline">
                  <span>{formatNumber(totalCredit)}</span>
                  <span className="text-[10px] text-rose-400 font-semibold">{symbol}</span>
                </span>
              </td>
              <td className={cn(
                'px-4 py-3.5 text-left font-numeric text-xs font-black',
                balance > 0 ? 'text-amber-600' : 'text-slate-700'
              )}>
                <span dir="rtl" className="inline-flex gap-0.5 items-baseline">
                  <span>{formatNumber(Math.abs(balance))}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{symbol}</span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
