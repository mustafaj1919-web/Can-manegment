'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Car, CheckCircle2, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn, photoUrl } from '@/lib/utils'
import { createCar, deleteCarPhoto, updateCar, uploadCarPhotos } from '@/lib/api/inventory'
import type { Car as CarType, CarPhoto, CarPayload } from '@/lib/api/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CarFormProps {
  car?: CarType
}

const NONE = '__none__'

const CONDITIONS = [
  { value: 'New', label: 'جديدة' },
  { value: 'Used', label: 'مستعملة' },
  { value: 'Damaged', label: 'متضررة' },
  { value: 'Salvage', label: 'سكراب' },
]

const PLATE_STATUSES = [
  { value: 'No Plate', label: 'بدون لوحة' },
  { value: 'Temporary', label: 'مؤقتة' },
  { value: 'Registered', label: 'مسجلة' },
]

const TRANSMISSIONS = [
  { value: 'Automatic', label: 'أوتوماتيك' },
  { value: 'Manual', label: 'يدوي' },
  { value: 'CVT', label: 'CVT' },
  { value: 'DCT', label: 'DCT' },
]

const FUEL_TYPES = [
  { value: 'Gasoline', label: 'بنزين' },
  { value: 'Diesel', label: 'ديزل' },
  { value: 'Hybrid', label: 'هايبرد' },
  { value: 'Electric', label: 'كهربائي' },
]

