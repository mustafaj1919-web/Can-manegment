'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getInstallmentPlan } from '@/lib/api/installments'
import { get } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { adaptInstallmentReceiptData } from '@/components/installments/installmentReceiptAdapter'
import { InstallmentReceiptPreview } from '@/components/installments/InstallmentReceiptPreview'

export default function InstallmentReceiptPage() {
  const routeParams = useParams<{ id: string }>()
  const id = routeParams?.id ? String(routeParams.id) : ""
  const planId = id

  const { data: plan, isLoading: isPlanLoading } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn: () => getInstallmentPlan(planId),
    staleTime: 30_000,
    enabled: !!planId,
  })

  // Get the latest payment receipt (most recent payment)
  const latestPaymentId = plan?.payments?.[0]?.id

  const { data: rawReceipt, isLoading: isReceiptLoading, isError } = useQuery({
    queryKey: ['payment-receipt', latestPaymentId],
    queryFn: () => get<any>(`/payments/${latestPaymentId}/receipt`),
    staleTime: 30_000,
    enabled: !!latestPaymentId,
  })

  if (isPlanLoading || isReceiptLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 space-y-4 font-tajawal">
        <Skeleton className="h-10 w-64 bg-slate-200 rounded-xl" />
        <Skeleton className="h-[148mm] w-[1100px] max-w-full bg-white border border-[#E5E7EB] rounded-2xl" />
      </div>
    )
  }

  if (isError || (!rawReceipt && !plan)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-8 text-center font-tajawal">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 max-w-md space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#0F172A]">لم يتم العثور على وصل سداد القسط</h2>
          <p className="text-xs text-[#64748B]">قد تكون الخطة لا تحتوي على أي مدفوعات مسجلة بعد.</p>
          <Button asChild variant="outline" size="sm" className="border-[#E5E7EB] bg-white hover:bg-slate-50 text-[#0F172A] gap-2 rounded-xl">
            <Link href={`/installments/${planId}`}>
              <ArrowRight className="h-4 w-4 text-[#64748B]" />
              <span>العودة لخطة الأقساط</span>
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Combine plan & rawReceipt if rawReceipt missing sub-objects
  const planAny = plan as any
  const fullRawData = {
    ...(rawReceipt ?? {}),
    plan: rawReceipt?.plan ?? plan,
    customer: rawReceipt?.customer ?? planAny?.customer ?? planAny?.buyer ?? null,
    car: rawReceipt?.car ?? planAny?.vehicle ?? planAny?.car ?? null,
  }

  const receiptViewModel = adaptInstallmentReceiptData(fullRawData)

  return (
    <InstallmentReceiptPreview
      data={receiptViewModel}
      backUrl={`/installments/${planId}`}
    />
  )
}
