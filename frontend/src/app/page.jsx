'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Store, Car, TrendingUp, Users, DollarSign,
  ArrowUpRight, Fuel, Gauge, Settings, Plus, Eye, Tag,
  ChevronLeft, ChevronRight, Sparkles, Clock, ShoppingBag,
  BarChart3, CalendarDays,
} from 'lucide-react'
import { HeroBanner }            from '../components/dashboard/HeroBanner'
import { KpiCards }              from '../components/dashboard/KpiCards'
import { RecentSalesWidget }     from '../components/dashboard/RecentSalesWidget'
import { SmartAlertsWidget }     from '../components/dashboard/SmartAlertsWidget'
import { FinancialChartWidget }  from '../components/dashboard/FinancialChartWidget'
import { InstallmentRiskWidget } from '../components/dashboard/InstallmentRiskWidget'
import { ActivityTimelineWidget } from '../components/dashboard/ActivityTimelineWidget'
import { getDashboardStats }     from '../lib/api/dashboard'
import { getCars }               from '../lib/api/inventory'
import { formatMoney, photoUrl, translateStatus, getStatusVariant, cn } from '../lib/utils'

/* ── Label maps ───────────────────────────────────────────────── */
const FUEL_LABEL  = { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' }
const TRANS_LABEL = { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' }

/* ── Showroom Car Card ────────────────────────────────────────── */
function ShowroomCarCard({ car }) {
  const hasCover = !!car.cover_photo
  return (
    <Link
      href={`/inventory/${car.id}`}
      className="group vehicle-card block overflow-hidden rounded-xl"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-[#0e0e0e]">
        {hasCover ? (
          <img
            src={photoUrl(car.cover_photo.filename, car.cover_photo.subfolder ?? 'vehicles')}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_110%,rgba(239,27,45,0.14),transparent_50%)] p-6">
            <img
              src="/fallback_car.png"
              alt="Premium Car"
              className="h-full w-full object-contain drop-shadow-[0_12px_30px_rgba(239,27,45,0.35)] transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
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

      {/* Info */}
      <div className="p-4 space-y-2.5">
        <div>
          <p className="text-[15px] font-black text-white group-hover:text-red-500 transition-colors font-family-cairo line-clamp-1 leading-tight">
            {car.brand} {car.model}
          </p>
          <p className="text-[10px] text-neutral-500/80 mt-0.5">
            {car.trim || car.color || ''}
          </p>
        </div>

        {/* Spec chips */}
        <div className="flex items-center gap-1.5 text-[9px] text-neutral-400">
          {car.fuel_type && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/[0.03] border border-white/[0.07] px-2 py-0.5">
              <Fuel className="h-2.5 w-2.5 text-red-500/70" />
              {FUEL_LABEL[car.fuel_type] ?? car.fuel_type}
            </span>
          )}
          {car.transmission && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/[0.03] border border-white/[0.07] px-2 py-0.5">
              <Settings className="h-2.5 w-2.5 text-red-500/70" />
              {TRANS_LABEL[car.transmission] ?? car.transmission}
            </span>
          )}
          {car.mileage != null && (
            <span className="flex items-center gap-0.5 rounded-full bg-white/[0.03] border border-white/[0.07] px-2 py-0.5">
              <Gauge className="h-2.5 w-2.5 text-red-500/70" />
              {car.mileage.toLocaleString()} كم
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between rounded-lg bg-white/[0.025] border border-white/[0.055] px-3 py-2 mt-1">
          <span className="font-numeric text-[17px] font-black text-red-500 leading-none">
            {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-neutral-400 group-hover:bg-red-600 group-hover:border-red-600 group-hover:text-white transition-all">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Sales Overview Mini-Card ─────────────────────────────────── */
function SalesOverviewCard({ stats }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white font-family-cairo">نظرة عامة على المبيعات</h3>
          <p className="text-[10px] text-neutral-500">إحصائيات الفترة الحالية</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'إجمالي المبيعات', value: formatMoney(stats?.total_sales_amount ?? 0, 'IQD'), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', iconBg: 'bg-emerald-500/10' },
          { label: 'عدد الصفقات', value: stats?.sales ?? 0, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/15', iconBg: 'bg-blue-500/10' },
          { label: 'السيارات المتاحة', value: stats?.available_cars ?? 0, icon: Car, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/15', iconBg: 'bg-amber-500/10' },
          { label: 'العملاء النشطون', value: stats?.customers ?? 0, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/5', border: 'border-violet-500/15', iconBg: 'bg-violet-500/10' },
        ].map(item => (
          <div key={item.label} className={cn("rounded-lg p-3 border", item.bg, item.border)}>
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-md mb-2", item.iconBg)}>
              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
            </div>
            <p className={cn("font-numeric text-base font-black leading-none", item.color)}>
              {typeof item.value === 'number' ? item.value.toLocaleString('ar-EG') : item.value}
            </p>
            <p className="text-[9px] text-neutral-500 mt-1 leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      <Link
        href="/reports"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] py-2 text-[11px] font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all font-family-cairo"
      >
        <BarChart3 className="h-3 w-3" />
        عرض التقارير الكاملة
      </Link>
    </div>
  )
}

/* ── Dashboard Page ────────────────────────────────────────────── */
export default function DashboardPage() {
  const rm = useReducedMotion()
  const [activeTab, setActiveTab] = useState('showroom')

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })

  // Featured = Available cars
  const { data: featuredData, isLoading: loadFeatured } = useQuery({
    queryKey: ['dash-featured'],
    queryFn: () => getCars({ status: 'Available', per_page: 8, page: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  // Recent = all cars sorted by newest
  const { data: recentData, isLoading: loadRecent } = useQuery({
    queryKey: ['dash-recent'],
    queryFn: () => getCars({ per_page: 8, page: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  const featuredCars = featuredData?.items ?? []
  const recentCars   = recentData?.items ?? []

  function zone(i) {
    if (rm) return {}
    return {
      initial:    { opacity: 0, y: 15 },
      animate:    { opacity: 1, y: 0 },
      transition: { duration: 0.35, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] },
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-[3px] rounded-full bg-primary shrink-0"
            style={{ boxShadow: '0 0 18px rgba(239,27,45,0.70)' }}
          />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-family-cairo leading-tight">
              لوحة التحكم
            </h1>
            <p className="text-xs text-muted-foreground/55 mt-0.5">
              نظام إدارة صالة عرض السيارات
            </p>
          </div>
        </div>

        {/* Tab switcher — surface-card style */}
        <div className="flex items-center bg-secondary/30 border border-border/25 rounded-xl p-1 self-start sm:self-auto gap-0.5">
          <button
            onClick={() => setActiveTab('showroom')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 select-none ${
              activeTab === 'showroom'
                ? 'bg-[var(--s3)] text-foreground shadow-sm border border-white/[0.07]'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            المعرض
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 select-none ${
              activeTab === 'business'
                ? 'bg-[var(--s3)] text-foreground shadow-sm border border-white/[0.07]'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            الأعمال
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'showroom' ? (
          <motion.div
            key="showroom-tab"
            initial={{ opacity: 0, x: rm ? 0 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: rm ? 0 : -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Hero */}
            <motion.div {...zone(0)}>
              <HeroBanner />
            </motion.div>

            {/* ── Featured Cars ── full width, 3-column, 6 cars */}
            <motion.div {...zone(1)}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-[3px] rounded-full bg-primary shrink-0" style={{boxShadow:'0 0 12px rgba(239,27,45,0.6)'}} />
                    <div className="h-9 w-9 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white font-family-cairo leading-tight">السيارات المميزة</h2>
                      <p className="text-[10px] text-neutral-500 leading-tight">أفضل السيارات المتاحة للبيع</p>
                    </div>
                  </div>
                  <Link href="/inventory" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold font-family-cairo transition-colors">
                    تصفح الكل
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {loadFeatured ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="h-72 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : featuredCars.length === 0 ? (
                  <div className="border border-dashed border-white/10 rounded-xl py-16 text-center">
                    <Car className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400 font-family-cairo">لا تتوفر سيارات متاحة حالياً</p>
                    <Link href="/inventory/new" className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all">
                      <Plus className="h-3.5 w-3.5" /> إضافة سيارة
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredCars.slice(0, 6).map(car => (
                      <ShowroomCarCard key={car.id} car={car} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── Recently Added Cars ── 3-column, 6 cars */}
            {recentCars.length > 0 && (
              <motion.div {...zone(2)}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-[3px] rounded-full bg-blue-500 shrink-0" style={{boxShadow:'0 0 12px rgba(59,130,246,0.5)'}} />
                      <div className="h-9 w-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white font-family-cairo leading-tight">المضافة حديثاً</h2>
                        <p className="text-[10px] text-neutral-500 leading-tight">آخر السيارات المضافة للمخزون</p>
                      </div>
                    </div>
                    <Link href="/inventory" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-bold font-family-cairo transition-colors">
                      عرض الكل
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentCars.slice(0, 6).map(car => (
                      <ShowroomCarCard key={car.id} car={car} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Top Available Cars ── sorted by price, 4-column */}
            {featuredCars.length > 0 && (
              <motion.div {...zone(3)}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-[3px] rounded-full bg-amber-500 shrink-0" style={{boxShadow:'0 0 12px rgba(245,158,11,0.5)'}} />
                      <div className="h-9 w-9 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white font-family-cairo leading-tight">أفضل العروض المتاحة</h2>
                        <p className="text-[10px] text-neutral-500 leading-tight">سيارات بأسعار تنافسية</p>
                      </div>
                    </div>
                    <Link href="/inventory?status=Available" className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold font-family-cairo transition-colors">
                      عرض الكل
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...featuredCars]
                      .sort((a, b) => (Number(b.selling_price) || 0) - (Number(a.selling_price) || 0))
                      .slice(0, 8)
                      .map(car => (
                        <ShowroomCarCard key={car.id} car={car} />
                      ))}
                  </div>
                </div>
              </motion.div>
            )}

          </motion.div>
        ) : (
          <motion.div
            key="business-tab"
            initial={{ opacity: 0, x: rm ? 0 : -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: rm ? 0 : 15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* KPI Cards */}
            <motion.div {...zone(0)}>
              <KpiCards />
            </motion.div>

            {/* Operations */}
            <motion.div {...zone(1)} className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <div className="xl:col-span-8"><RecentSalesWidget /></div>
              <div className="xl:col-span-4"><SmartAlertsWidget /></div>
            </motion.div>

            {/* Analytics */}
            <motion.div {...zone(2)} className="grid grid-cols-1 gap-5 xl:grid-cols-12">
              <div className="xl:col-span-7"><FinancialChartWidget /></div>
              <div className="xl:col-span-5"><InstallmentRiskWidget /></div>
            </motion.div>

            {/* Activity Timeline */}
            <motion.div {...zone(3)}>
              <ActivityTimelineWidget />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
