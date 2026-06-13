'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Plus, ReceiptText, RefreshCw } from 'lucide-react'
import { getExpenses } from '@/lib/api/accounting'
import { formatDate, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdvancedTable, ColumnDef } from '@/components/shared/AdvancedTable'
import { cn } from '@/lib/utils'

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const today = new Date()
const monthAgo = new Date()
monthAgo.setDate(today.getDate() - 30)

export default function ExpensesPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate,   setEndDate]   = useState(toDateInput(today))
  const [branchId,  setBranchId]  = useState('all')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['expenses', startDate, endDate, branchId],
    queryFn: () => getExpenses({ start_date: startDate, end_date: endDate, branch_id: branchId }),
    staleTime: 30_000,
    retry: 1,
  })
  const branches = data?.branches ?? []
  const canPickAllBranches = branches.length !== 1

  useEffect(() => {
    if (branches.length === 1 && branchId === 'all') {
      setBranchId(String(branches[0].id))
    }
  }, [branches, branchId])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      key: 'title',
      header: 'العنوان',
      render: (expense) => <span className="text-xs font-bold text-foreground">{expense.title}</span>,
      width: 180,
    },
    {
      key: 'expense_date',
      header: 'التاريخ',
      render: (expense) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/85">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {formatDate(expense.expense_date)}
        </div>
      ),
      width: 130,
    },
    {
      key: 'category',
      header: 'التصنيف',
      render: (expense) => <span className="text-xs text-muted-foreground/80">{expense.category ?? '—'}</span>,
      width: 140,
    },
    {
      key: 'amount_iqd',
      header: 'المبلغ',
      isNumeric: true,
      render: (expense) => (
        <span className="font-numeric text-xs font-bold text-orange-600 dark:text-orange-300">
          {formatMoney(expense.amount_iqd, 'IQD')}
        </span>
      ),
      width: 140,
    },
    {
      key: 'notes',
      header: 'الملاحظات',
      render: (expense) => <span className="text-xs text-muted-foreground/75 truncate block max-w-[240px]">{expense.notes ?? '—'}</span>,
      width: 240,
    }
  ], [])

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
            <ReceiptText className="h-5 w-5 text-orange-600 dark:text-orange-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المصاريف</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {isLoading
                ? 'جاري التحميل...'
                : `${data?.total ?? 0} مصروف · ${formatMoney(data?.total_iqd ?? 0, 'IQD')}`}
            </p>
          </div>
        </div>
        <Button asChild className="gap-2 bg-orange-600 text-white hover:bg-orange-500">
          <Link href="/expenses/new">
            <Plus className="h-4 w-4" />
            مصروف جديد
          </Link>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <Input
              type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="app-field-glass h-9 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <Input
              type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="app-field-glass h-9 text-xs flex-1"
            />
          </div>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="app-field-glass h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {canPickAllBranches && <SelectItem value="all">كل الفروع المتاحة</SelectItem>}
              {branches.map(branch => (
                <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button" variant="outline" onClick={() => refetch()}
            disabled={isFetching} className="h-9 gap-2 text-sm border-border/80 hover:bg-secondary/50 rounded-lg px-3"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Table */}
      <AdvancedTable
        data={data?.items ?? []}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        exportFilename="المصاريف"
        searchPlaceholder="بحث بالوصف أو التصنيف..."
      />
    </div>
  )
}
