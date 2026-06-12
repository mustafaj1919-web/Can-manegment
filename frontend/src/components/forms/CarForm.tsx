'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Plus, ScanLine, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn, photoUrl } from '@/lib/utils'
import { createCar, deleteCarPhoto, updateCar, uploadCarPhotos } from '@/lib/api/inventory'
import { extractApiError } from '@/lib/api/client'
import type { Car as CarType, CarPhoto, CarPayload } from '@/lib/api/inventory'
import { Button } from '@/components/ui/button'
import { ModernInput } from '@/components/ui/ModernInput'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandModelSelect, type TrimSpec } from '@/components/forms/BrandModelSelect'
import { useVinDecoder } from '@/lib/useVinDecoder'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'

interface CarFormProps {
  car?: CarType
}

const NONE = '__none__'

const CONDITIONS = [
  { value: 'New',     label: 'جديدة' },
  { value: 'Used',    label: 'مستعملة' },
  { value: 'Damaged', label: 'متضررة' },
  { value: 'Salvage', label: 'سكراب' },
]

const PLATE_STATUSES = [
  { value: 'No Plate',   label: 'بدون لوحة' },
  { value: 'Temporary',  label: 'مؤقتة' },
  { value: 'Registered', label: 'مسجلة' },
]

const TRANSMISSIONS = [
  { value: 'Automatic', label: 'أوتوماتيك' },
  { value: 'Manual',    label: 'يدوي' },
  { value: 'CVT',       label: 'CVT' },
  { value: 'DCT',       label: 'DCT' },
]

const FUEL_TYPES = [
  { value: 'Gasoline', label: 'بنزين' },
  { value: 'Diesel',   label: 'ديزل' },
  { value: 'Hybrid',   label: 'هايبرد' },
  { value: 'Electric', label: 'كهربائي' },
]

