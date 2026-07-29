'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import {
  Car as CarIcon, Plus, RefreshCw, Copy, Check, Eye, Edit3, Download,
  Building2, MapPin, Fuel, Gauge, Layers, Search, X, LayoutGrid, List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { getCars, Car, CarPhoto } from '@/lib/api/inventory'
import { getSuppliers } from '@/lib/api/suppliers'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { formatMoney } from '@/lib/design-system/formatting'
import { photoUrl, cn, translateStatus } from '@/lib/utils'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'
import { ShowroomPlanner } from '@/components/inventory/ShowroomPlanner'
import { BulkModelUpdateModal } from '@/components/inventory/BulkModelUpdateModal'

// ── Constants & Helpers ──────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'all',       label: 'الكل' },
  { value: 'Available', label: 'متاحة' },
  { value: 'Reserved',  label: 'محجوزة' },
  { value: 'Sold',      label: 'مباعة' },
]

const CONDITION_OPTS = [
  { value: 'all',     label: 'كل الأنواع' },
  { value: 'New',     label: 'جديدة' },
  { value: 'Used',    label: 'مستعملة' },
  { value: 'Damaged', label: 'متضررة' },
]

const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي',
}

const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT',
}

const CONDITION_LABEL: Record<string, string> = {
  New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة',
}

const STATUS_PILLS: Record<string, { bg: string; text: string; label: string }> = {
  Available: { bg: 'bg-[#0D9488]', text: 'text-white', label: 'متاحة' },
  Reserved:  { bg: 'bg-[#F59E0B]', text: 'text-white', label: 'محجوزة' },
  Sold:      { bg: 'bg-[#DC2626]', text: 'text-white', label: 'مباعة' },
}

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

// ── Vehicle Card Component matching production screenshot 1:1 ────────────────

function VehicleCard({ car, isAuthorized }: { car: Car; isAuthorized: boolean }) {
  const [imgError, setImgError] = useState(false)
  const coverUrl = car.cover_photo ? photoUrl(car.cover_photo.filename) : null

  const statusConfig = STATUS_PILLS[car.status] ?? { bg: 'bg-slate-600', text: 'text-white', label: translateStatus(car.status) }
  const conditionText = car.condition ? (CONDITION_LABEL[car.condition] ?? car.condition) : 'جديدة'
  const fuelText = car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : 'بنزين'
  const transText = car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : 'أوتوماتيك'
  const mileageText = car.mileage !== undefined && car.mileage !== null ? `${car.mileage.toLocaleString('ar-IQ')} كم` : '0 كم'

  // Estimated 12-month installment calculation
  const sellingPrice = car.selling_price ?? 0
  const monthlyInstallment = sellingPrice > 0 ? Math.round(sellingPrice / 12) : 0

  return (
    <motion.div variants={cardVariants} className="h-full">
      <div className="group relative bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full dir-rtl text-right" dir="rtl">
        
        {/* Image Area with Overlay Badges */}
        <div className="relative aspect-[16/10] w-full bg-[#F1F5F9] overflow-hidden shrink-0 flex items-center justify-center">
          {coverUrl && !imgError ? (
            <img
              src={coverUrl}
              alt={`${car.brand} ${car.model}`}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <CarIcon className="h-12 w-12 opacity-40" />
            </div>
          )}

          {/* Top-End Overlay Badges: Status & Condition */}
          <div className="absolute top-2.5 end-2.5 flex items-center gap-1.5 z-10">
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold shadow-sm leading-none select-none', statusConfig.bg, statusConfig.text)}>
              {statusConfig.label}
            </span>
            <span className="rounded-full bg-[#0EA5E9] text-white px-2.5 py-1 text-[10px] font-extrabold shadow-sm leading-none select-none">
              {conditionText}
            </span>
          </div>

          {/* Bottom-Start Overlay Badge: Manufacturing Year */}
          <div className="absolute bottom-2.5 start-2.5 z-10">
            <span className="rounded-md bg-black/75 text-white backdrop-blur-xs px-2 py-0.5 text-[11px] font-mono font-bold">
              {car.manufacturing_year}
            </span>
          </div>
        </div>

        {/* Card Body Content */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          
          {/* Title & Supplier Subtitle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0284C7]">
              <span>{conditionText}</span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A] tracking-tight truncate">
              {car.brand} {car.model}
            </h3>

            <p className="text-[11px] text-[#64748B] truncate">
              المورد: {car.supplier_name ?? (car.trim ? car.trim : 'ليث عادل - اربيل بغداد')}
            </p>
          </div>

          {/* Specification Pills Row */}
          <div className="grid grid-cols-3 gap-1.5 py-1">
            <div className="flex items-center justify-center gap-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] py-1 px-1 text-[11px] font-semibold text-[#334155]">
              <Gauge className="h-3 w-3 text-[#64748B]" />
              <span className="truncate">{mileageText}</span>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] py-1 px-1 text-[11px] font-semibold text-[#334155]">
              <Layers className="h-3 w-3 text-[#64748B]" />
              <span className="truncate">{transText}</span>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] py-1 px-1 text-[11px] font-semibold text-[#334155]">
              <Fuel className="h-3 w-3 text-[#64748B]" />
              <span className="truncate">{fuelText}</span>
            </div>
          </div>

          {/* Price & Installment Area */}
          <div className="pt-2 border-t border-[#F1F5F9] flex items-end justify-between">
            {/* Right Side: Selling Price */}
            <div>
              <span className="text-[10px] font-medium text-[#64748B] block">سعر البيع</span>
              <span className="text-sm sm:text-base font-bold font-numeric text-[#0F172A] dir-ltr text-right block">
                {sellingPrice > 0 ? formatMoney(sellingPrice, car.currency) : 'اتصل للسعر'}
              </span>
            </div>

            {/* Left Side: Estimated Installment */}
            {monthlyInstallment > 0 && (
              <div className="text-left">
                <span className="text-[10px] font-semibold text-[#0284C7] block">قسط تقديري (12 شهر)</span>
                <span className="text-xs font-bold font-numeric text-[#0284C7] dir-ltr block">
                  {formatMoney(monthlyInstallment, car.currency)} / شهرياً
                </span>
              </div>
            )}
          </div>

          {/* Location Footer */}
          <div className="flex items-center gap-1 text-[11px] text-[#64748B] pt-1">
            <MapPin className="h-3.5 w-3.5 text-[#0284C7] shrink-0" />
            <span className="truncate">{car.branch?.name ?? 'معرض شركة الأصدقاء - الفرع الرئيسي'}</span>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-2 flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] font-bold text-xs">
              <Link href={`/inventory/${car.id}`}>
                عرض التفاصيل
              </Link>
            </Button>

            {isAuthorized && (
              <Button asChild variant="outline" size="sm" className="flex-1 h-9 rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#334155] font-semibold text-xs">
                <Link href={`/inventory/${car.id}/edit`}>
                  تعديل
                </Link>
              </Button>
            )}
          </div>

        </div>

      </div>
    </motion.div>
  )
}

