'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingDown, TrendingUp, Download, RefreshCw, BookOpen } from 'lucide-react'
import { cn, formatMoney, formatDate } from '@/lib/utils'
import { getSupplierLedger } from '@/lib/api/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

function toDateInput(d: Date) { return d.toISOString().slice(0, 10) }

export default function SupplierLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [startDate, setStartDate] = useState(toDateInput(firstOfMonth))
  const [endDate,   setEndDate]   = useState(toDateInput(now))

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['supplier-ledger', id, startDate, endDate],
    queryFn: () => getSupplierLedger(id, startDate, endDate),
    staleTime: 30_000,
    enabled: !!id,
  })

  function handleExportCsv() {
    if (!data?.entries?.length) return
    const rows = [
      ['التاريخ', 'رقم القيد', 'البيان', 'مدين', 'دائن', 'الرصيد'],
      ...data.entries.map(e => [
        formatDate(e.date), e.entry_number, e.description,
        e.debit.toFixed(2), e.credit.toFixed(2), e.running_balance.toFixed(2)
      ])
    ]
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `ledger-${data.supplier.name}-${startDate}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <BookOpen className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold text-foreground">
              كشف حساب المورد{data?.supplier?.name ? `: ${data.supplier.name}` : ''}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">جميع الحركات المالية بالرصيد المتراكم</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!data?.entries?.length} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            تصدير CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/30 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">من:</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-40 border-border/50 bg-secondary/30" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">إلى:</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-40 border-border/50 bg-secondary/30" />
        </div>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'إجمالي المدين (دفعات)', value: data.summary.total_debit, color: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5' },
            { label: 'إجمالي الدائن (مشتريات)', value: data.summary.total_credit, color: 'text-rose-400', border: 'border-rose-500/20 bg-rose-500/5' },
            { label: 'الرصيد الحالي', value: data.summary.balance, color: data.summary.balance >= 0 ? 'text-foreground' : 'text-rose-400', border: 'border-border/30 bg-secondary/10' },
            { label: 'مشتريات غير مسددة', value: data.summary.unpaid_purchases, color: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5' },
          ].map(card => (
            <div key={card.label} className={cn('rounded-xl border p-4', card.border)}>
              <p className="text-[11px] text-muted-foreground">{card.label}</p>
              <p className={cn('mt-1 font-numeric text-lg font-black', card.color)}>
                {formatMoney(card.value, 'IQD')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Entries table */}
      <div className="overflow-hidden rounded-xl border border-border/30">
        <div className="border-b border-border/30 bg-secondary/20 px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            حركات الحساب {data?.entries?.length ? `(${data.entries.length} حركة)` : ''}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-1 p-4">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : !data?.entries?.length ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">لا توجد حركات في هذه الفترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20 bg-secondary/10">
                  {['التاريخ','رقم القيد','البيان','مدين','دائن','الرصيد المتراكم'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, i) => (
                  <tr key={i} className="border-b border-border/10 hover:bg-secondary/10 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground/70">{entry.entry_number}</td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-xs truncate">{entry.description}</td>
                    <td className="px-4 py-3 font-numeric text-xs font-semibold text-emerald-400">
                      {entry.debit > 0 ? formatMoney(entry.debit, 'IQD') : '-'}
                    </td>
                    <td className="px-4 py-3 font-numeric text-xs font-semibold text-rose-400">
                      {entry.credit > 0 ? formatMoney(entry.credit, 'IQD') : '-'}
                    </td>
                    <td className={cn('px-4 py-3 font-numeric text-xs font-bold', entry.running_balance >= 0 ? 'text-foreground' : 'text-rose-400')}>
                      {formatMoney(entry.running_balance, 'IQD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
