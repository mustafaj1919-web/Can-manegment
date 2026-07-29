'use client'

import React from 'react'
import { DollarSign, Wallet, FileText, Info, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney } from '@/lib/utils'
import type { WorkflowContext, PaymentMethodType } from './workflowTypes'
import type { InstallmentScheduleItem } from '@/lib/api/sales'
import type { InstallmentPlanDetail } from '@/lib/api/installments'

interface InstallmentPaymentModalProps {
  plan: InstallmentPlanDetail
  schedule: InstallmentScheduleItem
  context: WorkflowContext
  onUpdateForm: (updates: Partial<WorkflowContext['formValues']>) => void
  onProceedToReview: () => void
  onClose: () => void
}

export function InstallmentPaymentModal({
  plan,
  schedule,
  context,
  onUpdateForm,
  onProceedToReview,
  onClose
}: InstallmentPaymentModalProps) {
  const { formValues, eligibleAccounts, isLoadingAccounts } = context
  const enteredAmount = parseFloat(formValues.amount) || 0
  const currency = schedule.currency || 'IQD'
  const isOverpaying = enteredAmount > schedule.remaining_amount
  const excessAmount = Math.max(0, enteredAmount - schedule.remaining_amount)

  return (
    <div className="space-y-6 font-tajawal text-right" dir="rtl">
      {/* Information Header Banner (Apple Settings style) */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="h-5 w-5" />
        </div>
        <div className="text-sm space-y-1">
          <h4 className="font-bold text-slate-900">تسديد القسط المالي وتوليد المعاملة</h4>
          <p className="text-slate-600 text-xs leading-relaxed">
            أدخل مبلغ الدفعة المستلمة وحدد حساب الاستلام المعتمد لتوليد سند القبض والقيد المحاسبي المزدوج تلقائياً.
          </p>
        </div>
      </div>

      {/* Contract & Schedule Summary Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
        <div>
          <span className="text-slate-500 font-medium block text-xs mb-1">اسم العميل</span>
          <span className="font-bold text-slate-900 truncate block text-base">{plan.buyer_name ?? '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-medium block text-xs mb-1">السيارة / العقد</span>
          <span className="font-bold text-slate-900 truncate block text-base">{plan.car_name ?? plan.invoice_number ?? '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-medium block text-xs mb-1">القسط المستحق</span>
          <span className="font-bold font-mono text-emerald-600 block text-base">
            {formatMoney(schedule.remaining_amount, currency as any)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 font-medium block text-xs mb-1">الرصيد المتبقي الحالي</span>
          <span className="font-bold font-mono text-slate-700 block text-base">
            {formatMoney(plan.remaining_amount, currency as any)}
          </span>
        </div>
      </div>

      {/* Form Fields Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Amount Field */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span>المبلغ المستلم *</span>
          </Label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              step="any"
              value={formValues.amount}
              onChange={(e) => onUpdateForm({ amount: e.target.value })}
              placeholder="أدخل مبلغ الدفعة..."
              className="h-[52px] rounded-2xl bg-white border-slate-300 text-slate-900 font-mono font-bold text-base px-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
            />
            <span className="absolute start-4 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-slate-400 pointer-events-none">
              {currency}
            </span>
          </div>
        </div>

        {/* Payment Method & Receiving Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>طريقة الدفع *</span>
            </Label>
            <Select
              value={formValues.paymentMethod}
              onValueChange={(val: PaymentMethodType) => onUpdateForm({ paymentMethod: val, accountId: '' })}
            >
              <SelectTrigger className="h-[52px] rounded-2xl bg-white border-slate-300 text-slate-900 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl" className="bg-white border-slate-200 text-slate-900 rounded-xl text-sm font-medium">
                <SelectItem value="Cash">نقداً (الصندوق)</SelectItem>
                <SelectItem value="BankTransfer">تحويل مصرفي (البنك)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>حساب الاستلام المعتمد *</span>
            </Label>
            <Select
              value={formValues.accountId}
              onValueChange={(val) => onUpdateForm({ accountId: val })}
              disabled={isLoadingAccounts || eligibleAccounts.length === 0}
            >
              <SelectTrigger className="h-[52px] rounded-2xl bg-white border-slate-300 text-slate-900 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                <SelectValue placeholder={isLoadingAccounts ? 'جارٍ تحميل الحسابات...' : 'اختر الحساب...'} />
              </SelectTrigger>
              <SelectContent dir="rtl" className="bg-white border-slate-200 text-slate-900 rounded-xl text-sm font-medium">
                {eligibleAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes Input */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-400" />
            <span>ملاحظات وبيانات مرجعية (اختياري)</span>
          </Label>
          <Input
            value={formValues.notes}
            onChange={(e) => onUpdateForm({ notes: e.target.value })}
            placeholder="تفاصيل إضافية حول عملية السداد..."
            className="h-[52px] rounded-2xl bg-white border-slate-300 text-slate-900 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Estimated Impact Card (Soft Pale Green) */}
      <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
          <span>معاينة تقديرية لنتائج التسديد</span>
          <span className="text-[11px] text-emerald-600 font-normal">يتم الاعتماد والحساب النهائي عبر النظام الخلفي</span>
        </div>
        <div className="text-sm text-slate-700 flex items-center justify-between pt-1">
          <span>الرصيد المتبقي التقديري بعد السداد:</span>
          <span className="font-mono font-bold text-emerald-700 text-base">
            {formatMoney(Math.max(0, plan.remaining_amount - enteredAmount), currency as any)}
          </span>
        </div>
        {isOverpaying && (
          <p className="text-xs text-emerald-700 font-medium pt-1 border-t border-emerald-100/80">
            تنبيه: مبلغ الفائض ({formatMoney(excessAmount, currency as any)}) سيتم تخصيصه تلقائياً لترحيل الأقساط القادمة.
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-12 px-6 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold"
        >
          إلغاء
        </Button>

        <Button
          type="button"
          onClick={onProceedToReview}
          disabled={enteredAmount <= 0}
          className="h-12 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all gap-2"
        >
          <span>مراجعة وتأكيد الدفعة</span>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
