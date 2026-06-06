'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { getPurchaseById } from '@/lib/api/purchases'
import { formatMoney, formatNumber, translateStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PrintableContract } from '@/components/contracts/PrintableContract'

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ar-IQ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function PurchaseContractPage() {
  const params = useParams<{ id: string }>()
  const purchaseId = Number(params.id)

  const { data: purchase, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-contract', purchaseId],
    queryFn: () => getPurchaseById(purchaseId),
    enabled: Number.isFinite(purchaseId),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07111f] p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[760px] rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || !purchase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] p-6" dir="rtl">
        <div className="glass rounded-lg p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
          <p className="text-sm text-muted-foreground">تعذر تحميل عقد الشراء</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3">إعادة المحاولة</Button>
        </div>
      </div>
    )
  }

  return (
    <PrintableContract
      title="عقد شراء مركبة"
      contractNumber={purchase.invoice_number}
      contractDate={formatDateTime(purchase.purchase_date)}
      branchName={purchase.branch?.name}
      intro="تم الاتفاق بين الطرفين أدناه على شراء المركبة الموضحة بياناتها في هذا العقد، وذلك وفق التفاصيل المالية المثبتة في فاتورة الشراء المسجلة في النظام."
      parties={[
        {
          title: 'بيانات البائع',
          fields: [
            { label: 'الاسم', value: purchase.seller?.full_name || purchase.seller?.name },
            { label: 'الهاتف', value: purchase.seller?.phone },
            { label: 'العنوان', value: purchase.seller?.address },
            { label: 'نوع الهوية', value: purchase.seller?.id_type },
            { label: 'رقم الهوية', value: purchase.seller?.id_number },
          ],
        },
        {
          title: 'بيانات المشتري',
          fields: [
            { label: 'الاسم', value: 'شركة الأصدقاء لتجارة السيارات' },
            { label: 'الصفة', value: 'المشتري' },
            { label: 'رقم العقد', value: purchase.invoice_number },
          ],
        },
      ]}
      vehicle={[
        { label: 'الماركة', value: purchase.car?.brand },
        { label: 'الموديل', value: purchase.car?.model },
        { label: 'السنة', value: purchase.car?.manufacturing_year },
        { label: 'الفئة', value: purchase.car?.trim },
        { label: 'اللون', value: purchase.car?.color },
        { label: 'رقم الشاصي', value: purchase.car?.vin },
        { label: 'رقم اللوحة', value: purchase.car?.plate_number },
        { label: 'الممشى', value: purchase.car?.mileage != null ? formatNumber(purchase.car.mileage) : undefined },
        { label: 'حالة المركبة', value: purchase.car?.status ? translateStatus(purchase.car.status) : '-' },
      ]}
      financial={[
        { label: 'سعر الشراء', value: formatMoney(purchase.purchase_price, purchase.currency) },
        { label: 'المدفوع', value: formatMoney(purchase.paid_amount, purchase.currency) },
        { label: 'المتبقي', value: formatMoney(purchase.remaining_amount, purchase.currency) },
        { label: 'طريقة الدفع', value: translateStatus(purchase.payment_method) },
        { label: 'حالة الفاتورة', value: translateStatus(purchase.status) },
      ]}
    />
  )
}
