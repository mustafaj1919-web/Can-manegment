'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Car, TrendingUp, Users, DollarSign, ArrowUpRight, Fuel, Gauge, Settings,
  Plus, Eye, Tag, Sparkles, Clock, CalendarDays, ShieldCheck, Heart, Info
} from 'lucide-react'
import { getCars } from '../lib/api/inventory'
import { formatMoney, photoUrl, translateStatus, getStatusVariant, cn } from '../lib/utils'

/* ── Label maps ── */
const FUEL_LABEL = { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' }
const TRANS_LABEL = { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' }

/* ── Helper: Calculate days in inventory ── */
function getDaysInInventory(createdAt) {
  if (!createdAt) return 'مضاف حديثاً'
  const createdDate = new Date(createdAt)
  const diffTime = Math.abs(new Date().getTime() - createdDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return 'اليوم'
  if (diffDays === 2) return 'أمس'
  if (diffDays <= 10) return `منذ ${diffDays} أيام`
  return `منذ ${diffDays} يوماً`
}

/* ── Redesigned Premium Car Card ── */
function ShowroomCarCard({ car }) {
  const hasCover = !!car.cover_photo
  const daysInStock = getDaysInInventory(car.created_at)

  return (
    <Link
      href={`/inventory/${car.id}`}
      className="group bg-[#0e0e0e] border border-white/[0.05] hover:border-red-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_rgba(239,27,45,0.12)] flex flex-col h-full"
    >
      {/* Photo Container */}
      <div className="relative h-56 overflow-hidden bg-[#070707] w-full shrink-0 glare-effect">
        {hasCover ? (
          <img
            src={photoUrl(car.cover_photo.filename, car.cover_photo.subfolder ?? 'vehicles')}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_110%,rgba(239,27,45,0.1),transparent_50%)] p-6">
            <img
              src="/fallback_car.png"
              alt="Premium Car"
              className="h-full w-full object-contain drop-shadow-[0_12px_25px_rgba(239,27,45,0.25)] transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Soft dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent opacity-80" />

        {/* Floating Badges */}
        <span className={cn(
          'absolute top-3.5 start-3.5 rounded-full px-3 py-1 text-[10px] font-bold border backdrop-blur-md shadow-sm',
          getStatusVariant(car.status),
        )}>
          {translateStatus(car.status)}
        </span>

        <span className="absolute top-3.5 end-3.5 rounded-full bg-black/65 border border-white/10 px-3 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md shadow-sm flex items-center gap-1">
          <Clock className="h-3 w-3 text-red-500" />
          {daysInStock}
        </span>
      </div>

      {/* Info Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{car.manufacturing_year}</span>
            <span className="text-[10px] text-neutral-500">{car.condition === 'New' ? 'جديدة' : 'مستعملة'}</span>
          </div>
          <h3 className="text-lg font-black text-white group-hover:text-red-500 transition-colors font-family-cairo leading-snug line-clamp-1">
            {car.brand} {car.model}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-1">{car.trim || 'فئة قياسية'}</p>
        </div>

        {/* Specs bar */}
        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-white/[0.04] text-[10px] text-neutral-400 font-bold">
          <div className="flex flex-col items-center justify-center text-center py-1 bg-white/[0.01] rounded-lg border border-white/[0.02]">
            <Fuel className="h-3.5 w-3.5 text-red-500/80 mb-1" />
            <span className="truncate w-full px-1">{car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : '—'}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center py-1 bg-white/[0.01] rounded-lg border border-white/[0.02]">
            <Settings className="h-3.5 w-3.5 text-red-500/80 mb-1" />
            <span className="truncate w-full px-1">{car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : '—'}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center py-1 bg-white/[0.01] rounded-lg border border-white/[0.02]">
            <Gauge className="h-3.5 w-3.5 text-red-500/80 mb-1" />
            <span>{car.mileage != null ? `${car.mileage.toLocaleString()} كم` : '—'}</span>
          </div>
        </div>

        {/* Pricing & Arrow */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500">سعر البيع المعروض</span>
            <span className="font-numeric text-lg font-black text-white mt-0.5">
              {car.selling_price ? formatMoney(car.selling_price, car.currency) : 'يحدد عند الطلب'}
            </span>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07] text-neutral-300 group-hover:bg-red-600 group-hover:border-red-600 group-hover:text-white transition-all shadow-sm">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Main Redesigned Dashboard ── */
export default function DashboardPage() {
  const rm = useReducedMotion()

  // 1. Fetch available cars
  const { data: availableData, isLoading: loadAvailable } = useQuery({
    queryKey: ['dash-available-cars'],
    queryFn: () => getCars({ status: 'Available', per_page: 25, page: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  // 2. Fetch all cars for recent listing
  const { data: allCarsData, isLoading: loadAll } = useQuery({
    queryKey: ['dash-all-cars'],
    queryFn: () => getCars({ per_page: 8, page: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  const availableCars = availableData?.items ?? []
  const recentCars = allCarsData?.items ?? []

  // Dynamic Featured Hero: Pick the highest priced available vehicle
  const featuredCar = useMemo(() => {
    if (availableCars.length === 0) return null
    return [...availableCars].reduce((max, car) => {
      return (car.selling_price || 0) > (max?.selling_price || 0) ? car : max
    }, availableCars[0])
  }, [availableCars])

  // Most Expensive Vehicles: top 4 sorted by price
  const expensiveCars = useMemo(() => {
    if (availableCars.length === 0) return []
    return [...availableCars]
      .sort((a, b) => (Number(b.selling_price) || 0) - (Number(a.selling_price) || 0))
      .slice(0, 4)
  }, [availableCars])

  function motionParams(i) {
    if (rm) return {}
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
    }
  }

  return (
    <div className="space-y-10 pb-16" dir="rtl">
      {/* ── SECTION 1: Featured Vehicle Hero ── */}
      <motion.section
        {...motionParams(0)}
        className="relative rounded-3xl border border-white/[0.08] overflow-hidden bg-[#080808] min-h-[500px] flex flex-col justify-end"
      >
        {/* Immersive background image & gradient */}
        {featuredCar?.cover_photo ? (
          <>
            <img
              src={photoUrl(featuredCar.cover_photo.filename, featuredCar.cover_photo.subfolder ?? 'vehicles')}
              alt={`${featuredCar.brand} ${featuredCar.model}`}
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-transparent to-transparent z-10" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(239,27,45,0.12),transparent_60%)] opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent z-10" />
            <div className="absolute inset-0 flex items-center justify-center p-10 opacity-30 select-none">
              <img src="/fallback_car.png" alt="Showroom Hero" className="max-w-[650px] object-contain drop-shadow-[0_20px_60px_rgba(239,27,45,0.4)]" />
            </div>
          </>
        )}

        {/* Soft Red Flare glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Hero Content Overlay */}
        <div className="relative z-20 p-8 sm:p-10 lg:p-12 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-600/12 border border-red-500/20 text-red-500 rounded-full text-[11px] font-bold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            المركبة النجمية في المعرض · Featured Vehicle
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-family-cairo leading-tight">
              {featuredCar ? `${featuredCar.brand} ${featuredCar.model}` : 'معرض الأصدقاء للسيارات الفارهة'}
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-medium">
              {featuredCar?.trim ? `${featuredCar.trim} · ` : ''}{featuredCar ? `إصدار عام ${featuredCar.manufacturing_year}` : 'تصفح مخزون السيارات الفاخرة المتاحة للبيع والتسليم الفوري'}
            </p>
          </div>

          {featuredCar && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-neutral-300">
              {featuredCar.fuel_type && (
                <span className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-3.5 py-2 rounded-xl">
                  <Fuel className="h-4 w-4 text-red-500" />
                  {FUEL_LABEL[featuredCar.fuel_type] ?? featuredCar.fuel_type}
                </span>
              )}
              {featuredCar.transmission && (
                <span className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-3.5 py-2 rounded-xl">
                  <Settings className="h-4 w-4 text-red-500" />
                  {TRANS_LABEL[featuredCar.transmission] ?? featuredCar.transmission}
                </span>
              )}
              {featuredCar.mileage != null && (
                <span className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-3.5 py-2 rounded-xl">
                  <Gauge className="h-4 w-4 text-red-500" />
                  {featuredCar.mileage.toLocaleString()} كم
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {featuredCar ? (
              <>
                <Link
                  href={`/inventory/${featuredCar.id}`}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 font-family-cairo"
                >
                  <Eye className="h-4 w-4" />
                  عرض تفاصيل المركبة
                </Link>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-neutral-500 font-bold">القيمة الحالية</span>
                  <span className="text-xl font-black text-white font-numeric">
                    {featuredCar.selling_price ? formatMoney(featuredCar.selling_price, featuredCar.currency) : '—'}
                  </span>
                </div>
              </>
            ) : (
              <Link
                href="/inventory/new"
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition-all flex items-center gap-2 font-family-cairo"
              >
                <Plus className="h-4 w-4" />
                إضافة سيارة جديدة للمخزون
              </Link>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── SECTION 2: Ready For Sale (Available Cars Grid) ── */}
      <motion.section {...motionParams(1)} className="space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-family-cairo">سيارات جاهزة للتسليم الفوري</h2>
              <p className="text-xs text-neutral-500">مجموعة السيارات المتاحة للبيع والمعروضة بالصالة</p>
            </div>
          </div>
          <span className="text-xs text-neutral-400 font-bold">
            {availableCars.length} سيارة متوفرة
          </span>
        </div>

        {loadAvailable ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 rounded-2xl bg-white/[0.01] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : availableCars.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl py-14 text-center">
            <Car className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400 font-family-cairo">لا توجد سيارات متاحة للبيع في المعرض حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableCars.map(car => (
              <ShowroomCarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </motion.section>

      {/* ── SECTION 3: Recently Added Vehicles ── */}
      {recentCars.length > 0 && (
        <motion.section {...motionParams(2)} className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white font-family-cairo">المضافة حديثاً</h2>
                <p className="text-xs text-neutral-500">آخر المركبات التي تم إدراجها بالمخزون مؤخراً</p>
              </div>
            </div>
            <Link href="/inventory" className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors">
              تصفح كل المخزون
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentCars.slice(0, 4).map(car => (
              <ShowroomCarCard key={car.id} car={car} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ── SECTION 4: Most Expensive Vehicles (Luxury Row) ── */}
      {expensiveCars.length > 1 && (
        <motion.section {...motionParams(3)} className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Tag className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white font-family-cairo">الفئة الفاخرة والصف الأول</h2>
                <p className="text-xs text-neutral-500">السيارات الأعلى قيمة وتميزاً المتاحة بالصالة</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {expensiveCars.map(car => (
              <ShowroomCarCard key={car.id} car={car} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  )
}

