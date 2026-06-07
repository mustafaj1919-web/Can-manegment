'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Plus, ReceiptText, RefreshCw } from 'lucide-react'
import { getExpenses } from '@/lib/api/accounting'
import { formatDate, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

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

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
            <ReceiptText className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المصاريف</h1>
            <p className="text-xs text-muted-foreground">
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
      <div className="app-card rounded-xl p-4">
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
            disabled={isFetching} className="h-9 gap-2 text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="app-card overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : isError || !data ? (
          <EmptyState
            variant="error"
            title="تعذّر تحميل المصاريف"
            description="تحقق من اتصال الخادم ثم أعد المحاولة"
            action={
              <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
                إعادة المحاولة
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            variant="default"
            icon={<ReceiptText className="h-5 w-5" />}
            title="لا توجد مصاريف"
            description="لا توجد مصاريف ضمن الفترة المحددة"
            action={
              <Button asChild size="sm" className="bg-orange-600 text-white hover:bg-orange-500">
                <Link href="/expenses/new">
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  مصروف جديد
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  {['العنوان', 'التاريخ', 'التصنيف', 'المبلغ', 'الملاحظات'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(expense => (
                  <tr key={expense.id}>
                    <td className="text-xs font-semibold text-foreground">{expense.title}</td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0 opacity-60" />
                        {formatDate(expense.expense_date)}
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">{expense.category ?? '—'}</td>
                    <td className="font-numeric text-xs font-semibold text-orange-300">
                      {formatMoney(expense.amount_iqd, 'IQD')}
                    </td>
                    <td className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {expense.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
