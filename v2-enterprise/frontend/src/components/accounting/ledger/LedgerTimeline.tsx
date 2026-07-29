'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, ArrowDownLeft, Coins } from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'

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
}

export function LedgerTimeline({ entries, currency }: Props) {
  // Filter entries to only show the selected currency
  const filtered = entries.filter(e => e.currency === currency)

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-[#64748B] text-xs font-medium bg-white border border-[#E2E8F0] rounded-[22px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] no-print">
        لا توجد حركات لعرضها في الخط الزمني لهذه العملة.
      </div>
    )
  }

  const symbol = currency === 'USD' ? '$' : 'د.ع'

  return (
    <div className="relative border-inline-start border-[#E2E8F0] ps-6 ms-3 space-y-6 py-4 no-print">
      {filtered.map((entry, index) => {
        const isPurchase = entry.reference_type === 'Purchase' || entry.credit > 0
        const isPayment = entry.debit > 0
        
        // Define timeline indicator icon
        let icon = <Coins className="h-4 w-4 text-slate-500" />
        let iconBg = 'bg-slate-50 border-slate-200'
        
        if (isPurchase) {
          icon = <ShoppingBag className="h-4 w-4 text-rose-500" />
          iconBg = 'bg-rose-50 border-rose-100'
        } else if (isPayment) {
          icon = <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          iconBg = 'bg-emerald-50 border-emerald-100'
        }

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.5) }}
            className="relative flex flex-col md:flex-row md:items-start gap-4 p-6 bg-white border border-[#E2E8F0] hover:border-slate-300 rounded-[22px] transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            {/* Timeline node marker (RTL placement) */}
            <div className={`absolute -start-[38px] top-6 flex h-6 w-6 items-center justify-center rounded-full border-2 ${iconBg}`}>
              {icon}
            </div>

            {/* Event details */}
            <div className="flex-1 space-y-1.5 text-start">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 font-numeric">
                  {formatDate(entry.date)}
                </span>
                <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-semibold">
                  {entry.entry_number}
                </span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] leading-normal">{entry.description}</p>
              
              <div className="flex items-center gap-4 pt-1 text-xs text-[#94A3B8]">
                <span className="flex items-center gap-1.5">
                  <span>نوع المعاملة:</span>
                  <span className="font-bold text-slate-600">
                    {isPurchase ? 'عملية شراء سيارات' : isPayment ? 'عملية دفع وسداد' : 'قيد تسوية'}
                  </span>
                </span>
              </div>
            </div>

            {/* Money block */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-inline-start-0 md:border-inline-start border-[#E2E8F0] pt-4 md:pt-0 md:ps-6 shrink-0 min-w-[150px] gap-2 md:gap-1.5">
              <div>
                <p className="text-[13px] text-[#64748B] font-medium text-start md:text-end leading-none md:mb-1">القيمة</p>
                <div className="flex items-baseline gap-0.5 justify-start md:justify-end" dir="rtl">
                  <span className={`font-numeric text-sm font-extrabold ${isPurchase ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isPurchase ? '+' : '-'} {formatNumber(isPurchase ? entry.credit : entry.debit)}
                  </span>
                  <span className={`text-xs font-bold self-end mb-0.5 ${isPurchase ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {symbol}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-[13px] text-[#64748B] font-medium text-start md:text-end leading-none md:mb-1">الرصيد بعد الحركة</p>
                <div className="flex items-baseline gap-0.5 justify-start md:justify-end" dir="rtl">
                  <span className="text-sm font-bold text-slate-700 font-numeric tabular-nums">
                    {formatNumber(entry.running_balance)}
                  </span>
                  <span className="text-xs font-bold text-slate-400 self-end mb-0.5">
                    {symbol}
                  </span>
                </div>
              </div>
            </div>

          </motion.div>
        )
      })}
    </div>
  )
}
