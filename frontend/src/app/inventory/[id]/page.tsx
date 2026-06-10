'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle, ChevronLeft, ChevronRight,
  Edit, FileText, Plus, Trash2, ArrowUpRight,
  Fuel, Gauge, Settings, Calendar, MapPin, Palette,
  Shield, Tag, Hash, Layers, Armchair, Cylinder, Zap, Info
} from 'lucide-react'
import { cn, formatMoney, formatNumber, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCarById, getVehicleCosts, addVehicleCost, deleteVehicleCost, getCars } from '@/lib/api/inventory'
import type { CarPhoto } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'

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

// ── Premium Cinematic Gallery ──────────────────────────────────────────────────

function PremiumGallery({
  photos, carBrand, carModel, carId, status, year
}: {
  photos: CarPhoto[]; carBrand: string; carModel: string; carId: number; status: string; year?: number
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const activePhoto = photos[activeIdx]

  function prev() { setActiveIdx(i => (i === 0 ? photos.length - 1 : i - 1)) }
  function next() { setActiveIdx(i => (i === photos.length - 1 ? 0 : i + 1)) }

  return (
    <div className="relative group/gallery">
      {/* Main cinematic view - extra height and curved borders */}
      <div className="relative h-[620px] w-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090909] shadow-2xl">
        {activePhoto ? (
          <img
            key={activeIdx}
            src={photoUrl(activePhoto.filename, activePhoto.subfolder ?? 'vehicles')}
            alt={`${carBrand} ${carModel}`}
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_50%_120%,rgba(239,27,45,0.15),transparent_55%)]">
            <img
              src="/fallback_car.png"
              alt={carBrand}
              className="max-h-[55%] w-auto object-contain drop-shadow-[0_25px_60px_rgba(239,27,45,0.35)]"
            />
            <Link
              href={`/inventory/${carId}/edit`}
              className="rounded-xl border border-dashed border-white/10 px-8 py-3 text-xs font-semibold text-white/40 hover:border-red-500/40 hover:text-red-400 backdrop-blur-md bg-white/[0.02] transition-all"
            >
              + إضافة معرض صور
            </Link>
          </div>
        )}

        {/* Ambient overlays */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/10 to-transparent" />

        {/* Floating details overlay on hero */}
        <div className="absolute bottom-8 start-8 z-10 space-y-2 max-w-lg">
          <div className="flex items-center gap-3">
            <span className={cn('rounded-full px-3.5 py-1 text-[11px] font-black border tracking-wider backdrop-blur-md bg-black/40', getStatusVariant(status))}>
              {translateStatus(status)}
            </span>
            {year && (
              <span className="rounded-full bg-white/10 border border-white/10 px-3.5 py-1 text-[11px] font-black text-white/95 backdrop-blur-md">
                موديل {year}
              </span>
            )}
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-family-cairo leading-tight drop-shadow-md">
            {carBrand} <span className="text-white/80 font-medium">{carModel}</span>
          </h2>
        </div>

        {/* Photo counter */}
        {photos.length > 0 && (
          <div className="absolute top-6 end-6 rounded-full bg-black/70 px-4 py-2 text-[10px] font-black tracking-widest text-white/90 backdrop-blur-xl border border-white/[0.08]">
            {activeIdx + 1} / {photos.length}
          </div>
        )}

        {/* Nav arrows - premium style */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="الصورة السابقة"
              className="absolute start-6 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-xl transition-all duration-300 opacity-0 group-hover/gallery:opacity-100 hover:bg-red-600 hover:border-red-500 hover:scale-105"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="الصورة التالية"
              className="absolute end-6 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-xl transition-all duration-300 opacity-0 group-hover/gallery:opacity-100 hover:bg-red-600 hover:border-red-500 hover:scale-105"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip - elegant mini tiles */}
      {photos.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto py-2 justify-center" dir="ltr">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              aria-label={`صورة ${idx + 1}`}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition-all duration-300',
                idx === activeIdx
                  ? 'border-red-500 ring-2 ring-red-500/20 scale-102 opacity-100'
                  : 'border-white/10 opacity-40 hover:opacity-80',
              )}
            >
              <img
                src={photoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
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
    <div className="flex items-center gap-4 rounded-2xl bg-white/[0.015] border border-white/[0.04] p-4 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-300 group/spec">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] group-hover/spec:scale-105 transition-transform duration-300', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold leading-none">{label}</p>
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
      className="group block overflow-hidden rounded-2xl border border-white/[0.05] bg-[#0c0c0c] hover:border-red-500/20 hover:bg-[#111] hover:shadow-2xl hover:shadow-red-500/5 transition-all duration-500"
    >
      <div className="relative h-48 overflow-hidden bg-[#0a0a0a]">
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
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
          <span className="font-numeric text-base font-black text-red-500">
            {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.05] text-neutral-500 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-500 transition-all duration-300">
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
  const id = Number.parseInt(rawId, 10)
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canShowInternalInfo = user && (user.role === 'Owner' || user.role === 'Admin' || user.role === 'Accountant')

  const [newCostType,     setNewCostType]     = useState('shipping')
  const [newCostAmount,   setNewCostAmount]   = useState('')
  const [newCostCurrency, setNewCostCurrency] = useState('USD')
  const [newCostDesc,     setNewCostDesc]     = useState('')

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['car', id],
    queryFn: () => getCarById(id),
    staleTime: 30_000,
    retry: 1,
    enabled: !Number.isNaN(id),
  })

  const { data: profData } = useQuery({
    queryKey: ['vehicle-costs', id],
    queryFn: () => getVehicleCosts(id),
    staleTime: 30_000,
    enabled: !Number.isNaN(id),
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-neutral-400 hover:bg-white/5 hover:text-white hover:scale-103 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-family-cairo">العودة إلى المعرض</span>
            <h1 className="text-lg font-black text-white font-family-cairo -mt-0.5 leading-none">تفاصيل المركبة</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-10 border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20 rounded-xl px-4">
            <Link href={`/inventory/${car.id}/edit`}>
              <Edit className="h-4 w-4 text-neutral-400" /> تعديل
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Premium Cinematic Hero Gallery ── */}
      <PremiumGallery
        photos={photos}
        carBrand={car.brand}
        carModel={car.model}
        carId={id}
        status={car.status}
        year={car.manufacturing_year}
      />

      {/* ── Quick Specs Bar (Tesla/Porsche styled Strip) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0.5 rounded-[20px] overflow-hidden border border-white/[0.05] bg-white/[0.02] p-1.5 backdrop-blur-md">
        {[
          { label: 'السرعة / المحرك', value: car.engine_size ? `${car.engine_size} لتر` : '—', icon: Zap, color: 'text-amber-400' },
          { label: 'ناقل الحركة', value: car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : '—', icon: Settings, color: 'text-red-400' },
          { label: 'المسافة المقطوعة', value: car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—', icon: Gauge, color: 'text-emerald-400' },
          { label: 'نوع الوقود', value: car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : '—', icon: Fuel, color: 'text-indigo-400' },
          { label: 'اللون الخارجي', value: car.color ?? '—', icon: Palette, color: 'text-pink-400' },
          { label: 'المصدر', value: car.import_country ?? '—', icon: MapPin, color: 'text-cyan-400' },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center justify-center py-4 bg-[#0a0a0a]/50 text-center gap-1.5 border border-white/[0.02]">
            <item.icon className={cn('h-5 w-5', item.color)} />
            <div className="space-y-0.5">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black leading-none">{item.label}</p>
              <p className="text-[13px] font-black text-white mt-1 leading-tight">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content grid: Specs vs Floating Price Card ── */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">

        {/* Left column: Specifications & Details */}
        <div className="space-y-8 lg:col-span-8">

          {/* Technical Specs Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-[3px] rounded-full bg-red-600 shadow-[0_0_12px_rgba(239,27,45,0.7)]" />
              <h3 className="text-[15px] font-black tracking-wide text-white font-family-cairo">المواصفات الفنية والأداء</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <SpecTile icon={Fuel}     label="نظام المحرك والوقود"  value={car.fuel_type ? FUEL_LABEL[car.fuel_type] ?? car.fuel_type : null} />
              <SpecTile icon={Settings} label="علبة التروس والتحكم"  value={car.transmission ? TRANS_LABEL[car.transmission] ?? car.transmission : null} />
              <SpecTile icon={Gauge}    label="المسافة المقطوعة"    value={car.mileage ? `${formatNumber(car.mileage)} كم` : null} />
              <SpecTile icon={Cylinder} label="سعة المحرك (لتر)"    value={car.engine_size}        iconColor="text-amber-400" />
              <SpecTile icon={Layers}   label="عدد أسطوانات المحرك"   value={car.cylinders}          iconColor="text-amber-400" />
              <SpecTile icon={Armchair} label="السعة والمقاعد"      value={car.seat_count ? `${car.seat_count} مقاعد` : null} iconColor="text-blue-400" />
              <SpecTile icon={Palette}  label="اللون والهيكل"        value={car.color}              iconColor="text-pink-400" />
              <SpecTile icon={Shield}   label="حالة الاستخدام"      value={car.condition ? CONDITION_LABEL[car.condition] ?? car.condition : null} iconColor="text-emerald-400" />
              <SpecTile icon={MapPin}   label="منشأ الاستيراد"      value={car.import_country}     iconColor="text-cyan-400" />
            </div>
          </div>

          {/* Identity & Legal Docs */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-[3px] rounded-full bg-neutral-600 shadow-[0_0_10px_rgba(255,255,255,0.15)]" />
              <h3 className="text-[15px] font-black tracking-wide text-white font-family-cairo">معلومات الهوية والتوثيق</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <SpecTile icon={Hash}     label="رقم الهيكل التسلسلي (VIN)" value={car.vin}              iconColor="text-neutral-400" />
              <SpecTile icon={FileText} label="رقم لوحة السيارة"          value={car.plate_number}     iconColor="text-neutral-400" />
              <SpecTile icon={Calendar} label="سنة الصنع والإصدار"        value={car.manufacturing_year} iconColor="text-neutral-400" />
              <SpecTile icon={Shield}   label="ترخيص ولوحات المرور"        value={car.plate_status ? PLATE_LABEL[car.plate_status] ?? car.plate_status : null} iconColor="text-neutral-400" />
            </div>
          </div>

        </div>

        {/* Right column: Floating Price & Sales Control Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-[90px] space-y-6">

          {/* Premium Glassmorphic Price Card */}
          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-2xl p-7 flex flex-col justify-between">
            {/* Top red glowing design line */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 font-family-cairo">القيمة المطلوبة</p>
                <p className="mt-2.5 font-numeric text-[2.75rem] font-black tracking-tight leading-none text-red-500">
                  {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                </p>
              </div>

              {/* Purchase comparison box */}
              {canShowInternalInfo && (
                <div className="flex items-center justify-between rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black leading-none">تكلفة الشراء</p>
                    <p className="font-numeric text-base font-bold text-white/85 mt-2">
                      {formatMoney(car.purchase_price, car.currency)}
                    </p>
                  </div>
                  {margin !== null && (
                    <span className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-black tracking-wide',
                      margin >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
                    )}>
                      {margin >= 0 ? '+' : ''}{margin}% الهامش
                    </span>
                  )}
                </div>
              )}

              {/* Primary Sales Action */}
              <div className="space-y-3 pt-2">
                {car.status === 'Available' ? (
                  <Button asChild className="w-full h-13 gap-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-2xl shadow-red-600/30 transition-all duration-300 transform active:scale-98">
                    <Link href={`/sales/new?car_id=${car.id}`}>
                      <Tag className="h-4 w-4" />
                      تسجيل بيع المركبة
                    </Link>
                  </Button>
                ) : (
                  <div className={cn(
                    'w-full h-13 flex items-center justify-center rounded-xl text-sm font-black border backdrop-blur-md bg-white/[0.01]',
                    car.status === 'Sold'
                      ? 'border-neutral-800 text-neutral-500 bg-neutral-900/10'
                      : 'border-amber-500/20 text-amber-400 bg-amber-500/5',
                  )}>
                    {translateStatus(car.status)}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-11 border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl font-bold font-family-cairo">
                    <Link href={`/inventory/${car.id}/edit`}>
                      <Edit className="h-3.5 w-3.5" /> تعديل البيانات
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-2 text-xs h-11 border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl font-bold text-neutral-300 font-family-cairo">
                    <Link href={`/inventory/${car.id}/specification`}>
                      <FileText className="h-3.5 w-3.5" /> المواصفات الرسمية
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes display */}
          {canShowInternalInfo && car.notes && (
            <div className="rounded-[20px] border border-white/[0.05] bg-[#0c0c0c]/80 p-5 space-y-2">
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Info className="h-3.5 w-3.5" />
                <p className="text-[10px] font-black uppercase tracking-widest font-family-cairo">ملاحظات المعرض</p>
              </div>
              <p className="text-xs leading-relaxed text-white/65 font-family-cairo">{car.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Costs & Profitability details ── */}
      {canShowInternalInfo && (
        <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#0b0b0b] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/[0.05] px-7 py-4.5 bg-white/[0.01]">
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
                  <div key={item.label} className="rounded-xl bg-white/[0.01] border border-white/[0.04] p-4 space-y-1 hover:bg-white/[0.02] transition-colors">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black leading-none">{item.label}</p>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-family-cairo">تفاصيل فواتير المصاريف</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profData.costs.map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-white">{COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}</p>
                        <p className="text-[11px] text-neutral-500">{cost.description ?? 'بدون تفاصيل إضافية'}</p>
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
                          className="rounded-lg p-1.5 text-neutral-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
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
            <div className="rounded-2xl border border-dashed border-white/10 p-5 bg-white/[0.005]">
              <p className="mb-4 text-xs font-bold text-neutral-400 font-family-cairo">إدراج فاتورة مصروف جديدة للمركبة</p>
              <div className="flex flex-wrap gap-3">
                <Select value={newCostType} onValueChange={setNewCostType}>
                  <SelectTrigger className="h-10 w-[180px] border-white/10 bg-white/5 text-xs rounded-xl">
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
                  className="h-10 w-[120px] border-white/10 bg-white/5 text-xs font-numeric rounded-xl"
                />
                <Select value={newCostCurrency} onValueChange={setNewCostCurrency}>
                  <SelectTrigger className="h-10 w-[90px] border-white/10 bg-white/5 text-xs rounded-xl">
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
                  className="h-10 min-w-[200px] flex-1 border-white/10 bg-white/5 text-xs rounded-xl"
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

    </div>
  )
}
