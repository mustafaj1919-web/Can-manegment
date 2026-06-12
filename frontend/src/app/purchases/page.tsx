'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight, Ban, Calendar, Car, CheckCircle2,
  Clock, Download, Plus, Receipt, ShoppingBag, User,
} from 'lucide-react'
import { cn, formatDate, formatMoney, getStatusVariant, translateStatus } from '@/lib/utils'
import { getPurchases, type PurchaseListItem } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterBar } from '@/components/shared/FilterBar'
import { AdvancedTable, ColumnDef } from '@/components/shared/AdvancedTable'

function KpiCard({ icon, label, value, iconColor, iconBg }: {
  icon: React.ReactNode; label: string; value: number | string
  iconColor: string; iconBg: string
}) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
      <div className={cn('mb-3 flex h-8 w-8 items-center justify-center rounded-lg border', iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="font-numeric text-2xl font-bold tabular-nums text-foreground">
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground/60 font-semibold">{label}</p>
    </div>
  )
}

const STATUS_OPTS = [
  { value: 'all',       label: 'كل الحالات' },
  { value: 'Active',    label: 'نشطة' },
  { value: 'Cancelled', label: 'ملغاة' },
]
const METHOD_OPTS = [
  { value: 'all',           label: 'كل طرق الدفع' },
  { value: 'Cash',          label: 'نقداً' },
  { value: 'Installment',   label: 'أقساط' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]
const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة',
}

function hasActiveFilters(search: string, status: string, method: string, dateFrom: string, dateTo: string) {
  return !!(search || status !== 'all' || method !== 'all' || dateFrom || dateTo)
}

