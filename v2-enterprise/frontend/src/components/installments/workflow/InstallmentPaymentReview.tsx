'use client'

import React from 'react'
import { AlertTriangle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/utils'
import type { WorkflowContext } from './workflowTypes'
import type { InstallmentPlanDetail } from '@/lib/api/installments'
import type { InstallmentScheduleItem } from '@/lib/api/sales'

interface InstallmentPaymentReviewProps {
  plan: InstallmentPlanDetail
  schedule: InstallmentScheduleItem
  context: WorkflowContext
  onBackToEdit: () => void
  onSubmitPayment: () => void
}

export function InstallmentPaymentReview({
  plan,
  schedule,
  context,
  onBackToEdit,
  onSubmitPayment
}: InstallmentPaymentReviewProps) {
  const { formValues, eligibleAccounts, isSubmitting } = context
  const enteredAmount = parseFloat(formValues.amount) || 0
  const currency = schedule.currency || 'IQD'

  const selectedAccount = eligibleAccounts.find(a => a.id === formValues.accountId)
  const accountName = selectedAccount ? `${selectedAccount.name} (${selectedAccount.code})` : 'الصندوق الرئيسي'
  const methodLabel = formValues.paymentMethod === 'Cash' ? 'نقداً (الصندوق)' : 'تحويل مصرفي (البنك)'

  return (
    <div className="space-y-6 font-tajawal text-right" dir="rtl">
      {/* Step Title Header */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-900">مراجعة وتأكيد الدفعة المالية</h3>
        <p className="text-xs text-slate-500 mt-1">
          يرجى التحقق النهائي من تفاصيل المبلغ والمستلم قبل التثبيت والترحيل المحاسبي.
        </p>
      </div>

      {/* Review Details Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">اسم العميل</span>
            <span className="font-bold text-slate-900 text-base">{plan.buyer_name ?? '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">العقد / السيارة</span>
            <span className="font-bold text-slate-900 text-base">{plan.invoice_number ?? plan.car_name ?? '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">رقم القسط</span>
            <span className="font-bold text-slate-800">القسط #{schedule.installment_number}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">طريقة الدفع</span>
            <span className="font-bold text-slate-800">{methodLabel}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block text-xs mb-1">حساب الاستلام</span>
            <span className="font-bold text-emerald-700">{accountName}</span>
          </div>
        </div>

        {formValues.notes && (
          <div className="pt-3 border-t border-slate-100">
            <span className="text-slate-500 font-medium block text-xs mb-1">الملاحظات والبيانات المرجعية:</span>
            <span className="text-slate-700 italic text-xs">{formValues.notes}</span>
          </div>
        )}
      </div>

      {/* Amount & Impact Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2 shadow-sm">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          إجمالي المبلغ المطلوب ترحيله
        </span>
        <span className="text-3xl font-bold text-emerald-600 font-mono tracking-tight block py-1">
          {formatMoney(enteredAmount, currency as any)}
        </span>
        <div className="text-xs text-slate-600 font-medium pt-2 border-t border-slate-200/80">
          الرصيد المتبقي التقديري بعد السداد:{' '}
          <strong className="font-mono font-bold text-slate-900">{formatMoney(Math.max(0, plan.remaining_amount - enteredAmount), currency as any)}</strong>
        </div>
      </div>

      {/* Financial Warning Box */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-amber-900 shadow-sm">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>تنبيه مالي مهم:</strong> بعد تأكيد العملية سيتم قيد الدفعة فوراً وإنشاء القيد المحاسبي المزدوج وتوليد سند القبض الرسمي بشكل لا يمكن التراجع عنه يدوياً.
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBackToEdit}
          disabled={isSubmitting}
          className="h-12 px-6 rounded-2xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للتعديل</span>
        </Button>

        <Button
          type="button"
          onClick={onSubmitPayment}
          disabled={isSubmitting}
          className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جارٍ ترحيل الدفعة...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>تأكيد واستلام الدفعة</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
