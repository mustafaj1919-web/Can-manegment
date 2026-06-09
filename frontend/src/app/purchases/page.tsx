'use client'

import { useState, useCallback } from 'react'
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
import { DataTable } from '@/components/shared/DataTable'

function KpiCard({ icon, label, value, iconColor, iconBg }: {
  icon: React.ReactNode; label: string; value: number | string
  iconColor: string; iconBg: string
}) {
  return (
    <div className="app-card rounded-xl p-4">
      <div className={cn('mb-3 flex h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="font-numeric text-2xl font-bold tabular-nums text-foreground">
        {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
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
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="نشطة"
          value={counts?.active ?? '...'}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <KpiCard
          icon={<Ban className="h-4 w-4" />}
          label="ملغاة"
          value={counts?.cancelled ?? '...'}
          iconColor="text-rose-400"
          iconBg="bg-rose-500/10"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="بالأقساط"
          value={counts?.installment ?? '...'}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      <FilterBar
        search={{
          value: search,
          onChange: v => { setSearch(v); setPage(1) },
          placeholder: 'رقم الفاتورة، اسم البائع، السيارة، رقم الهيكل...',
        }}
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

      <DataTable
        isLoading={isLoading}
        isError={isError}
        isEmpty={items.length === 0}
        onRetry={() => refetch()}
        emptyProps={{
          variant: activeFilters ? 'search' : 'default',
          icon: <Receipt className="h-5 w-5" />,
          title: activeFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد فواتير مشتريات',
          description: activeFilters ? 'جرّب تعديل الفلاتر أو مسحها' : 'أضف أول فاتورة شراء للبدء',
          action: activeFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
              مسح الفلاتر
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/purchases/new">
                <Plus className="me-1.5 h-3.5 w-3.5" />
                فاتورة جديدة
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
            label="فاتورة"
          />
        }
      >
        <table className="app-table">
          <thead>
            <tr>
              <th>الفاتورة</th>
              <th>السيارة</th>
              <th className="hidden md:table-cell">البائع</th>
              <th>المبلغ</th>
              <th className="hidden sm:table-cell">الطريقة</th>
              <th className="hidden sm:table-cell">الحالة</th>
              <th className="w-10"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((purchase) => (
              <tr
                key={purchase.id}
                data-clickable
                onClick={() => router.push(`/purchases/${purchase.id}`)}
              >
                <td>
                  <p className="font-code text-xs font-semibold text-primary">{purchase.invoice_number}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(purchase.purchase_date)}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2 text-xs text-foreground/90">
                    <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="truncate max-w-[140px]">
                      {purchase.car_name ?? `سيارة #${purchase.car_id ?? '—'}`}
                    </span>
                  </div>
                </td>
                <td className="hidden md:table-cell">
                  <div className="flex items-center gap-2 text-xs text-foreground/90">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="truncate max-w-[130px]">
                      {purchase.seller_name ?? `بائع #${purchase.seller_id ?? '—'}`}
                    </span>
                  </div>
                </td>
                <td>
                  <p className="font-numeric text-xs font-semibold text-foreground">
                    {formatMoney(purchase.purchase_price, purchase.currency)}
                  </p>
                  {purchase.remaining_amount > 0 && (
                    <p className="mt-0.5 font-numeric text-[10px] text-rose-400">
                      متبقي: {formatMoney(purchase.remaining_amount, purchase.currency)}
                    </p>
                  )}
                </td>
                <td className="hidden sm:table-cell text-xs text-muted-foreground">
                  {METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}
                </td>
                <td className="hidden sm:table-cell">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    getStatusVariant(purchase.status)
                  )}>
                    {translateStatus(purchase.status)}
                  </span>
                </td>
                <td className="text-end">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

    </div>
  )
}
