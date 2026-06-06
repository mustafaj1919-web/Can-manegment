'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Calendar, Car, DollarSign, Hash, Phone, Receipt, User } from 'lucide-react'
import { cn, formatDate, formatMoney, formatNumber, getStatusVariant, translateStatus } from '@/lib/utils'
import { getPurchaseById } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقدا',
  Installment: 'أقساط',
  'Bank transfer': 'حوالة مصرفية',
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.04] py-3 last:border-0">
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
  const id = Number.parseInt(rawId, 10)

  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchaseById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !Number.isNaN(id),
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

  const carName = purchase.car
    ? `${purchase.car.brand} ${purchase.car.model} ${purchase.car.manufacturing_year}`
    : `سيارة #${purchase.car_id ?? '-'}`
  const sellerName = purchase.seller?.full_name || purchase.seller?.name || `بائع #${purchase.seller_id ?? '-'}`

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="glass rounded-lg px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
              <Receipt className="h-5 w-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-numeric truncate text-lg font-bold text-foreground">{purchase.invoice_number}</h1>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', getStatusVariant(purchase.status))}>
                  {translateStatus(purchase.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">تاريخ الشراء: {formatDate(purchase.purchase_date)}</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/purchases">
              <ArrowRight className="h-4 w-4" />
              المشتريات
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="glass rounded-lg overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
              <Car className="h-3.5 w-3.5 text-violet-300" />
            </div>
            <h2 className="text-sm font-semibold">السيارة</h2>
          </div>
          <div className="px-5 py-2">
            <InfoRow icon={Car} label="السيارة" value={carName} />
            <InfoRow icon={Hash} label="رقم الشاصي" value={purchase.car?.vin} />
            <InfoRow icon={Hash} label="رقم اللوحة" value={purchase.car?.plate_number} />
            <InfoRow icon={Calendar} label="المسافة المقطوعة" value={purchase.car?.mileage ? `${formatNumber(purchase.car.mileage)} كم` : null} />
          </div>
        </section>

        <section className="glass rounded-lg overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10">
              <User className="h-3.5 w-3.5 text-cyan-300" />
            </div>
            <h2 className="text-sm font-semibold">البائع</h2>
          </div>
          <div className="px-5 py-2">
            <InfoRow icon={User} label="الاسم" value={sellerName} />
            <InfoRow icon={Phone} label="رقم الهاتف" value={purchase.seller?.phone} />
            <InfoRow icon={Hash} label="رقم الهوية" value={purchase.seller?.id_number} />
          </div>
        </section>
      </div>

      <section className="glass rounded-lg overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <h2 className="text-sm font-semibold">السعر والدفع</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-center">
            <p className="mb-1 text-[11px] text-muted-foreground">سعر الشراء</p>
            <p className="font-numeric text-base font-bold">{formatMoney(purchase.purchase_price, purchase.currency)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-center">
            <p className="mb-1 text-[11px] text-muted-foreground">المدفوع</p>
            <p className="font-numeric text-base font-bold text-emerald-300">{formatMoney(purchase.paid_amount, purchase.currency)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-center">
            <p className="mb-1 text-[11px] text-muted-foreground">المتبقي</p>
            <p className={cn('font-numeric text-base font-bold', purchase.remaining_amount > 0 ? 'text-rose-300' : 'text-emerald-300')}>
              {formatMoney(purchase.remaining_amount, purchase.currency)}
            </p>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-5 py-3 text-xs text-muted-foreground">
          طريقة الدفع: {METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}
        </div>
      </section>
    </div>
  )
}
