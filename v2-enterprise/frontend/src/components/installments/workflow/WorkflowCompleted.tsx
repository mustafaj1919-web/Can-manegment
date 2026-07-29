'use client'

import React from 'react'
import { CheckCircle2, FileCheck, ArrowRight, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils'
import type { PaymentResultDto } from './workflowTypes'

interface WorkflowCompletedProps {
  paymentResult: PaymentResultDto
  onViewReceipt: () => void
  onClose: () => void
}

export function WorkflowCompleted({ paymentResult, onViewReceipt, onClose }: WorkflowCompletedProps) {
  const currency = paymentResult.currency || 'IQD'

  return (
    <div className="space-y-6 font-tajawal text-right" dir="rtl">
      {/* Success Badge Banner */}
      <div className="bg-emerald-50/80 border border-emerald-100 rounded-3xl p-6 text-center space-y-3 shadow-sm">
        <div className="h-14 w-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900">اكتملت عملية الدفع وأرشفة الوصل بنجاح</h3>
          <p className="text-xs text-emerald-800 font-medium">
            تم توثيق كافة المعاملات المالية والمستندية واعتماد السند رسمياً في النظام.
          </p>
        </div>
      </div>

      {/* Completion Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">رقم وصل السداد</span>
            <span className="font-bold text-slate-900 font-mono text-base">{paymentResult.receiptNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">المبلغ المدفوع</span>
            <span className="font-bold text-emerald-600 font-mono text-base">{formatMoney(paymentResult.postedAmount, currency as any)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">حالة الأرشفة</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
              تم تأكيد الأرشفة يدوياً
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-slate-700 text-xs">
          <div>
            <span className="text-slate-500">الرصيد المتبقي على العقد:</span>{' '}
            <strong className="font-mono font-bold text-slate-900">{formatMoney(paymentResult.remainingBalance, currency as any)}</strong>
          </div>
          <div>
            <span className="text-slate-500">التاريخ والوقت:</span>{' '}
            <strong className="font-mono font-bold text-slate-800">{new Date(paymentResult.createdAt).toLocaleString('ar-IQ')}</strong>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onViewReceipt}
            className="h-12 px-6 rounded-2xl bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold gap-2 shadow-sm"
          >
            <FileCheck className="h-4 w-4" />
            <span>عرض وصل السداد (A5)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onViewReceipt()
              setTimeout(() => window.print(), 500)
            }}
            className="h-12 px-6 rounded-2xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة نسخة أخرى</span>
          </Button>
        </div>

        <Button
          type="button"
          onClick={onClose}
          className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm gap-2 transition-all"
        >
          <span>إغلاق والعودة</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
