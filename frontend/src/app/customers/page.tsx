'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion, type Variants } from 'framer-motion'
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
import { FilterBar } from '@/components/shared/FilterBar'
import { DataTable } from '@/components/shared/DataTable'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTS = [
  { value: 'all',    label: 'الكل' },
  { value: 'Buyer',  label: 'مشترون' },
  { value: 'Seller', label: 'بائعون' },
]

const TYPE_BADGE: Record<string, string> = {
  Buyer:  'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Seller: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
}
const TYPE_LABEL: Record<string, string> = {
  Buyer: 'مشتري', Seller: 'بائع',
}

// ── Animation Variants ───────────────────────────────────────────────────────

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, iconColor, iconBg, accentGlow }: {
  icon: React.ReactNode; label: string; value: number | string
  iconColor: string; iconBg: string; accentGlow?: string
}) {
  return (
    <div className="app-card rounded-xl p-4 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
      {/* Subtle gradient glow */}
      {accentGlow && (
        <div className={cn('absolute -top-8 -end-8 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-35 transition-opacity', accentGlow)} />
      )}
      <div className="relative z-10">
        <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-white/5', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="font-numeric text-2xl font-bold tabular-nums text-foreground">
          {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ── Helper ───────────────────────────────────────────────────────────────────

function safeText(value?: string | null, fallback = '—') {
  return value?.trim() ? value : fallback
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
  const totalCount = counts ? counts.buyers + counts.sellers : undefined

  function resetFilters() { setSearch(''); setTypeFilter('all'); setPage(1) }

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
            view === v ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Header ── */}
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

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="إجمالي العملاء"
          value={totalCount ?? '...'}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          accentGlow="bg-blue-500"
        />
        <KpiCard
          icon={<UserCheck className="h-4 w-4" />}
          label="مشترون"
          value={counts?.buyers ?? '...'}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10"
          accentGlow="bg-cyan-500"
        />
        <KpiCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="بائعون"
          value={counts?.sellers ?? '...'}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          accentGlow="bg-amber-500"
        />
      </div>

      {/* ── Filters ── */}
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

      {/* ── Cards View ── */}
      {view === 'cards' && (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3.5 w-14 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-border/30 pt-3">
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                    <Skeleton className="h-10 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="app-card rounded-xl">
            <EmptyState
              variant="error"
              title="تعذر تحميل العملاء"
              description="تحقق من تشغيل الخادم ثم أعد المحاولة"
              action={<Button variant="ghost" size="sm" onClick={() => refetch()}>إعادة المحاولة</Button>}
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
                  <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">مسح الفلاتر</Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/customers/new"><Plus className="me-1.5 h-3.5 w-3.5" />عميل جديد</Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              variants={gridVariants}
              initial="hidden"
              animate="show"
            >
              {items.map((customer) => {
                const displayName    = customer.full_name || customer.name
                const initials       = displayName.slice(0, 2)
                const salesCount     = customer.sales_count ?? 0
                const purchasesCount = customer.purchases_count ?? 0
                const documentsCount = customer.documents_count ?? 0

                return (
                  <motion.div key={customer.id} variants={cardVariants}>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="group block overflow-hidden rounded-xl bg-[var(--s1)] border border-[var(--border-card)] hover:border-red-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_0_1px_rgba(239,27,45,0.08)]"
                    >
                      {/* Top accent bar */}
                      <div className={cn(
                        'h-1 w-full',
                        customer.customer_type === 'Buyer'
                          ? 'bg-gradient-to-r from-cyan-500/60 via-cyan-500/30 to-transparent'
                          : 'bg-gradient-to-r from-amber-500/60 via-amber-500/30 to-transparent',
                      )} />

                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-white/5 transition-all duration-300',
                            customer.customer_type === 'Buyer'
                              ? 'bg-gradient-to-br from-cyan-500/15 to-cyan-900/15 text-cyan-400'
                              : 'bg-gradient-to-br from-amber-500/15 to-amber-900/15 text-amber-400',
                          )}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground leading-tight group-hover:text-red-500 transition-colors">{displayName}</p>
                            <span className={cn(
                              'mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                              TYPE_BADGE[customer.customer_type],
                            )}>
                              {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
                            </span>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/20 transition-all group-hover:text-red-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mt-0.5" />
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1.5 bg-[var(--s2)] rounded-lg p-2.5">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0 text-red-500/50" />
                            <span className="truncate">{safeText(customer.phone)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Hash className="h-3 w-3 shrink-0 text-red-500/50" />
                            <span className="font-numeric truncate">{safeText(customer.id_number)}</span>
                          </div>
                        </div>

                        {/* Activity stats */}
                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                          {[
                            { icon: UserCheck,   label: 'مبيعات', value: salesCount,     colorClass: 'text-emerald-400', bg: 'bg-emerald-500/5' },
                            { icon: ShoppingBag, label: 'مشتريات', value: purchasesCount, colorClass: 'text-blue-400', bg: 'bg-blue-500/5' },
                            { icon: FileText,    label: 'وثائق',   value: documentsCount, colorClass: 'text-violet-400', bg: 'bg-violet-500/5' },
                          ].map(({ icon: Icon, label, value, colorClass, bg }) => (
                            <div key={label} className={cn('rounded-lg p-2 text-center ring-1 ring-white/[0.03]', bg)}>
                              <p className={cn('font-numeric text-base font-bold leading-none', colorClass)}>{value}</p>
                              <div className="mt-1 flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground/55">
                                <Icon className="h-2.5 w-2.5" />
                                <span>{label}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <p className="text-[10px] text-muted-foreground/35">
                          أُضيف {formatDate(customer.created_at)}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>

            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="عميل" />
          </>
        )
      )}

      {/* ── Table View ── */}
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
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">مسح الفلاتر</Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/customers/new"><Plus className="me-1.5 h-3.5 w-3.5" />عميل جديد</Link>
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
                  <tr key={customer.id}>
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
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                        TYPE_BADGE[customer.customer_type],
                      )}>
                        {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-emerald-400/60" />
                          {customer.sales_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 text-blue-400/60" />
                          {customer.purchases_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-violet-400/60" />
                          {customer.documents_count ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-[11px] text-muted-foreground">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="text-end">
                      <Button asChild variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
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
