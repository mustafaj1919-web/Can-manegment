'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Car, Plus, ArrowUpRight, Fuel, Gauge, Settings, Shield, Sparkles, 
  ChevronLeft, ChevronRight, Eye, Tag
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn, formatMoney, photoUrl, translateStatus, getStatusVariant } from '@/lib/utils'
import { getCars } from '@/lib/api/inventory'

const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي',
}
const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT',
}

export function FeaturedCarsWidget() {
  const [activeSubTab, setActiveSubTab] = useState<'featured' | 'recent'>('featured')
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Fetch Available (Featured) cars
  const { data: availData, isLoading: loadAvail } = useQuery({
    queryKey: ['dash-featured-avail'],
    queryFn: () => getCars({ status: 'Available', per_page: 8, page: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  // Fetch all cars to show Recently Added
  const { data: recentData, isLoading: loadRecent } = useQuery({
    queryKey: ['dash-featured-recent'],
    queryFn: () => getCars({ per_page: 8, page: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  const featuredCars = availData?.items ?? []
  const recentCars = recentData?.items ?? []

  const activeCars = activeSubTab === 'featured' ? featuredCars : recentCars
  const isLoading = activeSubTab === 'featured' ? loadAvail : loadRecent

  const handleNext = () => {
    if (activeCars.length === 0) return
    setCarouselIndex((prev) => (prev + 1) % activeCars.length)
  }

  const handlePrev = () => {
    if (activeCars.length === 0) return
    setCarouselIndex((prev) => (prev - 1 + activeCars.length) % activeCars.length)
  }

  // Hero Car for the Carousel banner
  const featuredHeroCar = featuredCars[carouselIndex] ?? featuredCars[0] ?? null

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── Tabs & Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-family-cairo">صالة العرض التفاعلية</h2>
            <p className="text-xs text-muted-foreground mt-0.5">اكتشف أحدث السيارات المميزة والمعروضة للبيع</p>
          </div>
        </div>

        <div className="flex p-0.5 rounded-lg bg-secondary/50 border border-border/40">
          <button
            onClick={() => { setActiveSubTab('featured'); setCarouselIndex(0) }}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-md transition-all select-none font-family-cairo",
              activeSubTab === 'featured'
                ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                : "text-muted-foreground hover:text-white"
            )}
          >
            السيارات المميزة ({featuredCars.length})
          </button>
          <button
            onClick={() => { setActiveSubTab('recent'); setCarouselIndex(0) }}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-md transition-all select-none font-family-cairo",
              activeSubTab === 'recent'
                ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                : "text-muted-foreground hover:text-white"
            )}
          >
            المضافة حديثاً ({recentCars.length})
          </button>
        </div>
      </div>

      {/* ── Carousel Feature Highlight ── */}
      {!isLoading && featuredHeroCar && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-border/50 overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #121212 0%, #080808 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
          }}
        >
          {/* Neon background light */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-red-600/10 blur-[90px] rounded-full pointer-events-none" />

          {/* Carousel Left: Text & Specs */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between z-10 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'rounded px-2.5 py-0.5 text-[9px] font-black border border-border/40 uppercase tracking-wider',
                  getStatusVariant(featuredHeroCar.status)
                )}>
                  {translateStatus(featuredHeroCar.status)}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold border border-border/40 px-2 py-0.5 rounded bg-secondary/30">
                  {featuredHeroCar.manufacturing_year}
                </span>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-family-cairo leading-tight">
                  {featuredHeroCar.brand} {featuredHeroCar.model}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{featuredHeroCar.trim || 'فئة قياسية'}</p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-secondary/10 border border-border/40 p-2 rounded-lg text-center">
                  <Fuel className="h-4 w-4 text-red-500 mx-auto mb-1" />
                  <span className="text-[10px] text-muted-foreground block">الوقود</span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {FUEL_LABEL[featuredHeroCar.fuel_type ?? ''] ?? featuredHeroCar.fuel_type ?? 'غير محدد'}
                  </span>
                </div>
                <div className="bg-secondary/10 border border-border/40 p-2 rounded-lg text-center">
                  <Settings className="h-4 w-4 text-red-500 mx-auto mb-1" />
                  <span className="text-[10px] text-muted-foreground block">الناقل</span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {TRANS_LABEL[featuredHeroCar.transmission ?? ''] ?? featuredHeroCar.transmission ?? 'غير محدد'}
                  </span>
                </div>
                <div className="bg-secondary/10 border border-border/40 p-2 rounded-lg text-center">
                  <Gauge className="h-4 w-4 text-red-500 mx-auto mb-1" />
                  <span className="text-[10px] text-muted-foreground block">العداد</span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {featuredHeroCar.mileage ? `${featuredHeroCar.mileage.toLocaleString()} كم` : 'جديد'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/40">
              <div>
                <span className="text-[10px] text-muted-foreground block">سعر البيع</span>
                <span className="text-2xl font-black text-red-500 font-numeric">
                  {featuredHeroCar.selling_price ? formatMoney(featuredHeroCar.selling_price, featuredHeroCar.currency) : 'اتصل لمعرفة السعر'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-4">
                  <Link href={`/inventory/${featuredHeroCar.id}`}>
                    <Eye className="me-1.5 h-3.5 w-3.5" />
                    تفاصيل السيارة
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-border/50 hover:bg-secondary/30 text-white text-xs h-9">
                  <Link href={`/sales/new?car_id=${featuredHeroCar.id}`}>
                    <Tag className="me-1.5 h-3.5 w-3.5" />
                    تسجيل بيع
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Carousel Right: Image showcase */}
          <div className="lg:col-span-6 min-h-[260px] bg-red-950/10 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
              <button onClick={handlePrev} className="h-8 w-8 rounded-full bg-black/60 border border-border/50 flex items-center justify-center text-white hover:bg-red-600 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={handleNext} className="h-8 w-8 rounded-full bg-black/60 border border-border/50 flex items-center justify-center text-white hover:bg-red-600 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {featuredHeroCar.cover_photo ? (
              <img
                src={photoUrl(featuredHeroCar.cover_photo.filename, featuredHeroCar.cover_photo.subfolder ?? 'vehicles')}
                alt={`${featuredHeroCar.brand} ${featuredHeroCar.model}`}
                className="max-h-[240px] w-auto object-contain transition-transform duration-300 hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="relative w-full flex items-center justify-center p-4">
                <img
                  src="/fallback_car.png"
                  alt="Premium Showroom Car"
                  className="max-h-[220px] w-auto object-contain drop-shadow-[0_15px_35px_rgba(239,27,45,0.45)]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cars Grid Section (Recently Added & Top Available Grid) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-t border-border/40 pt-6">
          <h3 className="text-md font-bold text-white font-family-cairo flex items-center gap-2">
            <Car className="h-4 w-4 text-red-500" />
            {activeSubTab === 'featured' ? 'أفضل السيارات المتاحة للبيع' : 'السيارات المضافة حديثاً للمخزون'}
          </h3>
          <Link href="/inventory" className="text-xs text-red-500 hover:underline flex items-center gap-1 font-family-cairo">
            تصفح المعرض الكامل
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-secondary/20 border border-border/40 rounded-xl p-3 space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : activeCars.length === 0 ? (
          <div className="border border-dashed border-border/50 rounded-xl py-12 text-center">
            <Car className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-family-cairo">لا تتوفر سيارات لعرضها حالياً</p>
            <Button asChild size="sm" className="mt-4 bg-red-600 hover:bg-red-700 text-white">
              <Link href="/inventory/new">
                <Plus className="me-1.5 h-3.5 w-3.5" />
                إضافة سيارة جديدة
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeCars.slice(0, 4).map((car) => {
              const hasCover = !!car.cover_photo
              return (
                <div key={car.id} className="group bg-card border border-border/40 rounded-xl overflow-hidden hover:border-red-500/30 transition-all duration-300 flex flex-col justify-between">
                  <div className="relative h-36 bg-card overflow-hidden flex items-center justify-center p-3 glare-effect">
                    {hasCover ? (
                      <img
                        src={photoUrl(car.cover_photo!.filename, car.cover_photo!.subfolder ?? 'vehicles')}
                        alt={`${car.brand} ${car.model}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <img
                        src="/fallback_car.png"
                        alt="Fallback Showroom Car"
                        className="max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(239,27,45,0.3)] transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <span className={cn(
                      'absolute top-2 start-2 text-[8px] font-bold px-1.5 py-0.5 rounded',
                      getStatusVariant(car.status)
                    )}>
                      {translateStatus(car.status)}
                    </span>
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-red-500 transition-colors font-family-cairo line-clamp-1">
                        {car.brand} {car.model}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{car.manufacturing_year} · {car.color || 'غير محدد'}</p>
                    </div>

                    <div className="border-t border-border/40 pt-2 flex items-center justify-between mt-2">
                      <span className="text-xs font-black text-red-500 font-numeric">
                        {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                      </span>
                      <Button asChild size="icon-sm" variant="ghost" className="h-6 w-6 rounded bg-secondary/30 text-foreground/70 hover:bg-red-600 hover:text-white transition-all">
                        <Link href={`/inventory/${car.id}`}>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
