'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Loader2, ScanLine, Layers, FileText, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatMoney } from '@/lib/utils'
import { createPurchase, getSellers } from '@/lib/api/purchases'
import { bulkCreatePurchase } from '@/lib/api/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandModelSelect, type TrimSpec } from '@/components/forms/BrandModelSelect'
import { useVinDecoder } from '@/lib/useVinDecoder'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { QuickSupplierDialog } from '@/components/purchases/QuickSupplierDialog'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'نقداً' },
  { value: 'Bank', label: 'حوالة مصرفية' },
  { value: 'Cheque', label: 'شيك / آجل' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

// ── Bulk Purchase Mode ────────────────────────────────────────────────────────

function BulkPurchaseForm({ sellers, sellersLoading }: { sellers: any[]; sellersLoading: boolean }) {
  const router = useRouter()
  const [sellerId, setSellerId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [vinInput, setVinInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const vinList = vinInput.split('\n').map(v => v.trim()).filter(Boolean)
  const uniqueVins = [...new Set(vinList)]
  const hasDuplicates = vinList.length !== uniqueVins.length

  const bulkMut = useMutation({
    mutationFn: bulkCreatePurchase,
    onSuccess: (res) => {
      if (res.errors?.length > 0) {
        toast.warning(`تم تسجيل ${res.created_count} سيارة. أخطاء: ${res.errors.join('، ')}`)
      } else {
        toast.success(res.message)
      }
      router.push('/purchases')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'حدث خطأ أثناء الشراء الجماعي'),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!sellerId) e.sellerId = 'اختر المورد'
    if (!model.trim()) e.model = 'الموديل مطلوب'
    if (!year || isNaN(Number(year))) e.year = 'السنة مطلوبة'
    if (!purchasePrice || Number(purchasePrice) <= 0) e.purchasePrice = 'سعر الشراء مطلوب'
    if (uniqueVins.length === 0) e.vins = 'أدخل رقم شاصي واحد على الأقل'
    if (uniqueVins.length > 50) e.vins = 'الحد الأقصى 50 سيارة في عملية واحدة'
    if (hasDuplicates) e.vins = 'يوجد أرقام شاصي مكررة'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    bulkMut.mutate({
      supplierId: sellerId,
      brand: brand.trim() || undefined,
      model: model.trim(),
      year: Number(year),
      color: color.trim() || undefined,
      purchaseCost: Number(purchasePrice),
      targetSellingPrice: Number(targetPrice) || Number(purchasePrice),
      paymentMethod: paymentMethod as any,
      chassisNumbers: uniqueVins,
    })
  }

  return (
    <div className="space-y-5">
      {/* Supplier */}
      <SectionCard title="المورد">
        <div className="mb-3 flex justify-end">
          <QuickSupplierDialog onSuccess={(id) => { setSellerId(id); setErrors(e => ({ ...e, sellerId: '' })) }} />
        </div>
        {sellersLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-secondary/40" />
        ) : (
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">اختر المورد *</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.sellerId && 'border-rose-500/60')}>
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {sellers.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.full_name || s.name} — {s.phone || '-'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={errors.sellerId} />
          </div>
        )}
      </SectionCard>

      {/* Car shared details */}
      <SectionCard title="بيانات السيارة (مشتركة لجميع السيارات)" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BrandModelSelect
          brand={brand}
          model={model}
          trim=""
          onBrandChange={(b) => { setBrand(b); setModel('') }}
          onModelChange={(m) => setModel(m)}
          onTrimSelect={() => {}}
          brandError={errors.brand}
          modelError={errors.model}
        />
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سنة الصنع *</Label>
          <Input type="number" value={year} onChange={e => setYear(e.target.value)} className={cn('font-numeric bg-secondary/30 border-border/60', errors.year && 'border-rose-500/60')} />
          <FieldError msg={errors.year} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">اللون</Label>
          <Input value={color} onChange={e => setColor(e.target.value)} placeholder="أبيض، أسود..." className="bg-secondary/30 border-border/60" />
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard title="السعر والدفع" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سعر الشراء لكل سيارة (IQD) *</Label>
          <Input type="number" min="0" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className={cn('font-numeric bg-secondary/30 border-border/60', errors.purchasePrice && 'border-rose-500/60')} />
          <FieldError msg={errors.purchasePrice} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سعر البيع المستهدف (IQD)</Label>
          <Input type="number" min="0" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="اختياري" className="font-numeric bg-secondary/30 border-border/60" />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع *</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Chassis numbers */}
      <SectionCard title="أرقام الشاصي">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">أدخل رقم شاصي واحد في كل سطر (حتى 50 سيارة)</p>
          <span className={cn('text-xs font-semibold', uniqueVins.length > 50 ? 'text-rose-400' : 'text-emerald-400')}>
            {uniqueVins.length} سيارة
          </span>
        </div>
        <textarea
          value={vinInput}
          onChange={e => { setVinInput(e.target.value); setErrors(err => ({ ...err, vins: '' })) }}
          placeholder={'WBAWL31040PY38989\nWBAWL31040PY38990\nWBAWL31040PY38991'}
          rows={8}
          dir="ltr"
          className={cn(
            'w-full rounded-md border bg-secondary/30 px-3 py-2 font-mono text-sm text-left resize-none focus:outline-none focus:ring-1 focus:ring-ring',
            errors.vins ? 'border-rose-500/60' : 'border-border/60',
          )}
        />
        {hasDuplicates && (
          <p className="mt-1 text-[11px] text-amber-400">تحذير: يوجد أرقام مكررة — سيتم إزالة التكرار تلقائياً ({vinList.length - uniqueVins.length} مكرر)</p>
        )}
        <FieldError msg={errors.vins} />

        {/* Preview */}
        {uniqueVins.length > 0 && Number(purchasePrice) > 0 && (
          <div className="mt-3 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">إجمالي التكلفة: </span>
            <span className="font-semibold text-amber-400">{formatMoney(uniqueVins.length * Number(purchasePrice), 'IQD')}</span>
            <span className="mx-2 text-border">·</span>
            <span className="text-muted-foreground">{uniqueVins.length} سيارة × {formatMoney(Number(purchasePrice), 'IQD')}</span>
          </div>
        )}
      </SectionCard>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={bulkMut.isPending}>إلغاء</Button>
        <Button
          onClick={handleSubmit}
          disabled={bulkMut.isPending || uniqueVins.length === 0}
          className="min-w-[180px] gap-2 bg-amber-600 text-white hover:bg-amber-500"
        >
          {bulkMut.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />جاري التسجيل...</>
          ) : (
            <><Layers className="h-4 w-4" />تسجيل {uniqueVins.length > 0 ? uniqueVins.length : ''} سيارة</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Single Purchase Mode (original) ──────────────────────────────────────────

function SinglePurchaseForm({ sellers, sellersLoading }: { sellers: any[]; sellersLoading: boolean }) {
  const router = useRouter()
  const [sellerId, setSellerId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [trim, setTrim] = useState('')
  const [transmission, setTransmission] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [engineSize, setEngineSize] = useState('')
  const [cylinders, setCylinders] = useState('')
  const [seatCount, setSeatCount] = useState('')
  const [importCountry, setImportCountry] = useState('')

  const handleTrimSelect = (t: string, specs: TrimSpec) => {
    setTrim(t)
    if (specs.transmission) setTransmission(specs.transmission)
    if (specs.fuel_type) setFuelType(specs.fuel_type)
    if (specs.engine_size) setEngineSize(specs.engine_size)
    if (specs.cylinders !== undefined) setCylinders(specs.cylinders === 0 ? '' : String(specs.cylinders))
    if (specs.seat_count) setSeatCount(String(specs.seat_count))
    if (specs.import_country) setImportCountry(specs.import_country)
  }

  const { decode: decodeVin, loading: vinLoading } = useVinDecoder()

  async function handleVinDecode() {
    const result = await decodeVin(vin)
    if (!result) { toast.error('لم يتم العثور على بيانات لهذا الشاصي'); return }
    if (result.brand) { setBrand(result.brand); setModel(''); setTrim('') }
    if (result.model) setModel(result.model)
    if (result.year) setYear(result.year)
    const parts = [result.brand, result.model, result.year].filter(Boolean)
    toast.success(`✓ ${parts.join(' ')} — تم تعبئة البيانات تلقائياً`)
  }

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

  const selectedSeller = sellers.find((s) => String(s.id) === sellerId)

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: (res) => {
      toast.success(`تم إنشاء فاتورة الشراء ${res.invoice_number}`)
      router.push(`/purchases/${res.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'حدث خطأ أثناء إنشاء الفاتورة'),
  })

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!sellerId) nextErrors.sellerId = 'اختر البائع'
    if (!brand.trim()) nextErrors.brand = 'الماركة مطلوبة'
    if (!model.trim()) nextErrors.model = 'الموديل مطلوب'
    if (!year || Number.isNaN(Number.parseInt(year, 10))) nextErrors.year = 'سنة الصنع مطلوبة'
    if (!color.trim()) nextErrors.color = 'اللون مطلوب'
    if (!vin.trim()) nextErrors.vin = 'رقم الشاصي مطلوب'
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
      seller_id: sellerId,
      purchase_price: price,
      paid_amount: paid,
      currency,
      payment_method: paymentMethod,
      purchase_date: purchaseDate,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SectionCard title="البائع">
        <div className="mb-3 flex justify-end">
          <QuickSupplierDialog onSuccess={(id) => { setSellerId(id); setErrors((e) => ({ ...e, sellerId: '' })) }} />
        </div>
        {sellersLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-secondary/40" />
        ) : sellers.length === 0 ? (
          <div className="py-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-cyan-400/60" />
            <p className="text-sm text-muted-foreground">لا يوجد موردون مسجّلون بعد — أضِف موردًا للبدء.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">اختر البائع *</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.sellerId && 'border-rose-500/60')}>
                  <SelectValue placeholder="اختر البائع" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={String(seller.id)}>
                      {(seller.full_name || seller.name)} — {seller.phone || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.sellerId} />
            </div>
            {selectedSeller && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs">
                <span className="text-muted-foreground">رقم الهاتف</span>
                <span className="text-foreground">{selectedSeller.phone || '-'}</span>
                <span className="text-muted-foreground">رقم الهوية</span>
                <span className="text-foreground">{selectedSeller.id_number || '-'}</span>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="السيارة" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BrandModelSelect
          brand={brand} model={model} trim={trim}
          onBrandChange={(b) => { setBrand(b); setModel(''); setTrim('') }}
          onModelChange={(m) => { setModel(m); setTrim('') }}
          onTrimSelect={handleTrimSelect}
          brandError={errors.brand} modelError={errors.model}
        />
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سنة الصنع *</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={cn('font-numeric bg-secondary/30 border-border/60', errors.year && 'border-rose-500/60')} />
          <FieldError msg={errors.year} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">اللون *</Label>
          <Input value={color} onChange={(e) => setColor(e.target.value)} className={cn('bg-secondary/30 border-border/60', errors.color && 'border-rose-500/60')} />
          <FieldError msg={errors.color} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الشاصي *</Label>
          <div className="flex gap-2">
            <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN — 17 حرف" className={cn('font-numeric bg-secondary/30 border-border/60', errors.vin && 'border-rose-500/60')} />
            <button
              type="button" onClick={handleVinDecode}
              disabled={vinLoading || vin.trim().length !== 17}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary/30 text-muted-foreground transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {vinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            </button>
          </div>
          <FieldError msg={errors.vin} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">رقم اللوحة</Label>
          <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className="font-numeric bg-secondary/30 border-border/60" />
          <FieldError msg={errors.plateNumber} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs text-muted-foreground">المسافة المقطوعة (كم)</Label>
          <Input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} className="font-numeric bg-secondary/30 border-border/60" />
        </div>
      </SectionCard>

      <SectionCard title="السعر والدفع" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">العملة</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
            <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">دولار (USD)</SelectItem>
              <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع *</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.paymentMethod && 'border-rose-500/60')}>
              <SelectValue placeholder="اختر الطريقة" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError msg={errors.paymentMethod} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سعر الشراء *</Label>
          <Input type="number" min="0" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={cn('font-numeric bg-secondary/30 border-border/60', errors.purchasePrice && 'border-rose-500/60')} />
          <FieldError msg={errors.purchasePrice} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">المبلغ المدفوع</Label>
          <Input type="number" min="0" step="any" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="font-numeric bg-secondary/30 border-border/60" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ الشراء *</Label>
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={cn('bg-secondary/30 border-border/60', errors.purchaseDate && 'border-rose-500/60')} />
          <FieldError msg={errors.purchaseDate} />
        </div>
        {price > 0 && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2.5">
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">السعر</span>
              <span className="font-semibold tabular-nums font-numeric text-foreground money">{formatMoney(price, currency)}</span>
            </span>
            <span className="pointer-events-none select-none text-border">·</span>
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">مدفوع</span>
              <span className="font-semibold tabular-nums font-numeric text-emerald-400 money">{formatMoney(paid, currency)}</span>
            </span>
            <span className="pointer-events-none select-none text-border">·</span>
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">متبقي</span>
              <span className={cn('font-semibold tabular-nums font-numeric money', remaining > 0 ? 'text-rose-400' : 'text-emerald-400')}>{formatMoney(remaining, currency)}</span>
            </span>
          </div>
        )}
      </SectionCard>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>إلغاء</Button>
        <Button type="submit" disabled={mutation.isPending || sellersLoading} className="min-w-[150px] gap-2 bg-blue-600 text-white hover:bg-blue-500">
          {mutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" />حفظ الفاتورة</>
          )}
        </Button>
      </div>
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewPurchasePage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ['purchase-sellers'],
    queryFn: getSellers,
    staleTime: 60_000,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <DetailHeader
        backHref="/purchases"
        backLabel="المشتريات"
        title="فاتورة شراء جديدة"
        subtitle="شراء سيارة من مورد وإضافتها للمخزون"
      />

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border bg-card p-1 gap-1">
        <button
          onClick={() => setMode('single')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
            mode === 'single'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText className="h-4 w-4" />
          سيارة واحدة
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
            mode === 'bulk'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Layers className="h-4 w-4" />
          شراء جماعي (نفس الموديل)
        </button>
      </div>

      {mode === 'single'
        ? <SinglePurchaseForm sellers={sellers} sellersLoading={sellersLoading} />
        : <BulkPurchaseForm sellers={sellers} sellersLoading={sellersLoading} />
      }
    </div>
  )
}
