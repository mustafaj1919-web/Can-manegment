'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  CheckCircle2, 
  Loader2, 
  Plus, 
  ScanLine, 
  Trash2, 
  Upload, 
  Info, 
  Sparkles,
  Camera,
  FileText,
  AlertTriangle,
  BadgeAlert,
  HelpCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { photoUrl, cn } from '@/lib/utils'
import { createCar, deleteCarPhoto, updateCar, uploadCarPhotos } from '@/lib/api/inventory'
import { extractApiError } from '@/lib/api/client'
import type { Car as CarType, CarPhoto, CarPayload } from '@/lib/api/inventory'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandModelSelect, type TrimSpec } from '@/components/forms/BrandModelSelect'
import { useVinDecoder } from '@/lib/useVinDecoder'
import { useRole } from '@/hooks/useRole'

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

function optional(value: string) {
  return value.trim() || undefined
}

function optionalSelect(value: string) {
  return value === NONE ? undefined : value
}

// Custom Config Input Component for Premium Styling
interface ConfigInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  rightIcon?: React.ReactNode
}

function ConfigInput({ label, error, rightIcon, className, ...props }: ConfigInputProps) {
  return (
    <div className="space-y-1.5 text-right w-full">
      <label className="block text-xs font-semibold text-slate-500 font-family-cairo">{label}</label>
      <div className="relative">
        <input
          className={cn(
            "w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 transition-all font-family-cairo",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500",
            "placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50",
            error && "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 font-medium font-family-cairo">{error}</p>}
    </div>
  )
}

// Custom Config Select Component for Premium Styling
interface ConfigSelectProps {
  label: string
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  error?: string
}

function ConfigSelect({ label, value, onValueChange, children, error }: ConfigSelectProps) {
  return (
    <div className="space-y-1.5 text-right w-full">
      <label className="block text-xs font-semibold text-slate-500 font-family-cairo">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(
          "w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 font-family-cairo text-right justify-between flex flex-row-reverse",
          "focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all",
          error && "border-rose-500"
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-slate-200">
          {children}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-rose-600 font-medium font-family-cairo">{error}</p>}
    </div>
  )
}

export function CarForm({ car }: CarFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = Boolean(car)
  const { role } = useRole()
  const canShowFinancials = role === 'Owner' || role === 'Admin' || role === 'Accountant'

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

  const [pendingPhotos,    setPendingPhotos]    = useState<File[]>([])
  const [localPhotos,      setLocalPhotos]      = useState<CarPhoto[]>(car?.photos ?? [])
  const [deletingPhotoId,  setDeletingPhotoId]  = useState<string | number | null>(null)
  const [isDragOver,       setIsDragOver]       = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

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

  async function handleDeletePhoto(photoId: string | number) {
    if (!car?.id) return
    setDeletingPhotoId(photoId)
    try {
      await deleteCarPhoto(car.id, photoId)
      setLocalPhotos((prev) => prev.filter((p) => p.id !== photoId))
      toast.success('تم حذف الصورة بنجاح')
    } catch {
      toast.error('فشل حذف الصورة')
    } finally {
      setDeletingPhotoId(null)
    }
  }

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length > 0) {
      setPendingPhotos((prev) => [...prev, ...imageFiles])
      toast.success(`تمت إضافة ${imageFiles.length} صورة إلى قائمة المعالجة`)
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
    if (!isEdit && (!purchasePrice || Number.isNaN(parsedPurchase) || parsedPurchase <= 0))
                                                            nextErrors.purchasePrice = 'سعر الشراء مطلوب'
    setErrors(nextErrors)

    // Accessibility: Move focus to the first invalid field
    const firstErrorKey = Object.keys(nextErrors)[0]
    if (firstErrorKey) {
      const element = document.getElementsByName(firstErrorKey)[0]
      if (element) {
        element.focus()
      }
    }

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
      // إبطال الكاش فوراً لتحديث البيانات دون الحاجة لإعادة تحميل الصفحة (ريفريش)
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] })
      queryClient.invalidateQueries({ queryKey: ['car', String(savedCar.id)] })
      queryClient.invalidateQueries({ queryKey: ['car', Number(savedCar.id)] })
      queryClient.invalidateQueries({ queryKey: ['kpi-dashboard'] })
      
      toast.success(isEdit ? 'تم تحديث بيانات السيارة بنجاح' : 'تمت إضافة السيارة بنجاح')
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

  // Dirty state verification
  const isDirty =
    brand !== (car?.brand || '') ||
    model !== (car?.model || '') ||
    year !== String(car?.manufacturing_year || new Date().getFullYear()) ||
    color !== (car?.color || '') ||
    vin !== (car?.vin || '') ||
    plate !== (car?.plate_number || '') ||
    mileage !== String(car?.mileage ?? '0') ||
    purchasePrice !== String(car?.purchase_price ?? '') ||
    currency !== (car?.currency || 'USD') ||
    trim !== (car?.trim || '') ||
    condition !== (car?.condition || 'New') ||
    plateStatus !== (car?.plate_status || NONE) ||
    sellingPrice !== (car?.selling_price ? String(car.selling_price) : '') ||
    engineSize !== (car?.engine_size || '') ||
    cylinders !== (car?.cylinders ? String(car.cylinders) : '') ||
    transmission !== (car?.transmission || NONE) ||
    fuelType !== (car?.fuel_type || NONE) ||
    importCountry !== (car?.import_country || '') ||
    seatCount !== (car?.seat_count ? String(car.seat_count) : '') ||
    seatMaterial !== (car?.seat_material || NONE) ||
    notes !== (car?.notes || '') ||
    pendingPhotos.length > 0

  // Confirm and Discard changes
  const handleDiscard = () => {
    if (isDirty && !window.confirm('هل أنت متأكد من إلغاء كافة التعديلات والعودة للبيانات الأصلية؟')) return
    setBrand(car?.brand || '')
    setModel(car?.model || '')
    setYear(String(car?.manufacturing_year || new Date().getFullYear()))
    setColor(car?.color || '')
    setVin(car?.vin || '')
    setPlate(car?.plate_number || '')
    setMileage(String(car?.mileage ?? '0'))
    setPurchasePrice(String(car?.purchase_price ?? ''))
    setCurrency(car?.currency || 'USD')
    setTrim(car?.trim || '')
    setCondition(car?.condition || 'New')
    setPlateStatus(car?.plate_status || NONE)
    setSellingPrice(car?.selling_price ? String(car.selling_price) : '')
    setEngineSize(car?.engine_size || '')
    setCylinders(car?.cylinders ? String(car.cylinders) : '')
    setTransmission(car?.transmission || NONE)
    setFuelType(car?.fuel_type || NONE)
    setImportCountry(car?.import_country || '')
    setSeatCount(car?.seat_count ? String(car.seat_count) : '')
    setSeatMaterial(car?.seat_material || NONE)
    setNotes(car?.notes || '')
    setPendingPhotos([])
    setErrors({})
    toast.success('تم التراجع عن التعديلات')
  }

  // Navigation Guard / Interceptors
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !mutation.isSuccess) {
        e.preventDefault()
        e.returnValue = 'توجد تعديلات غير محفوظة، هل تريد مغادرة الصفحة بالفعل؟'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Intercept clicks on links for Next.js internal routes
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty || mutation.isSuccess) return
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          if (!window.confirm('لديك تعديلات غير محفوظة، هل تريد مغادرة الصفحة بالفعل؟')) {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
    }
    document.addEventListener('click', handleAnchorClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleAnchorClick, true)
    }
  }, [isDirty, mutation.isSuccess])

  // Count modified fields
  const getChangesCount = () => {
    let count = 0
    if (brand !== (car?.brand || '')) count++
    if (model !== (car?.model || '')) count++
    if (year !== String(car?.manufacturing_year || new Date().getFullYear())) count++
    if (color !== (car?.color || '')) count++
    if (vin !== (car?.vin || '')) count++
    if (plate !== (car?.plate_number || '')) count++
    if (mileage !== String(car?.mileage ?? '0')) count++
    if (purchasePrice !== String(car?.purchase_price ?? '')) count++
    if (currency !== (car?.currency || 'USD')) count++
    if (trim !== (car?.trim || '')) count++
    if (condition !== (car?.condition || 'New')) count++
    if (plateStatus !== (car?.plate_status || NONE)) count++
    if (sellingPrice !== (car?.selling_price ? String(car.selling_price) : '')) count++
    if (engineSize !== (car?.engine_size || '')) count++
    if (cylinders !== (car?.cylinders ? String(car.cylinders) : '')) count++
    if (transmission !== (car?.transmission || NONE)) count++
    if (fuelType !== (car?.fuel_type || NONE)) count++
    if (importCountry !== (car?.import_country || '')) count++
    if (seatCount !== (car?.seat_count ? String(car.seat_count) : '')) count++
    if (seatMaterial !== (car?.seat_material || NONE)) count++
    if (notes !== (car?.notes || '')) count++
    if (pendingPhotos.length > 0) count += pendingPhotos.length
    return count
  }

  // Cover Image resolution
  const activeCover = localPhotos.length > 0
    ? photoUrl(localPhotos[0].filename, localPhotos[0].subfolder ?? 'vehicles')
    : pendingPhotos.length > 0
    ? URL.createObjectURL(pendingPhotos[0])
    : null

  // Operational readiness rules-based state
  const isImageComplete = localPhotos.length > 0 || pendingPhotos.length > 0
  const isDocsComplete = plateStatus !== NONE && plate.trim() !== ''
  const isSpecsComplete = !!fuelType && fuelType !== NONE && !!transmission && transmission !== NONE && !!engineSize && !!mileage
  const isPricingComplete = !!sellingPrice && Number(sellingPrice) > 0
  const isVinComplete = vin.trim().length === 17

  // Readiness Score
  let score = 0
  if (isImageComplete) score += 20
  if (isDocsComplete) score += 20
  if (isSpecsComplete) score += 20
  if (isPricingComplete) score += 20
  if (isVinComplete) score += 20

  // Deterministic warnings / Suggestions
  const systemSuggestions: string[] = []
  if (!isImageComplete) systemSuggestions.push('يرجى إضافة صورة واحدة على الأثل للمركبة.')
  if (!isVinComplete) systemSuggestions.push('رقم الشاصي (VIN) غير مكتمل، يرجى إدخال 17 حرفاً لفك الشفرة.')
  if (!isPricingComplete) systemSuggestions.push('سعر البيع المقترح غير محدد، يرجى كتابته لتفعيل عروض المعرض.')
  if (!isDocsComplete) systemSuggestions.push('بيانات اللوحة غير مكتملة، يرجى إدخال رقم اللوحة وحالتها.')

  return (
    <div className="mx-auto max-w-[1450px] px-4 py-8 bg-[#F8FAFC] min-h-screen text-right" dir="rtl">
      
      {/* ── Viewport Hero Section (Compact) ── */}
      {isEdit && (
        <div className="mb-6 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
          <div className="flex items-center gap-6 w-full md:w-auto text-right">
            <div className="h-20 w-28 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center relative">
              {activeCover ? (
                <img
                  src={activeCover}
                  alt="صورة السيارة"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 gap-1.5 p-2">
                  <Camera className="h-6 w-6 stroke-[1.2]" />
                  <span className="text-[9px] font-bold font-family-cairo">بدون غلاف</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black font-family-cairo bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {car?.condition === 'New' ? 'جديدة' : 'مستعملة'}
                </span>
                <span className={cn(
                  "text-[11px] font-black font-family-cairo px-2 py-0.5 rounded-full",
                  car?.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                )}>
                  {car?.status === 'Available' ? 'متاحة' : 'محجوزة'}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-none font-family-cairo">
                {brand || 'اسم الماركة'} {model || 'الموديل'} {year}
              </h1>
              <p className="text-[11px] text-slate-400 font-numeric tracking-wide font-bold text-right">
                VIN: {vin || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 text-right">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold font-family-cairo">سعر البيع المقترح</span>
              <p className="text-lg md:text-xl font-black text-emerald-600 font-numeric">
                {sellingPrice ? Number(sellingPrice).toLocaleString('en-US') : 'غير محدد'}
                <span className="text-xs ms-1 font-family-cairo">{currency === 'USD' ? 'دولار' : 'د.ع'}</span>
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 transition-all font-family-cairo"
            >
              <a href={`/inventory/${car?.id}`} className="flex items-center gap-1.5">
                <ArrowRight className="h-4 w-4" />
                <span>العودة للتفاصيل</span>
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* ── Quick Summary Row (Compact Strip) ── */}
      {isEdit && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-right px-2 border-l border-slate-100/80 last:border-l-0">
            <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">الفرع الحالي</span>
            <span className="text-xs font-black text-slate-800 font-family-cairo block mt-0.5 truncate">
              {car?.branch?.name || 'الفرع الرئيسي'}
            </span>
          </div>
          <div className="text-right px-2 border-l border-slate-100/80 last:border-l-0">
            <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">إجمالي الصور</span>
            <span className="text-xs font-black text-slate-800 font-numeric block mt-0.5">
              {localPhotos.length + pendingPhotos.length} صورة
            </span>
          </div>
          <div className="text-right px-2 border-l border-slate-100/80 last:border-l-0">
            <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">حالة رقم الشاصي</span>
            <span className={cn(
              "text-xs font-black block mt-0.5 font-family-cairo",
              isVinComplete ? "text-emerald-600" : "text-amber-500"
            )}>
              {isVinComplete ? "كامل (17 حرف)" : "غير مكتمل"}
            </span>
          </div>
          <div className="text-right px-2 border-l border-slate-100/80 last:border-l-0">
            <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">الجاهزية للبيع</span>
            <span className={cn(
              "text-xs font-black block mt-0.5 font-numeric",
              score >= 80 ? "text-emerald-600" : "text-amber-500"
            )}>
              {score}%
            </span>
          </div>
          {canShowFinancials && (
            <div className="text-right px-2 border-l border-slate-100/80 last:border-l-0">
              <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">سعر الشراء الفعلي</span>
              <span className="text-xs font-black text-slate-800 font-numeric block mt-0.5">
                {purchasePrice ? Number(purchasePrice).toLocaleString('en-US') : '—'} {currency}
              </span>
            </div>
          )}
          <div className="text-right px-2">
            <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">رقم اللوحة</span>
            <span className="text-xs font-black text-slate-800 font-numeric block mt-0.5 truncate">
              {plate || 'بدون لوحة'}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Responsive Grid ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24">
        
        {/* ── Left Column: Form Details (col-span-8) ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section: Basic Info */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Info className="h-4 w-4" />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-900 font-family-cairo">المواصفات الأساسية</h3>
                <p className="text-[10px] text-slate-400 font-family-cairo">الماركة والموديل وتفاصيل الهوية التجارية للمركبة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
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
              <ConfigInput
                name="year"
                type="number"
                min="1990"
                max="2030"
                label="سنة الصنع *"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                error={errors.year}
                className="font-numeric text-right"
              />
              <ConfigInput
                name="color"
                label="اللون *"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="مثال: أبيض صدفي"
                error={errors.color}
                className="text-right"
              />
              <ConfigSelect
                label="الحالة الفنية للمركبة"
                value={condition}
                onValueChange={(v) => setCondition(v as any)}
              >
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </ConfigSelect>
            </div>
          </div>

          {/* Section: Identifiers */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ScanLine className="h-4 w-4" />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-900 font-family-cairo">الهوية والتسجيل</h3>
                <p className="text-[10px] text-slate-400 font-family-cairo">رقم الهيكل واللوحات الرسمية وبلد الاستيراد</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
              <ConfigInput
                name="vin"
                label="رقم الشاصي (VIN) *"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="أدخل 17 حرفاً"
                error={errors.vin}
                className="font-numeric text-right pl-20"
                rightIcon={
                  <button
                    type="button"
                    onClick={handleVinDecode}
                    disabled={vinLoading || vin.trim().length !== 17}
                    title="فك شفرة الشاصي"
                    className="flex h-8 w-16 items-center justify-center gap-1 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold font-family-cairo"
                  >
                    {vinLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>تحليل</span>
                  </button>
                }
              />
              <ConfigInput
                name="plate"
                label="رقم اللوحة"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="أدخل رقم اللوحة إن وجد"
                className="font-numeric text-right"
              />
              <ConfigSelect
                label="حالة اللوحة"
                value={plateStatus}
                onValueChange={setPlateStatus}
              >
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {PLATE_STATUSES.map((ps) => (
                  <SelectItem key={ps.value} value={ps.value}>{ps.label}</SelectItem>
                ))}
              </ConfigSelect>
              <ConfigInput
                name="importCountry"
                label="بلد الاستيراد"
                value={importCountry}
                onChange={(e) => setImportCountry(e.target.value)}
                placeholder="مثال: الإمارات، كوريا"
                className="text-right"
              />
            </div>
          </div>

          {/* Section: Technical Specs */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FileText className="h-4 w-4" />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-900 font-family-cairo">التفاصيل الفنية والأداء</h3>
                <p className="text-[10px] text-slate-400 font-family-cairo">المحرك، نوع الوقود، مقاعد السيارة والمسافة المقطوعة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              <ConfigSelect
                label="نوع الوقود"
                value={fuelType}
                onValueChange={setFuelType}
              >
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {FUEL_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                ))}
              </ConfigSelect>
              <ConfigSelect
                label="ناقل الحركة"
                value={transmission}
                onValueChange={setTransmission}
              >
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {TRANSMISSIONS.map((tr) => (
                  <SelectItem key={tr.value} value={tr.value}>{tr.label}</SelectItem>
                ))}
              </ConfigSelect>
              <ConfigInput
                name="engineSize"
                label="حجم المحرك"
                value={engineSize}
                onChange={(e) => setEngineSize(e.target.value)}
                placeholder="مثال: 2000 cc"
                className="text-right"
              />
              <ConfigInput
                name="cylinders"
                type="number"
                min="1"
                max="16"
                label="عدد الأسطوانات"
                value={cylinders}
                onChange={(e) => setCylinders(e.target.value)}
                className="font-numeric text-right"
              />
              <ConfigInput
                name="seatCount"
                type="number"
                min="1"
                max="20"
                label="عدد المقاعد"
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
                className="font-numeric text-right"
              />
              <ConfigSelect
                label="مادة المقاعد"
                value={seatMaterial}
                onValueChange={setSeatMaterial}
              >
                <SelectItem value={NONE}>بدون تحديد</SelectItem>
                {SEAT_MATERIALS.map((sm) => (
                  <SelectItem key={sm.value} value={sm.value}>{sm.label}</SelectItem>
                ))}
              </ConfigSelect>
              <div className="md:col-span-3">
                <ConfigInput
                  name="mileage"
                  type="number"
                  min="0"
                  label="المسافة المقطوعة (كم)"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="font-numeric text-right"
                />
              </div>
            </div>
          </div>

          {/* Section: Pricing */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-900 font-family-cairo">الإدارة المالية والتسعير</h3>
                <p className="text-[10px] text-slate-400 font-family-cairo">تحديد عملة النظام وأسعار الشراء والبيع للمركبة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
              <ConfigSelect
                label="عملة التسعير"
                value={currency}
                onValueChange={(v) => setCurrency(v as any)}
              >
                <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
              </ConfigSelect>
              
              <div />

              {canShowFinancials && (
                <ConfigInput
                  name="purchasePrice"
                  type="number"
                  min="0"
                  step="any"
                  label={isEdit ? "سعر الشراء الفعلي (مغلق)" : "سعر الشراء *"}
                  value={purchasePrice}
                  onChange={(e) => !isEdit && setPurchasePrice(e.target.value)}
                  readOnly={isEdit}
                  placeholder="0"
                  error={errors.purchasePrice}
                  className={cn("font-numeric text-right", isEdit && "bg-slate-50 text-slate-500 cursor-not-allowed")}
                />
              )}

              <ConfigInput
                name="sellingPrice"
                type="number"
                min="0"
                step="any"
                label="سعر البيع المقترح بالمعرض"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="أدخل السعر المطلوب"
                className="font-numeric text-emerald-600 font-bold text-right"
              />
            </div>
          </div>

          {/* Section: Notes */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-family-cairo text-right">ملاحظات داخلية</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات وسجلات إضافية حول المركبة"
              rows={3}
              className="w-full p-4 rounded-2xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-family-cairo transition-all text-right"
            />
          </div>

        </div>

        {/* ── Right Column: Sidebar (col-span-4) ── */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Media Card */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4 text-right">
            <h3 className="text-sm font-bold text-slate-900 font-family-cairo">صور ومرفقات المركبة</h3>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => photoInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                isDragOver ? "border-emerald-500 bg-emerald-50/50" : "hover:border-slate-300 hover:bg-slate-50/50"
              )}
            >
              <Upload className="h-6 w-6 text-slate-400 stroke-[1.2]" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700 font-family-cairo">اسحب وأفلت الصور هنا</p>
                <p className="text-[10px] text-slate-400 font-family-cairo">أو اضغط لتحديد الملفات مباشرة</p>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) {
                    setPendingPhotos((prev) => [...prev, ...files])
                    toast.success(`تم اختيار ${files.length} صور`)
                  }
                  e.target.value = ''
                }}
              />
            </div>

            {/* Thumbnail grid */}
            {(localPhotos.length > 0 || pendingPhotos.length > 0) ? (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {localPhotos.map((photo) => (
                  <div key={photo.id} className="relative h-14 rounded-xl border border-slate-100 overflow-hidden group">
                    <img
                      src={photoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                      alt="صورة"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePhoto(photo.id)
                      }}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl disabled:cursor-not-allowed"
                    >
                      {deletingPhotoId === photo.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
                
                {pendingPhotos.map((file, idx) => (
                  <div key={`pending-${idx}`} className="relative h-14 rounded-xl border border-slate-100 overflow-hidden group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="مؤقتة"
                      className="h-full w-full object-cover opacity-80"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingPhotos(prev => prev.filter((_, i) => i !== idx))
                      }}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-[8px] text-white text-center py-0.5 font-family-cairo font-bold">
                      جديد
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-300 font-family-cairo text-xs">
                لا توجد صور مرفقة بالمعرض حالياً.
              </div>
            )}
          </div>

          {/* Compact Live Preview */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4 text-right">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-bold text-slate-900 font-family-cairo">معاينة مباشرة</h3>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full font-family-cairo">
                <Eye className="h-3 w-3" />
                <span>تحديث فوري</span>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden p-3.5 bg-slate-50/50">
              <div className="aspect-[16/10] bg-white rounded-xl overflow-hidden relative border border-slate-100 flex items-center justify-center">
                {activeCover ? (
                  <img
                    src={activeCover}
                    alt="معاينة"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-300 text-xs flex flex-col items-center justify-center gap-1 font-family-cairo">
                    <Camera className="h-5 w-5 stroke-[1.2]" />
                    <span>صورة افتراضية</span>
                  </div>
                )}
                {color && (
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[9px] font-family-cairo">
                    اللون: {color}
                  </div>
                )}
              </div>

              <div className="mt-3 text-right space-y-1">
                <h4 className="text-xs font-bold text-slate-900 font-family-cairo truncate">
                  {brand || 'الماركة'} {model || 'الموديل'} {year}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-family-cairo">السعر المعروض</span>
                  <span className="text-xs font-black text-emerald-600 font-numeric">
                    {sellingPrice ? Number(sellingPrice).toLocaleString('en-US') : '—'} {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Readiness & System Suggestions */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4 text-right">
            <h3 className="text-sm font-bold text-slate-900 font-family-cairo">الجاهزية واقتراحات النظام</h3>
            
            {/* Score pill */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
              <span className="text-xs text-slate-500 font-bold font-family-cairo">مؤشر الاكتمال الكلي</span>
              <span className={cn(
                "text-lg font-black font-numeric px-3 py-0.5 rounded-xl",
                score >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              )}>
                {score}%
              </span>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5 pt-1 text-right">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-family-cairo">معرض الصور والوسائط</span>
                <span className={cn("font-bold font-family-cairo", isImageComplete ? "text-emerald-600" : "text-amber-500")}>
                  {isImageComplete ? "كامل" : "ناقص"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-family-cairo">بيانات لوحات الترخيص</span>
                <span className={cn("font-bold font-family-cairo", isDocsComplete ? "text-emerald-600" : "text-amber-500")}>
                  {isDocsComplete ? "كامل" : "غير محدد"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-family-cairo">المواصفات الفنية للمحرك</span>
                <span className={cn("font-bold font-family-cairo", isSpecsComplete ? "text-emerald-600" : "text-amber-500")}>
                  {isSpecsComplete ? "كامل" : "غير مكتمل"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-family-cairo">القيم المالية والأسعار</span>
                <span className={cn("font-bold font-family-cairo", isPricingComplete ? "text-emerald-600" : "text-amber-500")}>
                  {isPricingComplete ? "كامل" : "غير محدد"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-family-cairo">رقم شاصي الهيكل</span>
                <span className={cn("font-bold font-family-cairo", isVinComplete ? "text-emerald-600" : "text-amber-500")}>
                  {isVinComplete ? "مطابق (17 حرف)" : "غير مكتمل"}
                </span>
              </div>
            </div>

            {/* Suggestions list */}
            {systemSuggestions.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-right">
                <span className="text-[10px] text-slate-400 block font-bold font-family-cairo">اقتراحات النظام الحالية:</span>
                {systemSuggestions.map((s, idx) => (
                  <div key={idx} className="flex gap-2 text-[10px] text-slate-500 leading-normal" dir="rtl">
                    <span className="text-amber-500">●</span>
                    <p className="font-family-cairo text-right">{s}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Floating Action Bar ── */}
        {(isDirty || mutation.isPending) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-white/95 border border-slate-200 shadow-xl rounded-3xl p-4 flex items-center justify-between gap-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-500 font-family-cairo font-bold">
                  توجد {getChangesCount()} تعديلات غير محفوظة
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleDiscard} 
                  disabled={mutation.isPending}
                  className="hover:bg-slate-50 rounded-2xl text-slate-500 hover:text-slate-800 transition-all font-family-cairo text-xs h-10 px-4"
                >
                  تراجع
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={mutation.isPending} 
                  className="rounded-2xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs h-10 px-6 font-family-cairo"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري حفظ البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{isEdit ? 'حفظ التغييرات' : 'إضافة المركبة'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </form>
    </div>
  )
}
