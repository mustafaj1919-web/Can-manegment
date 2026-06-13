'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingBag, Plus, Car, User, Eye,
  Calendar, ArrowUpRight, Download, Filter, X, RefreshCw
} from 'lucide-react'
import type { RowAction } from '@/components/shared/AdvancedTable'
import { cn, formatMoney, formatDate, translateStatus, getStatusVariant } from '@/lib/utils'
import { getPurchases, getPurchaseById, type PurchaseListItem } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdvancedTable, ColumnDef } from '@/components/shared/AdvancedTable'

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

/* ─── Expandable details sub-component ───────────────────────────────────── */
function PurchasePaymentDetails({ purchaseId }: { purchaseId: number }) {
  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase-details', purchaseId],
    queryFn: () => getPurchaseById(purchaseId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2.5 py-1 text-right">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (!purchase) {
    return <p className="text-xs text-muted-foreground text-right">تعذر تحميل تفاصيل الدفع</p>
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">تفاصيل الفاتورة والمبالغ</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-bg-elevated p-2.5 rounded-lg border border-border-subtle">
            <span className="text-[9px] text-muted-foreground block font-bold">سعر الشراء الكلي</span>
            <span className="font-black block mt-1">{formatMoney(purchase.purchase_price, purchase.currency)}</span>
          </div>
          <div className="bg-bg-elevated p-2.5 rounded-lg border border-border-subtle">
            <span className="text-[9px] text-muted-foreground block font-bold">المبلغ المدفوع</span>
            <span className="font-black text-emerald-400 block mt-1">{formatMoney(purchase.paid_amount, purchase.currency)}</span>
          </div>
          <div className="bg-bg-elevated p-2.5 rounded-lg border border-border-subtle">
            <span className="text-[9px] text-muted-foreground block font-bold">المبلغ المتبقي</span>
            <span className={cn("font-black block mt-1", purchase.remaining_amount > 0 ? "text-rose-400" : "text-foreground")}>
              {formatMoney(purchase.remaining_amount, purchase.currency)}
            </span>
          </div>
          <div className="bg-bg-elevated p-2.5 rounded-lg border border-border-subtle">
            <span className="text-[9px] text-muted-foreground block font-bold">طريقة الدفع الرئيسية</span>
            <span className="font-bold block mt-1">{METHOD_LABELS[purchase.payment_method] || purchase.payment_method}</span>
          </div>
        </div>
      </div>

      {purchase.payments && purchase.payments.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">سجل الدفعات والوصولات الصادرة</p>
          <div className="space-y-1.5 max-w-2xl">
            {purchase.payments.map((p, idx) => (
              <div key={p.id || idx} className="flex justify-between items-center text-xs bg-bg-surface border border-border-subtle px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-foreground">{formatMoney(p.amount, p.currency)}</span>
                  <span className="text-[10px] text-muted-foreground">({METHOD_LABELS[p.payment_method || ''] || p.payment_method})</span>
                </div>
                <div className="flex items-center gap-3">
                  {p.notes && <span className="text-muted-foreground text-[10px] truncate max-w-[200px]">{p.notes}</span>}
                  <span className="text-muted-foreground text-[10px] font-numeric">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-IQ') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PurchasesPage() {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [method,    setMethod]    = useState('all')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [page,      setPage]      = useState(1)
  const [exporting, setExporting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
      render: (purchase) => {
        const isDanger = purchase.status === 'Cancelled';
        return (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
            getStatusVariant(purchase.status)
          )}>
            {isDanger && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
              </span>
            )}
            {translateStatus(purchase.status)}
          </span>
        )
      },
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

  const params = useMemo(() => ({
    page,
    per_page: perPage,
    search:    search.trim() || undefined,
    status:    status !== 'all' ? status : undefined,
    method:    method !== 'all' ? method : undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
  }), [page, search, status, method, dateFrom, dateTo])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchases', params],
    queryFn:  () => getPurchases(params),
    staleTime: 30_000,
    retry: 1,
  })

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const activeFilters = hasActiveFilters(search, status, method, dateFrom, dateTo)

  // Calculations for summary strip
  const summaryTotals = useMemo(() => {
    const totals = { usdValue: 0, iqdValue: 0, usdPaid: 0, iqdPaid: 0 }
    items.forEach(p => {
      if (p.currency === 'USD') {
        totals.usdValue += p.purchase_price
        totals.usdPaid += p.paid_amount
      } else {
        totals.iqdValue += p.purchase_price
        totals.iqdPaid += p.paid_amount
      }
    })
    return totals
  }, [items])

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
    <div className="space-y-4" dir="rtl">

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
              onClick={() => setSidebarOpen(prev => !prev)}
              className={cn("h-8 gap-1.5 text-xs", sidebarOpen && "bg-bg-elevated")}
            >
              <Filter className="h-3.5 w-3.5" />
              تصفية
            </Button>
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

      {/* ── Summary strip above table ── */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-border-subtle bg-bg-surface p-4 rounded-xl">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">الفواتير المطابقة</span>
            <span className="text-xl font-black text-foreground mt-0.5">{total} فاتورة</span>
            <span className="text-[10px] text-muted-foreground mt-1">المعروضة بالصفحة الحالية: {items.length}</span>
          </div>
          <div className="flex flex-col text-right border-r border-border-subtle pr-3">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">قيمة فواتير الصفحة</span>
            <div className="flex flex-col mt-0.5 font-numeric">
              {summaryTotals.usdValue > 0 && (
                <span className="text-base font-extrabold text-foreground">{formatMoney(summaryTotals.usdValue, 'USD')}</span>
              )}
              {summaryTotals.iqdValue > 0 && (
                <span className="text-base font-extrabold text-foreground">{formatMoney(summaryTotals.iqdValue, 'IQD')}</span>
              )}
              {summaryTotals.usdValue === 0 && summaryTotals.iqdValue === 0 && (
                <span className="text-base font-extrabold text-foreground">0</span>
              )}
            </div>
          </div>
          <div className="flex flex-col text-right border-r border-border-subtle pr-3">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">إجمالي المدفوع بالصفحة</span>
            <div className="flex flex-col mt-0.5 font-numeric">
              {summaryTotals.usdPaid > 0 && (
                <span className="text-base font-extrabold text-emerald-400">{formatMoney(summaryTotals.usdPaid, 'USD')}</span>
              )}
              {summaryTotals.iqdPaid > 0 && (
                <span className="text-base font-extrabold text-emerald-400">{formatMoney(summaryTotals.iqdPaid, 'IQD')}</span>
              )}
              {summaryTotals.usdPaid === 0 && summaryTotals.iqdPaid === 0 && (
                <span className="text-base font-extrabold text-foreground">0</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content (sidebar + table) ── */}
      <div className="flex items-start gap-4">
        {/* Collapsible filter sidebar */}
        {sidebarOpen && (
          <aside className="w-[220px] shrink-0 border border-border-subtle bg-bg-surface rounded-xl overflow-hidden self-start">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle">
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-primary" />
                خيارات التصفية
              </span>
              {activeFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" />
                  إعادة ضبط
                </button>
              )}
            </div>
            <div className="p-3 space-y-4 text-right">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">بحث نصي</label>
                <Input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="الفاتورة، البائع، السيارة..."
                  className="h-9 text-xs border-border bg-bg-page"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">حالة الفاتورة</label>
                <div className="space-y-0.5">
                  {STATUS_OPTS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { setStatus(o.value); setPage(1) }}
                      className={cn(
                        "w-full text-right px-2.5 py-1.5 text-xs rounded-md transition-colors",
                        status === o.value
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-foreground/70 hover:bg-bg-elevated"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">طريقة الدفع</label>
                <div className="space-y-0.5">
                  {METHOD_OPTS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { setMethod(o.value); setPage(1) }}
                      className={cn(
                        "w-full text-right px-2.5 py-1.5 text-xs rounded-md transition-colors",
                        method === o.value
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-foreground/70 hover:bg-bg-elevated"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="space-y-2 border-t border-border-subtle pt-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">تاريخ الفاتورة</label>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[9px] text-muted-foreground">من:</span>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                      className="h-8 text-xs border-border bg-bg-page"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground">إلى:</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={e => { setDateTo(e.target.value); setPage(1) }}
                      className="h-8 text-xs border-border bg-bg-page"
                    />
                  </div>
                </div>
              </div>

              {/* Refresh trigger */}
              <button
                type="button"
                onClick={() => refetch()}
                className="w-full flex items-center justify-center gap-1.5 h-8 border border-border text-xs text-foreground/75 hover:bg-bg-elevated rounded-md transition-colors mt-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                تحديث البيانات
              </button>

            </div>
          </aside>
        )}

        {/* Full-width table */}
        <div className="min-w-0 flex-1">
          <AdvancedTable
            data={items}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            searchPlaceholder="ابحث السجلات الحالية..."
            searchValue={search}
            onSearchChange={(val) => { setSearch(val); setPage(1) }}
            exportFilename="فواتير-المشتريات"
            renderExpandedRow={(row) => <PurchasePaymentDetails purchaseId={row.id} />}
            rowActions={(purchase) => [
              { label: 'عرض', icon: <Eye className="h-3 w-3" />, onClick: (p) => router.push(`/purchases/${p.id}`) },
            ]}
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
      </div>

    </div>
  )
}