const SEAT_MATERIALS = [
  { value: 'Fabric', label: 'قماش' },
  { value: 'Leather', label: 'جلد' },
  { value: 'Synthetic Leather', label: 'جلد صناعي' },
  { value: 'Suede', label: 'سويد' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-lg overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  )
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

  const [brand, setBrand] = useState(car?.brand || '')
  const [model, setModel] = useState(car?.model || '')
  const [year, setYear] = useState(String(car?.manufacturing_year || new Date().getFullYear()))
  const [color, setColor] = useState(car?.color || '')
  const [vin, setVin] = useState(car?.vin || '')
  const [plate, setPlate] = useState(car?.plate_number || '')
  const [mileage, setMileage] = useState(String(car?.mileage ?? '0'))
  const [purchasePrice, setPurchasePrice] = useState(String(car?.purchase_price ?? ''))
  const [currency, setCurrency] = useState<'USD' | 'IQD'>(car?.currency || 'USD')

  const [trim, setTrim] = useState(car?.trim || '')
  const [condition, setCondition] = useState(car?.condition || 'New')
  const [plateStatus, setPlateStatus] = useState(car?.plate_status || NONE)
  const [sellingPrice, setSellingPrice] = useState(car?.selling_price ? String(car.selling_price) : '')
  const [engineSize, setEngineSize] = useState(car?.engine_size || '')
  const [cylinders, setCylinders] = useState(car?.cylinders ? String(car.cylinders) : '')
  const [transmission, setTransmission] = useState(car?.transmission || NONE)
  const [fuelType, setFuelType] = useState(car?.fuel_type || NONE)
  const [importCountry, setImportCountry] = useState(car?.import_country || '')
  const [seatCount, setSeatCount] = useState(car?.seat_count ? String(car.seat_count) : '')
  const [seatMaterial, setSeatMaterial] = useState(car?.seat_material || NONE)
  const [notes, setNotes] = useState(car?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Photo upload state
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [localPhotos, setLocalPhotos] = useState<CarPhoto[]>(car?.photos ?? [])
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null)
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
    const parsedYear = Number.parseInt(year, 10)
    const parsedPurchase = Number.parseFloat(purchasePrice)

    if (!brand.trim()) nextErrors.brand = 'الماركة مطلوبة'
    if (!model.trim()) nextErrors.model = 'الموديل مطلوب'
    if (!year || Number.isNaN(parsedYear)) nextErrors.year = 'سنة الصنع مطلوبة'
    if (!color.trim()) nextErrors.color = 'اللون مطلوب'
    if (!vin.trim()) nextErrors.vin = 'رقم الشاصي مطلوب'
    if (!plate.trim()) nextErrors.plate = 'رقم اللوحة مطلوب'
    if (!purchasePrice || Number.isNaN(parsedPurchase) || parsedPurchase <= 0) nextErrors.purchasePrice = 'سعر الشراء مطلوب'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildPayload(): CarPayload {
    return {
      brand: brand.trim(),
      model: model.trim(),
      manufacturing_year: Number.parseInt(year, 10),
      color: color.trim(),
      vin: vin.trim(),
      plate_number: plate.trim(),
      mileage: Number.parseInt(mileage || '0', 10),
      purchase_price: Number.parseFloat(purchasePrice),
      currency,
      trim: optional(trim),
      condition,
      plate_status: optionalSelect(plateStatus),
      selling_price: sellingPrice ? Number.parseFloat(sellingPrice) : undefined,
      engine_size: optional(engineSize),
      cylinders: cylinders ? Number.parseInt(cylinders, 10) : undefined,
      transmission: optionalSelect(transmission),
      fuel_type: optionalSelect(fuelType),
      import_country: optional(importCountry),
      seat_count: seatCount ? Number.parseInt(seatCount, 10) : undefined,
      seat_material: optionalSelect(seatMaterial),
      notes: optional(notes),
    }
  }

  const mutation = useMutation({
    mutationFn: () => (isEdit ? updateCar(car!.id, buildPayload()) : createCar(buildPayload())),
    onSuccess: async (savedCar) => {
      if (pendingPhotos.length > 0) {
        try {
          await uploadCarPhotos(savedCar.id, pendingPhotos)
        } catch {
          toast.warning('تمت إضافة السيارة لكن فشل رفع بعض الصور')
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
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
          <Car className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {isEdit ? 'تعديل بيانات السيارة' : 'إضافة سيارة جديدة'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEdit ? `${car?.brand} ${car?.model} ${car?.manufacturing_year}` : 'أدخل تفاصيل السيارة والأسعار'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="التعريف الأساسي">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">الماركة *</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota, Kia, BYD" className={cn('border-white/10 bg-white/5', errors.brand && 'border-rose-500/60')} />
            <FieldError msg={errors.brand} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">الموديل *</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry, Sportage" className={cn('border-white/10 bg-white/5', errors.model && 'border-rose-500/60')} />
            <FieldError msg={errors.model} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">سنة الصنع *</Label>
            <Input type="number" min="1990" max="2030" value={year} onChange={(e) => setYear(e.target.value)} className={cn('font-numeric border-white/10 bg-white/5', errors.year && 'border-rose-500/60')} />
            <FieldError msg={errors.year} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">الفئة</Label>
            <Input value={trim} onChange={(e) => setTrim(e.target.value)} placeholder="GLX, Sport, Premium" className="border-white/10 bg-white/5" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">اللون *</Label>
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="أبيض، أسود، رمادي" className={cn('border-white/10 bg-white/5', errors.color && 'border-rose-500/60')} />
            <FieldError msg={errors.color} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">الحالة</Label>
            <Select value={condition} onValueChange={(value) => setCondition(value as 'New' | 'Used' | 'Damaged' | 'Salvage')}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الشاصي *</Label>
            <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN" className={cn('font-numeric border-white/10 bg-white/5', errors.vin && 'border-rose-500/60')} />
            <FieldError msg={errors.vin} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">رقم اللوحة *</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="رقم اللوحة" className={cn('font-numeric border-white/10 bg-white/5', errors.plate && 'border-rose-500/60')} />
            <FieldError msg={errors.plate} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">حالة اللوحة</Label>
            <Select value={plateStatus} onValueChange={setPlateStatus}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {PLATE_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">بلد الاستيراد</Label>
            <Input value={importCountry} onChange={(e) => setImportCountry(e.target.value)} placeholder="الإمارات، كوريا، أمريكا" className="border-white/10 bg-white/5" />
          </div>
        </FormSection>

        <FormSection title="المواصفات الفنية">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">نوع الوقود</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {FUEL_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">ناقل الحركة</Label>
            <Select value={transmission} onValueChange={setTransmission}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue placeholder="اختر الناقل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {TRANSMISSIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">حجم المحرك</Label>
            <Input value={engineSize} onChange={(e) => setEngineSize(e.target.value)} placeholder="1600, 2000, V6" className="border-white/10 bg-white/5" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">عدد الأسطوانات</Label>
            <Input type="number" min="1" max="16" value={cylinders} onChange={(e) => setCylinders(e.target.value)} className="font-numeric border-white/10 bg-white/5" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">عدد المقاعد</Label>
            <Input type="number" min="1" max="20" value={seatCount} onChange={(e) => setSeatCount(e.target.value)} className="font-numeric border-white/10 bg-white/5" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">مادة المقاعد</Label>
            <Select value={seatMaterial} onValueChange={setSeatMaterial}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue placeholder="اختر المادة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {SEAT_MATERIALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">المسافة المقطوعة (كم)</Label>
            <Input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} className="font-numeric border-white/10 bg-white/5" />
          </div>
        </FormSection>

        <FormSection title="التسعير">
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
          <div />
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">سعر الشراء *</Label>
            <Input type="number" min="0" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" className={cn('font-numeric border-white/10 bg-white/5', errors.purchasePrice && 'border-rose-500/60')} />
            <FieldError msg={errors.purchasePrice} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">سعر البيع المقترح</Label>
            <Input type="number" min="0" step="any" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="اختياري" className="font-numeric border-white/10 bg-white/5" />
          </div>
        </FormSection>

        {/* ── Vehicle Photos ── */}
        <section className="glass rounded-lg overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">صور السيارة</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">JPG · PNG · WEBP — يتم الرفع بعد حفظ البيانات</p>
          </div>
          <div className="p-5">
            {/* Existing + pending thumbnails */}
            <div className="flex flex-wrap gap-3">
              {localPhotos.map((photo) => (
                <div key={photo.id} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
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
                <div key={`pending-${index}`} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-cyan-500/30 bg-cyan-500/5">
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

              {/* Add photos button */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-muted-foreground hover:border-violet-500/40 hover:text-violet-400 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px]">إضافة صورة</span>
              </button>
            </div>

            {pendingPhotos.length > 0 && (
              <p className="mt-3 text-xs text-cyan-400">
                <Upload className="me-1 inline h-3 w-3" />
                {pendingPhotos.length} صورة ستُرفع بعد حفظ البيانات
              </p>
            )}

            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) setPendingPhotos((prev) => [...prev, ...files])
                e.target.value = ''
              }}
            />
          </div>
        </section>

        <section className="glass rounded-lg overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">ملاحظات</h2>
          </div>
          <div className="p-5">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية اختيارية"
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="min-w-[150px] gap-2 bg-violet-600 text-white hover:bg-violet-500">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isEdit ? 'حفظ التعديلات' : 'إضافة السيارة'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