const SEAT_MATERIALS = [
  { value: 'Fabric',           label: 'قماش' },
  { value: 'Leather',          label: 'جلد' },
  { value: 'Synthetic Leather', label: 'جلد صناعي' },
  { value: 'Suede',            label: 'سويد' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

function optional(value: string) {
  return value.trim() || undefined
}

function optionalSelect(value: string) {
  return value === NONE ? undefined : value
}

export function CarForm({ car }: CarFormProps) {
  const router = useRouter()
  const isEdit = Boolean(car)

  const [brand,         setBrand]         = useState(car?.brand || '')
  const [model,         setModel]         = useState(car?.model || '')
  const [year,          setYear]          = useState(String(car?.manufacturing_year || new Date().getFullYear()))
  const [color,         setColor]         = useState(car?.color || '')
  const [vin,           setVin]           = useState(car?.vin || '')
  const [plate,         setPlate]         = useState(car?.plate_number || '')
  const [mileage,       setMileage]       = useState(String(car?.mileage ?? '0'))
  const [purchasePrice, setPurchasePrice] = useState(String(car?.purchase_price ?? ''))
  const [currency,      setCurrency]      = useState<'USD' | 'IQD'>(car?.currency || 'USD')

  const [trim,          setTrim]          = useState(car?.trim || '')
  const [condition,     setCondition]     = useState(car?.condition || 'New')
  const [plateStatus,   setPlateStatus]   = useState(car?.plate_status || NONE)
  const [sellingPrice,  setSellingPrice]  = useState(car?.selling_price ? String(car.selling_price) : '')
  const [engineSize,    setEngineSize]    = useState(car?.engine_size || '')
  const [cylinders,     setCylinders]     = useState(car?.cylinders ? String(car.cylinders) : '')
  const [transmission,  setTransmission]  = useState(car?.transmission || NONE)
  const [fuelType,      setFuelType]      = useState(car?.fuel_type || NONE)
  const [importCountry, setImportCountry] = useState(car?.import_country || '')
  const [seatCount,     setSeatCount]     = useState(car?.seat_count ? String(car.seat_count) : '')
  const [seatMaterial,  setSeatMaterial]  = useState(car?.seat_material || NONE)
  const [notes,         setNotes]         = useState(car?.notes || '')
  const [errors,        setErrors]        = useState<Record<string, string>>({})

  const handleTrimSelect = (t: string, specs: TrimSpec) => {
    setTrim(t)
    if (specs.transmission)  setTransmission(specs.transmission)
    if (specs.fuel_type)     setFuelType(specs.fuel_type)
    if (specs.engine_size)   setEngineSize(specs.engine_size)
    if (specs.cylinders !== undefined) setCylinders(specs.cylinders === 0 ? '' : String(specs.cylinders))
    if (specs.seat_count)    setSeatCount(String(specs.seat_count))
    if (specs.import_country) setImportCountry(specs.import_country)
  }

  const { decode: decodeVin, loading: vinLoading } = useVinDecoder()

  async function handleVinDecode() {
    const result = await decodeVin(vin)
    if (!result) { toast.error('لم يتم العثور على بيانات لهذا الشاصي'); return }
    if (result.brand)        setBrand(result.brand)
    if (result.model)        setModel(result.model)
    if (result.year)         setYear(result.year)
    if (result.cylinders)    setCylinders(result.cylinders)
    if (result.engineSize)   setEngineSize(result.engineSize)
    if (result.fuelType)     setFuelType(result.fuelType)
    if (result.importCountry) setImportCountry(result.importCountry)
    const parts = [result.brand, result.model, result.year].filter(Boolean)
    toast.success(`✓ ${parts.join(' ')} — تم تعبئة البيانات تلقائياً`)
  }

  const [pendingPhotos,    setPendingPhotos]    = useState<File[]>([])
  const [localPhotos,      setLocalPhotos]      = useState<CarPhoto[]>(car?.photos ?? [])
  const [deletingPhotoId,  setDeletingPhotoId]  = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  async function handleDeletePhoto(photoId: number) {
    if (!car?.id) return
    setDeletingPhotoId(photoId)
    try {
      await deleteCarPhoto(car.id, photoId)
      setLocalPhotos((prev) => prev.filter((p) => p.id !== photoId))
      toast.success('تم حذف الصورة')
    } catch {
      toast.error('فشل حذف الصورة')
    } finally {
      setDeletingPhotoId(null)
    }
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    const parsedYear     = Number.parseInt(year, 10)
    const parsedPurchase = Number.parseFloat(purchasePrice)

    if (!brand.trim())                                      nextErrors.brand         = 'الماركة مطلوبة'
    if (!model.trim())                                      nextErrors.model         = 'الموديل مطلوب'
    if (!year || Number.isNaN(parsedYear))                  nextErrors.year          = 'سنة الصنع مطلوبة'
    if (!color.trim())                                      nextErrors.color         = 'اللون مطلوب'
    if (!vin.trim())                                        nextErrors.vin           = 'رقم الشاصي مطلوب'
    if (!plate.trim())                                      nextErrors.plate         = 'رقم اللوحة مطلوب'
    if (!purchasePrice || Number.isNaN(parsedPurchase) || parsedPurchase <= 0)
                                                            nextErrors.purchasePrice = 'سعر الشراء مطلوب'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildPayload(): CarPayload {
    return {
      brand:              brand.trim(),
      model:              model.trim(),
      manufacturing_year: Number.parseInt(year, 10),
      color:              color.trim(),
      vin:                vin.trim(),
      plate_number:       plate.trim(),
      mileage:            Number.parseInt(mileage || '0', 10),
      purchase_price:     Number.parseFloat(purchasePrice),
      currency,
      trim:               optional(trim),
      condition,
      plate_status:       optionalSelect(plateStatus),
      selling_price:      sellingPrice ? Number.parseFloat(sellingPrice) : undefined,
      engine_size:        optional(engineSize),
      cylinders:          cylinders ? Number.parseInt(cylinders, 10) : undefined,
      transmission:       optionalSelect(transmission),
      fuel_type:          optionalSelect(fuelType),
      import_country:     optional(importCountry),
      seat_count:         seatCount ? Number.parseInt(seatCount, 10) : undefined,
      seat_material:      optionalSelect(seatMaterial),
      notes:              optional(notes),
    }
  }

  const mutation = useMutation({
    mutationFn: () => (isEdit ? updateCar(car!.id, buildPayload()) : createCar(buildPayload())),
    onSuccess: async (savedCar) => {
      if (pendingPhotos.length > 0) {
        try {
          await uploadCarPhotos(savedCar.id, pendingPhotos)
        } catch (error) {
          toast.error(`فشل رفع صور السيارة: ${extractApiError(error)}`)
          return
        }
      }
      toast.success(isEdit ? 'تم تحديث بيانات السيارة' : 'تمت إضافة السيارة بنجاح')
      router.push(`/inventory/${savedCar.id}`)
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { error?: string } } }
      toast.error(apiError?.response?.data?.error ?? 'حدث خطأ أثناء حفظ البيانات')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl">

      <div className="mb-5">
        <DetailHeader
          backHref={isEdit ? `/inventory/${car!.id}` : '/inventory'}
          backLabel={isEdit ? 'تفاصيل السيارة' : 'المخزون'}
          title={isEdit ? 'تعديل بيانات السيارة' : 'إضافة سيارة جديدة'}
          subtitle={isEdit ? `${car?.brand} ${car?.model} ${car?.manufacturing_year}` : 'أدخل تفاصيل السيارة والأسعار'}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 pb-4">

          {/* ── Section 1: Basic ID ── */}
          <SectionCard title="التعريف الأساسي" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BrandModelSelect
              brand={brand}
              model={model}
              trim={trim}
              onBrandChange={setBrand}
              onModelChange={setModel}
              onTrimSelect={handleTrimSelect}
              brandError={errors.brand}
              modelError={errors.model}
            />
            <ModernInput
              type="number"
              min="1990"
              max="2030"
              label="سنة الصنع *"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              error={errors.year}
              className="font-numeric"
            />
            <ModernInput
              label="اللون *"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="أبيض، أسود، رمادي"
              error={errors.color}
            />
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">الحالة</Label>
              <Select value={condition} onValueChange={(value) => setCondition(value as 'New' | 'Used' | 'Damaged' | 'Salvage')}>
                <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ModernInput
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="VIN — 17 حرف"
              label="رقم الشاصي *"
              error={errors.vin}
              className="font-numeric"
              rightIcon={
                <button
                  type="button"
                  onClick={handleVinDecode}
                  disabled={vinLoading || vin.trim().length !== 17}
                  title="فك شفرة الشاصي"
                  className="flex h-7 w-7 items-center justify-center rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {vinLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                </button>
              }
            />
            <ModernInput
              label="رقم اللوحة *"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="رقم اللوحة"
              error={errors.plate}
              className="font-numeric"
            />
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">حالة اللوحة</Label>
              <Select value={plateStatus} onValueChange={setPlateStatus}>
                <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بدون تحديد</SelectItem>
                  {PLATE_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ModernInput
              label="بلد الاستيراد"
              value={importCountry}
              onChange={(e) => setImportCountry(e.target.value)}
              placeholder="الإمارات، كوريا، أمريكا"
            />
          </SectionCard>

          {/* ── Section 2: Technical Specs ── */}
          <SectionCard title="المواصفات الفنية" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">نوع الوقود</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بدون تحديد</SelectItem>
                  {FUEL_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">ناقل الحركة</Label>
              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue placeholder="اختر الناقل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بدون تحديد</SelectItem>
                  {TRANSMISSIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ModernInput
              label="حجم المحرك"
              value={engineSize}
              onChange={(e) => setEngineSize(e.target.value)}
              placeholder="1600, 2000, V6"
            />
            <ModernInput
              type="number"
              min="1"
              max="16"
              label="عدد الأسطوانات"
              value={cylinders}
              onChange={(e) => setCylinders(e.target.value)}
              className="font-numeric"
            />
            <ModernInput
              type="number"
              min="1"
              max="20"
              label="عدد المقاعد"
              value={seatCount}
              onChange={(e) => setSeatCount(e.target.value)}
              className="font-numeric"
            />
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">مادة المقاعد</Label>
              <Select value={seatMaterial} onValueChange={setSeatMaterial}>
                <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بدون تحديد</SelectItem>
                  {SEAT_MATERIALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <ModernInput
                type="number"
                min="0"
                label="المسافة المقطوعة (كم)"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="font-numeric"
              />
            </div>
          </SectionCard>

          {/* ── Section 3: Pricing ── */}
          <SectionCard title="التسعير" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">العملة</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'IQD')}>
                <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">دولار (USD)</SelectItem>
                  <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
            <ModernInput
              type="number"
              min="0"
              step="any"
              label="سعر الشراء *"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0"
              error={errors.purchasePrice}
              className="font-numeric"
            />
            <ModernInput
              type="number"
              min="0"
              step="any"
              label="سعر البيع المقترح"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="اختياري"
              className="font-numeric"
            />
          </SectionCard>

          {/* ── Section 4: Photos ── */}
          <SectionCard
            title="صور السيارة"
            description="JPG · PNG · WEBP — يتم الرفع بعد حفظ البيانات"
          >
            <div className="flex flex-wrap gap-3">
              {localPhotos.map((photo) => (
                <div key={photo.id} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border/40">
                  <img
                    src={photoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                    alt="صورة السيارة"
                    className="h-full w-full object-cover"
                  />
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-500 transition-colors"
                      aria-label="حذف الصورة"
                    >
                      {deletingPhotoId === photo.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              ))}

              {pendingPhotos.map((file, index) => (
                <div key={`pending-${index}`} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-primary/30 bg-primary/5">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover opacity-80"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingPhotos((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-500"
                    aria-label="إزالة الصورة"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <p className="truncate text-[9px] text-white">جديدة</p>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px]">إضافة صورة</span>
              </button>
            </div>

            {pendingPhotos.length > 0 && (
              <p className="mt-3 text-xs text-primary">
                <Upload className="me-1 inline h-3 w-3" />
                {pendingPhotos.length} صورة ستُرفع بعد حفظ البيانات
              </p>
            )}

            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              aria-label="رفع صور السيارة"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) setPendingPhotos((prev) => [...prev, ...files])
                e.target.value = ''
              }}
            />
          </SectionCard>

          {/* ── Section 5: Notes ── */}
          <SectionCard title="ملاحظات">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية اختيارية"
              rows={3}
              className="w-full resize-none rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </SectionCard>

        </div>

        {/* ── Sticky action bar ── */}
        <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mt-8 flex items-center justify-end gap-3 border-t border-white/5 bg-black/60 py-4 backdrop-blur-md shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => router.back()} 
            disabled={mutation.isPending}
            className="hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            إلغاء
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending} 
            className="min-w-[150px] gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(239,27,45,0.2)] hover:shadow-[0_0_25px_rgba(239,27,45,0.35)] transition-all duration-300"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" />{isEdit ? 'حفظ التعديلات' : 'إضافة السيارة'}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
