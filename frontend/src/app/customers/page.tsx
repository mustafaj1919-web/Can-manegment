'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight, Download, FileText, Hash, LayoutGrid, List,
  Phone, Plus, ShoppingBag, UserCheck, Users,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getCustomers } from '@/lib/api/customers'
import type { Customer } from '@/lib/api/customers'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatStrip } from '@/components/shared/StatStrip'
import { FilterBar } from '@/components/shared/FilterBar'
import { DataTable } from '@/components/shared/DataTable'

const TYPE_OPTS = [
  { value: 'all',    label: 'الكل' },
  { value: 'Buyer',  label: 'مشترون' },
  { value: 'Seller', label: 'بائعون' },
]

// Semantic colors — functional distinction between buyer and seller, not per-page branding
const TYPE_BADGE: Record<string, string> = {
  Buyer:  'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Seller: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
}

const TYPE_LABEL: Record<string, string> = {
  Buyer: 'مشتري', Seller: 'بائع',
}

function safeText(value?: string | null, fallback = '—') {
  return value?.trim() ? value : fallback
}

export default function CustomersPage() {
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view,       setView]       = useState<'cards' | 'table'>('cards')
  const [page,       setPage]       = useState(1)
  const [exporting,  setExporting]  = useState(false)
  const perPage = 20

  const params = useMemo(() => ({
    page,
    per_page: perPage,
    search: search.trim() || undefined,
    customer_type: typeFilter === 'all' ? undefined : typeFilter,
  }), [page, search, typeFilter])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
    staleTime: 30_000,
    retry: 1,
  })

  // Lightweight aggregate counts for StatStrip (per_page:1 returns only the total)
  const { data: counts } = useQuery({
    queryKey: ['customer-counts'],
    queryFn: async () => {
      const [buyers, sellers] = await Promise.all([
        getCustomers({ customer_type: 'Buyer',  per_page: 1, page: 1 }),
        getCustomers({ customer_type: 'Seller', per_page: 1, page: 1 }),
      ])
      return { buyers: buyers.total, sellers: sellers.total }
    },
    staleTime: 120_000,
    retry: 1,
  })

  const items      = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasFilters = !!(search || typeFilter !== 'all')

  function resetFilters() {
    setSearch(''); setTypeFilter('all'); setPage(1)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = await getCustomers({ ...params, page: 1, per_page: 1000 })
      const headers = ['الاسم الكامل', 'الهاتف', 'نوع الهوية', 'رقم الهوية', 'العنوان', 'النوع', 'المبيعات', 'المشتريات']
      const rows = all.items.map((c: Customer) => [
        c.full_name || c.name, c.phone, c.id_type ?? '',
        c.id_number, c.address ?? '', TYPE_LABEL[c.customer_type] ?? c.customer_type,
        c.sales_count ?? 0, c.purchases_count ?? 0,
      ] as (string | number)[])
      await exportXlsx('العملاء', headers, rows)
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
        title="العملاء"
        icon={<Users className="h-4 w-4" />}
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
              <Link href="/customers/new">
                <Plus className="h-3.5 w-3.5" />
                عميل جديد
              </Link>
            </Button>
          </>
        }
      />

      <StatStrip
        stats={[
          {
            label: 'إجمالي العملاء',
            value: counts ? counts.buyers + counts.sellers : '...',
            icon: <Users className="h-4 w-4" />,
            color: 'info',
          },
          {
            label: 'مشترون',
            value: counts?.buyers ?? '...',
            icon: <UserCheck className="h-4 w-4" />,
            color: 'success',
          },
          {
            label: 'بائعون',
            value: counts?.sellers ?? '...',
            icon: <ShoppingBag className="h-4 w-4" />,
            color: 'warning',
          },
        ]}
      />

      <FilterBar
        search={{
          value: search,
          onChange: v => { setSearch(v); setPage(1) },
          placeholder: 'بحث بالاسم أو الهاتف أو رقم الهوية...',
        }}
        selects={[
          {
            value: typeFilter,
            onChange: v => { setTypeFilter(v); setPage(1) },
            options: TYPE_OPTS,
            width: 'w-full sm:w-[160px]',
          },
        ]}
        hasActiveFilters={hasFilters}
        onReset={resetFilters}
        onRefresh={() => refetch()}
      />

      {/* Cards view — DataTable not suited for grid layout; states handled inline */}
      {view === 'cards' && (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="app-card rounded-xl">
            <EmptyState
              variant="error"
              title="تعذر تحميل العملاء"
              description="تحقق من تشغيل الخادم ثم أعد المحاولة"
              action={
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  إعادة المحاولة
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="app-card rounded-xl">
            <EmptyState
              variant={hasFilters ? 'search' : 'default'}
              icon={<Users className="h-5 w-5" />}
              title={hasFilters ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد'}
              description={hasFilters ? 'جرّب تعديل معايير البحث' : 'أضف أول عميل للبدء'}
              action={
                hasFilters ? (
                  <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
                    مسح الفلاتر
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/customers/new">
                      <Plus className="me-1.5 h-3.5 w-3.5" />
                      عميل جديد
                    </Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((customer) => {
                const displayName    = customer.full_name || customer.name
                const salesCount     = customer.sales_count ?? 0
                const purchasesCount = customer.purchases_count ?? 0
                const documentsCount = customer.documents_count ?? 0

                return (
                  <div
                    key={customer.id}
                    className="glass-interactive overflow-hidden rounded-xl"
                  >

                    <div className="p-4">
                      <div className="mb-3.5 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-sm font-bold text-foreground">
                            {displayName.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                            <span className={cn(
                              'mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                              TYPE_BADGE[customer.customer_type]
                            )}>
                              {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
                            </span>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <Link href={`/customers/${customer.id}`} aria-label="عرض تفاصيل العميل">
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          <span className="truncate">{safeText(customer.phone)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          <span className="font-numeric truncate">{safeText(customer.id_number)}</span>
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-border/30 pt-3">
                        {[
                          { icon: UserCheck,   label: 'بيع',   value: salesCount },
                          { icon: ShoppingBag, label: 'شراء',  value: purchasesCount },
                          { icon: FileText,    label: 'وثائق', value: documentsCount },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="min-w-0 text-center">
                            <p className="font-numeric text-base font-bold text-foreground">{value}</p>
                            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
                              <Icon className="h-2.5 w-2.5" />
                              <span>{label}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="mt-2.5 text-[10px] text-muted-foreground/40">
                        أُضيف {formatDate(customer.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="عميل" />
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
            icon: <Users className="h-5 w-5" />,
            title: hasFilters ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد',
            description: hasFilters ? 'جرّب تعديل معايير البحث' : 'أضف أول عميل للبدء',
            action: hasFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
                مسح الفلاتر
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/customers/new">
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  عميل جديد
                </Link>
              </Button>
            ),
          }}
          footer={
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="عميل" compact />
          }
        >
          <table className="app-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th className="hidden sm:table-cell">رقم الهوية</th>
                <th className="hidden sm:table-cell">النوع</th>
                <th>المعاملات</th>
                <th className="hidden md:table-cell">مضاف</th>
                <th className="w-10"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => {
                const displayName = customer.full_name || customer.name
                return (
                  <tr
                    key={customer.id}
                  >
                    <td>
                      <p className="text-xs font-semibold">{displayName}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone className="h-2.5 w-2.5" />
                        {safeText(customer.phone)}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell font-numeric text-[11px] text-muted-foreground">
                      {safeText(customer.id_number)}
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        TYPE_BADGE[customer.customer_type]
                      )}>
                        {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          {customer.sales_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          {customer.purchases_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {customer.documents_count ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-[11px] text-muted-foreground">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="text-end">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Link href={`/customers/${customer.id}`}>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DataTable>
      )}

    </div>
  )
}
