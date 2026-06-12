'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle, CalendarDays, CheckCircle2, Loader2, Sparkles, TrendingDown,
} from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { getAvailableCars, getBuyers, createSale } from '@/lib/api/sales'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'

const PAYMENT_METHODS = [
  { value: 'Cash',          label: 'نقداً' },
  { value: 'Installment',   label: 'أقساط' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-[11px] text-rose-400 mt-1">{msg}</p>
}

export default function NewSalePage() {
  const router = useRouter()

  /* ── Form state ── */
  const [carId,         setCarId]         = useState('')
  const [buyerId,       setBuyerId]       = useState('')
  const [sellingPrice,  setSellingPrice]  = useState('')
  const [discount,      setDiscount]      = useState('0')
  const [paidAmount,    setPaidAmount]    = useState('')
  const [currency,      setCurrency]      = useState<'USD' | 'IQD'>('USD')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [saleDate,      setSaleDate]      = useState(new Date().toISOString().slice(0, 10))

  /* ── Installment state ── */
  const [enableInstallment, setEnableInstallment] = useState(false)
  const [numMonths,         setNumMonths]         = useState('')
  const [startDate,         setStartDate]         = useState('')
  const [dueDay,            setDueDay]            = useState('')
  const [installNotes,      setInstallNotes]      = useState('')

  /* ── Validation errors ── */
  const [errors, setErrors] = useState<Record<string, string>>({})

  /* ── Derived values ── */
  const sp        = parseFloat(sellingPrice) || 0
  const dc        = parseFloat(discount)     || 0
  const pa        = parseFloat(paidAmount)   || 0
  const remaining = Math.max(sp - dc - pa, 0)

  /* ── When payment method = Installment, auto-enable installment ── */
  useEffect(() => {
    if (paymentMethod === 'Installment') setEnableInstallment(true)
  }, [paymentMethod])

  /* ── Fetch available cars and buyers ── */
  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ['available-cars'],
    queryFn: getAvailableCars,
    staleTime: 60_000,
  })

  const { data: buyers = [], isLoading: buyersLoading } = useQuery({
    queryKey: ['buyers'],
    queryFn: getBuyers,
    staleTime: 60_000,
  })

  const selectedCar   = cars.find(c => String(c.id) === carId)
  const selectedBuyer = buyers.find(b => String(b.id) === buyerId)

  /* ── Prefill selling price from car ── */
  useEffect(() => {
    if (selectedCar?.selling_price && !sellingPrice) {
      setSellingPrice(String(selectedCar.selling_price))
      setCurrency(selectedCar.currency)
    }
  }, [selectedCar])

  /* ── Smart profit analysis ── */
  const purchaseCost   = selectedCar ? (parseFloat(String(selectedCar.purchase_price)) || 0) : 0
  const netRevenue     = Math.max(sp - dc, 0)
  const profit         = purchaseCost > 0 ? netRevenue - purchaseCost : 0
  const profitPct      = purchaseCost > 0 ? (profit / purchaseCost) * 100 : 0
  const isBelowCost    = purchaseCost > 0 && netRevenue < purchaseCost
  const suggestedPrice = purchaseCost > 0 ? Math.ceil(purchaseCost * 1.10) : 0

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      toast.success(`تم إنشاء فاتورة البيع ${res.invoice_number}`)
      router.push(`/sales/${res.id}`)
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { error?: string } } }
      toast.error(axErr?.response?.data?.error ?? 'حدث خطأ أثناء إنشاء الفاتورة')
    },
  })

  /* ── Validate ── */
  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!carId)                  e.carId         = 'اختر السيارة'
    if (!buyerId)                e.buyerId       = 'اختر المشتري'
    if (!sellingPrice || sp <= 0) e.sellingPrice = 'أدخل سعر البيع'
    if (!paymentMethod)          e.paymentMethod = 'اختر طريقة الدفع'
    if (!saleDate)               e.saleDate      = 'أدخل تاريخ البيع'
    if (enableInstallment && remaining > 0) {
      if (!startDate) e.startDate = 'أدخل تاريخ بدء الأقساط'
      if (!dueDay)    e.dueDay    = 'أدخل يوم الاستحقاق'
      const dd = parseInt(dueDay)
      if (dueDay && (dd < 1 || dd > 31)) e.dueDay = 'يوم الاستحقاق بين 1 و 31'
      if (numMonths && parseInt(numMonths) <= 0) e.numMonths = 'عدد الأشهر يجب أن يكون أكبر من صفر'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      car_id:         parseInt(carId),
      buyer_id:       parseInt(buyerId),
      selling_price:  sp,
      discount:       dc,
      paid_amount:    pa,
      currency,
      payment_method: paymentMethod,
      sale_date:      saleDate,
      enable_installment:      enableInstallment && remaining > 0,
      number_of_months:        numMonths  ? parseInt(numMonths)  : null,
      installment_start_date:  startDate  || null,
      installment_due_day:     dueDay     ? parseInt(dueDay)     : null,
      installment_notes:       installNotes || null,
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      <DetailHeader
        backHref="/sales"
        backLabel="المبيعات"
        title="فاتورة بيع جديدة"
        subtitle="بيع سيارة متاحة لعميل مشتري"
      />

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Section 1: Car ── */}
        <SectionCard title="السيارة">
          {carsLoading ? (
            <div className="h-10 bg-secondary/40 rounded-lg animate-pulse" />
          ) : cars.length === 0 ? (
            <div className="py-6 text-center">
              <AlertCircle className="h-6 w-6 mx-auto text-amber-400/60 mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد سيارات متاحة للبيع</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">اختر السيارة المتاحة</Label>
                <Select value={carId} onValueChange={setCarId}>
                  <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.carId && 'border-rose-500/50')}>
                    <SelectValue placeholder="اختر السيارة..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {cars.map(car => (
                      <SelectItem key={car.id} value={String(car.id)}>
                        <span className="font-medium">
                          {car.brand} {car.model} {car.manufacturing_year}
                        </span>
                        <span className="text-muted-foreground text-xs ms-2">— {car.vin}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.carId} />
              </div>
              {selectedCar && (
                <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">اللون</span>
                  <span className="text-foreground">{selectedCar.color}</span>
                  <span className="text-muted-foreground">رقم اللوحة</span>
                  <span className="text-foreground">{selectedCar.plate_number}</span>
                  <span className="text-muted-foreground">سعر الشراء</span>
                  <span className="text-foreground money">{formatMoney(selectedCar.purchase_price, selectedCar.currency)}</span>
                  {selectedCar.selling_price && (
                    <>
                      <span className="text-muted-foreground">سعر البيع المقترح</span>
                      <span className="text-amber-400 money">{formatMoney(selectedCar.selling_price, selectedCar.currency)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Section 2: Buyer ── */}
        <SectionCard title="المشتري">
          {buyersLoading ? (
            <div className="h-10 bg-secondary/40 rounded-lg animate-pulse" />
          ) : buyers.length === 0 ? (
            <div className="py-6 text-center">
              <AlertCircle className="h-6 w-6 mx-auto text-cyan-400/60 mb-2" />
              <p className="text-sm text-muted-foreground">لا يوجد عملاء من نوع مشتري</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">اختر المشتري</Label>
                <Select value={buyerId} onValueChange={setBuyerId}>
                  <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.buyerId && 'border-rose-500/50')}>
                    <SelectValue placeholder="اختر العميل المشتري..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {buyers.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        <span className="font-medium">{b.full_name || b.name}</span>
                        <span className="text-muted-foreground text-xs ms-2">— {b.phone}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.buyerId} />
              </div>
              {selectedBuyer && (
                <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">رقم الهاتف</span>
                  <span className="text-foreground">{selectedBuyer.phone}</span>
                  <span className="text-muted-foreground">رقم الهوية</span>
                  <span className="text-foreground">{selectedBuyer.id_number}</span>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Section 3: Pricing ── */}
        <SectionCard title="تفاصيل السعر والدفع">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">العملة</Label>
              <Select value={currency} onValueChange={v => setCurrency(v as 'USD' | 'IQD')}>
                <SelectTrigger className="bg-secondary/30 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">سعر البيع *</Label>
              <Input
                type="number" min="0" step="any" placeholder="0"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                className={cn('bg-secondary/30 border-border/60 money', errors.sellingPrice && 'border-rose-500/50')}
              />
              <FieldError msg={errors.sellingPrice} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">الخصم</Label>
              <Input
                type="number" min="0" step="any" placeholder="0"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="bg-secondary/30 border-border/60 money"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">المبلغ المدفوع</Label>
              <Input
                type="number" min="0" step="any" placeholder="0"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                className="bg-secondary/30 border-border/60 money"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">طريقة الدفع *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.paymentMethod && 'border-rose-500/50')}>
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.paymentMethod} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">تاريخ البيع *</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                className={cn('bg-secondary/30 border-border/60', errors.saleDate && 'border-rose-500/50')}
              />
              <FieldError msg={errors.saleDate} />
            </div>
          </div>

          {sp > 0 && (
            <div className="mt-4 space-y-3">
              {/* Inline financial summary */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2.5">
                <span className="flex items-baseline gap-1.5 text-[11px]">
                  <span className="text-muted-foreground/60">سعر البيع</span>
                  <span className="font-semibold tabular-nums money text-amber-400">{formatMoney(sp, currency)}</span>
                </span>
                <span className="pointer-events-none select-none text-border" aria-hidden>·</span>
                <span className="flex items-baseline gap-1.5 text-[11px]">
                  <span className="text-muted-foreground/60">مدفوع</span>
                  <span className="font-semibold tabular-nums money text-emerald-400">{formatMoney(pa, currency)}</span>
                </span>
                <span className="pointer-events-none select-none text-border" aria-hidden>·</span>
                <span className="flex items-baseline gap-1.5 text-[11px]">
                  <span className="text-muted-foreground/60">متبقي</span>
                  <span className={cn('font-semibold tabular-nums money', remaining > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                    {formatMoney(remaining, currency)}
                  </span>
                </span>
              </div>

              {/* Profit indicator */}
              {purchaseCost > 0 && (
                <div className={cn(
                  'rounded-lg border p-4',
                  isBelowCost
                    ? 'border-rose-500/30 bg-rose-500/[0.07]'
                    : profitPct < 5
                    ? 'border-amber-500/30 bg-amber-500/[0.07]'
                    : 'border-emerald-500/25 bg-emerald-500/[0.06]',
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isBelowCost
                        ? <TrendingDown className="h-4 w-4 text-rose-400 shrink-0" />
                        : <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />}
                      <div>
                        <p className={cn('text-xs font-bold', isBelowCost ? 'text-rose-300' : profitPct < 5 ? 'text-amber-300' : 'text-emerald-300')}>
                          {isBelowCost
                            ? `تحذير: أنت تبيع بأقل من سعر الشراء بـ ${formatMoney(Math.abs(profit), currency)}`
                            : `هامش الربح: ${profitPct.toFixed(1)}% — ربح ${formatMoney(profit, currency)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          سعر الشراء: {formatMoney(purchaseCost, selectedCar?.currency ?? currency)}
                          {suggestedPrice > 0 && !isBelowCost && profitPct < 5 && (
                            <> · السعر المقترح (10%+): <span className="text-amber-300 font-semibold">{formatMoney(suggestedPrice, selectedCar?.currency ?? currency)}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    {isBelowCost && suggestedPrice > 0 && (
                      <button
                        type="button"
                        onClick={() => setSellingPrice(String(suggestedPrice))}
                        className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      >
                        تطبيق السعر المقترح
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Installments (functional accordion — animation kept) ── */}
        {remaining > 0 && (
          <div className="dash-card overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => setEnableInstallment(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-border/40 hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                  enableInstallment ? 'bg-cyan-500/20 text-cyan-400' : 'bg-secondary/60 text-muted-foreground'
                )}>
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-semibold text-foreground">نظام الأقساط (اختياري)</p>
              </div>
              <div className={cn(
                'h-5 w-9 rounded-full transition-colors relative',
                enableInstallment ? 'bg-cyan-500' : 'bg-secondary/80'
              )}>
                <div className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                  enableInstallment ? 'start-5' : 'start-0.5'
                )} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {enableInstallment && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">المبلغ المتبقي للأقساط</Label>
                      <div className="h-9 px-3 flex items-center rounded-lg bg-secondary/40 border border-border/40 text-sm money text-rose-400 font-semibold">
                        {formatMoney(remaining, currency)}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">عدد الأشهر</Label>
                      <Input
                        type="number" min="1" placeholder="12"
                        value={numMonths}
                        onChange={e => setNumMonths(e.target.value)}
                        className={cn('bg-secondary/30 border-border/60', errors.numMonths && 'border-rose-500/50')}
                      />
                      <FieldError msg={errors.numMonths} />
                      {numMonths && parseInt(numMonths) > 0 && remaining > 0 && (
                        <p className="text-[11px] text-cyan-400/80 mt-1">
                          القسط الشهري: {formatMoney(remaining / parseInt(numMonths), currency)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">تاريخ بداية الأقساط *</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className={cn('bg-secondary/30 border-border/60', errors.startDate && 'border-rose-500/50')}
                      />
                      <FieldError msg={errors.startDate} />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">يوم الاستحقاق (1–31) *</Label>
                      <Input
                        type="number" min="1" max="31" placeholder="15"
                        value={dueDay}
                        onChange={e => setDueDay(e.target.value)}
                        className={cn('bg-secondary/30 border-border/60', errors.dueDay && 'border-rose-500/50')}
                      />
                      <FieldError msg={errors.dueDay} />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">ملاحظات الأقساط</Label>
                      <Input
                        placeholder="ملاحظات اختيارية..."
                        value={installNotes}
                        onChange={e => setInstallNotes(e.target.value)}
                        className="bg-secondary/30 border-border/60"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || carsLoading || buyersLoading}
            className="gap-2 bg-amber-600 hover:bg-amber-500 text-white min-w-[140px]"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" />حفظ الفاتورة</>
            )}
          </Button>
        </div>

      </form>
    </div>
  )
}
