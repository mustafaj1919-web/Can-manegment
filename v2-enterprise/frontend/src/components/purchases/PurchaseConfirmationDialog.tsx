'use client'

import { CheckCircle2, AlertTriangle, Car, User, DollarSign, Calendar, FileText, X } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PurchaseConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  data: {
    sourceType: 'Supplier' | 'Customer'
    sellerName: string
    sellerPhone?: string
    isBuyback?: boolean
    previousContractNumber?: string
    previousSalePrice?: number
    brand: string
    model: string
    year: string
    chassisNumber: string
    purchasePrice: number
    paidAmount: number
    paymentMethod: string
  }
}

export function PurchaseConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  data,
}: PurchaseConfirmationDialogProps) {
  if (!isOpen) return null

  const remainingAmount = Math.max(data.purchasePrice - data.paidAmount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">مراجعة وتأكيد فاتورة الشراء</h2>
              <p className="text-xs text-muted-foreground">تأكد من صحة البيانات قبل قيد الشراء في النظام</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details Summary */}
        <div className="space-y-3 text-xs">
          {/* Seller / Source */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>جهة الشراء</span>
              <span className="font-semibold text-foreground">
                {data.sourceType === 'Supplier' ? 'مورد (شركة / تاجر)' : 'زبون (أفراد)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>اسم البائع / الزبون</span>
              <span className="font-bold text-foreground">{data.sellerName}</span>
            </div>
            {data.isBuyback && (
              <div className="mt-2 rounded-lg bg-amber-500/15 border border-amber-500/30 p-2 text-amber-300 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>مصدر السيارة:</span>
                  <span>مباعة سابقاً من المعرض (إعادة شراء)</span>
                </div>
                {data.previousContractNumber && (
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span>رقم عقد البيع السابق:</span>
                    <span>#{data.previousContractNumber}</span>
                  </div>
                )}
                {data.previousSalePrice !== undefined && (
                  <div className="flex items-center justify-between font-numeric text-[11px]">
                    <span>سعر البيع السابق:</span>
                    <span>{formatMoney(data.previousSalePrice, 'IQD')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vehicle Identity */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">السيارة</span>
              <span className="font-bold text-foreground">
                {data.brand} {data.model} {data.year}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">رقم الشاصي (VIN)</span>
              <span className="font-mono text-foreground font-semibold">{data.chassisNumber}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">سعر إعادة الشراء / الشراء الفعلي</span>
              <span className="font-bold font-numeric text-amber-400 text-sm">
                {formatMoney(data.purchasePrice, 'IQD')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">طريقة الدفع</span>
              <span className="font-semibold text-foreground">{data.paymentMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">المدفوع فوراً</span>
              <span className="font-bold font-numeric text-emerald-400">
                {formatMoney(data.paidAmount, 'IQD')}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
              <span className="text-muted-foreground">المتبقي دَيْن على الحساب</span>
              <span className="font-bold font-numeric text-rose-400">
                {formatMoney(remainingAmount, 'IQD')}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            تعديل البيانات
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="gap-2 bg-amber-600 text-white hover:bg-amber-500"
          >
            {isSubmitting ? 'جاري قيد الشراء...' : 'تأكيد تسجيل الفاتورة'}
          </Button>
        </div>
      </div>
    </div>
  )
}
