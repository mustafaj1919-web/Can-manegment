'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowUpRight,
  Car,
  Download,
  Filter,
  Fuel,
  LayoutGrid,
  List,
  Palette,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { cn, formatMoney, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCars } from '@/lib/api/inventory'
import type { CarPhoto } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportXlsx } from '@/lib/export'

const STATUS_OPTS = [
  { value: 'all', label: 'الكل' },
  { value: 'Available', label: 'متاحة' },
  { value: 'Sold', label: 'مباعة' },
  { value: 'Reserved', label: 'محجوزة' },
]

const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين',
  Diesel: 'ديزل',
  Hybrid: 'هايبرد',
  Electric: 'كهربائي',
}

const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك',
  Manual: 'يدوي',
  CVT: 'CVT',
  DCT: 'DCT',
}

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const perPage = 18

  const params = useMemo(() => ({
    page,
    per_page: perPage,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
  }), [page, search, status])

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory', params],
    queryFn: () => getCars(params),
    staleTime: 30_000,
    retry: 1,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    refetch()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <Car className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المخزون</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${total} سيارة`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass flex rounded-lg p-1">
            <button
              type="button"
              onClick={() => setView('cards')}
              className={cn('flex h-8 w-8 items-center justify-center rounded-md transition-colors', view === 'cards' ? 'bg-violet-500/20 text-violet-200' : 'text-muted-foreground hover:text-foreground')}
              aria-label="عرض بطاقات"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={cn('flex h-8 w-8 items-center justify-center rounded-md transition-colors', view === 'table' ? 'bg-violet-500/20 text-violet-200' : 'text-muted-foreground hover:text-foreground')}
              aria-label="عرض جدول"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm"
            onClick={handleExport} disabled={exporting || isLoading || total === 0}
            className="h-9 gap-2 border-white/10 bg-white/5 text-xs hover:bg-white/10">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'Excel'}
          </Button>
          <Button asChild className="gap-2 bg-violet-600 text-white hover:bg-violet-500">
            <Link href="/inventory/new">
              <Plus className="h-4 w-4" />
              سيارة جديدة
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="بحث بالماركة أو الموديل أو الشاصي أو اللوحة"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-10 border-white/10 bg-white/5 ps-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-full border-white/10 bg-white/5 sm:w-[150px]">
              <Filter className="me-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary" className="h-10">
            بحث
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className={cn(view === 'cards' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل المخزون</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-lg py-16 text-center">
          <Car className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">لا توجد سيارات مطابقة</p>
          <Button asChild size="sm" className="mt-4 gap-2 bg-violet-600 text-white hover:bg-violet-500">
            <Link href="/inventory/new">
              <Plus className="h-3.5 w-3.5" />
              سيارة جديدة
            </Link>
          </Button>
        </div>
      ) : view === 'cards' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((car, index) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-interactive overflow-hidden rounded-lg"
              >
                {/* Cover photo or accent bar */}
                {car.cover_photo ? (
                  <div className="relative h-36 w-full overflow-hidden bg-white/[0.03]">
                    <img
                      src={photoUrl(car.cover_photo.filename, car.cover_photo.subfolder ?? 'vehicles')}
                      alt={`${car.brand} ${car.model}`}
                      className="h-full w-full object-cover"
                    />
                    <div className={cn('absolute bottom-0 left-0 right-0 h-1', {
                      'bg-emerald-500': car.status === 'Available',
                      'bg-violet-500': car.status === 'Sold',
                      'bg-amber-500': car.status === 'Reserved',
                    })} />
                  </div>
                ) : (
                  <div className={cn('h-1', {
                    'bg-emerald-500': car.status === 'Available',
                    'bg-violet-500': car.status === 'Sold',
                    'bg-amber-500': car.status === 'Reserved',
                  })} />
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {car.brand} {car.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {car.manufacturing_year}{car.trim ? ` - ${car.trim}` : ''}
                      </p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', getStatusVariant(car.status))}>
                      {translateStatus(car.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Palette className="h-3 w-3" />
                      <span className="truncate">{car.color}</span>
                    </div>
                    {car.fuel_type && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Fuel className="h-3 w-3" />
                        <span>{FUEL_LABEL[car.fuel_type] ?? car.fuel_type}</span>
                      </div>
                    )}
                    {car.transmission && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Settings className="h-3 w-3" />
                        <span>{TRANS_LABEL[car.transmission] ?? car.transmission}</span>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>الشاصي:</span>
                      <span className="font-numeric truncate">{car.vin}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <div>
                      <p className="font-numeric text-sm font-bold text-amber-300">
                        {car.selling_price ? formatMoney(car.selling_price, car.currency) : '-'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        شراء: {formatMoney(car.purchase_price, car.currency)}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8">
                      <Link href={`/inventory/${car.id}`} aria-label="عرض تفاصيل السيارة">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
        </>
      ) : (
        <div className="glass overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['السيارة', 'الشاصي', 'اللوحة', 'سعر البيع', 'سعر الشراء', 'الحالة', ''].map((heading) => (
                    <th key={heading} className="px-4 py-3.5 text-start text-xs font-medium text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((car, index) => (
                  <motion.tr
                    key={car.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold">{car.brand} {car.model}</p>
                      <p className="text-[11px] text-muted-foreground">{car.manufacturing_year} - {car.color}</p>
                    </td>
                    <td className="font-numeric px-4 py-3.5 text-[11px] text-muted-foreground">{car.vin}</td>
                    <td className="px-4 py-3.5 text-xs">{car.plate_number || '-'}</td>
                    <td className="font-numeric px-4 py-3.5 text-xs text-amber-300">
                      {car.selling_price ? formatMoney(car.selling_price, car.currency) : '-'}
                    </td>
                    <td className="font-numeric px-4 py-3.5 text-xs">{formatMoney(car.purchase_price, car.currency)}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', getStatusVariant(car.status))}>
                        {translateStatus(car.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-end">
                      <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8">
                        <Link href={`/inventory/${car.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} compact />
        </div>
      )}
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  total,
  setPage,
  compact = false,
}: {
  page: number
  totalPages: number
  total: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  compact?: boolean
}) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('glass flex items-center justify-between rounded-lg px-4 py-3', compact && 'rounded-none border-x-0 border-b-0')}>
      <span className="text-xs text-muted-foreground">
        صفحة {page} من {totalPages} - {total} سيارة
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          السابق
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
          التالي
        </Button>
      </div>
    </div>
  )
}
