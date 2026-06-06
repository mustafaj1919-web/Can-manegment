'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertCircle, ArrowUpRight, Calendar, Car, Download,
  Filter, Plus, Receipt, RefreshCw, Search, ShoppingBag, User, X,
} from 'lucide-react'
import { cn, formatDate, formatMoney, getStatusVariant, translateStatus } from '@/lib/utils'
import { getPurchases, type PurchaseListItem } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { exportXlsx } from '@/lib/export'

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
  return search || status !== 'all' || method !== 'all' || dateFrom || dateTo
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

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

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

  const activeFilters = hasActiveFilters(search, status, method, dateFrom, dateTo)

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
            <ShoppingBag className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">فواتير المشتريات</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${total.toLocaleString('ar-EG')} فاتورة`}
              {activeFilters && <span className="text-blue-400"> (مفلترة)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            onClick={handleExport} disabled={exporting || isLoading || total === 0}
            className="h-9 gap-2 border-white/10 bg-white/5 text-xs hover:bg-white/10">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </Button>
          <Button asChild className="gap-2 bg-blue-600 text-white hover:bg-blue-500 h-9 text-xs">
            <Link href="/purchases/new">
              <Plus className="h-3.5 w-3.5" />
              فاتورة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="رقم الفاتورة، اسم البائع، السيارة، رقم الهيكل..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="ps-9 bg-white/5 border-white/10 h-9 text-sm"
            />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-[150px] h-9 bg-white/5 border-white/10 text-sm">
              <Filter className="h-3.5 w-3.5 me-1.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={method} onValueChange={v => { setMethod(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] h-9 bg-white/5 border-white/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">من:</span>
            <Input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="h-8 bg-white/5 border-white/10 text-xs flex-1 min-w-[130px]" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">إلى:</span>
            <Input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="h-8 bg-white/5 border-white/10 text-xs flex-1 min-w-[130px]" />
          </div>
          {activeFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />مسح الفلاتر
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" />تحديث
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="space-y-3 p-4">
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
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل فواتير المشتريات</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">
              إعادة المحاولة
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-foreground/70">
              {activeFilters ? 'لا توجد نتائج تطابق الفلترة' : 'لا توجد فواتير مشتريات'}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {activeFilters ? 'جرّب تغيير معايير البحث أو مسح الفلاتر' : 'أضف أول فاتورة شراء للبدء'}
            </p>
            {activeFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 text-xs gap-1.5">
                <X className="h-3 w-3" />مسح الفلاتر
              </Button>
            ) : (
              <Button asChild size="sm" className="mt-4 gap-2 bg-blue-600 text-white hover:bg-blue-500">
                <Link href="/purchases/new"><Plus className="h-3.5 w-3.5" />فاتورة جديدة</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">الفاتورة</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">السيارة</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">البائع</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">المبلغ</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground hidden sm:table-cell">الطريقة</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground hidden sm:table-cell">الحالة</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((purchase, index) => (
                    <motion.tr key={purchase.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.025 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <p className="font-numeric text-xs text-blue-300">{purchase.invoice_number}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />{formatDate(purchase.purchase_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-xs text-foreground/90">
                          <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          <span className="truncate max-w-[140px]">{purchase.car_name ?? `سيارة #${purchase.car_id ?? '—'}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-xs text-foreground/90">
                          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          <span className="truncate max-w-[130px]">{purchase.seller_name ?? `بائع #${purchase.seller_id ?? '—'}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-numeric text-xs font-semibold text-foreground">
                          {formatMoney(purchase.purchase_price, purchase.currency)}
                        </p>
                        {purchase.remaining_amount > 0 && (
                          <p className="mt-0.5 text-[10px] text-rose-400">
                            متبقي: {formatMoney(purchase.remaining_amount, purchase.currency)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">
                        {METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', getStatusVariant(purchase.status))}>
                          {translateStatus(purchase.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-end">
                        <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8">
                          <Link href={`/purchases/${purchase.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
                <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages} - {total.toLocaleString('ar-EG')} فاتورة</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
