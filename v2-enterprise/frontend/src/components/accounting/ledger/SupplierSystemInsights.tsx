'use client'

import { Sparkles, ClipboardCheck, Info, AlertTriangle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

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
}

interface InsightItem {
  text: string
  severity: 'info' | 'warning'
}

export function SupplierSystemInsights({
  currency,
  balance,
  entries,
}: Props) {
  const filtered = entries.filter(e => e.currency === currency)
  const lastMovement = filtered.length > 0 ? filtered[filtered.length - 1] : null
  const totalPaid = filtered.reduce((acc, curr) => acc + curr.debit, 0)
  const totalPurchases = filtered.reduce((acc, curr) => acc + curr.credit, 0)
  
  // Deterministic statements
  const statements: InsightItem[] = []
  if (filtered.length === 0) {
    statements.push({
      text: 'لا توجد حركات قيود مسجلة لهذا المورد خلال التواريخ المحددة.',
      severity: 'warning',
    })
  } else {
    statements.push({
      text: `تم العثور على ${filtered.length} حركة قيود مسجلة بالـ ${currency} في هذه الفترة.`,
      severity: 'info',
    })
    if (totalPaid === 0) {
      statements.push({
        text: 'لم يتم تسجيل أي مدفوعات سداد للمورد خلال الفترة المحددة.',
        severity: 'warning',
      })
    }
    if (balance > 0 && totalPurchases > totalPaid) {
      statements.push({
        text: 'الرصيد المستحق للمورد تزايد خلال الفترة المحددة.',
        severity: 'warning',
      })
    }
    if (lastMovement) {
      const isPurchase = lastMovement.reference_type === 'Purchase' || lastMovement.credit > 0
      statements.push({
        text: `آخر حركة مالية مسجلة كانت ${isPurchase ? 'عملية شراء سيارة' : 'عملية سداد دفعة'}.`,
        severity: 'info',
      })
    }
  }

  // Safe operational recommendations
  const reviews: InsightItem[] = []
  if (balance > 0) {
    reviews.push({
      text: `مراجعة الرصيد المتبقي المستحق للمورد والبالغ ${formatNumber(balance)} ${currency === 'USD' ? '$' : 'د.ع'}.`,
      severity: 'warning',
    })
  } else if (balance < 0) {
    reviews.push({
      text: `متابعة الرصيد الدائن الإضافي المدفوع للمورد مقدماً والبالغ ${formatNumber(Math.abs(balance))} ${currency === 'USD' ? '$' : 'د.ع'}.`,
      severity: 'info',
    })
  } else {
    reviews.push({
      text: 'حساب المورد متطابق ومسدد بالكامل.',
      severity: 'info',
    })
  }
  reviews.push({
    text: 'تصدير كشف الحساب الحالي لمطابقته مع دفاتر المورد المعتمدة.',
    severity: 'info',
  })
  reviews.push({
    text: 'التحقق من صحة تواريخ الحركات وأرقام القيود المرجعية المرفقة.',
    severity: 'info',
  })

  return (
    <div className="space-y-4 no-print">
      {/* System Insights */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-base font-bold text-[#0F172A]">ملخص النظام</h3>
        </div>
        <ul className="space-y-3">
          {statements.map((stmt, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed text-[#475569]">
              {stmt.severity === 'warning' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              )}
              <span>{stmt.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Review */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <ClipboardCheck className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-bold text-[#0F172A]">مراجعة مقترحة</h3>
        </div>
        <ul className="space-y-3">
          {reviews.map((rev, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed text-[#475569]">
              {rev.severity === 'warning' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              )}
              <span>{rev.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