export default function PurchasesPage() {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [method,    setMethod]    = useState('all')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [page,      setPage]      = useState(1)
  const [exporting, setExporting] = useState(false)
  const perPage = 20
  const router = useRouter()

  const columns = useMemo<ColumnDef<PurchaseListItem>[]>(() => [
    {
      key: 'invoice_number',
      header: 'الفاتورة',
      render: (purchase) => (
        <div>
          <p className="font-code text-xs font-semibold text-primary">{purchase.invoice_number}</p>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(purchase.purchase_date)}
          </div>
        </div>
      ),
      width: 120,
    },
    {
      key: 'car_name',
      header: 'السيارة',
      render: (purchase) => (
        <div className="flex items-center gap-1.5 text-xs text-foreground/90">
          <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="truncate font-bold max-w-[150px]">
            {purchase.car_name ?? `سيارة #${purchase.car_id ?? '—'}`}
          </span>
        </div>
      ),
      width: 190,
    },
    {
      key: 'seller_name',
      header: 'البائع',
      render: (purchase) => (
        <div className="flex items-center gap-1.5 text-xs text-foreground/90">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="truncate font-semibold max-w-[140px]">
            {purchase.seller_name ?? `بائع #${purchase.seller_id ?? '—'}`}
          </span>
        </div>
      ),
      width: 170,
    },
    {
      key: 'purchase_price',
      header: 'المبلغ',
      isNumeric: true,
      render: (purchase) => (
        <div>
          <p className="font-numeric text-xs font-bold text-foreground">
            {formatMoney(purchase.purchase_price, purchase.currency)}
          </p>
          {purchase.remaining_amount > 0 && (
            <p className="mt-0.5 font-numeric text-[10px] font-bold text-rose-600 dark:text-rose-400">
              متبقي: {formatMoney(purchase.remaining_amount, purchase.currency)}
            </p>
          )}
        </div>
      ),
      width: 140,
    },
    {
      key: 'payment_method',
      header: 'الطريقة',
      render: (purchase) => (
        <span className="text-xs font-medium text-foreground/85">
          {METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}
        </span>
      ),
      width: 110,
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (purchase) => (
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-bold border',
          getStatusVariant(purchase.status)
        )}>
          {translateStatus(purchase.status)}
        </span>
      ),
      width: 100,
    },
    {
      key: 'actions',
      header: '',
      render: (purchase) => (
        <div className="text-end" onClick={e => e.stopPropagation()}>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <Link href={`/purchases/${purchase.id}`}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
      width: 60,
    }
  ], [])

  const params = {
    page,
    per_page: perPage,
    search:    search.trim() || undefined,
    status:    status !== 'all' ? status : undefined,
    method:    method !== 'all' ? method : undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchases', params],
    queryFn:  () => getPurchases(params),
    staleTime: 30_000,
    retry: 1,
  })

  const { data: counts } = useQuery({
    queryKey: ['purchase-counts'],
    queryFn: async () => {
      const [active, cancelled, installment] = await Promise.all([
        getPurchases({ status: 'Active',       per_page: 1, page: 1 }),
        getPurchases({ status: 'Cancelled',    per_page: 1, page: 1 }),
        getPurchases({ method: 'Installment',  per_page: 1, page: 1 }),
      ])
      return {
        active:      active.total,
        cancelled:   cancelled.total,
        installment: installment.total,
      }
    },
    staleTime: 120_000,
    retry: 1,
  })

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const activeFilters = hasActiveFilters(search, status, method, dateFrom, dateTo)

  function resetFilters() {
    setSearch(''); setStatus('all'); setMethod('all')
    setDateFrom(''); setDateTo(''); setPage(1)
  }

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const all = await getPurchases({ ...params, page: 1, per_page: 1000 })
      const headers = ['رقم الفاتورة', 'التاريخ', 'اسم السيارة', 'البائع', 'المبلغ', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الحالة']
      const rows = all.items.map((p: PurchaseListItem) => [
        p.invoice_number,
        p.purchase_date ?? '',
        p.car_name ?? '',
        p.seller_name ?? '',
        p.purchase_price,
        p.paid_amount,
        p.remaining_amount,
        METHOD_LABELS[p.payment_method] ?? p.payment_method,
        translateStatus(p.status),
      ])
      await exportXlsx('فواتير-المشتريات', headers, rows)
    } finally {
      setExporting(false)
    }
  }, [params])

  return (
    <div className="space-y-5" dir="rtl">

      <PageHeader
        title="فواتير المشتريات"
        icon={<ShoppingBag className="h-4 w-4" />}
        count={isLoading ? undefined : total}
        filtered={activeFilters}
        actions={
          <>
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
              <Link href="/purchases/new">
                <Plus className="h-3.5 w-3.5" />
                فاتورة جديدة
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="إجمالي الفواتير"
          value={counts ? counts.active + counts.cancelled : '...'}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10 border-blue-500/20"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="نشطة"
          value={counts?.active ?? '...'}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
        />
        <KpiCard
          icon={<Ban className="h-4 w-4" />}
          label="ملغاة"
          value={counts?.cancelled ?? '...'}
          iconColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-500/10 border-rose-500/20"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="بالأقساط"
          value={counts?.installment ?? '...'}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10 border-amber-500/20"
        />
      </div>

      <FilterBar
        selects={[
          {
            value: status,
            onChange: v => { setStatus(v); setPage(1) },
            options: STATUS_OPTS,
            width: 'w-full sm:w-[140px]',
          },
          {
            value: method,
            onChange: v => { setMethod(v); setPage(1) },
            options: METHOD_OPTS,
            width: 'w-full sm:w-[160px]',
          },
        ]}
        dateRange={{
          from: dateFrom,
          to: dateTo,
          onFromChange: v => { setDateFrom(v); setPage(1) },
          onToChange:   v => { setDateTo(v);   setPage(1) },
        }}
        onReset={resetFilters}
        onRefresh={() => refetch()}
        hasActiveFilters={activeFilters}
      />

      <AdvancedTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={(row) => router.push(`/purchases/${row.id}`)}
        searchPlaceholder="رقم الفاتورة، اسم البائع، السيارة، الهيكل..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1) }}
        exportFilename="فواتير-المشتريات"
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            label="فاتورة"
          />
        }
      />

    </div>
  )
}
