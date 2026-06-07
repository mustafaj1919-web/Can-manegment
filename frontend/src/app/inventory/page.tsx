'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight, Car, CheckCircle2, Clock, Download,
  Fuel, LayoutGrid, List, Palette, Plus, Settings, Tag,
} from 'lucide-react'
import { cn, formatMoney, getStatusVariant, photoUrl, translateStatus } from '@/lib/utils'
import { getCars } from '@/lib/api/inventory'
import type { CarPhoto } from '@/lib/api/inventory'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatStrip } from '@/components/shared/StatStrip'
import { FilterBar } from '@/components/shared/FilterBar'
import { DataTable } from '@/components/shared/DataTable'

const STATUS_OPTS = [
  { value: 'all',       label: 'جميع الحالات' },
  { value: 'Available', label: 'متاحة' },
  { value: 'Sold',      label: 'مباعة' },
  { value: 'Reserved',  label: 'محجوزة' },
]


const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي',
}
const TRANS_LABEL: Record<string, string> = {
  Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT',
}

export default function InventoryPage() {
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [view,   setView]       = useState<'cards' | 'table'>('cards')
  const [page,   setPage]       = useState(1)
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

  // Lightweight aggregate counts for StatStrip (per_page:1 returns only the total)
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

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasFilters = !!(search || status !== 'all')

  function resetFilters() {
    setSearch(''); setStatus('all'); setPage(1)
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
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-5" dir="rtl">

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

      <StatStrip
        stats={[
          {
            label: 'إجمالي السيارات',
            value: counts ? counts.available + counts.reserved + counts.sold : '...',
            icon: <Car className="h-4 w-4" />,
            color: 'info',
          },
          {
            label: 'متاحة للبيع',
            value: counts?.available ?? '...',
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'success',
          },
          {
            label: 'محجوزة',
            value: counts?.reserved ?? '...',
            icon: <Clock className="h-4 w-4" />,
            color: 'warning',
          },
          {
            label: 'مباعة',
            value: counts?.sold ?? '...',
            icon: <Tag className="h-4 w-4" />,
            color: 'default',
          },
        ]}
      />

      <FilterBar
        search={{
          value: search,
          onChange: v => { setSearch(v); setPage(1) },
          placeholder: 'بحث بالماركة أو الموديل أو رقم الهيكل أو اللوحة...',
        }}
        selects={[
          {
            value: status,
            onChange: v => { setStatus(v); setPage(1) },
            options: STATUS_OPTS,
            width: 'w-full sm:w-[170px]',
          },
        ]}
        hasActiveFilters={hasFilters}
        onReset={resetFilters}
        onRefresh={() => refetch()}
      />

      {/* Cards view — loading/error/empty handled inline; DataTable not suited for grid layout */}
      {view === 'cards' && (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((car) => (
                <div
                  key={car.id}
                  className="glass-interactive overflow-hidden rounded-xl"
                >
                  {car.cover_photo && (
                    <div className="relative h-36 w-full overflow-hidden bg-secondary/30">
                      <img
                        src={photoUrl((car.cover_photo as CarPhoto).filename, (car.cover_photo as CarPhoto).subfolder ?? 'vehicles')}
                        alt={`${car.brand} ${car.model}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {car.brand} {car.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {car.manufacturing_year}{car.trim ? ` · ${car.trim}` : ''}
                        </p>
                      </div>
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        getStatusVariant(car.status)
                      )}>
                        {translateStatus(car.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Palette className="h-3 w-3 shrink-0 opacity-60" />
                        <span className="truncate">{car.color}</span>
                      </div>
                      {car.fuel_type && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Fuel className="h-3 w-3 shrink-0 opacity-60" />
                          <span>{FUEL_LABEL[car.fuel_type] ?? car.fuel_type}</span>
                        </div>
                      )}
                      {car.transmission && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Settings className="h-3 w-3 shrink-0 opacity-60" />
                          <span>{TRANS_LABEL[car.transmission] ?? car.transmission}</span>
                        </div>
                      )}
                      <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="opacity-60">VIN:</span>
                        <span className="font-code truncate">{car.vin}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/30 pt-3">
                      <div>
                        <p className="font-numeric text-sm font-bold text-foreground">
                          {car.selling_price ? formatMoney(car.selling_price, car.currency) : '—'}
                        </p>
                        <p className="font-numeric text-[11px] text-muted-foreground">
                          شراء: {formatMoney(car.purchase_price, car.currency)}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Link href={`/inventory/${car.id}`} aria-label="عرض تفاصيل السيارة">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="سيارة" />
          </>
        )
      )}

      {/* Table view — DataTable handles all states */}
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
                <tr
                  key={car.id}
                >
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
  )
}
