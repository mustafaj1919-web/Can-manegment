'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowUpRight,
  Download,
  FileText,
  Hash,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  UserCheck,
  Users,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getCustomers } from '@/lib/api/customers'
import type { Customer } from '@/lib/api/customers'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportXlsx } from '@/lib/export'

const TYPE_OPTS = [
  { value: 'all', label: 'الكل' },
  { value: 'Buyer', label: 'مشتري' },
  { value: 'Seller', label: 'بائع' },
]

const TYPE_BADGE: Record<string, string> = {
  Buyer: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Seller: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
}

const TYPE_LABEL: Record<string, string> = {
  Buyer: 'مشتري',
  Seller: 'بائع',
}

function safeText(value?: string | null, fallback = '-') {
  return value && value.trim() ? value : fallback
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
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

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    refetch()
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <Users className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">العملاء</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${total} عميل`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            onClick={handleExport} disabled={exporting || isLoading || total === 0}
            className="h-9 gap-2 border-white/10 bg-white/5 text-xs hover:bg-white/10">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'Excel'}
          </Button>
          <Button asChild className="gap-2 bg-cyan-600 text-white hover:bg-cyan-500">
            <Link href="/customers/new">
              <Plus className="h-4 w-4" />
              عميل جديد
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass rounded-lg p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="بحث بالاسم أو الهاتف أو رقم الهوية"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-10 border-white/10 bg-white/5 ps-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-full border-white/10 bg-white/5 sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary" className="h-10">
            بحث
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل العملاء</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-lg py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">لا يوجد عملاء مطابقون</p>
          <Button asChild size="sm" className="mt-4 gap-2 bg-cyan-600 text-white hover:bg-cyan-500">
            <Link href="/customers/new">
              <Plus className="h-3.5 w-3.5" />
              عميل جديد
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((customer, index) => {
              const displayName = customer.full_name || customer.name
              const salesCount = customer.sales_count ?? 0
              const purchasesCount = customer.purchases_count ?? 0
              const documentsCount = customer.documents_count ?? 0

              return (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="glass-interactive rounded-lg p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                        customer.customer_type === 'Buyer'
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'bg-amber-500/10 text-amber-300'
                      )}>
                        {displayName.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                        <span className={cn(
                          'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          TYPE_BADGE[customer.customer_type]
                        )}>
                          {TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8 shrink-0">
                      <Link href={`/customers/${customer.id}`} aria-label="عرض تفاصيل العميل">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{safeText(customer.phone)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-numeric truncate">{safeText(customer.id_number)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <UserCheck className="h-3 w-3" />
                        <span>بيع</span>
                      </div>
                      <p className="font-numeric text-sm font-semibold text-foreground">{salesCount}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <ShoppingBag className="h-3 w-3" />
                        <span>شراء</span>
                      </div>
                      <p className="font-numeric text-sm font-semibold text-foreground">{purchasesCount}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>وثائق</span>
                      </div>
                      <p className="font-numeric text-sm font-semibold text-foreground">{documentsCount}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground/60">
                    تاريخ الإضافة: {formatDate(customer.created_at)}
                  </p>
                </motion.div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="glass flex items-center justify-between rounded-lg px-4 py-3">
              <span className="text-xs text-muted-foreground">
                صفحة {page} من {totalPages} - {total} عميل
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  السابق
                </Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                  التالي
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
