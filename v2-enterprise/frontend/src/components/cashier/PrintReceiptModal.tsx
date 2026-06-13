'use client'

import { useRef } from 'react'
import { Printer, X, DollarSign, Calendar, FileText, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney, formatDate } from '@/lib/utils'

interface PrintReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'sale' | 'payment' | 'close' | 'schedule'
  data: any
}

export function PrintReceiptModal({ open, onOpenChange, type, data }: PrintReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!data) return null

  const handlePrint = () => {
    if (typeof window === 'undefined') return
    const content = printRef.current?.innerHTML
    if (!content) return

    const win = window.open('', '_blank', 'width=820,height=700')
    if (!win) return

    const titles: Record<string, string> = {
      sale: 'فاتورة بيع سيارة',
      payment: 'سند قبض',
      close: 'تقرير إقفال الصندوق',
      schedule: 'جدول الأقساط',
    }

    win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${titles[type] ?? 'طباعة'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
      direction: rtl;
      background: #fff;
      color: #111;
      padding: 28px 32px;
      font-size: 13px;
      line-height: 1.6;
    }
    h1, h2, h3 { font-weight: 800; }
    .print-header { text-align: center; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 2px solid #111; }
    .print-header h2 { font-size: 18px; }
    .print-header p  { font-size: 11px; color: #555; margin-top: 3px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px; }
    .row:last-child { border: 0; }
    .label { color: #666; }
    .value { font-weight: 700; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 7px 10px; text-align: right; }
    th { background: #f5f5f5; font-weight: 700; }
    .section { margin-top: 18px; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fafafa; }
    .section-title { font-weight: 800; font-size: 12px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: 900; font-size: 14px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 50px; text-align: center; font-size: 11px; color: #555; }
    .sig-line { border-top: 1px solid #aaa; padding-top: 6px; margin: 0 16px; }
    .badge { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
    .badge-green  { background: #dcfce7; color: #166534; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef9c3; color: #713f12; }
    .text-green { color: #15803d; }
    .text-red   { color: #b91c1c; }
    .text-muted { color: #666; font-size: 11px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
${content}
<script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  const renderReceiptContent = () => {
    switch (type) {
      case 'sale':
        return (
          <div className="space-y-6 text-foreground print-border text-right" dir="rtl">
            {/* Header */}
            <div className="text-center pb-4 border-b border-border/80">
              <h2 className="text-xl font-bold font-family-cairo">شركة الأصدقاء لتجارة السيارات</h2>
              <p className="text-xs text-muted-foreground mt-1">فاتورة بيع سيارة</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">رقم الفاتورة: {data.invoice_number}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">التاريخ</p>
                <p className="font-semibold">{formatDate(data.sale_date ?? new Date())}</p>
              </div>
              <div>
                <p className="text-muted-foreground">المشتري</p>
                <p className="font-semibold">{data.buyer_name || data.buyer?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">رقم الهاتف</p>
                <p className="font-semibold">{data.buyer_phone || data.buyer?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">طريقة الدفع</p>
                <p className="font-semibold">{data.payment_method === 'Cash' ? 'نقدي' : data.payment_method === 'Installment' ? 'أقساط' : 'حوالة مصرفية'}</p>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="border border-border/60 rounded-lg p-3 bg-secondary/10">
              <h3 className="text-xs font-bold mb-2 pb-1 border-b border-border/40">تفاصيل المركبة</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <span className="text-muted-foreground">السيارة:</span>
                <span className="font-semibold text-left">{data.car_name || `${data.car?.brand ?? ''} ${data.car?.model ?? ''} ${data.car?.manufacturing_year ?? ''}`}</span>
                <span className="text-muted-foreground">رقم الشاصي (VIN):</span>
                <span className="font-mono text-left">{data.car_vin || data.car?.vin || '-'}</span>
                <span className="text-muted-foreground">رقم اللوحة:</span>
                <span className="font-semibold text-left">{data.plate_number || data.car?.plate_number || '-'}</span>
                <span className="text-muted-foreground">اللون:</span>
                <span className="font-semibold text-left">{data.color || data.car?.color || '-'}</span>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="border-t border-border/80 pt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">سعر السيارة</span>
                <span className="font-numeric font-semibold">{formatMoney(data.selling_price, data.currency ?? 'USD')}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>الخصم الممنوح</span>
                  <span className="font-numeric font-semibold">- {formatMoney(data.discount, data.currency ?? 'USD')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/40 pt-2 text-sm font-bold">
                <span>المبلغ الإجمالي</span>
                <span className="font-numeric text-amber-400">{formatMoney(data.selling_price - (data.discount ?? 0), data.currency ?? 'USD')}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>المدفوع مستعجلاً</span>
                <span className="font-numeric font-semibold">{formatMoney(data.paid_amount ?? 0, data.currency ?? 'USD')}</span>
              </div>
              <div className="flex justify-between border-t border-double border-border/60 pt-2 text-sm font-bold text-rose-400">
                <span>المتبقي ذمة</span>
                <span className="font-numeric">{formatMoney(Math.max((data.selling_price - (data.discount ?? 0)) - (data.paid_amount ?? 0), 0), data.currency ?? 'USD')}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
              <div>
                <div className="border-t border-border/80 pt-2 mx-4">توقيع المستلم / العميل</div>
              </div>
              <div>
                <div className="border-t border-border/80 pt-2 mx-4">توقيع الكاشير / المحاسب</div>
              </div>
            </div>
          </div>
        )

      case 'payment':
        return (
          <div className="space-y-6 text-foreground print-border text-right" dir="rtl">
            {/* Header */}
            <div className="text-center pb-4 border-b border-border/80">
              <h2 className="text-xl font-bold font-family-cairo">شركة الأصدقاء لتجارة السيارات</h2>
              <p className="text-xs text-muted-foreground mt-1">سند قبض أقساط / مبيعات</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">رقم السند: #{data.paymentId || data.id}</p>
            </div>

            {/* Receipt body */}
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground shrink-0">استلمنا من السيد/ة:</span>
                <span className="font-bold border-b border-dashed border-border/80 pb-0.5 flex-1">{data.buyer_name || data.customer_name || data.buyerName || 'المشتري'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground shrink-0">مبلغاً وقدره:</span>
                <span className="font-bold border-b border-dashed border-border/80 pb-0.5 flex-1 font-numeric text-emerald-400 text-sm">
                  {formatMoney(data.amount ?? data.paid_amount ?? 0, data.currency ?? 'IQD')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground shrink-0">وذلك عن:</span>
                <span className="font-medium border-b border-dashed border-border/80 pb-0.5 flex-1">
                  {data.notes || data.description || 'سداد دفعة قسط مستحقة'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">تاريخ السند:</span>
                  <span className="font-semibold ms-1.5">{formatDate(data.payment_date ?? new Date())}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">طريقة الدفع:</span>
                  <span className="font-semibold ms-1.5">{data.payment_method === 'Bank' ? 'تحويل بنكي' : 'نقدي'}</span>
                </div>
              </div>
            </div>

            {/* Remaining stats if installment related */}
            {data.plan_remaining !== undefined && (
              <div className="rounded-lg border border-border/40 bg-secondary/10 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المتبقي الإجمالي على الخطة:</span>
                  <span className="font-numeric font-bold text-rose-400">{formatMoney(data.plan_remaining, 'IQD')}</span>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-[10px]">
              <div>
                <div className="border-t border-border/80 pt-2 mx-4">توقيع المسدد (العميل)</div>
              </div>
              <div>
                <div className="border-t border-border/80 pt-2 mx-4">توقيع المستلم (أمين الصندوق)</div>
              </div>
            </div>
          </div>
        )

      case 'close':
        return (
          <div className="space-y-6 text-foreground print-border text-right" dir="rtl">
            {/* Header */}
            <div className="text-center pb-4 border-b border-border/80">
              <h2 className="text-xl font-bold font-family-cairo">شركة الأصدقاء لتجارة السيارات</h2>
              <p className="text-xs text-muted-foreground mt-1">تقرير إقفال الصندوق اليومي</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">تاريخ الإقفال: {formatDate(data.close_date ?? new Date())}</p>
            </div>

            {/* Stats */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">الحساب المقفل</span>
                <span className="font-semibold">{data.account_name} ({data.account_code})</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">الرصيد الدفتري (المتوقع)</span>
                <span className="font-numeric font-semibold">{formatMoney(data.system_balance, 'IQD')}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">الرصيد الفعلي (المعدود)</span>
                <span className="font-numeric font-semibold text-cyan-400">{formatMoney(data.actual_balance, 'IQD')}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5 font-bold">
                <span className="text-muted-foreground">الفارق (العجز / الزيادة)</span>
                <span className={`font-numeric ${data.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.difference > 0 ? '+' : ''}{formatMoney(data.difference, 'IQD')}
                </span>
              </div>
              {data.note && (
                <div className="pt-2">
                  <p className="text-muted-foreground">ملاحظات الإقفال:</p>
                  <p className="bg-secondary/20 rounded p-2 text-[11px] mt-1 italic">{data.note}</p>
                </div>
              )}
            </div>

            {/* Info footer */}
            <div className="grid grid-cols-2 gap-4 text-[10px] text-muted-foreground pt-4 border-t border-border/40">
              <span>أقفل بواسطة: {data.closed_by || 'أمين الصندوق'}</span>
              <span className="text-left">وقت الإغلاق: {data.created_at ? new Date(data.created_at).toLocaleTimeString('ar-EG') : '-'}</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-[10px]">
              <div>
                <div className="border-t border-border/80 pt-2 mx-4">أمين الصندوق</div>
              </div>
              <div>
                <div className="border-t border-border/80 pt-2 mx-4">اعتماد الإدارة المالي</div>
              </div>
            </div>
          </div>
        )

      case 'schedule':
        return (
          <div className="space-y-5 text-foreground text-right" dir="rtl">
            <div className="text-center pb-4 border-b border-border/80 print-header">
              <h2 className="text-xl font-bold font-family-cairo">شركة الأصدقاء لتجارة السيارات</h2>
              <p className="text-xs text-muted-foreground mt-1">جدول سداد الأقساط</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">العميل: {data.customer_name || data.buyer_name || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">السيارة</p><p className="font-semibold">{data.car_name || '-'}</p></div>
              <div><p className="text-muted-foreground">إجمالي العقد</p><p className="font-semibold font-numeric">{formatMoney(data.total_amount ?? 0, data.currency ?? 'IQD')}</p></div>
              <div><p className="text-muted-foreground">الدفعة الأولى</p><p className="font-semibold font-numeric">{formatMoney(data.down_payment ?? 0, data.currency ?? 'IQD')}</p></div>
              <div><p className="text-muted-foreground">تاريخ أول قسط</p><p className="font-semibold">{data.first_installment_date ? formatDate(data.first_installment_date) : '-'}</p></div>
            </div>

            {Array.isArray(data.schedule) && data.schedule.length > 0 && (
              <table className="w-full text-[11px] border-collapse border border-border/40">
                <thead>
                  <tr className="bg-secondary/20">
                    <th className="border border-border/40 px-2 py-1.5 text-right font-bold">#</th>
                    <th className="border border-border/40 px-2 py-1.5 text-right font-bold">تاريخ الاستحقاق</th>
                    <th className="border border-border/40 px-2 py-1.5 text-right font-bold">المبلغ</th>
                    <th className="border border-border/40 px-2 py-1.5 text-right font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schedule.map((row: any, i: number) => (
                    <tr key={i} className={row.status === 'paid' ? 'bg-emerald-500/5' : row.status === 'overdue' ? 'bg-rose-500/5' : ''}>
                      <td className="border border-border/30 px-2 py-1">{i + 1}</td>
                      <td className="border border-border/30 px-2 py-1">{formatDate(row.due_date)}</td>
                      <td className="border border-border/30 px-2 py-1 font-numeric">{formatMoney(row.amount, data.currency ?? 'IQD')}</td>
                      <td className="border border-border/30 px-2 py-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          row.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500' :
                          row.status === 'overdue' ? 'bg-rose-500/15 text-rose-500' :
                          'bg-secondary/40 text-muted-foreground'
                        }`}>
                          {row.status === 'paid' ? 'مدفوع' : row.status === 'overdue' ? 'متأخر' : 'معلق'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-[10px]">
              <div><div className="border-t border-border/80 pt-2 mx-4">توقيع العميل</div></div>
              <div><div className="border-t border-border/80 pt-2 mx-4">توقيع الشركة / الختم</div></div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] p-5" dir="rtl">
        <DialogHeader className="no-print text-right pb-3 border-b border-border/40">
          <DialogTitle className="font-family-cairo text-md font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              {type === 'sale' ? 'فاتورة بيع سيارة' : type === 'payment' ? 'سند قبض' : type === 'schedule' ? 'جدول الأقساط' : 'تقرير إقفال الصندوق'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Area */}
        <div ref={printRef} className="my-2 p-1">
          {renderReceiptContent()}
        </div>

        {/* Action buttons */}
        <div className="no-print flex items-center justify-end gap-3 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            إغلاق
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة الآن</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
