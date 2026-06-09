'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle, ChevronLeft, ChevronRight,
  Edit, FileText, Plus, Trash2, ArrowUpRight,
  Fuel, Gauge, Settings, Calendar, MapPin, Palette,
  Shield, Tag, Hash, Layers, Armchair, Cylinder, Zap,
} from 'lucide-react'
import { cn, formatMoney, formatNumber, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCarById, getVehicleCosts, addVehicleCost, deleteVehicleCost, getCars } from '@/lib/api/inventory'
import type { CarPhoto } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

// ── Premium Gallery ──────────────────────────────────────────────────────────

function PremiumGallery({
  photos, carBrand, carModel, carId,
}: {
  photos: CarPhoto[]; carBrand: string; carModel: string; carId: number
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  const activePhoto = photos[activeIdx]

  function prev() { setActiveIdx(i => (i === 0 ? photos.length - 1 : i - 1)) }
  function next() { setActiveIdx(i => (i === photos.length - 1 ? 0 : i + 1)) }

  return (
    <div className="space-y-3">
      {/* Main photo — tall cinematic */}
      <div className="relative h-[540px] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0a]">
        {activePhoto ? (
          <img
            key={activeIdx}
            src={photoUrl(activePhoto.filename, activePhoto.subfolder ?? 'vehicles')}
            alt={`${carBrand} ${carModel}`}
            className="h-full w-full object-cover transition-all duration-500"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_120%,rgba(239,27,45,0.18),transparent_52%)]">
            <img
              src="/fallback_car.png"
              alt={carBrand}
              className="max-h-[65%] w-auto object-contain drop-shadow-[0_20px_60px_rgba(239,27,45,0.45)]"
            />
            <Link
              href={`/inventory/${carId}/edit`}
              className="rounded-xl border border-dashed border-white/10 px-6 py-2.5 text-[11px] text-white/30 hover:border-red-500/40 hover:text-red-400 transition-all"
            >
              + إضافة صور للسيارة
            </Link>
          </div>
        )}

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Top fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />

        {/* Photo counter */}
        {photos.length > 0 && (
          <div className="absolute top-4 end-4 rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md border border-white/10">
            {activeIdx + 1} / {photos.length}
          </div>
        )}

        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="الصورة السابقة"
              className="absolute start-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all hover:bg-red-600 hover:border-red-600 hover:shadow-lg hover:shadow-red-600/30"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="الصورة التالية"
              className="absolute end-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-md transition-all hover:bg-red-600 hover:border-red-600 hover:shadow-lg hover:shadow-red-600/30"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" dir="ltr">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              aria-label={`صورة ${idx + 1}`}
              className={cn(
                'relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200',
                idx === activeIdx
                  ? 'border-red-500 shadow-lg shadow-red-500/25 ring-1 ring-red-500/20'
                  : 'border-transparent opacity-35 hover:opacity-70',
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

// ── Spec Tile ─────────────────────────────────────────────────────────────────

function SpecTile({ icon: Icon, label, value, iconColor = 'text-red-500' }: {
  icon: React.ElementType; label: string; value?: string | number | null; iconColor?: string
}) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] px-4 py-3.5 hover:bg-white/[0.04] transition-colors">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]', iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-sm font-bold text-white mt-1 truncate">{value}</p>
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
      className="group block overflow-hidden rounded-xl border border-white/5 bg-[#111111] hover:border-red-500/25 transition-all duration-300"
    >
      <div className="relative h-44 overflow-hidden bg-[#0e0e0e]">
        {hasCover ? (
          <img
            src={photoUrl(car.cover_photo.filename, car.cover_photo.subfolder ?? 'vehicles')}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_110%,rgba(239,27,45,0.13),transparent_50%)] p-5">
            <img
              src="/fallback_car.png"
              alt="car"
              className="h-full w-full object-contain drop-shadow-[0_10px_25px_rgba(239,27,45,0.35)]"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
        <span className={cn(
          'absolute bottom-2.5 start-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold border backdrop-blur-md',
          getStatusVariant(car.status),
        )}>
          {translateStatus(car.status)}
        </span>
        {car.manufacturing_year && (
          <span className="absolute top-2.5 end-2.5 rounded-full bg-black/65 border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md">
            {car.manufacturing_year}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[15px] font-black text-white group-hover:text-red-500 transition-colors font-family-cairo line-clamp-1 leading-tight">
          {car.brand} {car.model}
        </p>
        <div className="flex items-center justify-between rounded-lg bg-white/[0.025] border border-white/[0.05] px-3 py-2">
          <span className="font-numeric text-base font-black text-red-500">
            {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-neutral-500 group-hover:bg-red-600 group-hover:text-white transition-all">
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const id = Number.parseInt(rawId, 10)
  const qc = useQueryClient()

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
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-[540px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-5">
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-10 w-10 text-rose-400/60" />
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
    <div className="mx-auto max-w-7xl space-y-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-neutral-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-family-cairo leading-tight">
              {car.brand} {car.model}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {[car.manufacturing_year, car.trim, car.condition ? CONDITION_LABEL[car.condition] : null].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={cn('rounded-full px-3.5 py-1.5 text-[11px] font-bold border', getStatusVariant(car.status))}>
            {translateStatus(car.status)}
          </span>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-9 border-white/10 hover:border-white/25">
            <Link href={`/inventory/${car.id}/edit`}>
              <Edit className="h-3.5 w-3.5" /> تعديل
            </Link>
          </Button>
          {car.status === 'Available' && (
            <Button asChild size="sm" className="gap-1.5 text-xs h-9 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/25">
              <Link href={`/sales/new?car_id=${car.id}`}>
                <Tag className="h-3.5 w-3.5" /> تسجيل بيع
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Full-width Gallery ── */}
      <PremiumGallery
        photos={photos}
        carBrand={car.brand}
        carModel={car.model}
        carId={id}
      />

      {/* ── Quick Info Pills ── */}
      <div className="flex flex-wrap gap-2">
        {car.fuel_type && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <Fuel className="h-3 w-3 text-red-500" />
            {FUEL_LABEL[car.fuel_type] ?? car.fuel_type}
          </span>
        )}
        {car.transmission && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <Settings className="h-3 w-3 text-red-500" />
            {TRANS_LABEL[car.transmission] ?? car.transmission}
          </span>
        )}
        {car.mileage != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <Gauge className="h-3 w-3 text-red-500" />
            {formatNumber(car.mileage)} كم
          </span>
        )}
        {car.manufacturing_year && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <Calendar className="h-3 w-3 text-red-500" />
            {car.manufacturing_year}
          </span>
        )}
        {car.color && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <Palette className="h-3 w-3 text-red-500" />
            {car.color}
          </span>
        )}
        {car.engine_size && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <Zap className="h-3 w-3 text-amber-500" />
            {car.engine_size}
          </span>
        )}
        {car.import_country && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-neutral-300">
            <MapPin className="h-3 w-3 text-cyan-500" />
            {car.import_country}
          </span>
        )}
      </div>

      {/* ── Two-column: Specs + Price ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">

        {/* Left: Specifications */}
        <div className="space-y-6 lg:col-span-7">

          {/* Technical Specs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-[3px] rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,27,45,0.6)]" />
              <h3 className="text-sm font-black text-white font-family-cairo">المواصفات الفنية</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <SpecTile icon={Fuel}     label="نوع الوقود"         value={car.fuel_type ? FUEL_LABEL[car.fuel_type] ?? car.fuel_type : null} />
              <SpecTile icon={Settings} label="ناقل الحركة"        value={car.transmission ? TRANS_LABEL[car.transmission] ?? car.transmission : null} />
              <SpecTile icon={Gauge}    label="المسافة المقطوعة"   value={car.mileage ? `${formatNumber(car.mileage)} كم` : null} />
              <SpecTile icon={Cylinder} label="حجم المحرك"         value={car.engine_size}        iconColor="text-amber-500" />
              <SpecTile icon={Layers}   label="عدد الأسطوانات"     value={car.cylinders}          iconColor="text-amber-500" />
              <SpecTile icon={Armchair} label="عدد المقاعد"        value={car.seat_count}         iconColor="text-blue-400" />
              <SpecTile icon={Palette}  label="اللون"              value={car.color}              iconColor="text-violet-400" />
              <SpecTile icon={Shield}   label="الحالة"             value={car.condition ? CONDITION_LABEL[car.condition] ?? car.condition : null} iconColor="text-emerald-400" />
              <SpecTile icon={MapPin}   label="بلد الاستيراد"      value={car.import_country}     iconColor="text-cyan-400" />
            </div>
          </div>

          {/* Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-[3px] rounded-full bg-neutral-500" />
              <h3 className="text-sm font-black text-white font-family-cairo">بيانات التعريف</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <SpecTile icon={Hash}     label="رقم الشاصي (VIN)"  value={car.vin}              iconColor="text-neutral-400" />
              <SpecTile icon={FileText} label="رقم اللوحة"        value={car.plate_number}     iconColor="text-neutral-400" />
              <SpecTile icon={Calendar} label="سنة الصنع"         value={car.manufacturing_year} iconColor="text-neutral-400" />
              <SpecTile icon={Shield}   label="حالة اللوحة"       value={car.plate_status ? PLATE_LABEL[car.plate_status] ?? car.plate_status : null} iconColor="text-neutral-400" />
            </div>
          </div>
        </div>

        {/* Right: Price + Actions — sticky */}
        <div className="lg:col-span-5 lg:sticky lg:top-[76px] space-y-4">

          {/* Price Card */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111111]">
            {/* Red accent bar */}
            <div className="h-[3px] bg-gradient-to-l from-red-700 via-red-500 to-red-700/20" />

            <div className="p-6 space-y-5">
              {/* Selling price — hero number */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 font-family-cairo">سعر البيع</p>
                <p className="mt-2 font-numeric text-[3rem] font-black leading-none text-red-500">
                  {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                </p>
              </div>

              {/* Purchase + margin row */}
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-none">سعر الشراء</p>
                  <p className="font-numeric text-sm font-bold text-white/70 mt-1">
                    {formatMoney(car.purchase_price, car.currency)}
                  </p>
                </div>
                {margin !== null && (
                  <span className={cn(
                    'rounded-xl px-3.5 py-1.5 text-sm font-black',
                    margin >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
                  )}>
                    {margin >= 0 ? '+' : ''}{margin}%
                  </span>
                )}
              </div>

              {/* Primary CTA */}
              <div className="space-y-2.5">
                {car.status === 'Available' ? (
                  <Button asChild className="w-full h-12 gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-xl shadow-red-600/30 transition-all">
                    <Link href={`/sales/new?car_id=${car.id}`}>
                      <Tag className="h-4 w-4" />
                      تسجيل بيع لهذه السيارة
                    </Link>
                  </Button>
                ) : (
                  <div className={cn(
                    'w-full h-12 flex items-center justify-center rounded-xl text-sm font-black border',
                    car.status === 'Sold'
                      ? 'bg-neutral-800/50 border-neutral-700/30 text-neutral-500'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                  )}>
                    {translateStatus(car.status)}
                  </div>
                )}

                {/* Secondary actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-10 border-white/10 hover:border-white/25 rounded-xl">
                    <Link href={`/inventory/${car.id}/edit`}>
                      <Edit className="h-3.5 w-3.5" /> تعديل البيانات
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-10 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 rounded-xl">
                    <Link href={`/inventory/${car.id}/specification`}>
                      <FileText className="h-3.5 w-3.5" /> ورقة المواصفات
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {car.notes && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">ملاحظات</p>
              <p className="text-sm leading-relaxed text-white/65">{car.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Costs & Profitability ── */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111111]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <div className="h-5 w-[3px] rounded-full bg-emerald-500" />
          <h3 className="text-sm font-black text-white font-family-cairo">التكاليف والربحية</h3>
        </div>

        <div className="space-y-5 p-6" dir="rtl">
          {profData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {([
                { label: 'سعر الشراء',      value: formatMoney(profData.purchase_price_iqd, 'IQD'),   cls: 'text-white' },
                { label: 'إجمالي التكاليف', value: formatMoney(profData.costs_total_iqd, 'IQD'),     cls: 'text-amber-400' },
                { label: 'إجمالي التكلفة',  value: formatMoney(profData.total_cost_iqd, 'IQD'),      cls: 'text-orange-400' },
                { label: 'سعر البيع',       value: profData.selling_price_iqd ? formatMoney(profData.selling_price_iqd, 'IQD') : '—', cls: 'text-white' },
                {
                  label: 'صافي الربح',
                  value: profData.net_profit_iqd !== null
                    ? `${formatMoney(profData.net_profit_iqd, 'IQD')} (${profData.profit_pct?.toFixed(1)}%)`
                    : '—',
                  cls: profData.net_profit_iqd !== null && profData.net_profit_iqd >= 0 ? 'text-emerald-400' : 'text-rose-400',
                },
              ] as const).map(item => (
                <div key={item.label} className="rounded-xl bg-white/[0.025] border border-white/[0.06] px-4 py-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-none">{item.label}</p>
                  <p className={cn('font-numeric text-sm font-black tabular-nums mt-1.5', item.cls)}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {profData?.costs && profData.costs.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                  <tr>
                    {['النوع', 'الوصف', 'المبلغ', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-start text-[10px] font-bold uppercase tracking-wider text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profData.costs.map((cost: any) => (
                    <tr key={cost.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold text-white/90">{COST_TYPE_LABELS[cost.cost_type] ?? cost.cost_type}</td>
                      <td className="px-4 py-3 text-neutral-500">{cost.description ?? '—'}</td>
                      <td className="px-4 py-3 font-numeric text-amber-400 font-bold">
                        {formatMoney(cost.amount, cost.currency as 'USD' | 'IQD')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(cost.id)}
                          disabled={deleteMutation.isPending}
                          aria-label="حذف التكلفة"
                          className="rounded-lg p-1.5 text-neutral-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add new cost */}
          <div className="rounded-xl border border-dashed border-white/10 p-4">
            <p className="mb-3 text-xs font-bold text-neutral-500 font-family-cairo">إضافة تكلفة جديدة</p>
            <div className="flex flex-wrap gap-2">
              <Select value={newCostType} onValueChange={setNewCostType}>
                <SelectTrigger className="h-9 w-[160px] border-white/10 bg-white/5 text-xs">
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
                className="h-9 w-[110px] border-white/10 bg-white/5 text-xs font-numeric"
              />
              <Select value={newCostCurrency} onValueChange={setNewCostCurrency}>
                <SelectTrigger className="h-9 w-[80px] border-white/10 bg-white/5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="IQD">IQD</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="ملاحظة (اختياري)"
                value={newCostDesc}
                onChange={e => setNewCostDesc(e.target.value)}
                className="h-9 min-w-[150px] flex-1 border-white/10 bg-white/5 text-xs"
              />
              <Button
                size="sm" className="h-9 gap-1.5 text-xs rounded-lg"
                disabled={!newCostAmount || parseFloat(newCostAmount) <= 0 || addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                <Plus className="h-3.5 w-3.5" /> إضافة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Related Vehicles ── */}
      {relatedCars.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(239,27,45,0.5)]" />
              <h3 className="text-sm font-black text-white font-family-cairo">سيارات أخرى متاحة</h3>
            </div>
            <Link href="/inventory?status=Available" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold font-family-cairo transition-colors">
              عرض الكل
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedCars.map((rc: any) => (
              <RelatedCarCard key={rc.id} car={rc} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