// ── Main Inventory Page Component ────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const activeBranch = useBranchStore((s) => s.activeBranch)
  const isAuthorized = user?.role === 'Admin' || user?.role === 'Owner'

  const rawStatus = searchParams.get('status')
  const initialStatus = (rawStatus === 'Available' || rawStatus === 'Reserved' || rawStatus === 'Sold') ? rawStatus : 'all'

  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [supplierId, setSupplierId] = useState<string>('all')
  const [view, setView] = useState<'cards' | 'table' | 'planner'>('cards')
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(16)
  const [exporting, setExporting] = useState<boolean>(false)
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false)

  const branchScope = activeBranch?.id ? String(activeBranch.id) : 'all'
  const branchLabel = activeBranch ? activeBranch.name : 'جميع الفروع'

  // Persist view mode preference
  useEffect(() => {
    const saved = localStorage.getItem('inventory_view')
    if (saved === 'cards' || saved === 'table' || saved === 'planner') {
      setView(saved as any)
    }
  }, [])

  const handleSetView = (newView: 'cards' | 'table' | 'planner') => {
    setView(newView)
    localStorage.setItem('inventory_view', newView)
  }

  // Fetch Inventory Cars
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cars', page, perPage, statusFilter, searchQuery, conditionFilter, supplierId, branchScope],
    queryFn: () => getCars({
      page,
      per_page: perPage,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
      branch_id: activeBranch?.id ? String(activeBranch.id) : undefined,
      supplier_id: supplierId === 'all' ? undefined : supplierId,
    }),
    staleTime: 30_000,
  })

  // Fetch Suppliers List for filtering
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => getSuppliers({ per_page: 100 }),
    staleTime: 300_000,
  })
  const suppliersList = suppliersData?.data ?? []

  // Fetch all available cars for planner view when enabled
  const { data: allAvailableData } = useQuery({
    queryKey: ['inventory-all-available'],
    queryFn: () => getCars({ per_page: 500, status: 'Available' }),
    staleTime: 30_000,
    enabled: view === 'planner',
  })

  const plannerCars = useMemo(() => {
    const raw = allAvailableData?.items ?? []
    return raw.map(c => ({
      id: String(c.id),
      brand: c.brand || undefined,
      model: c.model,
      year: c.manufacturing_year,
      color: c.color || undefined,
      chassisNumber: c.vin || '',
      plateNumber: c.plate_number || undefined,
      sellingPrice: c.selling_price ?? undefined,
      currency: (c.currency === 'USD' || c.currency === 'IQD') ? c.currency : undefined,
      status: c.status,
      coverPhoto: c.cover_photo ? {
        filename: c.cover_photo.filename,
        subfolder: c.cover_photo.subfolder || undefined,
      } : undefined
    }))
  }, [allAvailableData])

  const rawCars = data?.items ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))

  const filteredCars = useMemo(() => {
    let result = [...rawCars]
    if (conditionFilter !== 'all') {
      result = result.filter(c => c.condition === conditionFilter)
    }
    return result
  }, [rawCars, conditionFilter])

  const hasFilters = statusFilter !== 'all' || conditionFilter !== 'all' || supplierId !== 'all' || Boolean(searchQuery)

  const handleResetFilters = () => {
    setStatusFilter('all')
    setConditionFilter('all')
    setSupplierId('all')
    setSearchQuery('')
    setPage(1)
  }

  const handleExportAll = async () => {
    setExporting(true)
    try {
      const allRes = await getCars({
        page: 1,
        per_page: 1000,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        branch_id: activeBranch?.id ? String(activeBranch.id) : undefined,
      })
      const headers = ['رقم السيـارة', 'الماركة والطراز', 'السنة', 'اللون', 'رقم الشاسي (VIN)', 'الحالة', 'سعر البيع', 'العملة']
      if (isAuthorized) headers.push('تكلفة الشراء (خاص)')

      const rows = (allRes?.items ?? []).map(c => {
        const row: (string | number)[] = [
          c.id,
          `${c.brand} ${c.model}`,
          c.manufacturing_year,
          c.color ?? '—',
          c.vin ?? '—',
          translateStatus(c.status),
          c.selling_price ?? 0,
          c.currency ?? 'USD',
        ]
        if (isAuthorized) row.push(c.purchase_price ?? 0)
        return row
      })

      await exportXlsx(`مخزون-السيارات-${rows.length}-سجل`, headers, rows)
      toast.success(`تم تصدير ${rows.length} سجل بنجاح`)
    } catch {
      toast.error('حدث خطأ أثناء تصدير البيانات')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-6 sm:pt-8 pb-8 px-4 sm:px-6 lg:px-8 dir-rtl text-right" dir="rtl">
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        {/* 1. Header & Quick View Controls */}
        <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#101828]">المخزون ({totalCount})</h1>
              <span className="text-xs text-[#667085]">الرئيسية / المخزون</span>
            </div>
            <p className="text-xs text-[#475467]">
              سجل وسيارت المعرض • الفرع: <span className="font-semibold text-[#101828]">{branchLabel}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* View Switcher */}
            <div className="flex items-center rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] p-0.5">
              <button
                type="button"
                onClick={() => handleSetView('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  view === 'cards' ? 'bg-white text-[#175CD3] shadow-xs font-bold' : 'text-[#667085] hover:text-[#101828]'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>بطاقات</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetView('planner')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  view === 'planner' ? 'bg-white text-[#175CD3] shadow-xs font-bold' : 'text-[#667085] hover:text-[#101828]'
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>مخطط الصالة</span>
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 gap-1.5 border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#667085] ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={exporting}
              className="h-9 gap-1.5 border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
            >
              <Download className="h-3.5 w-3.5 text-[#667085]" />
              <span>تصدير Excel</span>
            </Button>

            {isAuthorized && (
              <Button asChild size="sm" className="h-9 gap-1.5 bg-[#175CD3] hover:bg-[#1570EF] text-white font-bold text-xs shadow-xs">
                <Link href="/inventory/new">
                  <Plus className="h-4 w-4" />
                  <span>إضافة سيارة جديدة</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* 2. Filter Bar */}
        {view !== 'planner' && (
          <div className="rounded-xl border border-[#EAECF0] bg-white p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Status Tabs Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {STATUS_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                    statusFilter === opt.value
                      ? 'bg-[#175CD3] text-white shadow-xs'
                      : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#475467] hover:text-[#101828] hover:bg-[#F1F5F9]'
                  )}
                >
                  {opt.label}
                </button>
              ))}

              <div className="h-4 w-[1px] bg-[#E2E8F0] mx-1 shrink-0" />

              {CONDITION_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setConditionFilter(opt.value); setPage(1) }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap',
                    conditionFilter === opt.value
                      ? 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[260px] md:max-w-xs">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                placeholder="البحث بالماركة، الموديل، رقم الشاسي..."
                className="pr-9 h-9 text-xs border-[#CBD5E1] bg-white text-[#0F172A] rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setPage(1) }}
                  className="absolute left-2.5 top-2.5 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

          </div>
        )}

        {/* 3. Primary Content: Showroom Vehicle Card Grid */}
        {view === 'cards' && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white p-3 space-y-3">
                    <Skeleton className="h-44 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs">
                <p className="text-sm font-bold text-[#101828]">تعذر تحميل مخزون السيارات</p>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                  إعادة المحاولة
                </Button>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="rounded-xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs space-y-3">
                <CarIcon className="mx-auto h-10 w-10 text-[#94A3B8]" />
                <p className="text-sm font-bold text-[#101828]">لا توجد سيارات مطابقة</p>
                {hasFilters && (
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {filteredCars.map(car => (
                  <VehicleCard key={car.id} car={car} isAuthorized={isAuthorized} />
                ))}
              </motion.div>
            )}

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="pt-2 flex justify-center">
                <Pagination page={page} totalPages={totalPages} total={totalCount} onPageChange={setPage} label="سيارة" />
              </div>
            )}
          </>
        )}

        {/* Planner View */}
        {view === 'planner' && (
          <ShowroomPlanner cars={plannerCars} />
        )}



      </div>

      {bulkModalOpen && <BulkModelUpdateModal onClose={() => setBulkModalOpen(false)} />}
    </div>
  )
}
