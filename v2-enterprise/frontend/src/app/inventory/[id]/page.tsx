'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ChevronLeft, ChevronRight,
  Edit, FileText, Plus, Trash2, ArrowUpRight,
  Fuel, Gauge, Settings, Calendar, MapPin, Palette,
  Shield, Tag, Hash, Layers, Armchair, Cylinder, Zap, Info,
  Upload, X, Loader2, ImageOff, Search, Check, Bookmark
} from 'lucide-react'
import { cn, formatMoney, formatNumber, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCarById, getVehicleCosts, addVehicleCost, deleteVehicleCost, getCars, uploadCarPhotos, deleteCarPhoto } from '@/lib/api/inventory'
import type { CarPhoto } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'
import { AiPriceInsight } from '@/components/inventory/AiPriceInsight'
import { toast } from 'sonner'
import { compressImage } from '@/lib/image-compressor'

const CONDITION_LABEL: Record<string, string> = {
  New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة', Salvage: 'سكراب',
}
const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي',
}
const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT',
}
const PLATE_LABEL: Record<string, string> = {
  'No Plate': 'بدون لوحة', Temporary: 'مؤقتة', Registered: 'مسجلة',
}
const COST_TYPE_LABELS: Record<string, string> = {
  shipping: 'مصاريف الشحن', clearance: 'مصاريف التخليص',
  inspection: 'مصاريف الفحص', preparation: 'مصاريف التجهيز', other: 'مصاريف أخرى',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بكسل`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
}

// ── Premium Cinematic Gallery ──────────────────────────────────────────────────

function SpotlightGallery({
  photos, carBrand, carModel, status, year
}: {
  photos: CarPhoto[]; carBrand: string; carModel: string; status: string; year?: number
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const activePhoto = photos[activeIdx]
  const activeKey = activePhoto ? String(activePhoto.id) : null
  const isActiveBroken = activeKey ? broken.has(activeKey) : false
  const showFallback = !activePhoto || isActiveBroken

  function markBroken(key: string) { setBroken(prev => new Set(prev).add(key)) }

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      {/* Spotlight Ring Stage Container */}
      <div className="relative h-[340px] w-full flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(0,212,170,0.1)_0%,transparent_65%)] overflow-hidden rounded-[24px] border border-border/10 bg-black/10">
        {/* Spotlight Stage Oval Ring */}
        <div className="absolute bottom-[20%] w-[75%] h-12 rounded-full border border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_50px_rgba(0,212,170,0.15)] transform -rotate-[3deg]" />

        {/* Floating badge */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[9px] font-black border tracking-wider backdrop-blur-md bg-black/40', getStatusVariant(status))}>
            {translateStatus(status)}
          </span>
          {year && (
            <span className="rounded-full bg-secondary/40 border border-border/50 px-2.5 py-0.5 text-[9px] font-black text-white/95 backdrop-blur-md">
              {year}
            </span>
          )}
        </div>

        {/* Car Active Photo */}
        {!showFallback && activePhoto ? (
          <img
            key={activeIdx}
            src={photoUrl(activePhoto.filename, activePhoto.subfolder ?? 'vehicles')}
            alt={`${carBrand} ${carModel}`}
            className="z-10 max-h-[85%] max-w-[85%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all duration-500"
            onError={() => markBroken(String(activePhoto.id))}
          />
        ) : (
          <img
            src="/fallback_car.png"
            alt={carBrand}
            className="z-10 max-h-[75%] max-w-[75%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
          />
        )}
      </div>

      {/* Slider selector under the stage */}
      {photos.length > 1 && (
        <div className="relative w-48 mx-auto mt-4 px-2 select-none">
          <div className="h-0.5 w-full bg-border/40 rounded-full relative flex items-center">
            {/* Active progress fill */}
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(activeIdx / (photos.length - 1)) * 100}%` }}
            />
            {/* Knob */}
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,212,170,0.8)] border border-white cursor-pointer transition-all duration-300"
              style={{ left: `${(activeIdx / (photos.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          {/* Click zones */}
          <div className="absolute inset-x-0 -top-2 -bottom-2 flex justify-between">
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className="h-full flex-1"
                title={`صورة ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Premium Specs Tile ────────────────────────────────────────────────────────

function SpecTile({ icon: Icon, label, value, iconColor = 'text-red-500' }: {
  icon: React.ElementType; label: string; value?: string | number | null; iconColor?: string
}) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-secondary/30 border border-border/30 p-4 hover:bg-secondary/20 hover:border-border/50 transition-all duration-300 group/spec">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/20 border border-border/50 group-hover/spec:scale-105 transition-transform duration-300', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold leading-none">{label}</p>
        <p className="text-[15px] font-bold text-white mt-1.5 truncate leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ── Related Car Card ──────────────────────────────────────────────────────────

function RelatedCarCard({ car }: { car: any }) {
  const hasCover = !!car.cover_photo
  return (
    <Link
      href={`/inventory/${car.id}`}
      className="group block overflow-hidden rounded-2xl border border-border/40 bg-card hover:border-red-500/20 hover:bg-secondary hover:shadow-2xl hover:shadow-red-500/5 transition-all duration-500"
    >
      <div className="relative h-48 overflow-hidden bg-card glare-effect">
        {hasCover ? (
          <img
            src={photoUrl(car.cover_photo.filename, car.cover_photo.subfolder ?? 'vehicles')}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_110%,rgba(239,27,45,0.1),transparent_50%)] p-6">
            <img
              src="/fallback_car.png"
              alt="car"
              className="h-full w-full object-contain drop-shadow-[0_12px_25px_rgba(239,27,45,0.25)]"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 to-transparent" />
        <span className={cn(
          'absolute bottom-3.5 start-3.5 rounded-full px-3 py-1 text-[10px] font-black border backdrop-blur-md',
          getStatusVariant(car.status),
        )}>
          {translateStatus(car.status)}
        </span>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-base font-black text-white group-hover:text-red-500 transition-colors font-family-cairo line-clamp-1 leading-none">
          {car.brand} {car.model}
        </p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
          <span className="font-numeric text-base font-black text-red-500">
            {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/20 border border-border/40 text-muted-foreground group-hover:bg-red-600 group-hover:text-white group-hover:border-red-500 transition-all duration-300">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = rawId
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canShowInternalInfo = user && (user.role === 'Owner' || user.role === 'Admin' || user.role === 'Accountant')

  const [newCostType,     setNewCostType]     = useState('shipping')
  const [newCostAmount,   setNewCostAmount]   = useState('')
  const [newCostCurrency, setNewCostCurrency] = useState('USD')
  const [newCostDesc,     setNewCostDesc]     = useState('')

  const [showPhotoManager, setShowPhotoManager] = useState(false)
  const [useCompression, setUseCompression] = useState(true)
  const [uploadFiles, setUploadFiles] = useState<{
    id: string
    name: string
    size: number
    compressedSize?: number
    status: 'compressing' | 'uploading' | 'success' | 'failed'
    progress: number
  }[]>([])
  const [isUploadingAll, setIsUploadingAll] = useState(false)

  const handleFileChange = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    const newItems = Array.from(filesList).map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: f.size,
      status: 'compressing' as 'compressing' | 'uploading' | 'success' | 'failed',
      progress: 0
    }))
    setUploadFiles(prev => [...prev, ...newItems])
    setIsUploadingAll(true)

    const filesArray = Array.from(filesList)
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i]
      const item = newItems[i]

      try {
        let fileToUpload = file
        if (useCompression && file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file)
          setUploadFiles(prev => prev.map(u => u.id === item.id ? {
            ...u,
            compressedSize: fileToUpload.size,
            status: 'uploading'
          } : u))
        } else {
          setUploadFiles(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u))
        }

        const uploadResult = await uploadCarPhotos(id, [fileToUpload])
        if (uploadResult.photos.length > 0) {
          setUploadFiles(prev => prev.map(u => u.id === item.id ? { ...u, status: 'success', progress: 100 } : u))
        } else {
          setUploadFiles(prev => prev.map(u => u.id === item.id ? { ...u, status: 'failed' } : u))
        }
      } catch (err) {
        console.error('Upload item failed:', err)
        setUploadFiles(prev => prev.map(u => u.id === item.id ? { ...u, status: 'failed' } : u))
      }
    }
    setIsUploadingAll(false)
    qc.invalidateQueries({ queryKey: ['car', id] })
  }

  const isValidId = !!id && id !== 'undefined'

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['car', id],
    queryFn: () => getCarById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: isValidId,
  })

  const { data: profData } = useQuery({
    queryKey: ['vehicle-costs', id],
    queryFn: () => getVehicleCosts(id),
    staleTime: 30_000,
    enabled: isValidId,
  })

  const { data: relatedData } = useQuery({
    queryKey: ['related-cars'],
    queryFn: () => getCars({ status: 'Available', per_page: 8, page: 1 }),
    staleTime: 60_000,
    enabled: !!car,
  })
  const relatedCars = (relatedData?.items ?? []).filter((c: any) => c.id !== id).slice(0, 4)

  const addMutation = useMutation({
    mutationFn: () => addVehicleCost(id, {
      cost_type: newCostType,
      amount: parseFloat(newCostAmount),
      currency: newCostCurrency,
      description: newCostDesc || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-costs', id] })
      setNewCostAmount(''); setNewCostDesc('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (costId: number) => deleteVehicleCost(id, costId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-costs', id] }),
  })

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string | number) => deleteCarPhoto(id, photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['car', id] })
      toast.success('تم حذف الصورة بنجاح')
    },
    onError: () => toast.error('فشل حذف الصورة'),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-[620px] w-full rounded-[24px]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-4">
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-12 w-12 text-rose-500/60" />
        <p className="text-muted-foreground font-family-cairo">تعذر تحميل بيانات السيارة</p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/inventory">العودة للمخزون</Link>
        </Button>
      </div>
    )
  }

  const photos = car.photos ?? []
  const sp = Number(car.selling_price ?? 0)
  const pp = Number(car.purchase_price)
  const margin = sp > 0 && pp > 0 ? Math.round(((sp - pp) / pp) * 100) : null

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12" dir="rtl">

      {/* ── Breadcrumb Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/inventory"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-secondary/10 text-muted-foreground hover:bg-secondary/30 hover:text-white hover:scale-103 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black font-family-cairo">العودة إلى المعرض</span>
            <h1 className="text-lg font-black text-white font-family-cairo -mt-0.5 leading-none">تفاصيل المركبة</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canShowInternalInfo && (
            <Button
              onClick={() => setShowPhotoManager(true)}
              variant="outline"
              size="sm"
              className="gap-2 text-xs h-10 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 rounded-xl px-4"
            >
              <Upload className="h-4 w-4" /> إدارة صور المعرض
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-10 border-border/50 bg-secondary/10 hover:bg-secondary/30 hover:border-border/60 rounded-xl px-4">
            <Link href={`/inventory/${car.id}/edit`}>
              <Edit className="h-4 w-4 text-muted-foreground" /> تعديل
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Main Split Layout ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

        {/* LEFT COLUMN: Title, Gallery, Configurations (col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight text-white uppercase font-family-cairo">
                {car.brand} <span className="text-white/60 font-medium">{car.model}</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {car.condition ? CONDITION_LABEL[car.condition] ?? car.condition : 'مركبة'} • {car.manufacturing_year} • {car.color ?? '—'}
              </p>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-secondary/15 text-muted-foreground hover:text-white transition-colors">
              <Bookmark className="h-4 w-4" />
            </button>
          </div>

          {/* Spotlight Oval Stage Gallery */}
          <div className="glass rounded-[24px] border border-border/40 p-5 bg-card/45">
            <SpotlightGallery
              photos={photos}
              carBrand={car.brand}
              carModel={car.model}
              status={car.status}
              year={car.manufacturing_year}
            />
          </div>

          {/* Configurations Layout */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white font-family-cairo">تجهيزات الفئات والخيارات</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Active Card */}
              <div className="glass rounded-2xl border border-border/40 bg-secondary/10 p-5 flex flex-col justify-between hover:border-emerald-500/20 transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white font-family-cairo">الفئة الأساسية (Active)</span>
                    <span className="rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5">مستحسن</span>
                  </div>
                  <ul className="space-y-2 text-[11px] text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> ناقل الحركة {car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : '—'}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> المحرك {car.engine_size ? `${car.engine_size} لتر` : '—'}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> لوحة رقم {car.plate_number ?? 'بدون لوحة'}</li>
                  </ul>
                </div>
                <Button variant="ghost" size="sm" className="mt-4 text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 w-full h-8">المزيد من التفاصيل</Button>
              </div>

              {/* Premium / Style Card */}
              <div className="glass rounded-2xl border border-border/40 bg-secondary/10 p-5 flex flex-col justify-between hover:border-emerald-500/20 transition-all">
                <div className="space-y-3">
                  <span className="text-xs font-black text-white font-family-cairo">المواصفات والجمالية (Style)</span>
                  <ul className="space-y-2 text-[11px] text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> اللون الخارجي {car.color ?? '—'}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> سنة الإصدار {car.manufacturing_year ?? '—'}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> نوع الوقود {car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : '—'}</li>
                  </ul>
                </div>
                <Button variant="ghost" size="sm" className="mt-4 text-[10px] bg-secondary/30 text-muted-foreground hover:bg-secondary/40 w-full h-8">تصفح الفئات</Button>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Specs Grid, Custom Coral Price Card & Actions (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Quick Specs Grid (Performance Specs) */}
          <div className="glass rounded-[24px] border border-border/40 bg-secondary/10 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white font-family-cairo">الخصائص الفنية</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">هايبرد (Hybrid)</span>
                <button 
                  onClick={() => {}}
                  disabled
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors duration-300",
                    car.fuel_type === 'Hybrid' ? "bg-emerald-500" : "bg-neutral-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
                    car.fuel_type === 'Hybrid' ? "right-4" : "right-0.5"
                  )} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-family-cairo">سعة المحرك</p>
                <p className="text-lg font-black text-white">{car.engine_size ? `${car.engine_size} لتر` : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-family-cairo">نوع الوقود</p>
                <p className="text-lg font-black text-white">{car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-family-cairo">المسافة المقطوعة</p>
                <p className="text-lg font-black text-white">{car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-family-cairo">علبة التروس</p>
                <p className="text-lg font-black text-white">{car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Custom Coral Price Card & expenses trend line */}
          <div className="relative overflow-hidden rounded-[24px] border border-red-500/20 bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-xl shadow-red-500/10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-white/70 font-family-cairo">السعر الفعلي المطلوب</p>
                <p className="text-3xl font-black tracking-tight font-numeric mt-2">
                  {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                </p>
              </div>
              <button className="text-white/60 hover:text-white">
                <Info className="h-4 w-4" />
              </button>
            </div>

            {/* Custom SVG Mini cost bar chart */}
            <div className="mt-8 flex flex-col justify-end h-24 relative select-none">
              <div className="flex items-end justify-between px-2 h-16">
                {[12, 18, 10, 16, 24, 20].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 w-1.5 relative">
                    <div 
                      className={cn(
                        "w-1 rounded-full transition-all duration-500",
                        i === 4 ? "bg-white h-14 shadow-[0_0_12px_white]" : "bg-white/40 h-8"
                      )}
                      style={{ height: `${h * 2.5}px` }}
                    />
                    {i === 4 && (
                      <div className="absolute -top-6 bg-white text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg select-none">
                        -5%
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="h-[1px] w-full bg-white/20 mt-2" />
              <div className="flex justify-between text-[8px] text-white/50 mt-1 font-numeric">
                <span>0</span>
                <span>500</span>
                <span>700</span>
                <span>900</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            {car.status === 'Available' ? (
              <Button asChild className="w-full h-12 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-xl transition-all">
                <Link href={`/sales/new?car_id=${car.id}`}>
                  <Tag className="h-4 w-4" />
                  تسجيل مبيعات وعقد السيارة
                </Link>
              </Button>
            ) : (
              <div className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-black border border-border bg-secondary/15 text-muted-foreground">
                {translateStatus(car.status)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-10 border-border/50 hover:border-border/60 bg-secondary/10 hover:bg-secondary/20 rounded-xl font-bold font-family-cairo">
                <Link href={`/inventory/${car.id}/edit`}>
                  <Edit className="h-3.5 w-3.5" /> تعديل البيانات
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-10 border-border/50 hover:border-border/60 bg-secondary/10 hover:bg-secondary/20 rounded-xl font-bold text-foreground/70 font-family-cairo">
                <Link href={`/inventory/${car.id}/specification`}>
                  <FileText className="h-3.5 w-3.5" /> المواصفات الرسمية
                </Link>
              </Button>
            </div>
          </div>

          {/* AI insights widget */}
          {car.status === 'Available' && <AiPriceInsight car={car} />}

          {/* Legal / Note panel */}
          {car.notes && (
            <div className="rounded-[20px] border border-border/40 bg-card/45 p-5 space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <p className="text-[9px] font-black uppercase tracking-widest font-family-cairo">ملاحظات المعرض</p>
              </div>
              <p className="text-xs leading-relaxed text-white/60 font-family-cairo">{car.notes}</p>
            </div>
          )}

        </div>
      </div>

      {/* ── Costs & Profitability details ── */}
      {canShowInternalInfo && (
        <div className="overflow-hidden rounded-[24px] border border-border/50 bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border/40 px-7 py-4.5 bg-secondary/10">
            <div className="h-5 w-[3px] rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <h3 className="text-sm font-black text-white font-family-cairo">المصاريف الإضافية والربحية للمركبة</h3>
          </div>

          <div className="space-y-6 p-7">
            {profData && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {([
                  { label: 'سعر الشراء الأساسي', value: formatMoney(profData.purchase_price_iqd, 'IQD'),   cls: 'text-white' },
                  { label: 'إجمالي المصاريف الإضافية', value: formatMoney(profData.costs_total_iqd, 'IQD'),   cls: 'text-amber-400' },
                  { label: 'التكلفة الإجمالية المترتبة',  value: formatMoney(profData.total_cost_iqd, 'IQD'),      cls: 'text-orange-400' },
                  { label: 'قيمة المبيع المحددة',       value: profData.selling_price_iqd ? formatMoney(profData.selling_price_iqd, 'IQD') : '—', cls: 'text-white' },
                  {
                    label: 'صافي الربح المتوقع',
                    value: profData.net_profit_iqd !== null
                      ? `${formatMoney(profData.net_profit_iqd, 'IQD')} (${profData.profit_pct?.toFixed(1)}%)`
                      : '—',
                    cls: profData.net_profit_iqd !== null && profData.net_profit_iqd >= 0 ? 'text-emerald-400' : 'text-rose-400',
                  },
                ] as const).map(item => (
                  <div key={item.label} className="rounded-xl bg-secondary/10 border border-border/30 p-4 space-y-1 hover:bg-secondary/10 transition-colors">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black leading-none">{item.label}</p>
                    <p className={cn('font-numeric text-sm font-black mt-2 tabular-nums', item.cls)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Table-free visually premium cost list */}
            {profData?.costs && profData.costs.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-family-cairo">تفاصيل فواتير المصاريف</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profData.costs.map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-secondary/10 hover:border-border/50 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-white">{COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}</p>
                        <p className="text-[11px] text-muted-foreground">{cost.description ?? 'بدون تفاصيل إضافية'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-numeric text-xs font-black text-amber-400">
                          {formatMoney(cost.amount, cost.currency as 'USD' | 'IQD')}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(cost.id)}
                          disabled={deleteMutation.isPending}
                          aria-label="حذف التكلفة"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elegant inline cost creator form */}
            <div className="rounded-2xl border border-dashed border-border/50 p-5 bg-secondary/30">
              <p className="mb-4 text-xs font-bold text-muted-foreground font-family-cairo">إدراج فاتورة مصروف جديدة للمركبة</p>
              <div className="flex flex-wrap gap-3">
                <Select value={newCostType} onValueChange={setNewCostType}>
                  <SelectTrigger className="h-10 w-[180px] border-border/50 bg-secondary/30 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COST_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="المبلغ" type="number" min="0" step="0.01"
                  value={newCostAmount}
                  onChange={e => setNewCostAmount(e.target.value)}
                  className="h-10 w-[120px] border-border/50 bg-secondary/30 text-xs font-numeric rounded-xl"
                />
                <Select value={newCostCurrency} onValueChange={setNewCostCurrency}>
                  <SelectTrigger className="h-10 w-[90px] border-border/50 bg-secondary/30 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="IQD">IQD</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="ملاحظات وتفاصيل الفاتورة..."
                  value={newCostDesc}
                  onChange={e => setNewCostDesc(e.target.value)}
                  className="h-10 min-w-[200px] flex-1 border-border/50 bg-secondary/30 text-xs rounded-xl"
                />
                <Button
                  size="sm" className="h-10 gap-1.5 text-xs rounded-xl px-5 bg-white hover:bg-neutral-200 text-black hover:text-black font-bold transition-all"
                  disabled={!newCostAmount || parseFloat(newCostAmount) <= 0 || addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                >
                  <Plus className="h-4 w-4" /> إضافة المصروف
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Related Vehicles ── */}
      {relatedCars.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-[3px] rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,27,45,0.6)]" />
              <h3 className="text-sm font-black text-white font-family-cairo">سيارات أخرى متاحة في المعرض</h3>
            </div>
            <Link href="/inventory?status=Available" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold font-family-cairo transition-all">
              عرض كامل المخزون
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedCars.map((rc: any) => (
              <RelatedCarCard key={rc.id} car={rc} />
            ))}
          </div>
        </div>
      )}

      {/* ── Photo Manager Modal ── */}
      <AnimatePresence>
        {showPhotoManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isUploadingAll) setShowPhotoManager(false)
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-border/50 bg-[#161616] p-6 shadow-2xl glare-effect"
            >
              {/* Top red glow decoration line */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-600/20">
                    <Upload className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white font-family-cairo">إدارة صور السيارة</h3>
                    <p className="text-[11px] text-muted-foreground font-family-cairo">إضافة وتعديل ألبوم الصور للمركبة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhotoManager(false)}
                  disabled={isUploadingAll}
                  aria-label="إغلاق مدير الصور"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/40 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-5 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {/* 1. Existing Photos Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white font-family-cairo">الصور الحالية للسيارة ({photos.length})</h4>
                  {photos.length === 0 ? (
                    <div className="text-center py-6 rounded-2xl bg-secondary/15 border border-border/30 border-dashed">
                      <p className="text-xs text-muted-foreground font-family-cairo">لا توجد صور مرفوعة حالياً للسيارة.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {photos.map((photo) => (
                        <div key={photo.id} className="group relative h-20 rounded-xl overflow-hidden border border-border/40">
                          <img
                            src={photoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }}
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              disabled={deletePhotoMutation.isPending}
                              onClick={() => deletePhotoMutation.mutate(photo.id)}
                              className="flex items-center gap-1 rounded-lg bg-red-600/90 hover:bg-red-500 px-2.5 py-1.5 text-[10px] font-bold text-white transition-all disabled:opacity-50"
                            >
                              {deletePhotoMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Drag & Drop Zone */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white font-family-cairo">رفع صور جديدة</h4>
                  
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (!isUploadingAll) handleFileChange(e.dataTransfer.files)
                    }}
                    onClick={() => {
                      if (!isUploadingAll) document.getElementById('photo-uploader-input')?.click()
                    }}
                    className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-border/50 hover:border-red-500/30 bg-secondary/15 hover:bg-secondary/10 cursor-pointer transition-all duration-300"
                  >
                    <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center border border-border/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-white font-family-cairo">اسحب وأفلت الصور هنا، أو انقر للاختيار</p>
                      <p className="text-[10px] text-muted-foreground/60">يدعم صيغ JPG, PNG, WEBP</p>
                    </div>
                    <input
                      id="photo-uploader-input"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp"
                      aria-label="رفع صور المركبة"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files)}
                    />
                  </div>

                  {/* 3. Settings: Toggle Compression */}
                  <div className="flex items-center justify-between rounded-xl bg-secondary/20 border border-border/30 p-3.5">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white font-family-cairo">الضغط التلقائي للصور (توفير المساحة)</p>
                      <p className="text-[10px] text-muted-foreground/70 font-family-cairo">تقليص الحجم لسرعة الرفع وحفظ مساحة السيرفر بنسبة تصل إلى 90% دون فقدان الوضوح.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCompression}
                        onChange={(e) => setUseCompression(e.target.checked)}
                        aria-label="تفعيل الضغط التلقائي للصور"
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                {/* 4. Queue List */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white font-family-cairo">قائمة الرفع والضغط</h4>
                      <button
                        type="button"
                        onClick={() => setUploadFiles([])}
                        className="text-[10px] text-red-400 hover:text-red-300 font-family-cairo font-bold"
                        disabled={isUploadingAll}
                      >
                        مسح القائمة
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {uploadFiles.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border/20 bg-secondary/10">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate max-w-[240px]">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground/70">
                                {formatBytes(item.size)}
                                {item.compressedSize && (
                                  <span className="text-emerald-400">
                                    {' '}← {formatBytes(item.compressedSize)} (وفرت {Math.round((1 - item.compressedSize / item.size) * 100)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.status === 'compressing' && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-family-cairo flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> جاري الضغط...
                              </span>
                            )}
                            {item.status === 'uploading' && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-family-cairo flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> جاري الرفع...
                              </span>
                            )}
                            {item.status === 'success' && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-family-cairo">
                                تم الرفع بنجاح
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-family-cairo">
                                فشل الرفع
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button
                  onClick={() => setShowPhotoManager(false)}
                  disabled={isUploadingAll}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl px-5 py-2 text-xs font-bold font-family-cairo"
                >
                  إغلاق النافذة
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
