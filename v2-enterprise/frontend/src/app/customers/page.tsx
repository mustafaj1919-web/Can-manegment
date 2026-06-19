'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ArrowUpRight, Download, Eye, FileText, Hash, LayoutGrid, List,
  Phone, Plus, ShoppingBag, UserCheck, Users, X, MapPin, Calendar, DollarSign, Edit
} from 'lucide-react'
import type { RowAction } from '@/components/shared/AdvancedTable'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { getCustomers, getCustomerStatement } from '@/lib/api/customers'
import type { Customer } from '@/lib/api/customers'
import { CustomerQuickCard } from '@/components/shared/CustomerQuickCard'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { exportXlsx } from '@/lib/export'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterBar } from '@/components/shared/FilterBar'
import { AdvancedTable, ColumnDef } from '@/components/shared/AdvancedTable'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTS = [
  { value: 'all',        label: 'الكل' },
  { value: 'Individual', label: 'أفراد' },
  { value: 'Company',    label: 'شركات' },
]

const TYPE_BADGE: Record<string, string> = {
  Individual: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.06)] font-bold',
  Company:    'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.06)] font-bold',
}

const TYPE_LABEL: Record<string, string> = {
  Individual: 'فرد', Company: 'شركة',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeText(value?: string | null, fallback = '—') {
  return value?.trim() ? value : fallback
}

function getHealthScore(salesCount: number, purchasesCount: number): { score: number; label: string; color: string } {
  const total = (salesCount ?? 0) + (purchasesCount ?? 0)
  if (total === 0) return { score: 1, label: 'جديد',      color: 'text-muted-foreground/40' }
  if (total === 1) return { score: 2, label: 'مبتدئ',     color: 'text-sky-400' }
  if (total === 2) return { score: 3, label: 'نشط',       color: 'text-blue-400' }
  if (total === 3) return { score: 4, label: 'موثوق',     color: 'text-emerald-400' }
  return               { score: 5, label: 'ذهبي',       color: 'text-amber-400' }
}

function HealthDots({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5" title={`موثوقية العميل: ${score}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full transition-colors',
            i < score ? color.replace('text-', 'bg-') : 'bg-border/40'
          )}
        />
      ))}
    </div>
  )
}

function getHashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return {
    bg: `hsla(${h}, 60%, 45%, 0.12)`,
    text: `hsl(${h}, 75%, 55%)`,
  }
}

// ── Animation Variants ───────────────────────────────────────────────────────

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, iconColor, iconBg, accentGlow }: {
  icon: React.ReactNode; label: string; value: number | string
  iconColor: string; iconBg: string; accentGlow?: string
}) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 relative overflow-hidden group hover:border-primary/20 transition-all duration-300 shadow-sm">
      {accentGlow && (
        <div className={cn('absolute -top-8 -end-8 w-24 h-24 rounded-full blur-[40px] opacity-[0.03] dark:opacity-20 group-hover:opacity-[0.06] dark:group-hover:opacity-35 transition-opacity', accentGlow)} />
      )}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="mt-0.5 text-xs text-muted-foreground/60 font-semibold">{label}</p>
          <p className="font-numeric text-2xl font-bold tabular-nums text-foreground mt-1.5">
            {typeof value === 'number' ? value.toLocaleString('en-US') : value}
          </p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

// ── Quick View Panel Component ───────────────────────────────────────────────

