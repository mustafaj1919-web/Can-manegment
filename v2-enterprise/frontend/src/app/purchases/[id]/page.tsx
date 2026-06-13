'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Calendar, Car, Hash, Phone, User } from 'lucide-react'
import { cn, formatDate, formatMoney, formatNumber, getStatusVariant, translateStatus } from '@/lib/utils'
import { getPurchaseById } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'

const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقدا',
  Installment: 'أقساط',
  'Bank transfer': 'حوالة مصرفية',
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-3 border-b border-border/20 py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = rawId

  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchaseById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
        <Skeleton className="h-36 rounded-lg" />
      </div>
    )
  }

  if (isError || !purchase) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-rose-400/60" />
        <p className="text-muted-foreground">تعذر تحميل فاتورة الشراء</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/purchases">العودة للمشتريات</Link>
        </Button>
      </div>
    )
  }

  const carName    = purchase.car
    ? `${purchase.car.brand} ${purchase.car.model} ${purchase.car.manufacturing_year}`
    : `سيارة #${purchase.car_id ?? '-'}`
  const sellerName = purchase.seller?.full_name || purchase.seller?.name || `بائع #${purchase.seller_id ?? '-'}`

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      <DetailHeader
        backHref="/purchases"
        backLabel="المشتريات"
        title={purchase.invoice_number}
        subtitle={`تاريخ الشراء: ${formatDate(purchase.purchase_date)}`}
        status={
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', getStatusVariant(purchase.status))}>
            {translateStatus(purchase.status)}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="السيارة" contentClassName="px-5 py-0">
          <InfoRow icon={Car}      label="السيارة"           value={carName} />
          <InfoRow icon={Hash}     label="رقم الشاصي"        value={purchase.car?.vin} />
          <InfoRow icon={Hash}     label="رقم اللوحة"        value={purchase.car?.plate_number} />
          <InfoRow icon={Calendar} label="المسافة المقطوعة"  value={purchase.car?.mileage ? `${formatNumber(purchase.car.mileage)} كم` : null} />
        </SectionCard>

        <SectionCard title="البائع" contentClassName="px-5 py-0">
          <InfoRow icon={User}  label="الاسم"       value={sellerName} />
          <InfoRow icon={Phone} label="رقم الهاتف"  value={purchase.seller?.phone} />
          <InfoRow icon={Hash}  label="رقم الهوية"  value={purchase.seller?.id_number} />
        </SectionCard>
      </div>

      <SectionCard title="السعر والدفع" contentClassName="px-5 py-1">
        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">سعر الشراء</span>
            <span className="font-numeric text-sm font-bold text-foreground">
              {formatMoney(purchase.purchase_price, purchase.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">المدفوع</span>
            <span className="font-numeric text-sm font-bold text-emerald-300">
              {formatMoney(purchase.paid_amount, purchase.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">المتبقي</span>
            <span className={cn('font-numeric text-sm font-bold', purchase.remaining_amount > 0 ? 'text-rose-300' : 'text-emerald-300')}>
              {formatMoney(purchase.remaining_amount, purchase.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">طريقة الدفع</span>
            <span className="text-sm text-foreground">
              {METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}
            </span>
          </div>
        </div>
      </SectionCard>

    </div>
  )
}
