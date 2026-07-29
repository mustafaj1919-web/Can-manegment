'use client'

import { CarOption, CustomerOption } from '@/lib/api/sales'
import { formatMoney } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Car, User, ShieldCheck, Banknote, Calendar } from 'lucide-react'

interface LiveInvoicePreviewPanelProps {
  selectedCar?: CarOption
  selectedBuyer?: CustomerOption
  currency: 'USD' | 'IQD'
  sp: number
  dc: number
  pa: number
  netRevenuePreview: number
  remainingPreview: number
  paymentMethod: string
  saleDate: string
  salesRepName?: string
  isAuthorizedRole: boolean
  purchaseCost: number
  profitPreview: number
  profitPctPreview: number
  isBelowCost: boolean
  errors: Record<string, string>
}

export function LiveInvoicePreviewPanel({
  selectedCar,
  selectedBuyer,
  currency,
  sp,
  dc,
  pa,
  netRevenuePreview,
  remainingPreview,
  paymentMethod,
  saleDate,
  salesRepName = 'غير محدد',
  isAuthorizedRole,
  purchaseCost,
  profitPreview,
  profitPctPreview,
  isBelowCost,
  errors,
}: LiveInvoicePreviewPanelProps) {
  const hasErrors = Object.keys(errors).length > 0
  const isReady = selectedCar && selectedBuyer && sp > 0 && !hasErrors

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5 lg:sticky lg:top-6">
      {/* Panel Badge */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-base font-bold text-[#0F172A]">معاينة ملخص الفاتورة</h3>
        </div>
        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
          معاينة قبل الحفظ
        </span>
      </div>

      {/* Primary Big Price Preview */}
      <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 space-y-1 text-center" dir="rtl">
        <span className="text-[11px] font-bold text-[#64748B] block">صافي مبلغ الفاتورة التقديري</span>
        <div className="text-[36px] xl:text-[42px] font-extrabold text-[#0F172A] font-numeric tabular-nums leading-none tracking-tight">
          {formatMoney(netRevenuePreview, currency)}
        </div>
        <span className="text-[11px] font-medium text-[#64748B] block pt-1">
          {paymentMethod === 'Cash' ? 'سداد نقدي مباشر' : paymentMethod === 'Installment' ? 'بيع بنظام التقسيط المرابحة' : 'حوالة مصرفية'}
        </span>
      </div>

      {/* Selected Vehicle Preview Item */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-[#64748B] block">السيارة المختارة</span>
        {selectedCar ? (
          <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Car className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-[#0F172A] block">{selectedCar.brand} {selectedCar.model}</span>
                <span className="text-[11px] font-mono text-[#64748B] block">VIN: {selectedCar.vin}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">متاحة</span>
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs text-[#94A3B8]">
            لم يتم اختيار سيارة بعد
          </div>
        )}
      </div>

      {/* Selected Customer Preview Item */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-[#64748B] block">العميل المشتري</span>
        {selectedBuyer ? (
          <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-[#0F172A] block">{selectedBuyer.full_name || selectedBuyer.name}</span>
                <span className="text-[11px] font-mono text-[#64748B] block">{selectedBuyer.phone}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">مشتري</span>
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs text-[#94A3B8]">
            لم يتم اختيار عميل بعد
          </div>
        )}
      </div>

      {/* Financial Line Items Breakdown */}
      <div className="border-t border-[#E2E8F0] pt-3 space-y-2 text-xs">
        <div className="flex justify-between items-center text-[#64748B]">
          <span>سعر البيع الأصلي:</span>
          <span className="font-bold font-numeric text-[#0F172A]">{formatMoney(sp, currency)}</span>
        </div>

        <div className="flex justify-between items-center text-[#64748B]">
          <span>الخصم الممنوح:</span>
          <span className="font-bold font-numeric text-[#0F172A]">- {formatMoney(dc, currency)}</span>
        </div>

        <div className="flex justify-between items-center text-[#64748B]">
          <span>المبلغ المدفوع مقدمًا:</span>
          <span className="font-bold font-numeric text-emerald-600">{formatMoney(pa, currency)}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0] font-bold text-[#0F172A]">
          <span>المتبقي التقديري:</span>
          <span className={`font-numeric text-sm ${remainingPreview > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatMoney(remainingPreview, currency)}
          </span>
        </div>
      </div>

      {/* Role-Restricted Profit Summary (ONLY if Authorized) */}
      {isAuthorizedRole && purchaseCost > 0 && sp > 0 && (
        <div className="border-t border-[#E2E8F0] pt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>ربحية الصفقة (خاص بالإدارة):</span>
            </span>
            <span className={`font-bold font-numeric ${isBelowCost ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatMoney(profitPreview, currency)} ({profitPctPreview.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Validation Readiness Indicator */}
      <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
        isReady
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        {isReady ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>الفاتورة مكتملة وجاهزة للحفظ</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>يرجى إكمال الحقول الأساسية المطلوب حظرها</span>
          </>
        )}
      </div>
    </div>
  )
}
