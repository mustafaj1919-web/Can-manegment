'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowUpRight, Car, Download,
  Fuel, Gauge, LayoutGrid, List, Palette, Plus, Search, Settings, X,
} from 'lucide-react'
import { cn, formatMoney, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCars } from '@/lib/api/inventory'
import type { CarPhoto } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'

// ── Constants ────────────────────────────────────────────────────────────────

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

// ── Framer-Motion Variants ───────────────────────────────────────────────────

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
}

// ── Sidebar Filter ───────────────────────────────────────────────────────────

interface SidebarFilterProps {
  status: string
  onStatusChange: (v: string) => void
  condition: string
  onConditionChange: (v: string) => void
  hasFilters: boolean
  onReset: () => void
  counts?: { available: number; reserved: number; sold: number }
  totalCount?: number
}

function SidebarFilter({
  status, onStatusChange,
  condition, onConditionChange,
  hasFilters, onReset,
  counts, totalCount,
}: SidebarFilterProps) {
  const statusItems = [
    { value: 'all',       label: 'جميع الحالات', count: totalCount,        badgeCls: 'bg-secondary text-muted-foreground' },
    { value: 'Available', label: 'متاحة للبيع',  count: counts?.available, badgeCls: 'bg-emerald-500/12 text-emerald-400' },
    { value: 'Reserved',  label: 'محجوزة',        count: counts?.reserved,  badgeCls: 'bg-amber-500/12 text-amber-400' },
    { value: 'Sold',      label: 'مباعة',         count: counts?.sold,      badgeCls: 'bg-violet-500/12 text-violet-400' },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-card)] bg-[var(--s1)]">

      {/* Status */}
      <div className="border-b border-border/30 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/45">الحالة</p>
      </div>
      <div className="space-y-0.5 px-2 py-2">
        {statusItems.map(item => (
          <button
            key={item.value}
            type="button"
            onClick={() => onStatusChange(item.value)}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-start',
              status === item.value
                ? 'bg-[hsl(var(--primary)/0.10)] text-primary'
                : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                item.badgeCls,
              )}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Condition */}
      <div className="border-y border-border/30 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/45">النوع</p>
      </div>
      <div className="space-y-0.5 px-2 py-2">
        {CONDITION_OPTS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onConditionChange(opt.value)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-start',
              condition === opt.value
                ? 'bg-[hsl(var(--primary)/0.10)] text-primary'
                : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            <span className={cn(
              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors',
              condition === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground/25',
            )}>
              {condition === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Reset */}
      {hasFilters && (
        <div className="border-t border-border/30 p-2">
          <button
            type="button"
            onClick={onReset}
            className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400/80 transition-colors hover:bg-rose-500/[0.08] hover:text-rose-400"
          >
            <X className="h-3 w-3 shrink-0" />
            مسح الفلاتر
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [condition, setCondition] = useState('all')
  const [view,      setView]      = useState<'cards' | 'table'>('cards')
  const [page,      setPage]      = useState(1)
  const [exporting, setExporting] = useState(false)
  const perPage = 18

  const params = useMemo(() => ({
    page,
    per_page: perPage,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
  }), [page, search, status])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory', params],
    queryFn: () => getCars(params),
    staleTime: 30_000,
    retry: 1,
  })

  const { data: counts } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const [avail, reserved, sold] = await Promise.all([
        getCars({ status: 'Available', per_page: 1, page: 1 }),
        getCars({ status: 'Reserved',  per_page: 1, page: 1 }),
        getCars({ status: 'Sold',      per_page: 1, page: 1 }),
      ])
      return { available: avail.total, reserved: reserved.total, sold: sold.total }
    },
    staleTime: 120_000,
    retry: 1,
  })

  const rawItems = data?.items ?? []
  const items    = useMemo(
    () => condition === 'all' ? rawItems : rawItems.filter(c => c.condition === condition),
    [rawItems, condition],
  )
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasFilters = !!(search || status !== 'all' || condition !== 'all')
  const totalCount = counts ? counts.available + counts.reserved + counts.sold : undefined

  function resetFilters() {
    setSearch(''); setStatus('all'); setCondition('all'); setPage(1)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = await getCars({ ...params, page: 1, per_page: 1000 })
      const headers = ['الماركة', 'الموديل', 'السنة', 'الفئة', 'اللون', 'رقم الهيكل', 'رقم اللوحة', 'سعر البيع', 'سعر الشراء', 'الحالة']
      const rows = all.items.map(c => [
        c.brand, c.model, c.manufacturing_year, c.trim ?? '',
        c.color, c.vin, c.plate_number,
        c.selling_price ?? 0, c.purchase_price,
        translateStatus(c.status),
      ])
      await exportXlsx('المخزون', headers, rows)
    } finally {
      setExporting(false)
    }
  }

  const viewToggle = (
    <div className="flex rounded-lg border border-border/60 bg-secondary/30 p-0.5">
      {([['cards', LayoutGrid], ['table', List]] as const).map(([v, Icon]) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          aria-label={v === 'cards' ? 'عرض بطاقات' : 'عرض جدول'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            view === v
              ? 'bg-secondary text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )

  return (
    <div dir="rtl">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="المخزون"
        icon={<Car className="h-4 w-4" />}
        count={isLoading ? undefined : total}
        filtered={hasFilters}
        actions={
          <>
            {viewToggle}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || isLoading || total === 0}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'جاري التصدير...' : 'Excel'}
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
              <Link href="/inventory/new">
                <Plus className="h-3.5 w-3.5" />
                سيارة جديدة
              </Link>
            </Button>
          </>
        }
      />

      {/* ── Status stats strip ── */}
      {counts && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/20 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <span className="font-numeric text-[11px] font-semibold tabular-nums text-foreground">
              {totalCount ?? '—'}
            </span>
            <span className="text-[11px] text-muted-foreground/55">إجمالي</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-numeric text-[11px] font-semibold tabular-nums text-emerald-400">
              {counts.available}
            </span>
            <span className="text-[11px] text-muted-foreground/55">متاحة</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="font-numeric text-[11px] font-semibold tabular-nums text-amber-400">
              {counts.reserved}
            </span>
            <span className="text-[11px] text-muted-foreground/55">محجوزة</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/15 bg-rose-500/5 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span className="font-numeric text-[11px] font-semibold tabular-nums text-rose-400">
              {counts.sold}
            </span>
            <span className="text-[11px] text-muted-foreground/55">مباعة</span>
          </div>
        </div>
      )}

      {/* ── Search & Filter Chips ── */}
      <div className="space-y-3 mt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالماركة أو الموديل أو رقم الهيكل..."
            className="h-10 bg-[var(--s1)] ps-10 text-sm border-white/5 focus:border-red-500/50"
          />
          {search && (
            <button
              type="button"
              aria-label="مسح البحث"
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground/40 transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Brand / Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pb-1 overflow-x-auto">
          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.07em] select-none">تصفية:</span>

          {/* Status Chips */}
          <div className="flex items-center gap-1.5 border-e border-border/25 pe-3">
            {STATUS_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setStatus(opt.value); setPage(1) }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all select-none',
                  status === opt.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-secondary/40 border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60',
                )}
              >
                {status === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Condition Chips */}
          <div className="flex items-center gap-1.5">
            {CONDITION_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setCondition(opt.value); setPage(1) }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all select-none',
                  condition === opt.value
                    ? 'bg-primary/15 border border-primary/30 text-primary'
                    : 'bg-secondary/40 border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60',
                )}
              >
                {condition === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-primary/80 shrink-0" />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + content ──────────────────────────────────────── */}
      <div className="mt-5 flex items-start gap-5">

        {/* Sidebar — desktop only */}
        <aside className="hidden w-[210px] shrink-0 lg:block lg:sticky lg:top-[76px]">
          <SidebarFilter
            status={status}
            onStatusChange={s => { setStatus(s); setPage(1) }}
            condition={condition}
            onConditionChange={c => { setCondition(c); setPage(1) }}
            hasFilters={hasFilters}
            onReset={resetFilters}
            counts={counts}
            totalCount={totalCount}
          />
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">

          {/* Mobile status tab pills */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5 lg:hidden" />

          {/* ── Cards View ─────────────────────────────────────────────── */}
          {view === 'cards' && (
            isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
                    <Skeleton className="h-56 rounded-none" />
                    <div className="space-y-2.5 p-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex gap-1.5 pt-1">
                        <Skeleton className="h-5 w-16 rounded-md" />
                        <Skeleton className="h-5 w-14 rounded-md" />
                      </div>
                      <div className="flex items-end justify-between border-t border-border/30 pt-3">
                        <div className="space-y-1.5">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-10 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="app-card rounded-xl">
                <EmptyState
                  variant="error"
                  title="تعذر تحميل المخزون"
                  description="تحقق من تشغيل الخادم ثم أعد المحاولة"
                  action={
                    <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
                      إعادة المحاولة
                    </Button>
                  }
                />
              </div>
            ) : items.length === 0 ? (
              <div className="app-card rounded-xl">
                <EmptyState
                  variant={hasFilters ? 'search' : 'default'}
                  icon={<Car className="h-5 w-5" />}
                  title={hasFilters ? 'لا توجد سيارات مطابقة' : 'المخزون فارغ'}
                  description={hasFilters ? 'جرّب تعديل معايير البحث أو الفلترة' : 'أضف أول سيارة لبدء المخزون'}
                  action={
                    hasFilters ? (
                      <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
                        مسح الفلاتر
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link href="/inventory/new">
                          <Plus className="me-1.5 h-3.5 w-3.5" />
                          سيارة جديدة
                        </Link>
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                >
                  {items.map((car) => {
                    const sp = Number(car.selling_price ?? 0)
                    const pp = Number(car.purchase_price)
                    const margin = sp > 0 && pp > 0
                      ? Math.round(((sp - pp) / pp) * 100)
                      : null

                    return (
                      <motion.div key={car.id} variants={cardVariants}>
                        <div
                          className="vehicle-card group block overflow-hidden rounded-xl bg-[#111111] border border-white/5 hover:border-red-500/30 transition-all duration-300"
                        >
                          {/* Image Link container */}
                          <Link href={`/inventory/${car.id}`} className="block relative h-64 overflow-hidden bg-[#161616]">
                            {car.cover_photo ? (
                              <img
                                src={photoUrl(
                                  (car.cover_photo as CarPhoto).filename,
                                  (car.cover_photo as CarPhoto).subfolder ?? 'vehicles',
                                )}
                                alt={`${car.brand} ${car.model}`}
                                className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.05]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_110%,rgba(239,27,45,0.12),transparent_46%),linear-gradient(145deg,#161616,#090909)] p-6">
                                <img
                                  src="/fallback_car.png"
                                  alt="Premium Showroom Car"
                                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04] drop-shadow-[0_15px_30px_rgba(239,27,45,0.35)]"
                                  loading="lazy"
                                />
                                <span className="absolute top-3 start-3 text-[9px] font-black uppercase tracking-widest text-white/30 font-family-cairo">
                                  {car.brand}
                                </span>
                              </div>
                            )}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />
                            <span className={cn(
                              'absolute bottom-3 start-3 rounded-full px-2.5 py-1 text-[10px] font-bold border backdrop-blur-md',
                              getStatusVariant(car.status),
                            )}>
                              {translateStatus(car.status)}
                            </span>
                            {car.condition && car.condition !== 'New' && (
                              <span className="absolute bottom-3 end-3 rounded-full bg-black/60 border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur-md">
                                {CONDITION_LABEL[car.condition] ?? car.condition}
                              </span>
                            )}
                          </Link>

                          {/* Card body */}
                          <div className="space-y-3 p-4">
                            <Link href={`/inventory/${car.id}`} className="block">
                              <p className="text-[15px] font-black leading-tight text-white font-family-cairo hover:text-red-500 transition-colors">
                                {car.brand} {car.model}
                              </p>
                              <p className="mt-1 text-[10px] text-neutral-400/80">
                                {car.manufacturing_year}{car.trim ? ` · ${car.trim}` : ''}
                              </p>
                            </Link>

                            {/* Spec chips */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.07] px-2.5 py-1 text-[9px]",
                                car.fuel_type ? "text-neutral-300" : "text-neutral-600"
                              )}>
                                <Fuel className="h-2.5 w-2.5 opacity-80 text-red-500" />
                                {car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : "غير محدد"}
                              </span>

                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.07] px-2.5 py-1 text-[9px]",
                                car.transmission ? "text-neutral-300" : "text-neutral-600"
                              )}>
                                <Settings className="h-2.5 w-2.5 opacity-80 text-red-500" />
                                {car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : "غير محدد"}
                              </span>

                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.07] px-2.5 py-1 text-[9px]",
                                car.mileage !== undefined && car.mileage !== null ? "text-neutral-300" : "text-neutral-600"
                              )}>
                                <Gauge className="h-2.5 w-2.5 opacity-80 text-red-500" />
                                {car.mileage !== undefined && car.mileage !== null ? `${car.mileage.toLocaleString('ar-EG')} كم` : "غير محدد"}
                              </span>
                            </div>

                            {/* Price section */}
                            <div className="flex items-center justify-between rounded-lg bg-white/[0.025] border border-white/[0.055] px-3 py-2.5 mt-2">
                              <div className="min-w-0">
                                <p className="font-numeric text-[17px] font-black leading-none text-red-500">
                                  {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                                </p>
                                <p className="font-numeric mt-1 text-[9px] text-neutral-500">
                                  شراء: {formatMoney(car.purchase_price, car.currency)}
                                </p>
                              </div>
                              {margin !== null && (
                                <span className={cn(
                                  'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black border',
                                  margin >= 0
                                    ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/15 text-rose-400',
                                )}>
                                  {margin >= 0 ? '+' : ''}{margin}%
                                </span>
                              )}
                            </div>

                            {/* Redesigned Quick Action buttons */}
                            <div className="grid grid-cols-3 gap-1.5 border-t border-white/5 pt-3 mt-2">
                              <Button asChild size="sm" className="col-span-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] h-8">
                                <Link href={`/inventory/${car.id}`}>
                                  عرض التفاصيل
                                </Link>
                              </Button>

                              <div className="flex gap-1 justify-end">
                                <Button asChild size="icon-sm" variant="ghost" className="h-8 w-8 rounded bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10" title="تعديل">
                                  <Link href={`/inventory/${car.id}/edit`}>
                                    <Settings className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                                {car.status === 'Available' && (
                                  <Button asChild size="icon-sm" variant="ghost" className="h-8 w-8 rounded bg-red-600/10 border border-red-500/10 text-red-500 hover:text-white hover:bg-red-600" title="تسجيل بيع">
                                    <Link href={`/sales/new?car_id=${car.id}`}>
                                      <ArrowUpRight className="h-3.5 w-3.5" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>

                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="سيارة" />
              </>
            )
          )}

          {/* ── Table View ─────────────────────────────────────────────── */}
          {view === 'table' && (
            <DataTable
              isLoading={isLoading}
              isError={isError}
              isEmpty={items.length === 0}
              onRetry={() => refetch()}
              emptyProps={{
                variant: hasFilters ? 'search' : 'default',
                icon: <Car className="h-5 w-5" />,
                title: hasFilters ? 'لا توجد سيارات مطابقة' : 'المخزون فارغ',
                description: hasFilters ? 'جرّب تعديل معايير البحث أو الفلترة' : 'أضف أول سيارة لبدء المخزون',
                action: hasFilters ? (
                  <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
                    مسح الفلاتر
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/inventory/new">
                      <Plus className="me-1.5 h-3.5 w-3.5" />
                      سيارة جديدة
                    </Link>
                  </Button>
                ),
              }}
              footer={
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={setPage}
                  label="سيارة"
                  compact
                />
              }
            >
              <table className="app-table">
                <thead>
                  <tr>
                    <th>السيارة</th>
                    <th>رقم الهيكل</th>
                    <th className="hidden sm:table-cell">اللوحة</th>
                    <th>سعر البيع</th>
                    <th className="hidden md:table-cell">سعر الشراء</th>
                    <th>الحالة</th>
                    <th className="w-10"><span className="sr-only">إجراءات</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((car) => (
                    <tr key={car.id}>
                      <td>
                        <p className="text-xs font-semibold">{car.brand} {car.model}</p>
                        <p className="text-[11px] text-muted-foreground">{car.manufacturing_year} · {car.color}</p>
                      </td>
                      <td className="font-code text-[11px] text-muted-foreground">{car.vin}</td>
                      <td className="hidden sm:table-cell text-xs">{car.plate_number || '—'}</td>
                      <td className="font-numeric text-xs font-semibold text-foreground">
                        {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                      </td>
                      <td className="hidden md:table-cell font-numeric text-xs text-muted-foreground">
                        {formatMoney(car.purchase_price, car.currency)}
                      </td>
                      <td>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', getStatusVariant(car.status))}>
                          {translateStatus(car.status)}
                        </span>
                      </td>
                      <td className="text-end">
                        <Button asChild variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Link href={`/inventory/${car.id}`}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}

        </div>
      </div>

    </div>
  )
}
