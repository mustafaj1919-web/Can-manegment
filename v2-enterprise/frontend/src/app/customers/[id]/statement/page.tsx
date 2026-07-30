'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCustomerById, getCustomerStatement } from '@/lib/api/customers'
import { formatMoney, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Printer, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  Paid: 'مسدد', Overdue: 'متأخر', Partial: 'جزئي',
  Pending: 'معلق', Active: 'نشط', Cancelled: 'ملغاة',
}
const METHOD_LABEL: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة مصرفية',
}

export default function CustomerStatementPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = rawId

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn:  () => getCustomerById(id),
    staleTime: 30_000,
  })

  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ['customer-statement', id],
    queryFn:  () => getCustomerStatement(id),
    staleTime: 30_000,
    enabled:  !!id,
  })

  if (isLoading) {
    return <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-8 rounded"/>)}</div>
  }

  if (isError || !statement) {
    return <div className="p-8 text-center text-sm text-rose-400">تعذر تحميل كشف الحساب</div>
  }

  const { summary, sales } = statement
  const today = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div dir="rtl" className="min-h-screen bg-white text-black">

      {/* Action bar - hidden on print */}
      <div className="no-print flex items-center gap-3 bg-slate-800 px-6 py-3 text-white">
        <Button asChild variant="ghost" size="sm" className="text-white hover:text-white gap-1.5">
          <Link href={`/customers/${id}`}><ArrowRight className="h-4 w-4"/>العودة</Link>
        </Button>
        <Button size="sm" className="gap-2 bg-white text-muted-foreground hover:bg-slate-100" onClick={() => window.print()}>
          <Printer className="h-4 w-4"/>طباعة / PDF
        </Button>
      </div>

      {/* Print content */}
      <div className="mx-auto max-w-3xl px-8 py-8 text-sm">

        {/* Header */}
        <div className="border-b-2 border-slate-800 pb-6 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-muted-foreground">كشف حساب عميل</h1>
            <p className="text-muted-foreground mt-1">تاريخ الإصدار: {today}</p>
          </div>
          <div className="text-end">
            <p className="font-bold text-lg">{statement.customer?.name ?? '—'}</p>
            <p className="text-muted-foreground">{statement.customer?.phone ?? '—'}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-50 rounded-lg p-4">
          {[
            { label: 'إجمالي المشتريات', value: summary.total_sales_amount, color: 'text-muted-foreground' },
            { label: 'المدفوع',           value: summary.total_paid_amount,   color: 'text-emerald-600' },
            { label: 'المتبقي',           value: summary.total_remaining,     color: 'text-amber-600' },
            { label: 'المتأخر',           value: summary.total_overdue,       color: 'text-red-600' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className={`font-black text-base ${item.color}`}>{formatMoney(item.value, 'IQD')}</p>
            </div>
          ))}
        </div>

        {summary.last_payment_date && (
          <p className="text-xs text-muted-foreground mb-6">آخر دفعة: {summary.last_payment_date}</p>
        )}

        {/* Sales table */}
        {sales.map((sale, si) => (
          <div key={sale.id} className="mb-8">
            <div className="bg-slate-800 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
              <span className="font-bold">{sale.car_name ?? `سيارة #${sale.id}`}</span>
              <span className="text-foreground/70 text-xs font-mono">{sale.invoice_number} · {sale.sale_date}</span>
            </div>

            {/* Sale summary */}
            <div className="border border-slate-200 rounded-b-lg px-4 py-3 mb-3">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">سعر البيع: </span>
                  <span className="font-bold">{formatMoney(sale.selling_price, sale.currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">المدفوع: </span>
                  <span className="font-bold text-emerald-600">{formatMoney(sale.paid_amount, sale.currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">المتبقي: </span>
                  <span className="font-bold text-amber-600">{formatMoney(sale.remaining_amount, sale.currency)}</span>
                </div>
              </div>
            </div>

            {/* Installment schedule */}
            {sale.installment_plan && sale.installment_plan.schedules.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  جدول الأقساط ({sale.installment_plan.number_of_months} شهر)
                </p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-2 py-1 text-start">#</th>
                      <th className="border border-slate-200 px-2 py-1 text-start">الاستحقاق</th>
                      <th className="border border-slate-200 px-2 py-1 text-end">المبلغ</th>
                      <th className="border border-slate-200 px-2 py-1 text-end">المدفوع</th>
                      <th className="border border-slate-200 px-2 py-1 text-end">المتبقي</th>
                      <th className="border border-slate-200 px-2 py-1 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.installment_plan.schedules.map(sch => (
                      <tr key={sch.id} className={sch.status === 'Overdue' ? 'bg-red-50' : sch.status === 'Paid' ? 'bg-green-50' : ''}>
                        <td className="border border-slate-200 px-2 py-1">{sch.installment_number}</td>
                        <td className="border border-slate-200 px-2 py-1">{sch.due_date ?? '—'}</td>
                        <td className="border border-slate-200 px-2 py-1 text-end">{formatMoney(sch.amount, sch.currency)}</td>
                        <td className="border border-slate-200 px-2 py-1 text-end text-emerald-700">{formatMoney(sch.paid_amount, sch.currency)}</td>
                        <td className="border border-slate-200 px-2 py-1 text-end text-amber-700">{formatMoney(sch.remaining_amount, sch.currency)}</td>
                        <td className="border border-slate-200 px-2 py-1 text-center">{STATUS_LABEL[sch.status] ?? sch.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment history */}
            {sale.payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">سجل الدفعات</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-2 py-1 text-start">التاريخ</th>
                      <th className="border border-slate-200 px-2 py-1 text-start">طريقة الدفع</th>
                      <th className="border border-slate-200 px-2 py-1 text-end">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.payments.map(p => (
                      <tr key={p.id}>
                        <td className="border border-slate-200 px-2 py-1">{p.payment_date ?? '—'}</td>
                        <td className="border border-slate-200 px-2 py-1">{METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method}</td>
                        <td className="border border-slate-200 px-2 py-1 text-end font-bold text-emerald-700">{formatMoney(p.amount, p.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {/* Customer Purchases section */}
        {statement.customer_purchases && statement.customer_purchases.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-bold text-slate-800 mb-3 border-b pb-2">السيارات المشتراة من الزبون (المعرض مدين للزبون بقيمتها)</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-700 px-3 py-2 text-start">رقم الفاتورة</th>
                  <th className="border border-slate-700 px-3 py-2 text-start">السيارة والشاصي</th>
                  <th className="border border-slate-700 px-3 py-2 text-start">التاريخ</th>
                  <th className="border border-slate-700 px-3 py-2 text-end">سعر الشراء</th>
                  <th className="border border-slate-700 px-3 py-2 text-end">المسدد له</th>
                  <th className="border border-slate-700 px-3 py-2 text-end">المتبقي له</th>
                </tr>
              </thead>
              <tbody>
                {statement.customer_purchases.map(cp => (
                  <tr key={cp.id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2 font-mono font-bold">{cp.purchase_number}</td>
                    <td className="border border-slate-200 px-3 py-2 font-medium">
                      {cp.vehicle_name}
                      {cp.chassis_number && <span className="block text-[10px] text-muted-foreground font-mono">{cp.chassis_number}</span>}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">{cp.purchase_date ? cp.purchase_date.slice(0, 10) : '—'}</td>
                    <td className="border border-slate-200 px-3 py-2 text-end font-bold text-slate-800">{formatMoney(cp.purchase_cost, cp.currency)}</td>
                    <td className="border border-slate-200 px-3 py-2 text-end text-emerald-700 font-medium">{formatMoney(cp.amount_paid, cp.currency)}</td>
                    <td className="border border-slate-200 px-3 py-2 text-end text-rose-700 font-bold">{formatMoney(cp.outstanding_amount, cp.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-slate-800 pt-4 mt-8 text-xs text-muted-foreground text-center">
          <p>كشف حساب بتاريخ {today} · شركة الأصدقاء لتجارة السيارات</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  )
}
