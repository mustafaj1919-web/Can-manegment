'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, Plus, Car, User, Eye, FileText,
  Calendar, Download, Filter, X,
  AlertCircle
} from 'lucide-react'
import type { RowAction } from '@/components/shared/AdvancedTable'
import { CustomerQuickCard } from '@/components/shared/CustomerQuickCard'
import { cn, formatMoney, formatDate, translateStatus } from '@/lib/utils'
import { getSales, getSaleById, type SaleListItem } from '@/lib/api/sales'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdvancedTable, ColumnDef } from '@/components/shared/AdvancedTable'
import { toast } from 'sonner'

/* ─── Taxonomy Enums & Labels (Rule #5) ─────────────────────────────────── */
const STATUS_OPTS = [
  { value: 'all',       label: 'الكل' },
  { value: 'Active',    label: 'النشطة' },
  { value: 'Cancelled', label: 'الملغاة' },
]

const METHOD_OPTS = [
  { value: 'all',           label: 'الكل' },
  { value: 'Cash',          label: 'نقداً' },
  { value: 'Installment',   label: 'أقساط' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]

const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقداً',
  Installment: 'أقساط',
  'Bank transfer': 'حوالة',
  Bank: 'حوالة',
}

function getActiveFilterCount(search: string, status: string, method: string, from: string, to: string) {
  let count = 0
  if (search) count++
  if (status !== 'all') count++
  if (method !== 'all') count++
  if (from) count++
  if (to) count++
  return count
}

