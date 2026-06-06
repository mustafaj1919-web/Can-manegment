'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, Plus, Search, Filter, AlertCircle,
  Car, User, Calendar, ArrowUpRight, Receipt,
  Download, X, RefreshCw,
} from 'lucide-react'
import { cn, formatMoney, formatDate, translateStatus, getStatusVariant } from '@/lib/utils'
import { getSales, type SaleListItem } from '@/lib/api/sales'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportXlsx } from '@/lib/export'

const STATUS_OPTS = [
  { value: 'all',       label: 'كل الحالات' },
  { value: 'Active',    label: 'نشطة' },
  { value: 'Cancelled', label: 'ملغاة' },
]
const METHOD_OPTS = [
  { value: 'all',            label: 'كل طرق الدفع' },
  { value: 'Cash',           label: 'نقداً' },
  { value: 'Installment',    label: 'أقساط' },
  { value: 'Bank transfer',  label: 'حوالة مصرفية' },
]
const METHOD_LABELS: Record<string, string> = {
  Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة',
}

function hasActiveFilters(search: string, status: string, method: string, dateFrom: string, dateTo: string) {
  return search || status !== 'all' || method !== 'all' || dateFrom || dateTo
}

export default function SalesPage() {
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [method,   setMethod]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)
  const [exporting, setExporting] = useState(false)
  const PER_PAGE = 20

  const params = {
    page,
    per_page: PER_PAGE,
    status:    status   !== 'all' ? status    : undefined,
    method:    method   !== 'all' ? method    : undefined,
    search:    search.trim() || undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
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

  function resetFilters() {
    setSearch(''); setStatus('all'); setMethod('all')
    setDateFrom(''); setDateTo(''); setPage(1)
  }

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      // Fetch all matching results (up to 1000)
      const all = await getSales({ ...params, page: 1, per_page: 1000 })
      const headers = ['رقم الفاتورة', 'التاريخ', 'اسم السيارة', 'رقم الهيكل', 'المشتري', 'المبلغ', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الحالة']
      const rows = all.items.map((s: SaleListItem) => [
        s.invoice_number,
        s.sale_date ?? '',
        s.car_name ?? '',
        s.car_vin ?? '',
        s.buyer_name ?? '',
        s.selling_price,
        s.paid_amount,
        s.remaining_amount,
        METHOD_LABELS[s.payment_method] ?? s.payment_method,
        translateStatus(s.status),
      ])
      await exportXlsx('فواتير-المبيعات', headers, rows)
    } finally {
      setExporting(false)
    }
  }, [params])

  const activeFilters = hasActiveFilters(search, status, method, dateFrom, dateTo)

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <TrendingUp className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">فواتير المبيعات</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? '...' : `${total.toLocaleString('ar-EG')} فاتورة`}
              {activeFilters && <span className="text-amber-400"> (مفلترة)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={handleExport} disabled={exporting || isLoading || total === 0}
            className="h-9 gap-2 border-white/10 bg-white/5 text-xs hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </Button>
          <Button asChild className="gap-2 bg-amber-600 hover:bg-amber-500 text-white h-9 text-xs">
            <Link href="/sales/new">
              <Plus className="h-3.5 w-3.5" />
              فاتورة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="رقم الفاتورة، اسم المشتري، السيارة، رقم الهيكل..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="ps-9 bg-white/5 border-white/10 h-9 text-sm"
            />
          </div>
          {/* Status */}
          <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-[150px] h-9 bg-white/5 border-white/10 text-sm">
              <Filter className="h-3.5 w-3.5 me-1.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Method */}
          <Select value={method} onValueChange={v => { setMethod(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] h-9 bg-white/5 border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Date range */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">من:</span>
            <Input
              type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="h-8 bg-white/5 border-white/10 text-xs flex-1 min-w-[130px]"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">إلى:</span>
            <Input
              type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="h-8 bg-white/5 border-white/10 text-xs flex-1 min-w-[130px]"
            />
          </div>
          {activeFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
              مسح الفلاتر
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" /><Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-rose-400/50 mb-3" />
            <p className="text-sm text-muted-foreground">تعذّر تحميل الفواتير</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">
              إعادة المحاولة
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/25 mb-3" />
            <p className="font-medium text-foreground/70">
              {activeFilters ? 'لا توجد نتائج تطابق الفلترة' : 'لا توجد فواتير مبيعات'}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {activeFilters ? 'جرّب تغيير معايير البحث أو مسح الفلاتر' : 'أضف أول فاتورة بيع للبدء'}
            </p>
            {activeFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 text-xs gap-1.5">
                <X className="h-3 w-3" />
                مسح الفلاتر
              </Button>
            ) : (
              <Button asChild size="sm" className="mt-4 gap-2 bg-amber-600 hover:bg-amber-500 text-white">
                <Link href="/sales/new"><Plus className="h-3.5 w-3.5" />فاتورة جديدة</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <th className="px-5 py-3 text-start text-xs text-muted-foreground font-medium">الفاتورة</th>
                    <th className="px-4 py-3 text-start text-xs text-muted-foreground font-medium hidden md:table-cell">السيارة</th>
                    <th className="px-4 py-3 text-start text-xs text-muted-foreground font-medium hidden lg:table-cell">المشتري</th>
                    <th className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">المبلغ</th>
                    <th className="px-4 py-3 text-start text-xs text-muted-foreground font-medium hidden sm:table-cell">الطريقة</th>
                    <th className="px-4 py-3 text-start text-xs text-muted-foreground font-medium hidden sm:table-cell">الحالة</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sale, i) => (
                    <motion.tr key={sale.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-mono text-amber-400">{sale.invoice_number}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />{formatDate(sale.sale_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Car className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-xs text-foreground/90 truncate max-w-[150px]">
                            {sale.car_name ?? `سيارة #${sale.car_id ?? '—'}`}
                          </span>
                        </div>
                        {sale.car_vin && <p className="text-[10px] text-muted-foreground/50 mt-0.5 ps-5 font-mono">{sale.car_vin}</p>}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-xs truncate max-w-[130px]">{sale.buyer_name ?? '—'}</span>
                        </div>
                        {sale.buyer_phone && <p className="text-[10px] text-muted-foreground/50 mt-0.5 ps-5">{sale.buyer_phone}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-semibold text-foreground">{formatMoney(sale.selling_price, sale.currency)}</p>
                        {sale.remaining_amount > 0 && (
                          <p className="text-[10px] text-rose-400 mt-0.5">متبقي: {formatMoney(sale.remaining_amount, sale.currency)}</p>
                        )}
                        {sale.has_installment && <span className="text-[10px] text-cyan-400/80">أقساط</span>}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-muted-foreground">
                        {METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', getStatusVariant(sale.status))}>
                          {translateStatus(sale.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-end">
                        <Button asChild variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Link href={`/sales/${sale.id}`}><ArrowUpRight className="h-3.5 w-3.5" /></Link>
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
                <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages} · {total.toLocaleString('ar-EG')} فاتورة</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">السابق</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">التالي</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
