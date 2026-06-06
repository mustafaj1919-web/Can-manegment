'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getInstallmentPlan } from '@/lib/api/installments'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Pending:   { label: 'مستحق',  cls: 'text-amber-400' },
  Paid:      { label: 'مدفوع',  cls: 'text-emerald-400' },
  Partial:   { label: 'جزئي',   cls: 'text-sky-400' },
  Overdue:   { label: 'متأخر',  cls: 'text-rose-400' },
  Cancelled: { label: 'ملغى',   cls: 'text-muted-foreground' },
}

export default function SchedulePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const planId = parseInt(rawId, 10)

  const { data: plan, isLoading } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn:  () => getInstallmentPlan(planId),
    staleTime: 30_000,
  })

  return (
    <div dir="rtl">
      {/* Print controls — hidden when printing */}
      <div className="no-print flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/installments/${planId}`}><ArrowRight className="h-4 w-4 me-1" />رجوع</Link>
        </Button>
        <Button size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          طباعة الجدول
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
      ) : !plan ? (
        <p className="text-muted-foreground">لم يتم العثور على الخطة</p>
      ) : (
        <div className="print-page bg-white text-black p-8 rounded-xl shadow-lg max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-xl font-bold text-center mb-2">جدول الأقساط</h1>
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p><span className="font-semibold">العميل:</span> {plan.buyer_name ?? '—'}</p>
                <p><span className="font-semibold">السيارة:</span> {plan.car_name ?? '—'}</p>
                <p><span className="font-semibold">رقم العقد:</span> {plan.invoice_number ?? '—'}</p>
              </div>
              <div>
                <p><span className="font-semibold">المبلغ الإجمالي:</span> {formatMoney(plan.total_amount, plan.currency)}</p>
                <p><span className="font-semibold">المبلغ المسدد:</span> {formatMoney(plan.paid_amount, plan.currency)}</p>
                <p><span className="font-semibold">عدد الأقساط:</span> {plan.number_of_months ?? '—'}</p>
                <p><span className="font-semibold">قيمة القسط:</span> {formatMoney(plan.installment_amount, plan.currency)}</p>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">#</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">تاريخ الاستحقاق</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">المبلغ</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">المدفوع</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">المتبقي</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">الحالة</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">تاريخ الدفع</th>
              </tr>
            </thead>
            <tbody>
              {plan.schedules.map((sch, i) => {
                const s = STATUS_LABELS[sch.status] ?? { label: sch.status, cls: '' }
                return (
                  <tr key={sch.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-2">{sch.installment_number}</td>
                    <td className="border border-gray-300 px-3 py-2 font-numeric">{sch.due_date?.split('T')[0] ?? '—'}</td>
                    <td className="border border-gray-300 px-3 py-2 font-numeric">{formatMoney(sch.amount, plan.currency)}</td>
                    <td className="border border-gray-300 px-3 py-2 font-numeric">{formatMoney(sch.paid_amount, plan.currency)}</td>
                    <td className="border border-gray-300 px-3 py-2 font-numeric">{formatMoney(sch.remaining_amount, plan.currency)}</td>
                    <td className={cn('border border-gray-300 px-3 py-2 font-semibold', s.cls)}>{s.label}</td>
                    <td className="border border-gray-300 px-3 py-2 font-numeric text-gray-600">{sch.payment_date?.split('T')[0] ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2" colSpan={2}>الإجمالي</td>
                <td className="border border-gray-300 px-3 py-2 font-numeric">{formatMoney(plan.total_amount, plan.currency)}</td>
                <td className="border border-gray-300 px-3 py-2 font-numeric">{formatMoney(plan.paid_amount, plan.currency)}</td>
                <td className="border border-gray-300 px-3 py-2 font-numeric">{formatMoney(plan.remaining_amount, plan.currency)}</td>
                <td className="border border-gray-300 px-3 py-2" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-8 flex justify-between text-xs text-gray-500">
            <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-IQ')}</p>
            <p>توقيع العميل: ____________________</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