function QuickViewPanel({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const { data: statement, isLoading, isError } = useQuery({
    queryKey: ['customer-statement', customerId],
    queryFn: () => getCustomerStatement(customerId),
    staleTime: 10_000,
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ translateX: '100%' }}
        animate={{ translateX: 0 }}
        exit={{ translateX: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-[500px] h-full bg-card border-s border-border/60 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-border/40">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground/80"><Users className="h-5 w-5" /></span>
              <h3 className="text-base font-bold text-foreground">معاينة سريعة للعميل</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-6 pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          ) : isError || !statement ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-rose-500">تعذر تحميل بيانات كشف حساب العميل</p>
            </div>
          ) : (
            <div className="space-y-6 pt-6">
              {/* Profile Card */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const cName = statement.customer?.name ?? '—'
                    const cType = statement.customer?.customer_type ?? ''
                    return (
                      <>
                        <div
                          style={{
                            backgroundColor: getHashColor(cName).bg,
                            color: getHashColor(cName).text
                          }}
                          className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-white/5"
                        >
                          {cName.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-foreground leading-snug">{cName}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                              TYPE_BADGE[cType]
                            )}>
                              {TYPE_LABEL[cType] ?? cType}
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="icon-sm" className="h-8 w-8 rounded-lg">
                    <Link href={`/customers/${statement.customer?.id}/edit`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="h-8 gap-1 rounded-lg">
                    <Link href={`/customers/${statement.customer?.id}`}>
                      <span>الملف الكامل</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Information List */}
              <div className="grid grid-cols-2 gap-3 bg-secondary/20 rounded-xl p-3 border border-border/40">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">رقم الهاتف</span>
                  <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="font-numeric">{safeText(statement.customer?.phone)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">نوع العميل</span>
                  <span className="text-xs text-foreground font-semibold">
                    {TYPE_LABEL[statement.customer?.customer_type ?? ''] || statement.customer?.customer_type}
                  </span>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الملخص المالي</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border/50 bg-secondary/10 rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground block">إجمالي المعاملات ({statement.summary.sales_count})</span>
                    <span className="font-numeric text-base font-bold text-foreground mt-1 block">
                      {formatMoney(statement.summary.total_sales_amount, statement.summary.currency)}
                    </span>
                  </div>
                  <div className="border border-border/50 bg-secondary/10 rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground block">المبالغ المدفوعة</span>
                    <span className="font-numeric text-base font-bold text-emerald-400 mt-1 block">
                      {formatMoney(statement.summary.total_paid_amount, statement.summary.currency)}
                    </span>
                  </div>
                  <div className="border border-border/50 bg-secondary/10 rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground block">المتبقي في الذمة</span>
                    <span className="font-numeric text-base font-bold text-amber-400 mt-1 block">
                      {formatMoney(statement.summary.total_remaining, statement.summary.currency)}
                    </span>
                  </div>
                  <div className="border border-border/50 bg-secondary/10 rounded-xl p-3">
                    <span className="text-[10px] text-muted-foreground block">المستحقات المتأخرة</span>
                    <span className="font-numeric text-base font-bold text-rose-400 mt-1 block">
                      {formatMoney(statement.summary.total_overdue, statement.summary.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Sales / Transactions */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">آخر الفواتير والمعاملات</h5>
                {statement.sales.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">لا توجد فواتير بيع أو شراء مسجلة لهذا العميل</p>
                ) : (
                  <div className="space-y-2">
                    {statement.sales.slice(0, 4).map(sale => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{sale.car_name || 'سيارة غير محددة'}</p>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {sale.invoice_number} • {sale.sale_date ? formatDate(sale.sale_date) : ''}
                          </span>
                        </div>
                        <div className="text-end shrink-0">
                          <span className="font-numeric text-xs font-bold text-foreground block">
                            {formatMoney(sale.selling_price, sale.currency)}
                          </span>
                          <span className={cn(
                            'text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block',
                            sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          )}>
                            {sale.status === 'Paid' ? 'مسدد' : 'متبقي'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} className="w-full text-xs h-9">
            إغلاق المعاينة
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter()
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view,       setView]       = useState<'cards' | 'table'>('cards')
  const [page,       setPage]       = useState(1)
  const [exporting,  setExporting]  = useState(false)
  const perPage = 20

  // Quick view state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      key: 'name',
      header: 'العميل',
      render: (customer) => {
        const displayName = customer.full_name || customer.name
        const initials = displayName.slice(0, 2)
        const hashColor = getHashColor(displayName)
        return (
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: hashColor.bg, color: hashColor.text }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
            >
              {initials}
            </div>
            <div>
              <CustomerQuickCard customerId={customer.id} customerName={displayName} className="text-xs font-bold" />
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Phone className="h-2.5 w-2.5" />
                {safeText(customer.phone)}
              </div>
            </div>
          </div>
        )
      },
      width: 200,
    },
    {
      key: 'id_number',
      header: 'رقم الهوية',
      render: (customer) => <span className="font-numeric text-[11px] text-muted-foreground">{safeText(customer.id_number)}</span>,
      width: 140,
    },
    {
      key: 'customer_type',
      header: 'النوع',
      render: (customer) => (
        <span className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold',
          TYPE_BADGE[customer.customer_type]
        )}>
          {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
        </span>
      ),
      width: 100,
    },
    {
      key: 'transactions',
      header: 'المعاملات',
      render: (customer) => (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold">
            <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {customer.sales_count ?? 0}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <ShoppingBag className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            {customer.purchases_count ?? 0}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <FileText className="h-3 w-3 text-violet-600 dark:text-violet-400" />
            {customer.documents_count ?? 0}
          </span>
        </div>
      ),
      width: 170,
    },
    {
      key: 'health',
      header: 'الموثوقية',
      render: (customer) => {
        const { score, label, color } = getHealthScore(customer.sales_count ?? 0, customer.purchases_count ?? 0)
        return (
          <div className="flex flex-col gap-1">
            <HealthDots score={score} color={color} />
            <span className={cn('text-[10px] font-semibold', color)}>{label}</span>
          </div>
        )
      },
      width: 90,
    },
    {
      key: 'created_at',
      header: 'مضاف',
      render: (customer) => <span className="text-[11px] text-muted-foreground">{formatDate(customer.created_at)}</span>,
      width: 120,
    },
    {
      key: 'actions',
      header: '',
      render: (customer) => (
        <div className="text-end" onClick={e => e.stopPropagation()}>
          <Button asChild variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Link href={`/customers/${customer.id}`}>
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
      const [individuals, companies] = await Promise.all([
        getCustomers({ customer_type: 'Individual', per_page: 1, page: 1 }),
        getCustomers({ customer_type: 'Company',    per_page: 1, page: 1 }),
      ])
      return { buyers: individuals.total, sellers: companies.total }
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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200" dir="rtl">

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
              className="h-8 gap-1.5 text-xs rounded-lg"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'جاري التصدير...' : 'Excel'}
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5 text-xs rounded-lg">
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
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10 border-blue-500/20"
          accentGlow="bg-blue-500"
        />
        <KpiCard
          icon={<UserCheck className="h-4 w-4" />}
          label="أفراد"
          value={counts?.buyers ?? '...'}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-500/10 border-cyan-500/20"
          accentGlow="bg-cyan-500"
        />
        <KpiCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="شركات"
          value={counts?.sellers ?? '...'}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 border-amber-500/20"
          accentGlow="bg-amber-500"
        />
      </div>

      {/* ── Filters ── */}
      <FilterBar
        search={view !== 'table' ? {
          value: search,
          onChange: v => { setSearch(v); setPage(1) },
          placeholder: 'بحث بالاسم أو الهاتف أو رقم الهوية...',
        } : undefined}
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
                const hashColor      = getHashColor(displayName)
                const health         = getHealthScore(salesCount, purchasesCount)

                return (
                  <motion.div key={customer.id} variants={cardVariants}>
                    <div
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="group cursor-pointer block overflow-hidden rounded-xl bg-card border border-border/60 hover:border-primary/20 transition-all duration-300 shadow-xs"
                    >
                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div
                            style={{ backgroundColor: hashColor.bg, color: hashColor.text }}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-white/5 transition-all duration-300"
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{displayName}</p>
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                TYPE_BADGE[customer.customer_type],
                              )}>
                                {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <HealthDots score={health.score} color={health.color} />
                                <span className={cn('text-[10px] font-semibold', health.color)}>{health.label}</span>
                              </div>
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/20 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mt-0.5" />
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1.5 bg-secondary/20 rounded-lg p-2.5 border border-border/30">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            <span className="truncate">{safeText(customer.phone)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Hash className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            <span className="font-numeric truncate">{safeText(customer.id_number)}</span>
                          </div>
                        </div>

                        {/* Activity stats */}
                        <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
                          {[
                            { icon: UserCheck,   label: 'مبيعات', value: salesCount,     colorClass: 'text-emerald-400', bg: 'bg-emerald-500/5' },
                            { icon: ShoppingBag, label: 'مشتريات', value: purchasesCount, colorClass: 'text-blue-400', bg: 'bg-blue-500/5' },
                            { icon: FileText,    label: 'وثائق',   value: documentsCount, colorClass: 'text-violet-400', bg: 'bg-violet-500/5' },
                          ].map(({ icon: Icon, label, value, colorClass, bg }) => (
                            <div key={label} className={cn('rounded-lg p-2 text-center border border-border/30', bg)}>
                              <p className={cn('font-numeric text-sm font-bold leading-none', colorClass)}>{value}</p>
                              <div className="mt-1 flex items-center justify-center gap-0.5 text-[9px] text-muted-foreground/55">
                                <Icon className="h-2.5 w-2.5" />
                                <span>{label}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <p className="text-[10px] text-muted-foreground/35 pt-1">
                          أُضيف {formatDate(customer.created_at)}
                        </p>
                      </div>
                    </div>
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
        <AdvancedTable
          data={items}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onRowClick={(row) => setSelectedCustomerId(row.id)}
          searchPlaceholder="بحث بالاسم، الهاتف، الهوية..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1) }}
          exportFilename="العملاء"
          rowActions={(customer) => [
            { label: 'عرض', icon: <Eye className="h-3 w-3" />, onClick: (c) => setSelectedCustomerId(c.id) },
            { label: 'تعديل', icon: <Edit className="h-3 w-3" />, onClick: (c) => router.push(`/customers/${c.id}/edit`) },
          ]}
          footer={
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} label="عميل" compact />
          }
        />
      )}

      {/* ── Quick View Panel (Slide over) ── */}
      <AnimatePresence>
        {selectedCustomerId !== null && (
          <QuickViewPanel
            customerId={selectedCustomerId}
            onClose={() => setSelectedCustomerId(null)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

