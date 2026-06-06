'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, Car, CheckCircle2, DollarSign, Loader2, ShoppingBag, User } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatMoney } from '@/lib/utils'
import { createPurchase, getSellers } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'نقدا' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

function SectionCard({ title, icon: Icon, color, children }: {
  title: string
  icon: React.ElementType
  color: string
  children: React.ReactNode
}) {
  return (
    <section className="glass rounded-lg overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export default function NewPurchasePage() {
  const router = useRouter()
  const [sellerId, setSellerId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [vin, setVin] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [mileage, setMileage] = useState('0')
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const price = Number.parseFloat(purchasePrice) || 0
  const paid = Number.parseFloat(paidAmount) || 0
  const remaining = Math.max(price - paid, 0)

  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ['purchase-sellers'],
    queryFn: getSellers,
    staleTime: 60_000,
  })

  const selectedSeller = sellers.find((seller) => String(seller.id) === sellerId)

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: (res) => {
      toast.success(`تم إنشاء فاتورة الشراء ${res.invoice_number}`)
      router.push(`/purchases/${res.id}`)
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { error?: string } } }
      toast.error(apiError?.response?.data?.error ?? 'حدث خطأ أثناء إنشاء الفاتورة')
    },
  })

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!sellerId) nextErrors.sellerId = 'اختر البائع'
    if (!brand.trim()) nextErrors.brand = 'الماركة مطلوبة'
    if (!model.trim()) nextErrors.model = 'الموديل مطلوب'
    if (!year || Number.isNaN(Number.parseInt(year, 10))) nextErrors.year = 'سنة الصنع مطلوبة'
    if (!color.trim()) nextErrors.color = 'اللون مطلوب'
    if (!vin.trim()) nextErrors.vin = 'رقم الشاصي مطلوب'
    if (!plateNumber.trim()) nextErrors.plateNumber = 'رقم اللوحة مطلوب'
    if (!purchasePrice || price <= 0) nextErrors.purchasePrice = 'سعر الشراء مطلوب'
    if (!paymentMethod) nextErrors.paymentMethod = 'اختر طريقة الدفع'
    if (!purchaseDate) nextErrors.purchaseDate = 'تاريخ الشراء مطلوب'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      brand: brand.trim(),
      model: model.trim(),
      manufacturing_year: Number.parseInt(year, 10),
      color: color.trim(),
      vin: vin.trim(),
      plate_number: plateNumber.trim(),
      mileage: Number.parseInt(mileage || '0', 10),
      seller_id: Number.parseInt(sellerId, 10),
      purchase_price: price,
      paid_amount: paid,
      currency,
      payment_method: paymentMethod,
      purchase_date: purchaseDate,
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
          <ShoppingBag className="h-5 w-5 text-blue-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">فاتورة شراء جديدة</h1>
          <p className="text-xs text-muted-foreground">شراء سيارة من بائع وإضافتها للمخزون</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title="البائع" icon={User} color="bg-cyan-500/10 text-cyan-300">
          {sellersLoading ? (
            <div className="h-10 animate-pulse rounded-lg bg-white/5" />
          ) : sellers.length === 0 ? (
            <div className="py-6 text-center">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-cyan-400/60" />
              <p className="text-sm text-muted-foreground">لا يوجد عملاء من نوع بائع</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">اختر البائع *</Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger className={cn('border-white/10 bg-white/5', errors.sellerId && 'border-rose-500/60')}>
                    <SelectValue placeholder="اختر البائع" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={String(seller.id)}>
                        {(seller.full_name || seller.name)} - {seller.phone || '-'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.sellerId} />
              </div>
              {selectedSeller && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 text-xs">
                  <span className="text-muted-foreground">رقم الهاتف</span>
                  <span>{selectedSeller.phone || '-'}</span>
                  <span className="text-muted-foreground">رقم الهوية</span>
                  <span>{selectedSeller.id_number || '-'}</span>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="السيارة" icon={Car} color="bg-violet-500/10 text-violet-300">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">الماركة *</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className={cn('border-white/10 bg-white/5', errors.brand && 'border-rose-500/60')} />
              <FieldError msg={errors.brand} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">الموديل *</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} className={cn('border-white/10 bg-white/5', errors.model && 'border-rose-500/60')} />
              <FieldError msg={errors.model} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">سنة الصنع *</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={cn('font-numeric border-white/10 bg-white/5', errors.year && 'border-rose-500/60')} />
              <FieldError msg={errors.year} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">اللون *</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} className={cn('border-white/10 bg-white/5', errors.color && 'border-rose-500/60')} />
              <FieldError msg={errors.color} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الشاصي *</Label>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} className={cn('font-numeric border-white/10 bg-white/5', errors.vin && 'border-rose-500/60')} />
              <FieldError msg={errors.vin} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">رقم اللوحة *</Label>
              <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className={cn('font-numeric border-white/10 bg-white/5', errors.plateNumber && 'border-rose-500/60')} />
              <FieldError msg={errors.plateNumber} />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">المسافة المقطوعة (كم)</Label>
              <Input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} className="font-numeric border-white/10 bg-white/5" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="السعر والدفع" icon={DollarSign} color="bg-emerald-500/10 text-emerald-300">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">العملة</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'IQD')}>
                <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">دولار (USD)</SelectItem>
                  <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className={cn('border-white/10 bg-white/5', errors.paymentMethod && 'border-rose-500/60')}>
                  <SelectValue placeholder="اختر الطريقة" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError msg={errors.paymentMethod} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">سعر الشراء *</Label>
              <Input type="number" min="0" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={cn('font-numeric border-white/10 bg-white/5', errors.purchasePrice && 'border-rose-500/60')} />
              <FieldError msg={errors.purchasePrice} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">المبلغ المدفوع</Label>
              <Input type="number" min="0" step="any" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="font-numeric border-white/10 bg-white/5" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ الشراء *</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={cn('border-white/10 bg-white/5', errors.purchaseDate && 'border-rose-500/60')} />
              <FieldError msg={errors.purchaseDate} />
            </div>
          </div>
          {price > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">السعر</p>
                <p className="font-numeric text-sm font-bold">{formatMoney(price, currency)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">مدفوع</p>
                <p className="font-numeric text-sm font-bold text-emerald-300">{formatMoney(paid, currency)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">متبقي</p>
                <p className={cn('font-numeric text-sm font-bold', remaining > 0 ? 'text-rose-300' : 'text-emerald-300')}>{formatMoney(remaining, currency)}</p>
              </div>
            </div>
          )}
        </SectionCard>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending || sellersLoading} className="min-w-[150px] gap-2 bg-blue-600 text-white hover:bg-blue-500">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                حفظ الفاتورة
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
