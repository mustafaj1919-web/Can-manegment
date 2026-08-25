'use client'

import { CalendarDays, CreditCard, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FormattedNumberInput } from '@/components/ui/formatted-number-input'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/lib/utils'

interface InstallmentsConfigCardProps {
  paymentMethod: string
  calcMode: 'months' | 'amount'
  setCalcMode: (m: 'months' | 'amount') => void
  numMonths: string
  setNumMonths: (m: string) => void
  customMonthlyAmount: string
  setCustomMonthlyAmount: (a: string) => void
  startDate: string
  setStartDate: (d: string) => void
  dueDay: string
  setDueDay: (d: string) => void
  installNotes: string
  setInstallNotes: (n: string) => void
  remainingPreview: number
  currency: 'USD' | 'IQD'
  errors: Record<string, string>
}

export function InstallmentsConfigCard({
  paymentMethod,
  calcMode,
  setCalcMode,
  numMonths,
  setNumMonths,
  customMonthlyAmount,
  setCustomMonthlyAmount,
  startDate,
  setStartDate,
  dueDay,
  setDueDay,
  installNotes,
  setInstallNotes,
  remainingPreview,
  currency,
  errors,
}: InstallmentsConfigCardProps) {
  // MUST render ONLY when payment method is 'Installment'
  if (paymentMethod !== 'Installment') return null

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">إعدادات جدولة الأقساط</h2>
            <p className="text-[13px] font-medium text-[#64748B]">مخصص لعمليات البيع بنظام التقسيط المرابحة</p>
          </div>
        </div>

        <span className="text-xs font-bold bg-cyan-100 text-cyan-800 px-3 py-1 rounded-xl">
          نظام تقسيط فعال
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-3 bg-slate-50 border border-[#E2E8F0] p-1.5 rounded-2xl text-xs">
        <button
          type="button"
          onClick={() => setCalcMode('months')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all ${
            calcMode === 'months'
              ? 'bg-white text-cyan-900 shadow-sm border border-[#E2E8F0]'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          تحديد عدد الأشهر
        </button>

        <button
          type="button"
          onClick={() => setCalcMode('amount')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all ${
            calcMode === 'amount'
              ? 'bg-white text-cyan-900 shadow-sm border border-[#E2E8F0]'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          تحديد قيمة القسط الشهري
        </button>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-start">
        {/* Remaining Principal Display */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">المبلغ الخاضع للتقسيط (المتبقي)</Label>
          <div className="h-12 px-4 flex items-center rounded-xl bg-slate-100 border border-[#E2E8F0] text-sm font-numeric font-extrabold text-rose-600">
            {formatMoney(remainingPreview, currency)}
          </div>
        </div>

        {/* Dynamic Mode Fields */}
        {calcMode === 'months' ? (
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#64748B]">عدد الأشهر (فترة السداد) *</Label>
            <Input
              type="number"
              min="1"
              placeholder="12"
              value={numMonths}
              onChange={e => setNumMonths(e.target.value)}
              className={`h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-numeric font-bold text-[#0F172A] ${
                errors.numMonths ? 'border-rose-300 bg-rose-50/30' : ''
              }`}
            />
            {errors.numMonths && <p className="text-[11px] font-medium text-rose-500">{errors.numMonths}</p>}
            {numMonths && parseInt(numMonths) > 0 && remainingPreview > 0 && (
              <p className="text-[11px] font-bold text-cyan-700 mt-1 font-numeric">
                القسط الشهري التقديري: {formatMoney(remainingPreview / parseInt(numMonths), currency)}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#64748B]">مبلغ القسط الشهري الثابت *</Label>
            <FormattedNumberInput
              placeholder="أدخل مبلغ القسط..."
              value={customMonthlyAmount}
              onChangeValue={setCustomMonthlyAmount}
              className={`h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-numeric font-bold text-[#0F172A] ${
                errors.customMonthlyAmount ? 'border-rose-300 bg-rose-50/30' : ''
              }`}
            />
            {errors.customMonthlyAmount && <p className="text-[11px] font-medium text-rose-500">{errors.customMonthlyAmount}</p>}
            {customMonthlyAmount && parseFloat(customMonthlyAmount) > 0 && remainingPreview > 0 && (
              (() => {
                const amt = parseFloat(customMonthlyAmount)
                const months = Math.ceil(remainingPreview / amt)
                return (
                  <p className="text-[11px] font-bold text-cyan-700 mt-1 font-numeric">
                    عدد الأقساط المقدرة: {months} شهر
                  </p>
                )
              })()
            )}
          </div>
        )}

        {/* Start Date */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">تاريخ استحقاق القسط الأول *</Label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={`h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-xs font-bold text-[#0F172A] ${
              errors.startDate ? 'border-rose-300 bg-rose-50/30' : ''
            }`}
          />
          {errors.startDate && <p className="text-[11px] font-medium text-rose-500">{errors.startDate}</p>}
        </div>

        {/* Due Day */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">يوم الاستحقاق الشهري (1–31)</Label>
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="15"
            value={dueDay}
            onChange={e => setDueDay(e.target.value)}
            className="h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-numeric font-bold text-[#0F172A]"
          />
        </div>

        {/* Installment Notes */}
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">ملاحظات وشروط عقد الأقساط</Label>
          <Input
            placeholder="أدخل أي ملاحظات مخصصة لجدولة الأقساط..."
            value={installNotes}
            onChange={e => setInstallNotes(e.target.value)}
            className="h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-xs font-medium text-[#0F172A]"
          />
        </div>
      </div>
    </div>
  )
}
