'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInstallmentPlan } from '@/lib/api/installments'
import { get } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Printer, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const METHOD_LABEL: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة مصرفية',
}

interface PaymentReceipt {
  payment: {
    id: number; amount: number; currency: string
    payment_method: string | null; payment_date: string | null
    payment_type: string | null; notes: string | null
  }
  schedule: {
    id: number; installment_number: number; due_date: string | null
    amount: number; paid_amount: number; remaining_amount: number
  } | null
  plan: {
    id: number; number_of_months: number | null
    installment_amount: number; total_amount: number
    paid_amount: number; remaining_amount: number
  } | null
  sale: { id: number; invoice_number: string } | null
  customer: { id: number; name: string; phone: string | null } | null
  car: { name: string; vin: string } | null
}

export default function InstallmentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const planId = Number.parseInt(rawId, 10)

  const { data: plan } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn:  () => getInstallmentPlan(planId),
    staleTime: 30_000,
    enabled:  !isNaN(planId),
  })

  // Get the latest payment receipt (most recent payment)
  const latestPaymentId = plan?.payments?.[0]?.id

  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ['payment-receipt', latestPaymentId],
    queryFn:  () => get<PaymentReceipt>(`/payments/${latestPaymentId}/receipt`),
    staleTime: 30_000,
    enabled:  !!latestPaymentId,
  })

  const today = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })

  if (isLoading || !plan) {
    return <div className="p-8 space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-8 rounded"/>)}</div>
  }

  if (isError || !receipt) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-rose-400 mb-4">لم يتم العثور على دفعة لهذه الخطة</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/installments/${planId}`}>العودة لخطة الأقساط</Link>
        </Button>
      </div>
    )
  }

  const { payment, schedule, plan: planInfo, sale, customer, car } = receipt
  const receiptNumber = `RCP-${String(payment.id).padStart(6, '0')}`

  return (
    <div dir="rtl" className="min-h-screen bg-white text-black">

      {/* Action bar */}
      <div className="no-print flex items-center gap-3 bg-slate-800 px-6 py-3 text-white">
        <Button asChild variant="ghost" size="sm" className="text-white hover:text-white gap-1.5">
          <Link href={`/installments/${planId}`}><ArrowRight className="h-4 w-4"/>العودة</Link>
        </Button>
        <Button size="sm" className="gap-2 bg-white text-slate-800 hover:bg-slate-100" onClick={() => window.print()}>
          <Printer className="h-4 w-4"/>طباعة / PDF
        </Button>
      </div>

      {/* Receipt */}
      <div className="mx-auto max-w-md px-8 py-8">

        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="شعار شركة الأصدقاء"
            className="mx-auto mb-3 h-24 w-auto object-contain"
          />
          <h1 className="text-xl font-black">سند قبض</h1>
          <p className="text-slate-500 text-sm">شركة الأصدقاء لتجارة السيارات</p>
        </div>

        {/* Receipt number + date */}
        <div className="bg-slate-50 rounded-lg p-4 mb-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-slate-500 text-xs">رقم السند</p>
            <p className="font-black text-lg">{receiptNumber}</p>
          </div>
          <div className="text-end">
            <p className="text-slate-500 text-xs">التاريخ</p>
            <p className="font-bold">{payment.payment_date ?? today}</p>
          </div>
        </div>

        {/* Customer + Car */}
        {customer && (
          <div className="border border-slate-200 rounded-lg p-4 mb-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">اسم العميل:</span>
              <span className="font-bold">{customer.name}</span>
            </div>
            {customer.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">الهاتف:</span>
                <span>{customer.phone}</span>
              </div>
            )}
            {car && (
              <div className="flex justify-between">
                <span className="text-slate-500">السيارة:</span>
                <span className="font-bold">{car.name}</span>
              </div>
            )}
            {sale && (
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الفاتورة:</span>
                <span className="font-mono text-xs">{sale.invoice_number}</span>
              </div>
            )}
          </div>
        )}

        {/* Payment details */}
        <div className="border border-slate-200 rounded-lg p-4 mb-4 text-sm space-y-2">
          {schedule && (
            <div className="flex justify-between">
              <span className="text-slate-500">القسط رقم:</span>
              <span className="font-bold">{schedule.installment_number}</span>
            </div>
          )}
          {schedule?.due_date && (
            <div className="flex justify-between">
              <span className="text-slate-500">تاريخ الاستحقاق:</span>
              <span>{schedule.due_date}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">طريقة الدفع:</span>
            <span>{METHOD_LABEL[payment.payment_method ?? ''] ?? payment.payment_method}</span>
          </div>
          {payment.notes && (
            <div className="flex justify-between">
              <span className="text-slate-500">ملاحظات:</span>
              <span className="text-xs">{payment.notes}</span>
            </div>
          )}
        </div>

        {/* Amount box */}
        <div className="bg-slate-800 text-white rounded-lg p-5 mb-4 text-center">
          <p className="text-slate-400 text-xs mb-1">المبلغ المستلم</p>
          <p className="text-3xl font-black">{formatMoney(payment.amount, payment.currency as 'USD' | 'IQD')}</p>
        </div>

        {/* Plan summary */}
        {planInfo && (
          <div className="border border-slate-200 rounded-lg p-4 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800 mb-2">ملخص خطة الأقساط</p>
            <div className="flex justify-between">
              <span>إجمالي خطة الأقساط:</span>
              <span className="font-bold">{formatMoney(planInfo.total_amount, payment.currency as 'USD' | 'IQD')}</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي المدفوع:</span>
              <span className="font-bold text-emerald-700">{formatMoney(planInfo.paid_amount, payment.currency as 'USD' | 'IQD')}</span>
            </div>
            <div className="flex justify-between">
              <span>المتبقي:</span>
              <span className="font-bold text-amber-700">{formatMoney(planInfo.remaining_amount, payment.currency as 'USD' | 'IQD')}</span>
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
          <div>
            <div className="border-b border-slate-300 mb-2 pb-6"></div>
            <p>توقيع المستلم</p>
          </div>
          <div>
            <div className="border-b border-slate-300 mb-2 pb-6"></div>
            <p>توقيع العميل</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          شكراً لتعاملكم مع شركة الأصدقاء لتجارة السيارات
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          @page { size: A5; margin: 10mm; }
        }
      `}</style>
    </div>
  )
}
