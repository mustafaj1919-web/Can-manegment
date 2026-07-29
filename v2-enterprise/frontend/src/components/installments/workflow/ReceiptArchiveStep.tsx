'use client'

import React, { useState } from 'react'
import { Archive, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PaymentResultDto } from './workflowTypes'

interface ReceiptArchiveStepProps {
  paymentResult: PaymentResultDto
  onConfirmArchive: (method: 'ManuallyConfirmed' | 'Uploaded', notes?: string) => void
  isArchiving: boolean
}

export function ReceiptArchiveStep({ paymentResult, onConfirmArchive, isArchiving }: ReceiptArchiveStepProps) {
  const [confirmed, setConfirmed] = useState(true)
  const [archiveMethod] = useState<'ManuallyConfirmed' | 'Uploaded'>('ManuallyConfirmed')
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    if (!confirmed) return
    onConfirmArchive(archiveMethod, notes)
  }

  return (
    <div className="space-y-6 font-tajawal text-right" dir="rtl">
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-600" />
            <span>توثيق وأرشفة وصل السداد</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            يرجى توثيق أرشفة هذا الوصل لإتمام متطلبات الرقابة الحسابية وضبط المستندات.
          </p>
        </div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
          وصل بانتظار الأرشفة
        </span>
      </div>

      {/* Amber Information Banner (Apple style) */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 flex items-start gap-4 text-xs text-amber-900 shadow-sm">
        <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-sm">تم تسجيل الدفعة ماليًا بنجاح</p>
          <p className="leading-relaxed text-slate-600">
            تأكيد الأرشفة هو إجراء توثيقي إداري لحفظ نسخة الوصل ورقياً أو إلكترونياً. إغلاق النافذة الآن لن يلغي الدفعة المسجلة.
          </p>
        </div>
      </div>

      {/* Receipt Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-slate-500 font-medium block mb-1">رقم وصل السداد</span>
          <span className="font-mono font-bold text-slate-900 text-sm">{paymentResult.receiptNumber}</span>
        </div>
        <div>
          <span className="text-slate-500 font-medium block mb-1">المبلغ المسدد</span>
          <span className="font-mono font-bold text-emerald-600 text-sm">{paymentResult.postedAmount} {paymentResult.currency}</span>
        </div>
        <div>
          <span className="text-slate-500 font-medium block mb-1">حالة القيد المحاسبي</span>
          <span className="font-bold text-emerald-700 text-xs">مرحل ومثبت في الدفاتر</span>
        </div>
      </div>

      {/* Manual Confirmation Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <input
            id="archive-check"
            type="checkbox"
            checked={confirmed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded-md border-slate-300 bg-white text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          />
          <Label htmlFor="archive-check" className="text-xs text-slate-800 font-semibold leading-relaxed cursor-pointer">
            أؤكد أنني قمت بطباعة أو حفظ نسخة وصل السداد وأرشفتها يدوياً حسب إجراءات ضبط المستندات المعتمدة في الشركة.
          </Label>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700">ملاحظات الأرشفة والتوثيق (اختياري)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: تم حفظ النسخة ورقية في الملف الإداري للعميل..."
            className="h-[52px] rounded-2xl bg-white border-slate-300 text-slate-900 text-xs shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end pt-4 border-t border-slate-100">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!confirmed || isArchiving}
          className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm gap-2 transition-all"
        >
          {isArchiving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جارٍ حفظ الأرشفة...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>تأكيد وحفظ الأرشفة</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
