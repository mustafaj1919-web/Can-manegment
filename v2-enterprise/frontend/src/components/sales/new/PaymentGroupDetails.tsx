'use client'

import { AlertTriangle, Banknote, Calendar, Coins, CreditCard, DollarSign, Sparkles, TrendingDown } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FormattedNumberInput } from '@/components/ui/formatted-number-input'
import { formatMoney } from '@/lib/utils'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'نقداً' },
  { value: 'Installment', label: 'أقساط (مرابحة / تقسيط)' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]

interface PaymentGroupDetailsProps {
  sellingPrice: string
  setSellingPrice: (v: string) => void
  discount: string
  setDiscount: (v: string) => void
  paidAmount: string
  setPaidAmount: (v: string) => void
  currency: 'USD' | 'IQD'
  setCurrency: (c: 'USD' | 'IQD') => void
  paymentMethod: string
  setPaymentMethod: (m: string) => void
  saleDate: string
  setSaleDate: (d: string) => void
  sp: number
  dc: number
  pa: number
  netRevenuePreview: number
  remainingPreview: number
  isAuthorizedRole: boolean
  purchaseCost: number
  profitPreview: number
  profitPctPreview: number
  isBelowCost: boolean
  errors: Record<string, string>
}

export function PaymentGroupDetails({
  sellingPrice,
  setSellingPrice,
  discount,
  setDiscount,
  paidAmount,
  setPaidAmount,
  currency,
  setCurrency,
  paymentMethod,
  setPaymentMethod,
  saleDate,
  setSaleDate,
  sp,
  dc,
  pa,
  netRevenuePreview,
  remainingPreview,
  isAuthorizedRole,
  purchaseCost,
  profitPreview,
  profitPctPreview,
  isBelowCost,
  errors,
}: PaymentGroupDetailsProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
          <Banknote className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">تفاصيل السعر والدفع</h2>
          <p className="text-[13px] font-medium text-[#64748B]">تحديد العملة وسعر البيع والدفعة الأولى وطريقة السداد</p>
        </div>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-start">
        {/* Currency Selector */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">عملة المعاملة *</Label>
          <Select value={currency} onValueChange={v => setCurrency(v as 'USD' | 'IQD')}>
            <SelectTrigger className="h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-xs font-bold text-[#0F172A]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">دولار أمريكي (USD $)</SelectItem>
              <SelectItem value="IQD">دينار عراقي (IQD د.ع)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selling Price */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">سعر البيع المعتمد *</Label>
          <FormattedNumberInput
            placeholder="0"
            value={sellingPrice}
            onChangeValue={setSellingPrice}
            className={`h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-numeric font-bold text-[#0F172A] ${
              errors.sellingPrice ? 'border-rose-300 bg-rose-50/30' : ''
            }`}
          />
          {errors.sellingPrice && <p className="text-[11px] font-medium text-rose-500">{errors.sellingPrice}</p>}
        </div>

        {/* Discount */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">الخصم الممنوح</Label>
          <FormattedNumberInput
            placeholder="0"
            value={discount}
            onChangeValue={setDiscount}
            className="h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-numeric font-semibold text-[#0F172A]"
          />
        </div>

        {/* Paid Amount */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">المبلغ المدفوع (الدفعة المقدمة)</Label>
          <FormattedNumberInput
            placeholder="0"
            value={paidAmount}
            onChangeValue={setPaidAmount}
            className="h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-numeric font-semibold text-emerald-700"
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">طريقة السداد *</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className={`h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-xs font-bold text-[#0F172A] ${
              errors.paymentMethod ? 'border-rose-300 bg-rose-50/30' : ''
            }`}>
              <SelectValue placeholder="اختر طريقة السداد..." />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.paymentMethod && <p className="text-[11px] font-medium text-rose-500">{errors.paymentMethod}</p>}
        </div>

        {/* Sale Date */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#64748B]">تاريخ الفاتورة *</Label>
          <Input
            type="date"
            value={saleDate}
            onChange={e => setSaleDate(e.target.value)}
            className={`h-12 rounded-xl border-[#E2E8F0] bg-slate-50 text-xs font-bold text-[#0F172A] ${
              errors.saleDate ? 'border-rose-300 bg-rose-50/30' : ''
            }`}
          />
          {errors.saleDate && <p className="text-[11px] font-medium text-rose-500">{errors.saleDate}</p>}
        </div>
      </div>

      {/* Financial Totals Inline Preview Strip */}
      {sp > 0 && (
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F172A]">الملخص المالي السريع</span>
            <span className="text-[11px] font-medium text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-md">
              معاينة قبل الحفظ
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">سعر البيع الاجمالي</span>
              <span className="font-extrabold font-numeric text-[#0F172A] text-sm">{formatMoney(sp, currency)}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">صافي الفاتورة</span>
              <span className="font-extrabold font-numeric text-slate-800 text-sm">{formatMoney(netRevenuePreview, currency)}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">المبلغ الواصل</span>
              <span className="font-extrabold font-numeric text-emerald-600 text-sm">{formatMoney(pa, currency)}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">المتبقي التقديري</span>
              <span className={`font-extrabold font-numeric text-sm ${remainingPreview > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatMoney(remainingPreview, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Role-Restricted Profit Analysis Card (ONLY for Authorized Roles) */}
      {isAuthorizedRole && purchaseCost > 0 && sp > 0 && (
        <div className={`border rounded-2xl p-4 transition-all ${
          isBelowCost
            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
            : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isBelowCost ? (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              ) : (
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold">
                  {isBelowCost
                    ? `تنبيه حتمي: سعر البيع أقل من التكلفة المسجلة بـ ${formatMoney(Math.abs(profitPreview), currency)}`
                    : `مؤشر الربحية: ${profitPctPreview.toFixed(1)}% — ربح تقديري ${formatMoney(profitPreview, currency)}`}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  تكلفة شراء المركبة: <span className="font-numeric font-bold">{formatMoney(purchaseCost, currency)}</span>
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-md">
              عرض خاص بالإدارة
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
