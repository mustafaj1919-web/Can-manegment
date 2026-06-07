'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, Plus, Car, User,
  Calendar, ArrowUpRight, Receipt, Download,
} from 'lucide-react'
import { cn, formatMoney, formatDate, translateStatus, getStatusVariant } from '@/lib/utils'
import { getSales, type SaleListItem } from '@/lib/api/sales'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterBar } from '@/components/shared/FilterBar'
import { DataTable } from '@/components/shared/DataTable'

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

function hasActiveFilters(search: string, status: string, method: string, from: string, to: string) {
  return !!(search || status !== 'all' || method !== 'all' || from || to)
}

export default function SalesPage() {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [method,    setMethod]    = useState('all')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [page,      setPage]      = useState(1)
  const [exporting, setExporting] = useState(false)
  const PER_PAGE = 20

  const params = {
    page,
    per_page:  PER_PAGE,
    status:    status !== 'all' ? status    : undefined,
    method:    method !== 'all' ? method    : undefined,
    search:    search.trim()    || undefined,
    date_from: dateFrom         || undefined,
    date_to:   dateTo           || undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales', params],
    queryFn:  () => getSales(params),
    staleTime: 30_000,
    retry: 1,
  })

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const activeFilters = hasActiveFilters(search, status, method, dateFrom, dateTo)

  function resetFilters() {
    setSearch(''); setStatus('all'); setMethod('all')
    setDateFrom(''); setDateTo(''); setPage(1)
  }

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const all = await getSales({ ...params, page: 1, per_page: 1000 })
      const headers = ['رقم الفاتورة', 'التاريخ', 'السيارة', 'رقم الهيكل', 'المشتري', 'المبلغ', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الحالة']
      const rows = all.items.map((s: SaleListItem) => [
        s.invoice_number, s.sale_date ?? '', s.car_name ?? '', s.car_vin ?? '',
        s.buyer_name ?? '', s.selling_price, s.paid_amount, s.remaining_amount,
        METHOD_LABELS[s.payment_method] ?? s.payment_method,
        translateStatus(s.status),
      ])
      await exportXlsx('فواتير-المبيعات', headers, rows)
    } finally {
      setExporting(false)
    }
  }, [params])

  return (
    <div className="space-y-5" dir="rtl">

      <PageHeader
        title="فواتير المبيعات"
        icon={<TrendingUp className="h-4 w-4" />}
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
              <Link href="/sales/new">
                <Plus className="h-3.5 w-3.5" />
                فاتورة جديدة
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar
        search={{
          value: search,
          onChange: v => { setSearch(v); setPage(1) },
          placeholder: 'رقم الفاتورة، المشتري، السيارة، رقم الهيكل...',
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
          title: activeFilters ? 'لا توجد نتائج مطابقة' : 'لا توجد فواتير مبيعات',
          description: activeFilters ? 'جرّب تعديل الفلاتر أو مسحها' : 'أضف أول فاتورة بيع للبدء',
          action: activeFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
              مسح الفلاتر
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/sales/new">
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
              <th className="hidden md:table-cell">السيارة</th>
              <th className="hidden lg:table-cell">المشتري</th>
              <th>المبلغ</th>
              <th className="hidden sm:table-cell">الطريقة</th>
              <th className="hidden sm:table-cell">الحالة</th>
              <th className="w-10"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((sale) => (
              <tr
                key={sale.id}
              >
                <td>
                  <p className="font-code text-xs font-semibold text-primary">{sale.invoice_number}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(sale.sale_date)}
                  </div>
                </td>
                <td className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    <span className="text-xs truncate max-w-[150px]">
                      {sale.car_name ?? `#${sale.car_id ?? '—'}`}
                    </span>
                  </div>
                  {sale.car_vin && (
                    <p className="mt-0.5 ps-5 font-code text-[10px] text-muted-foreground/45">
                      {sale.car_vin}
                    </p>
                  )}
                </td>
                <td className="hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    <span className="text-xs truncate max-w-[130px]">{sale.buyer_name ?? '—'}</span>
                  </div>
                  {sale.buyer_phone && (
                    <p className="mt-0.5 ps-5 text-[10px] text-muted-foreground/45">{sale.buyer_phone}</p>
                  )}
                </td>
                <td>
                  <p className="font-numeric text-xs font-semibold text-foreground">
                    {formatMoney(sale.selling_price, sale.currency)}
                  </p>
                  {sale.remaining_amount > 0 && (
                    <p className="mt-0.5 font-numeric text-[10px] text-rose-400">
                      متبقي: {formatMoney(sale.remaining_amount, sale.currency)}
                    </p>
                  )}
                </td>
                <td className="hidden sm:table-cell text-xs text-muted-foreground">
                  {METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
                </td>
                <td className="hidden sm:table-cell">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    getStatusVariant(sale.status)
                  )}>
                    {translateStatus(sale.status)}
                  </span>
                </td>
                <td className="text-end">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Link href={`/sales/${sale.id}`}>
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
