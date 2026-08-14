'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Calendar, Car, Hash, Phone, User, PlusCircle, Loader2, XCircle } from 'lucide-react'
import { cn, formatDate, formatMoney, formatNumber, getStatusVariant, translateStatus } from '@/lib/utils'
import { getPurchaseById, addPurchasePayment, cancelPurchase } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقداً',
  Bank: 'حوالة مصرفية',
  Cheque: 'شيك / آجل',
  Installment: 'أقساط',
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

function AddPaymentForm({
  purchaseId,
  remaining,
  currency,
  onSuccess,
}: {
  purchaseId: string
  remaining: number
  currency: string
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      addPurchasePayment(purchaseId, {
        amount: Number(amount),
        payment_method: method,
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`تم تسجيل الدفعة. المتبقي: ${formatMoney(res.remaining_amount, currency as any)}`)
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'حدث خطأ أثناء تسجيل الدفعة')
    },
  })

  const parsed = Number(amount)
  const isValid = parsed > 0 && parsed <= remaining

  return (
    <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <p className="text-xs font-semibold text-amber-400">تسجيل دفعة جديدة</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            المبلغ * (الحد الأقصى: {formatMoney(remaining, currency as any)})
          </Label>
          <Input
            type="number"
            min="0.01"
            step="any"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-numeric bg-secondary/30 border-border/60"
            placeholder="0"
          />
          {parsed > remaining && (
            <p className="mt-1 text-[11px] text-rose-400">المبلغ يتجاوز المتبقي</p>
          )}
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">نقداً</SelectItem>
              <SelectItem value="Bank">حوالة مصرفية</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات (اختياري)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary/30 border-border/60"
            placeholder="دفعة شهر..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          size="sm"
          className="gap-1.5 bg-amber-600 text-white hover:bg-amber-500"
        >
          {mutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري التسجيل...</>
          ) : (
            <><PlusCircle className="h-3.5 w-3.5" />تسجيل الدفعة</>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = rawId
  const queryClient = useQueryClient()
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchaseById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchase(id, { cancel_reason: cancelReason }),
    onSuccess: () => {
      toast.success('تم إلغاء فاتورة الشراء وعكس القيود المحاسبية بنجاح')
      setShowCancelDialog(false)
      queryClient.invalidateQueries({ queryKey: ['purchase', id] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'حدث خطأ أثناء إلغاء فاتورة الشراء')
    },
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
  const hasRemaining = (purchase.remaining_amount ?? 0) > 0

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
        actions={
          purchase.status !== 'Cancelled' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="h-8 gap-1.5 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <XCircle className="h-3.5 w-3.5" />
              إلغاء الفاتورة
            </Button>
          ) : null
        }
      />

      <ConfirmDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="تأكيد إلغاء فاتورة الشراء"
        description="هل أنت متأكد من رغبتك في إلغاء فاتورة الشراء هذه؟ سيتم تغيير حالتها إلى 'ملغاة' وعكس كافة القيود المحاسبية التابعة لها."
        confirmText="نعم، إلغاء الفاتورة"
        cancelText="تراجع"
        variant="danger"
        loading={cancelMutation.isPending}
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

      <SectionCard
        title="السعر والدفع"
        contentClassName="px-5 py-1"
        action={
          hasRemaining && purchase.status !== 'Cancelled' ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPaymentForm((v) => !v)}
              className="gap-1.5 text-amber-400 hover:text-amber-300"
            >
              <PlusCircle className="h-4 w-4" />
              {showPaymentForm ? 'إلغاء' : 'إضافة دفعة'}
            </Button>
          ) : null
        }
      >
        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-muted-foreground">سعر الشراء الإجمالي</span>
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
            <span className={cn('font-numeric text-sm font-bold', hasRemaining ? 'text-rose-300' : 'text-emerald-300')}>
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

        {showPaymentForm && (
          <div className="pb-3">
            <AddPaymentForm
              purchaseId={id}
              remaining={purchase.remaining_amount ?? 0}
              currency={purchase.currency}
              onSuccess={() => {
                setShowPaymentForm(false)
                queryClient.invalidateQueries({ queryKey: ['purchase', id] })
              }}
            />
          </div>
        )}
      </SectionCard>

    </div>
  )
}
