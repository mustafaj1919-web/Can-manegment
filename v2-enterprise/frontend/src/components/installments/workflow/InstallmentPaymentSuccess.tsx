'use client'

import React from 'react'
import { CheckCircle2, FileCheck, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils'
import type { PaymentResultDto } from './workflowTypes'

interface InstallmentPaymentSuccessProps {
  result: PaymentResultDto
  onOpenReceipt: () => void
}

export function InstallmentPaymentSuccess({ result, onOpenReceipt }: InstallmentPaymentSuccessProps) {
  const currency = result.currency || 'IQD'

  return (
    <div className="space-y-6 font-tajawal text-right" dir="rtl">
      {/* Banner Header (Soft Success) */}
      <div className="bg-emerald-50/80 border border-emerald-100 rounded-3xl p-6 text-center space-y-3 shadow-sm">
        <div className="h-14 w-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900">تم تسديد الدفعة بنجاح</h3>
          <p className="text-xs text-emerald-800 font-medium">
            تم تسجيل سند القبض المالي وتوليد القيد المحاسبي المزدوج واكتمال التحديث الحسابي في النظام.
          </p>
        </div>
      </div>

      {/* Authoritative Financial Result Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-sm shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-slate-900">حالة المعاملة المحاسبية</span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
            {result.accountingStatus === 'Posted' ? 'تم ترحيل القيد المحاسبي' : 'القيد بانتظار الترحيل'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">رقم وصل السداد</span>
            <span className="font-bold text-slate-900 font-mono text-base">{result.receiptNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">المبلغ المسدد</span>
            <span className="font-bold text-emerald-600 font-mono text-base">{formatMoney(result.postedAmount, currency as any)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">الرصيد المتبقي</span>
            <span className="font-bold text-slate-700 font-mono text-base">{formatMoney(result.remainingBalance, currency as any)}</span>
          </div>
        </div>

        {result.journalEntryNumber && (
          <div className="pt-3 border-t border-slate-100 flex justify-between text-slate-500 text-xs">
            <span>مرجع القيد المحاسبي المزدوج:</span>
            <span className="font-mono font-bold text-slate-800">{result.journalEntryNumber}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={onOpenReceipt}
          className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm gap-2 transition-all"
        >
          <FileCheck className="h-4 w-4" />
          <span>فتح وصل السداد الرسمى (A5)</span>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
