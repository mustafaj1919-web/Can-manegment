'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, Plus, ReceiptText } from 'lucide-react'
import { getExpenses } from '@/lib/api/accounting'
import { formatDate, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const today = new Date()
const monthAgo = new Date()
monthAgo.setDate(today.getDate() - 30)

export default function ExpensesPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate, setEndDate] = useState(toDateInput(today))
  const [branchId, setBranchId] = useState('all')

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10">
            <ReceiptText className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المصاريف</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${data?.total ?? 0} مصروف - ${formatMoney(data?.total_iqd ?? 0, 'IQD')}`}
            </p>
          </div>
        </div>
        <Button asChild className="gap-2 bg-orange-600 text-white hover:bg-orange-500">
          <Link href="/expenses/new"><Plus className="h-4 w-4" />مصروف جديد</Link>
        </Button>
      </div>

      <div className="glass rounded-lg p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-white/10 bg-white/5" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-white/10 bg-white/5" />
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-9 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {canPickAllBranches && <SelectItem value="all">كل الفروع المتاحة</SelectItem>}
              {branches.map((branch) => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-9 border border-white/10">تحديث</Button>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}
          </div>
        ) : isError || !data ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل المصاريف</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-16 text-center">
            <ReceiptText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">لا توجد مصاريف ضمن الفترة المحددة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['العنوان', 'التاريخ', 'التصنيف', 'المبلغ', 'الملاحظات'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((expense) => (
                  <tr key={expense.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{expense.title}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground"><CalendarDays className="me-1 inline h-3 w-3" />{formatDate(expense.expense_date)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{expense.category ?? '-'}</td>
                    <td className="px-4 py-3 font-numeric text-xs font-semibold text-orange-300">{formatMoney(expense.amount_iqd, 'IQD')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{expense.notes ?? '-'}</td>
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
