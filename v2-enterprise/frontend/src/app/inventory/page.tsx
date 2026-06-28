'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
import {
  ArrowUpRight, Building2, Car, Download, Eye,
  Fuel, Gauge, LayoutGrid, List, Palette, Plus, Search, Settings, X, Clock, MapPin,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { RowAction } from '@/components/shared/AdvancedTable'
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
import { AdvancedTable, ColumnDef } from '@/components/shared/AdvancedTable'
import { toast } from 'sonner'
import { useBranchStore } from '@/lib/stores/branch-store'
import { ShowroomPlanner } from '@/components/inventory/ShowroomPlanner'
import { useAuthStore } from '@/lib/stores/auth-store'

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

const STATUS_PILLS: Record<string, string> = {
  Available: 'bg-emerald-600 text-white font-extrabold border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  Reserved: 'bg-amber-500 text-white font-extrabold border-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  Sold: 'bg-red-600 text-white font-extrabold border-red-500/20 shadow-[0_0_10px_rgba(230,57,70,0.2)]',
}

function getDaysInInventory(createdAt: string | null) {
  if (!createdAt) return 'مضاف حديثاً'
  const createdDate = new Date(createdAt)
  const diffTime = Math.abs(new Date().getTime() - createdDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return 'اليوم'
  if (diffDays === 2) return 'أمس'
  if (diffDays <= 10) return `منذ ${diffDays} أيام`
  return `منذ ${diffDays} يوماً`
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

// ── Assign Branch Modal ───────────────────────────────────────────────────────

function AssignBranchModal({ car, onClose }: { car: any; onClose: () => void }) {
  const { branches } = useBranchStore()
  const token = useAuthStore(s => s.token)
  const queryClient = useQueryClient()
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    if (selectedBranch === null) return
    setLoading(true)
    try {
      const res = await fetch(`/api/inventory/${car.id}/assign-branch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ branchId: selectedBranch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(data.message)
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'فشل تعيين الفرع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">تعيين للفرع</p>
            <p className="text-xs text-muted-foreground">{car.brand} {car.model} {car.year}</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors text-start',
                selectedBranch === b.id
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/40 hover:bg-secondary/40 text-foreground',
              )}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">{b.name}</span>
              {b.is_main && <span className="mr-auto text-[10px] font-bold text-primary/60 border border-primary/20 rounded px-1.5 py-0.5">رئيسي</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={selectedBranch === null || loading}
            onClick={handleAssign}
          >
            {loading ? 'جاري التعيين...' : 'تعيين'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter()
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [condition, setCondition] = useState('all')
  const [view,      setView]      = useState<'cards' | 'table' | 'planner'>('cards')
  const [page,      setPage]      = useState(1)
  const [exporting, setExporting] = useState(false)
  const [assignCar, setAssignCar] = useState<any>(null)
  const { branches } = useBranchStore()
  const canSeeAll = branches.length > 1
  const perPage = 18

  // Persist view toggle in localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('inventory_view')
    if (savedView === 'cards' || savedView === 'table' || savedView === 'planner') {
      setView(savedView as any)
    }
  }, [])

  const handleSetView = (newView: 'cards' | 'table' | 'planner') => {
    setView(newView)
    localStorage.setItem('inventory_view', newView)
  }

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      key: 'photo',
      header: 'الصورة',
      render: (car) => {
        const cover = car.cover_photo as CarPhoto | null
        return (
          <div className="h-10 w-10 rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center shrink-0">
            {cover ? (
              <img
                src={photoUrl(cover.filename, cover.subfolder ?? 'vehicles')}
                alt={`${car.brand} ${car.model}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Car className="h-4.5 w-4.5 text-muted-foreground/35" />
            )}
          </div>
        )
      },
      width: 65,
    },
    {
      key: 'brand',
      header: 'السيارة',
      render: (car) => (
        <div>
          <p className="text-xs font-bold text-foreground">{car.brand} {car.model}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{car.manufacturing_year} · {car.color}</p>
        </div>
      ),
      width: 150,
    },
    {
      key: 'vin',
      header: 'رقم الهيكل',
      render: (car) => <span className="font-code text-[10px] text-muted-foreground">{car.vin}</span>,
      width: 150,
    },
    {
      key: 'plate_number',
      header: 'رقم اللوحة',
      render: (car) => <span className="text-[11px] font-medium">{car.plate_number || '—'}</span>,
      width: 110,
    },
    {
      key: 'selling_price',
      header: 'سعر البيع',
      isNumeric: true,
      render: (car) => (
        <span className="font-numeric text-xs font-bold text-foreground">
          {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
        </span>
      ),
      width: 140,
    },
    {
      key: 'purchase_price',
      header: 'سعر الشراء',
      isNumeric: true,
      render: (car) => (
        <span className="font-numeric text-xs font-medium text-muted-foreground">
          {formatMoney(car.purchase_price, car.currency)}
        </span>
      ),
      width: 140,
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (car) => (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border', getStatusVariant(car.status))}>
          {translateStatus(car.status)}
        </span>
      ),
      width: 100,
    },
    {
      key: 'actions',
      header: '',
      render: (car) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          {canSeeAll && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title="تعيين للفرع"
              onClick={() => setAssignCar(car)}
            >
              <Building2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button asChild variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Link href={`/inventory/${car.id}`}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
      width: 80,
    }
  ], [])

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

  // Query to get all available cars when the planner view is enabled
  const { data: allAvailableData } = useQuery({
    queryKey: ['inventory-all-available'],
    queryFn: () => getCars({ per_page: 500, status: 'Available' }),
    staleTime: 30_000,
    enabled: view === 'planner',
  })

  // Format the available cars list for the ShowroomPlanner component
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
      {([
        ['cards', LayoutGrid, 'عرض بطاقات'],
        ['table', List, 'عرض جدول'],
        ['planner', MapPin, 'مخطط الصالة']
      ] as const).map(([v, Icon, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => handleSetView(v)}
          aria-label={label}
          title={label}
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
    <>
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
      {view !== 'planner' && (
        <div className="space-y-3 mt-4">
          {view !== 'table' && (
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="بحث بالماركة أو الموديل أو رقم الهيكل..."
                className="h-10 bg-[var(--s1)] ps-10 text-sm border-border/40 focus:border-primary/50"
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
          )}

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
      )}

      {/* ── Body: sidebar + content ──────────────────────────────────────── */}
      <div className="mt-5 flex items-start gap-5">

        {/* Sidebar — desktop only */}
        {view !== 'planner' && (
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
        )}

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
                {/* ── Featured Car Banner (Oldest Available) ── */}
                {!hasFilters && page === 1 && (
                  (() => {
                    const avail = items.filter(c => c.status === 'Available')
                    if (avail.length === 0) return null
                    // Sort by created_at ascending to find oldest
                    const oldest = [...avail].sort((a, b) => {
                      const da = a.created_at ? new Date(a.created_at).getTime() : 0
                      const db = b.created_at ? new Date(b.created_at).getTime() : 0
                      return da - db
                    })[0]
                    
                    if (!oldest) return null
                    const diffDays = oldest.created_at 
                      ? Math.ceil(Math.abs(Date.now() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24))
                      : 0

                    return (
                      <div className="mb-6 rounded-2xl border border-red-500/25 bg-gradient-to-r from-red-500/[0.04] to-amber-500/[0.04] p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden select-none">
                        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />
                        
                        <div className="space-y-3 relative z-10 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-red-500/15 border border-red-500/20 px-3 py-0.5 text-[10px] font-black text-red-500 uppercase tracking-widest">
                              أطول سيارة مكثت بدون بيع
                            </span>
                            <span className="text-[10px] text-muted-foreground font-bold">
                              {oldest.manufacturing_year}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-black text-foreground font-family-cairo leading-tight">
                              {oldest.brand} {oldest.model}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">{oldest.trim || 'فئة قياسية'}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-red-500" />
                              في المعرض منذ <strong className="text-foreground font-numeric">{diffDays}</strong> يوماً
                            </span>
                            <span>·</span>
                            <span>الهيكل: <strong className="font-mono text-[10px] text-foreground">{oldest.vin}</strong></span>
                            <span>·</span>
                            <span>السعر المعروض: <strong className="text-red-500 font-numeric">{oldest.selling_price ? formatMoney(oldest.selling_price, oldest.currency) : '—'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 relative z-10">
                          <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 rounded-xl px-4 shadow-md shadow-red-600/10">
                            <Link href={`/sales/new?car_id=${oldest.id}`}>
                              تسجيل بيع سريع
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="h-9 rounded-xl px-4 text-xs border-border/60">
                            <Link href={`/inventory/${oldest.id}`}>
                              تفاصيل السيارة
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })()
                )}

                {/* ── Luxury Car Configurator Grid ── */}
                <motion.div
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
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
                    
                    const createdDate = car.created_at ? new Date(car.created_at) : null
                    const diffDays = createdDate
                      ? Math.ceil(Math.abs(Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                      : 0

                    const daysLabel = diffDays <= 1 ? 'اليوم' : diffDays === 2 ? 'أمس' : `منذ ${diffDays} يوماً`
                    
                    // Stagnation limit = 90 days
                    const progressPct = Math.min(100, Math.round((diffDays / 90) * 100))
                    const barColor = diffDays > 60 
                      ? 'bg-rose-500' 
                      : diffDays > 30 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500 font-semibold'

                    return (
                      <motion.div key={car.id} variants={cardVariants}>
                        <div
                          className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-md hover:border-primary/30 flex flex-col h-full select-none shadow-xs"
                        >
                          {/* Image & Status & Urgency Overlay */}
                          <div className="relative h-[200px] overflow-hidden bg-white/[0.02] w-full shrink-0 flex items-center justify-center">
                            {car.cover_photo ? (
                              <img
                                src={photoUrl(
                                  (car.cover_photo as CarPhoto).filename,
                                  (car.cover_photo as CarPhoto).subfolder ?? 'vehicles',
                                )}
                                alt={`${car.brand} ${car.model}`}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="h-full w-full bg-white/[0.02] flex items-center justify-center">
                                {/* Car silhouette SVG placeholder */}
                                <svg className="w-32 h-16 text-white/10" viewBox="0 0 100 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M 10 35 L 20 35 C 22 35 23 33 24 31 L 28 20 C 30 15 35 12 45 12 L 65 12 C 70 12 75 14 77 18 L 84 31 C 85 33 86 35 88 35 L 94 35 C 96 35 98 37 98 39 L 98 43 C 98 44 97 45 96 45 L 90 45 C 90 41 86 38 82 38 C 78 38 74 41 74 45 L 36 45 C 36 41 32 38 28 38 C 24 38 20 41 20 45 L 4 45 C 3 45 2 44 2 43 L 2 39 C 2 37 4 35 6 35 Z" />
                                  <circle cx="28" cy="45" r="7" />
                                  <circle cx="82" cy="45" r="7" />
                                  <path d="M 33 20 L 48 20 L 48 15 L 36 15 Z" />
                                  <path d="M 52 20 L 73 20 L 68 15 L 52 15 Z" />
                                </svg>
                              </div>
                            )}

                            {/* Floating status badge */}
                            <span className={cn(
                              'absolute top-3 end-3 rounded-full px-2.5 py-0.5 text-[9px] font-black border backdrop-blur-md shadow-sm select-none',
                              STATUS_PILLS[car.status] || 'bg-secondary text-white'
                            )}>
                              {translateStatus(car.status)}
                            </span>
                          </div>

                          {/* Info Body */}
                          <div className="p-4.5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/40 font-semibold">
                                  {car.condition ? (CONDITION_LABEL[car.condition] ?? car.condition) : '—'}
                                </span>
                                {diffDays <= 30 && (
                                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[8px] font-black text-emerald-400">
                                    جديد
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="text-sm font-bold text-white font-family-cairo leading-snug truncate">
                                {car.brand} {car.model}
                              </h4>
                              
                              {/* Chips for Year, Color, Mileage */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="font-numeric text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-white/75">{car.manufacturing_year}</span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 text-white/75">{car.color}</span>
                                <span className="font-numeric text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-white/75">
                                  {car.mileage !== undefined && car.mileage !== null ? `${car.mileage.toLocaleString('ar-IQ')} كم` : '0 كم'}
                                </span>
                              </div>
                            </div>

                            {/* Price and Margin */}
                            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3">
                              <div className="flex flex-col">
                                <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">السعر المعروض</span>
                                <span className="font-numeric text-base font-black text-white mt-0.5">
                                  {car.selling_price ? formatMoney(car.selling_price, car.currency) : 'اتصل للسعر'}
                                </span>
                              </div>
                              {margin !== null && (
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] text-white/40 font-bold">الهامش المتوقع</span>
                                  <span className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold border mt-0.5',
                                    margin >= 0
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                  )}>
                                    {margin >= 0 ? '+' : ''}{margin}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Actions */}
                            <div className="flex gap-2 border-t border-white/5 pt-3.5 mt-auto">
                              <Button asChild size="sm" className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-white hover:text-white border border-white/5 h-8 rounded-lg text-xs">
                                <Link href={`/inventory/${car.id}`}>
                                  عرض التفاصيل
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-xs border-white/5 bg-transparent hover:bg-white/[0.04] text-white/70 hover:text-white">
                                <Link href={`/inventory/${car.id}/edit`}>
                                  تعديل
                                </Link>
                              </Button>
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
            <AdvancedTable
              data={items}
              columns={columns}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => refetch()}
              searchPlaceholder="بحث بالماركة أو الموديل أو رقم الهيكل..."
              searchValue={search}
              onSearchChange={(val) => { setSearch(val); setPage(1) }}
              exportFilename="المخزون"
              rowActions={(car) => [
                { label: 'عرض', icon: <Eye className="h-3 w-3" />, onClick: (c) => router.push(`/inventory/${c.id}`) },
              ]}
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
            />
          )}

          {/* ── Showroom Planner View ──────────────────────────────────── */}
          {view === 'planner' && (
            <ShowroomPlanner cars={plannerCars} />
          )}

        </div>
      </div>

    </div>

    {assignCar && <AssignBranchModal car={assignCar} onClose={() => setAssignCar(null)} />}
    </>
  )
}
