'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { getSupplierLedger } from '@/lib/api/reports'
import { getSupplier } from '@/lib/api/suppliers'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export default function SupplierLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: supplierRes } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
    enabled: !!id,
  })
  const supplier = supplierRes?.data

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplier-ledger', id, fromDate, toDate],
    queryFn: () => getSupplierLedger({ supplierId: id, fromDate: fromDate || undefined, toDate: toDate || undefined, per_page: 100 }),
    enabled: !!id,
  })

  const isCredit = (data?.closing_balance ?? 0) > 0
  const isDebit  = (data?.closing_balance ?? 0) < 0

  return (
    <div className="flex flex-col gap-5 p-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/suppliers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted/40 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <BookOpen className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">كشف حساب المورد</h1>
          <p className="text-xs text-muted-foreground">{supplier?.name ?? '...'} — حساب {supplier?.account_code ?? ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">من تاريخ</label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">إلى تاريخ</label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </Button>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate('') }}>مسح الفلتر</Button>
        )}
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">الرصيد الافتتاحي</p>
            <p className="font-numeric text-lg font-bold text-foreground">{formatMoney(data.opening_balance, 'IQD')}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">إجمالي الحركات</p>
            <p className="font-numeric text-lg font-bold text-foreground">{data.total_count} حركة</p>
          </div>
          <div className={cn(
            'rounded-xl border p-4',
            isCredit ? 'border-rose-500/30 bg-rose-500/5' :
            isDebit  ? 'border-emerald-500/30 bg-emerald-500/5' :
            'border-border bg-card'
          )}>
            <p className="mb-1 text-xs text-muted-foreground">الرصيد الختامي</p>
            <p className={cn(
              'font-numeric text-lg font-bold',
              isCredit ? 'text-rose-400' : isDebit ? 'text-emerald-400' : 'text-foreground'
            )}>
              {formatMoney(Math.abs(data.closing_balance), 'IQD')}
              <span className="mr-2 text-xs font-normal text-muted-foreground">
                {isCredit ? '(مستحق للمورد)' : isDebit ? '(مدفوع زيادة)' : '(مسوّى)'}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['التاريخ', 'رقم القيد', 'البيان', 'مدين', 'دائن', 'الرصيد'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-400" />
                    <p className="text-sm text-muted-foreground">فشل تحميل البيانات</p>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && (!data?.transactions || data.transactions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm text-muted-foreground">لا توجد حركات في هذه الفترة</p>
                  </td>
                </tr>
              )}
              {data?.transactions.map((tx) => (
                <tr key={tx.journal_entry_id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(tx.entry_date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{tx.entry_number}</td>
                  <td className="px-4 py-3 text-foreground max-w-xs truncate">{tx.description}</td>
                  <td className="px-4 py-3 font-numeric text-rose-400">
                    {tx.debit > 0 ? formatMoney(tx.debit, 'IQD') : '—'}
                  </td>
                  <td className="px-4 py-3 font-numeric text-emerald-400">
                    {tx.credit > 0 ? formatMoney(tx.credit, 'IQD') : '—'}
                  </td>
                  <td className="px-4 py-3 font-numeric font-semibold text-foreground">
                    {formatMoney(Math.abs(tx.running_balance), 'IQD')}
                    <span className="mr-1 text-[10px] text-muted-foreground">
                      {tx.running_balance > 0 ? 'د' : tx.running_balance < 0 ? 'م' : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
