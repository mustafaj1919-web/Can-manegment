'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Search, RefreshCw, AlertCircle, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatMoney } from '@/lib/utils'
import { getContracts, type ContractItem } from '@/lib/api/installments'

const STATUS_OPTS = [
  { value: 'all',       label: 'كل العقود' },
  { value: 'active',    label: 'نشطة' },
  { value: 'paid',      label: 'مسددة' },
  { value: 'cancelled', label: 'ملغاة' },
]

function StatusBadge({ saleStatus, planStatus }: { saleStatus: string; planStatus: string | null }) {
  if (saleStatus === 'Cancelled') return (
    <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400">ملغى</span>
  )
  if (planStatus === 'Paid') return (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">مسدد</span>
  )
  return (
    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-400">نشط</span>
  )
}

export default function ContractsPage() {
  const [status,  setStatus]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)
  const perPage = 25

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['contracts', status, search, page],
    queryFn:  () => getContracts({
      page,
      per_page: perPage,
      status:   status !== 'all' ? status : undefined,
      search:   search.trim()    || undefined,
    }),
    staleTime: 30_000,
  })

  const totalPages = Math.ceil((data?.total ?? 0) / perPage)

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <FileText className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="section-title">عقود البيع بالأقساط</h1>
            <p className="section-subtitle">{data?.total ?? 0} عقد</p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="بحث برقم العقد أو العميل..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="ps-9 h-9 bg-secondary/30 border-border/50 text-sm"
          />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[150px] h-9 bg-secondary/30 border-border/50 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل العقود</p>
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/60">لا توجد عقود</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden lg:grid grid-cols-[110px_90px_140px_120px_90px_80px_80px_60px_80px_70px_50px] border-b border-border/50 bg-secondary/10 px-4 py-2.5 gap-2">
              {['رقم العقد','التاريخ','السيارة','العميل','سعر البيع','الدفعة الأولى','المتبقي','الأقساط','قيمة القسط','تاريخ البدء','الحالة'].map(h => (
                <span key={h} className="text-[10px] font-medium text-muted-foreground truncate">{h}</span>
              ))}
            </div>

            {data!.items.map((c: ContractItem) => (
              <div
                key={c.sale_id}
                className="border-b border-border/20 last:border-0 hover:bg-secondary/10 px-4 py-3"
              >
                <div className="grid grid-cols-[1fr_auto] lg:grid-cols-[110px_90px_140px_120px_90px_80px_80px_60px_80px_70px_50px] items-center gap-2">
                  <span className="font-mono text-xs text-indigo-300">{c.invoice_number ?? '—'}</span>
                  <span className="hidden lg:block text-xs text-muted-foreground">{c.sale_date ?? '—'}</span>
                  <span className="hidden lg:block text-xs text-foreground/80 truncate">{c.car}</span>
                  <Link href={`/customers/${c.customer_id}`} className="hidden lg:block text-xs text-sky-400 hover:underline truncate">
                    {c.customer_name}
                  </Link>
                  <span className="hidden lg:block font-numeric text-xs text-foreground/80">
                    {formatMoney(c.selling_price, c.currency as 'USD' | 'IQD')}
                  </span>
                  <span className="hidden lg:block font-numeric text-xs text-emerald-400">
                    {formatMoney(c.paid_amount, c.currency as 'USD' | 'IQD')}
                  </span>
                  <span className="hidden lg:block font-numeric text-xs text-rose-400">
                    {formatMoney(c.remaining_amount, c.currency as 'USD' | 'IQD')}
                  </span>
                  <span className="hidden lg:block text-xs text-center text-foreground/70">
                    {c.number_of_months ?? '—'}
                  </span>
                  <span className="hidden lg:block font-numeric text-xs text-amber-300">
                    {c.installment_amount ? formatMoney(c.installment_amount, c.currency as 'USD' | 'IQD') : '—'}
                  </span>
                  <span className="hidden lg:block text-xs text-muted-foreground">
                    {c.installment_start_date ?? '—'}
                  </span>

                  {/* Mobile: name + status */}
                  <div className="lg:hidden flex items-center gap-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{c.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.car}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end lg:justify-start">
                    <StatusBadge saleStatus={c.sale_status} planStatus={c.plan_status} />
                    {c.plan_id && (
                      <Link href={`/installments/${c.plan_id}`} title="فتح خطة الأقساط">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-indigo-400 transition-colors" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
                <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages} · {data!.total} عقد</span>
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