/* ─── Real Time-Series Sparkline Generator (Rule #1 & #2 Scope Aligned) ─── */
function RealSalesSparkline({ items, label }: { items: SaleListItem[]; label: string }) {
  const aggregatedSeries = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach(item => {
      if (!item.sale_date) return
      const dateKey = item.sale_date.substring(0, 10)
      map.set(dateKey, (map.get(dateKey) || 0) + (Number(item.selling_price) || 0))
    })
    const sortedDates = Array.from(map.keys()).sort()
    if (sortedDates.length < 2) return null
    return sortedDates.map(d => ({ date: d, value: map.get(d) || 0 }))
  }, [items])

  if (!aggregatedSeries || aggregatedSeries.length < 2) {
    return null
  }

  const values = aggregatedSeries.map(s => s.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const width = 120
  const height = 24

  const points = aggregatedSeries
    .map((s, idx) => {
      const x = (idx / (aggregatedSeries.length - 1)) * width
      const y = height - ((s.value - min) / range) * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="flex items-center gap-2 mt-1.5" title={label}>
      <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
        <polyline
          fill="none"
          stroke="#0F766E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <span className="text-[10px] text-[#6B7280]">{label}</span>
    </div>
  )
}

/* ─── Expanded Payment Details (Rule #6 - Lazy Query) ────────────────────── */
function SalePaymentDetails({ saleId }: { saleId: number }) {
  const { data: sale, isLoading, isError, refetch } = useQuery({
    queryKey: ['sale-details', saleId],
    queryFn: () => getSaleById(saleId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2 py-1 text-right" dir="rtl">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between py-2 text-xs text-[#DC2626] text-right" dir="rtl">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>تعذر تحميل تفاصيل الدفع للفاتورة #{saleId}</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => refetch()} className="h-7 text-xs border border-[#E5E7EB]">
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  if (!sale) {
    return <p className="text-xs text-[#6B7280] text-right" dir="rtl">لا تتوفر تفاصيل دفع لهذه الفاتورة</p>
  }

  const isOverpaid = sale.remaining_amount < 0

  return (
    <div className="space-y-3 text-right bg-white p-3.5 rounded-lg border border-[#E5E7EB]" dir="rtl">
      <div>
        <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">تفاصيل المبالغ والخصم الفعلي</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block font-medium">سعر البيع الأساسي</span>
            <span className="font-bold block mt-0.5 text-[#111827]">{formatMoney(sale.selling_price, sale.currency)}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block font-medium">الخصم الممنوح</span>
            <span className="font-bold block mt-0.5 text-[#DC2626]">{formatMoney(sale.discount, sale.currency)}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block font-medium">المبلغ المسدد (المدفوع)</span>
            <span className="font-bold text-[#16A34A] block mt-0.5">{formatMoney(sale.paid_amount, sale.currency)}</span>
          </div>
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E5E7EB]">
            <span className="text-[10px] text-[#6B7280] block font-medium">
              {isOverpaid ? 'دفعة زائدة (رصيد دائن)' : 'المبلغ المتبقي'}
            </span>
            <span className={cn("font-bold block mt-0.5", isOverpaid ? "text-[#16A34A]" : sale.remaining_amount > 0 ? "text-[#DC2626]" : "text-[#111827]")}>
              {isOverpaid ? formatMoney(Math.abs(sale.remaining_amount), sale.currency) : formatMoney(sale.remaining_amount, sale.currency)}
            </span>
          </div>
        </div>
      </div>

      {sale.payments && sale.payments.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">سجل المقبوضات المسجلة</p>
          <div className="space-y-1 max-w-2xl">
            {sale.payments.map((p, idx) => (
              <div key={p.id || idx} className="flex justify-between items-center text-xs bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-1.5 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                  <span className="font-bold text-[#111827]">{formatMoney(p.amount, p.currency)}</span>
                  <span className="text-[11px] text-[#6B7280]">({METHOD_LABELS[p.payment_method || ''] || p.payment_method})</span>
                </div>
                <div className="flex items-center gap-3">
                  {p.notes && <span className="text-[#6B7280] text-[11px] truncate max-w-[200px]">{p.notes}</span>}
                  <span className="text-[#6B7280] text-[11px] font-numeric">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('ar-IQ') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sale.installment_plan && (
        <div>
          <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">جدول خطة الأقساط</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-[#F8FAFC] p-2 rounded-md border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block font-medium">عدد الأشهر</span>
              <span className="font-bold block mt-0.5">{sale.installment_plan.number_of_months} أشهر</span>
            </div>
            <div className="bg-[#F8FAFC] p-2 rounded-md border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block font-medium">القسط الشهري</span>
              <span className="font-bold block mt-0.5">{formatMoney(sale.installment_plan.installment_amount, sale.installment_plan.currency)}</span>
            </div>
            <div className="bg-[#F8FAFC] p-2 rounded-md border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block font-medium">مقبوض الأقساط</span>
              <span className="font-bold text-[#16A34A] block mt-0.5">{formatMoney(sale.installment_plan.paid_amount, sale.installment_plan.currency)}</span>
            </div>
            <div className="bg-[#F8FAFC] p-2 rounded-md border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block font-medium">متبقي الأقساط</span>
              <span className="font-bold text-[#DC2626] block mt-0.5">{formatMoney(sale.installment_plan.remaining_amount, sale.installment_plan.currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main SalesPage Component ───────────────────────────────────────────── */
export default function SalesPage() {
  const [search,        setSearch]        = useState('')
  const [status,        setStatus]        = useState('all')
  const [method,        setMethod]        = useState('all')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')
  const [page,          setPage]          = useState(1)
  const [exporting,     setExporting]     = useState(false)
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [sortKey,       setSortKey]       = useState<string | null>(null)
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc')
  const [density,       setDensity]       = useState<'compact' | 'comfortable'>('compact')

  const PER_PAGE = 25
  const router = useRouter()

  // Accessible keyboard trap for drawer (Rule #13)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  // Table Column Definitions matching Typography Specs (Rule #6 & Typography Specs)
  const columns = useMemo<ColumnDef<SaleListItem>[]>(() => [
    {
      key: 'invoice_number',
      header: 'رقم الفاتورة',
      sortable: true,
      render: (sale: SaleListItem) => (
        <div>
          {/* Invoice Number: 16px (text-[15px]), SemiBold, Primary Accent (#0F766E), Monospace */}
          <p className="font-mono text-[15px] font-semibold text-[#0F766E] tracking-tight">{sale.invoice_number}</p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B7280]">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatDate(sale.sale_date)}</span>
          </div>
        </div>
      ),
      width: 130,
      minWidth: 100,
    },
    {
      key: 'car_name',
      header: 'السيارة المركبة',
      sortable: true,
      render: (sale: SaleListItem) => (
        <div>
          {/* Vehicle: 15px (text-[15px]) */}
          <div className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            <span className="text-[15px] font-medium text-[#111827] truncate max-w-[170px]">
              {sale.car_name ?? `#${sale.car_id ?? '—'}`}
            </span>
          </div>
          {sale.car_vin && (
            <p className="mt-0.5 ps-5 font-mono text-[11px] text-[#6B7280]">
              {sale.car_vin}
            </p>
          )}
        </div>
      ),
      width: 190,
      minWidth: 140,
    },
    {
      key: 'buyer_name',
      header: 'اسم العميل / المشتري',
      sortable: true,
      render: (sale: SaleListItem) => (
        <div>
          {/* Customer: 15px (text-[15px]), Medium */}
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            {sale.buyer_id && sale.buyer_name
              ? <CustomerQuickCard customerId={sale.buyer_id} customerName={sale.buyer_name} className="text-[15px] font-medium text-[#111827]" />
              : <span className="text-[15px] font-medium text-[#111827]">{sale.buyer_name ?? '—'}</span>
            }
          </div>
          {sale.buyer_phone && (
            <p className="mt-0.5 ps-5 text-[11px] text-[#6B7280] font-numeric">{sale.buyer_phone}</p>
          )}
        </div>
      ),
      width: 180,
      minWidth: 130,
    },
    {
      key: 'selling_price',
      header: 'المبلغ الإجمالي',
      isNumeric: true,
      sortable: true,
      render: (sale: SaleListItem) => {
        const isOverpaid = sale.remaining_amount < 0
        return (
          <div>
            {/* Amount: Bold, tabular numerals */}
            <p className="font-numeric text-xs font-bold text-[#111827]">
              {formatMoney(sale.selling_price, sale.currency)}
            </p>
            {sale.remaining_amount > 0 && (
              <p className="mt-0.5 font-numeric text-[11px] font-bold text-[#DC2626]">
                متبقي: {formatMoney(sale.remaining_amount, sale.currency)}
              </p>
            )}
            {isOverpaid && (
              <p className="mt-0.5 font-numeric text-[11px] font-semibold text-[#16A34A] bg-emerald-50 px-1 py-0.2 rounded inline-block">
                دفعة زائدة: {formatMoney(Math.abs(sale.remaining_amount), sale.currency)}
              </p>
            )}
          </div>
        )
      },
      width: 140,
      minWidth: 110,
    },
    {
      key: 'payment_method',
      header: 'طريقة الدفع',
      sortable: true,
      render: (sale: SaleListItem) => (
        <span className="text-xs font-medium text-[#374151]">
          {METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
        </span>
      ),
      width: 110,
      minWidth: 90,
    },
    {
      key: 'status',
      header: 'الحالة',
      sortable: true,
      render: (sale: SaleListItem) => {
        const isCancelled = sale.status === 'Cancelled'
        return (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border',
            isCancelled
              ? 'bg-rose-50 text-[#DC2626] border-rose-200'
              : 'bg-emerald-50 text-[#16A34A] border-emerald-200'
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isCancelled ? "bg-[#DC2626]" : "bg-[#16A34A]")} />
            {translateStatus(sale.status)}
          </span>
        )
      },
      width: 100,
      minWidth: 80,
    },
  ], [])

  const params = useMemo(() => ({
    page,
    per_page:  PER_PAGE,
    status:    status !== 'all' ? status    : undefined,
    method:    method !== 'all' ? method    : undefined,
    search:    search.trim()    || undefined,
    date_from: dateFrom         || undefined,
    date_to:   dateTo           || undefined,
  }), [page, status, method, search, dateFrom, dateTo])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sales', params],
    queryFn:  () => getSales(params),
    staleTime: 30_000,
    retry: 1,
  })

  const rawItems   = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const activeFiltersCount = getActiveFilterCount(search, status, method, dateFrom, dateTo)

  // Sort rawItems client-side if sortKey is set (Section 4: Current page client-side sorting)
  const items = useMemo(() => {
    if (!sortKey) return rawItems
    return [...rawItems].sort((a: any, b: any) => {
      const valA = a[sortKey] ?? ''
      const valB = b[sortKey] ?? ''
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'ar')
        : String(valB).localeCompare(String(valA), 'ar')
    })
  }, [rawItems, sortKey, sortDir])

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Calculate Page-Level Monetary Metrics strictly without fake global assumptions (Adjustment #2: Preserve negative overpayments)
  const pageTotals = useMemo(() => {
    const totals = {
      usdValue: 0, iqdValue: 0,
      usdPaid: 0, iqdPaid: 0,
      usdRemaining: 0, iqdRemaining: 0,
      usdCredit: 0, iqdCredit: 0
    }
    items.forEach(s => {
      const price = Number(s.selling_price) || 0
      const paid = Number(s.paid_amount) || 0
      const remaining = Number(s.remaining_amount) || 0

      if (s.currency === 'USD') {
        totals.usdValue += price
        totals.usdPaid += paid
        if (remaining > 0) {
          totals.usdRemaining += remaining
        } else if (remaining < 0) {
          totals.usdCredit += Math.abs(remaining)
        }
      } else {
        totals.iqdValue += price
        totals.iqdPaid += paid
        if (remaining > 0) {
          totals.iqdRemaining += remaining
        } else if (remaining < 0) {
          totals.iqdCredit += Math.abs(remaining)
        }
      }
    })
    return totals
  }, [items])

  function resetFilters() {
    setSearch(''); setStatus('all'); setMethod('all')
    setDateFrom(''); setDateTo(''); setPage(1)
  }

  // Adjustment #1: Safe page-by-page export fetching up to all matching records
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const firstPage = await getSales({ ...params, page: 1, per_page: 100 })
      const totalCount = firstPage?.total ?? 0
      let allItems: SaleListItem[] = [...(firstPage?.items ?? [])]
      const fetchPerPage = 100
      const maxPages = Math.min(Math.ceil(totalCount / fetchPerPage), 50) // Safe cap 5,000 items

      if (maxPages > 1) {
        toast.info(`جاري جمع البيانات للتصدير... (1/${maxPages})`)
        for (let p = 2; p <= maxPages; p++) {
          const res = await getSales({ ...params, page: p, per_page: fetchPerPage })
          if (res?.items) {
            allItems.push(...res.items)
          }
        }
      }

      const headers = ['رقم الفاتورة', 'التاريخ', 'السيارة', 'رقم الهيكل', 'المشتري', 'المبلغ', 'المدفوع', 'المتبقي / الدائن', 'طريقة الدفع', 'الحالة']
      const rows = allItems.map((s: SaleListItem) => [
        s.invoice_number,
        s.sale_date ?? '',
        s.car_name ?? '',
        s.car_vin ?? '',
        s.buyer_name ?? '',
        s.selling_price,
        s.paid_amount,
        s.remaining_amount < 0 ? `دفعة زائدة: ${Math.abs(s.remaining_amount)}` : s.remaining_amount,
        METHOD_LABELS[s.payment_method] ?? s.payment_method,
        translateStatus(s.status),
      ])

      const filename = `فواتير-المبيعات-${allItems.length}-سجل`
      await exportXlsx(filename, headers, rows)
      toast.success(`تم تصدير ${allItems.length} سجل بنجاح من أصل ${totalCount}`)
    } catch {
      toast.error('حدث خطأ أثناء تصدير البيانات')
    } finally {
      setExporting(false)
    }
  }, [params])

  return (
    <div className="space-y-3" dir="rtl">

      {/* ── Page Title Header ── */}
      <PageHeader
        title="فواتير المبيعات"
        icon={<TrendingUp className="h-4 w-4" />}
        count={isLoading ? undefined : total}
        filtered={activeFiltersCount > 0}
      />

      {/* ── Data-Aware Enterprise KPI Widgets (Rules #1, #2, #3, #4) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 print:hidden">
        {/* KPI 1: Global Filtered Total Invoices (No Sparkline - Rule #1 Scope Alignment) */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs hover:border-[#0F766E] transition-colors">
          <span className="text-[11px] font-semibold text-[#6B7280]">إجمالي الفواتير المطابقة</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#111827]">{isLoading ? '...' : total} فاتورة</span>
            <span className="text-[10px] text-[#6B7280]">— لا تتوفر مقارنة</span>
          </div>
          <p className="text-[10px] text-[#6B7280] mt-2.5">المعروضة بالصفحة: {items.length} فاتورة</p>
        </div>

        {/* KPI 2: Page Sales Volume (Rule #3: Strictly Page-Level Label) */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs hover:border-[#0F766E] transition-colors">
          <span className="text-[11px] font-semibold text-[#6B7280]">إجمالي مبيعات الصفحة الحالية</span>
          <div className="flex flex-col mt-1 font-numeric">
            {pageTotals.usdValue > 0 && (
              <span className="text-base font-bold text-[#111827]">{formatMoney(pageTotals.usdValue, 'USD')}</span>
            )}
            {pageTotals.iqdValue > 0 && (
              <span className="text-base font-bold text-[#111827]">{formatMoney(pageTotals.iqdValue, 'IQD')}</span>
            )}
            {pageTotals.usdValue === 0 && pageTotals.iqdValue === 0 && (
              <span className="text-base font-bold text-[#111827]">0</span>
            )}
          </div>
          <RealSalesSparkline items={items} label="حركة مبيعات الصفحة" />
        </div>

        {/* KPI 3: Page Paid Amount (Rule #3) */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs hover:border-[#0F766E] transition-colors">
          <span className="text-[11px] font-semibold text-[#6B7280]">المقبوض ضمن الصفحة الحالية</span>
          <div className="flex flex-col mt-1 font-numeric">
            {pageTotals.usdPaid > 0 && (
              <span className="text-base font-bold text-[#16A34A]">{formatMoney(pageTotals.usdPaid, 'USD')}</span>
            )}
            {pageTotals.iqdPaid > 0 && (
              <span className="text-base font-bold text-[#16A34A]">{formatMoney(pageTotals.iqdPaid, 'IQD')}</span>
            )}
            {pageTotals.usdPaid === 0 && pageTotals.iqdPaid === 0 && (
              <span className="text-base font-bold text-[#111827]">0</span>
            )}
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1.5">المبالغ المسددة فعلياً</p>
        </div>

        {/* KPI 4: Page Remaining Balance & Customer Credit (Adjustment #2) */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs hover:border-[#0F766E] transition-colors">
          <span className="text-[11px] font-semibold text-[#6B7280]">المستحق المتبقي / الرصيد الدائن</span>
          <div className="flex flex-col mt-1 font-numeric">
            {pageTotals.usdRemaining > 0 && (
              <span className="text-base font-bold text-[#DC2626]">{formatMoney(pageTotals.usdRemaining, 'USD')} متبقي</span>
            )}
            {pageTotals.iqdRemaining > 0 && (
              <span className="text-base font-bold text-[#DC2626]">{formatMoney(pageTotals.iqdRemaining, 'IQD')} متبقي</span>
            )}
            {pageTotals.usdCredit > 0 && (
              <span className="text-xs font-bold text-[#16A34A] mt-0.5">+{formatMoney(pageTotals.usdCredit, 'USD')} دائن</span>
            )}
            {pageTotals.iqdCredit > 0 && (
              <span className="text-xs font-bold text-[#16A34A] mt-0.5">+{formatMoney(pageTotals.iqdCredit, 'IQD')} دائن</span>
            )}
            {pageTotals.usdRemaining === 0 && pageTotals.iqdRemaining === 0 && pageTotals.usdCredit === 0 && pageTotals.iqdCredit === 0 && (
              <span className="text-base font-bold text-[#111827]">0</span>
            )}
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">ذمم الأقساط والدفعات الزائدة</p>
        </div>
      </div>

      {/* ── Slide-Over Advanced Filter Drawer (Rule #13 & Section 9 Accessibility) ── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/25 z-40 animate-in fade-in duration-150"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="التصفية والبحث المتقدم"
            className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-[#E5E7EB] shadow-2xl p-4 flex flex-col justify-between animate-in slide-in-from-right duration-200"
            dir="rtl"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#0F766E]" />
                  <h3 className="text-sm font-bold text-[#111827]">التصفية والبحث المتقدم</h3>
                </div>
                <button
                  type="button"
                  aria-label="إغلاق التصفية"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-md text-[#6B7280] hover:bg-[#F1F5F9] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-right">
                {/* Search */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#374151]">البحث النصي</label>
                  <Input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="رقم الفاتورة، اسم المشتري، رقم الهيكل..."
                    className="h-8 text-xs border-[#E5E7EB] bg-[#F8FAFC]"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#374151]">حالة الفاتورة</label>
                  <div className="grid grid-cols-3 gap-1">
                    {STATUS_OPTS.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => { setStatus(o.value); setPage(1) }}
                        className={cn(
                          "py-1.5 px-2 text-xs rounded-md font-medium border transition-colors",
                          status === o.value
                            ? "bg-[#F0FDFA] text-[#0F766E] border-[#0F766E] font-bold"
                            : "bg-[#F8FAFC] text-[#374151] border-[#E5E7EB] hover:bg-[#F1F5F9]"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#374151]">طريقة الدفع</label>
                  <div className="grid grid-cols-2 gap-1">
                    {METHOD_OPTS.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => { setMethod(o.value); setPage(1) }}
                        className={cn(
                          "py-1.5 px-2 text-xs rounded-md font-medium border transition-colors text-center",
                          method === o.value
                            ? "bg-[#F0FDFA] text-[#0F766E] border-[#0F766E] font-bold"
                            : "bg-[#F8FAFC] text-[#374151] border-[#E5E7EB] hover:bg-[#F1F5F9]"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2 border-t border-[#E5E7EB] pt-3">
                  <label className="text-xs font-semibold text-[#374151] block">تاريخ الفاتورة</label>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[11px] text-[#6B7280]">من تاريخ:</span>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                        className="h-8 text-xs border-[#E5E7EB] bg-[#F8FAFC]"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#6B7280]">إلى تاريخ:</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setPage(1) }}
                        className="h-8 text-xs border-[#E5E7EB] bg-[#F8FAFC]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer controls */}
            <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
              <Button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs h-8 rounded-lg font-bold"
              >
                تطبيق التصفية
              </Button>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full text-center text-xs text-[#DC2626] hover:underline font-medium py-1"
                >
                  إعادة ضبط جميع الخيارات
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Enterprise High-Density Table ── */}
      <AdvancedTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        searchPlaceholder="البحث برقم الفاتورة، المشتري، رقم الهيكل..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1) }}
        exportFilename="فواتير-المبيعات"
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        density={density}
        onDensityChange={setDensity}
        onFilterDrawerToggle={() => setDrawerOpen(true)}
        activeFilterCount={activeFiltersCount}
        renderExpandedRow={(row) => <SalePaymentDetails saleId={row.id} />}
        
        /* Quick Status Filter Pills in Toolbar (Rule #5) */
        quickFilterControl={
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E5E7EB] p-0.5 rounded-lg">
            {STATUS_OPTS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setStatus(s.value); setPage(1) }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap",
                  status === s.value
                    ? "bg-white text-[#0F766E] font-bold shadow-2xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        }

        /* Visually Dominant Primary CTA "+ فاتورة جديدة" (Rule #12) */
        primaryAction={
          <Button asChild size="sm" className="h-8 gap-1.5 text-xs bg-[#0F766E] hover:bg-[#0D655E] text-[#FFFFFF] font-bold rounded-lg px-3 shadow-2xs">
            <Link href="/sales/new">
              <Plus className="h-3.5 w-3.5" />
              <span>فاتورة جديدة</span>
            </Link>
          </Button>
        }

        rowActions={(sale) => [
          { label: 'عرض', icon: <Eye className="h-3 w-3" />, onClick: (s) => router.push(`/sales/${s.id}`) },
          { label: 'عقد', icon: <FileText className="h-3 w-3" />, onClick: (s) => window.open(`/sales/${s.id}/contract`, '_blank') },
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
  )
}
