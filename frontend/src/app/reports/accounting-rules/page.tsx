'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAccountingRulesCheck } from '@/lib/api/accounting'

function ViolationTable({ title, items, columns, renderRow }: {
  title: string
  items: unknown[]
  columns: string[]
  renderRow: (item: unknown, i: number) => React.ReactNode
}) {
  if (items.length === 0) {
    return (
      <div className="dash-card p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">لا توجد مخالفات</p>
        </div>
      </div>
    )
  }
  return (
    <section className="dash-card overflow-hidden">
      <div className="dash-header">
        <div className="flex items-center gap-2.5">
          <div className="dash-icon-well"><AlertTriangle className="h-4 w-4 text-amber-400" /></div>
          <div>
            <p className="dash-title">{title}</p>
            <p className="dash-sub">{items.length} مخالفة</p>
          </div>
        </div>
      </div>
      <div className="dash-body overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {columns.map(c => (
                <th key={c} className="px-3 py-2 text-start text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => renderRow(item, i))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function AccountingRulesPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['accounting-rules-check'],
    queryFn: getAccountingRulesCheck,
    staleTime: 60_000,
    retry: 1,
  })

  const totalViolations =
    (data?.parent_account_violations.length ?? 0) +
    (data?.unbalanced_entries.length ?? 0) +
    (data?.missing_reference_number.length ?? 0)

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="section-title">فحص قواعد المحاسبة</h1>
            <p className="section-subtitle">
              {isLoading ? 'جاري الفحص...' : totalViolations === 0 ? 'لا توجد مخالفات' : `${totalViolations} مخالفة`}
            </p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          فحص الآن
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <p className="mt-3 text-sm font-semibold text-foreground">تعذر تحميل نتائج الفحص</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ViolationTable
            title="قيود تستخدم حسابات أب"
            items={data.parent_account_violations}
            columns={['رقم القيد', 'المرجع', 'رمز الحساب', 'اسم الحساب']}
            renderRow={(item: any, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-numeric text-xs text-indigo-300">#{item.entry_id}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{item.ref ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-amber-300">{item.account_code ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-foreground/80">{item.account_name ?? '—'}</td>
              </tr>
            )}
          />

          <ViolationTable
            title="قيود غير متوازنة"
            items={data.unbalanced_entries}
            columns={['رقم القيد', 'المرجع', 'الوصف', 'مدين', 'دائن']}
            renderRow={(item: any, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-numeric text-xs text-indigo-300">#{item.id}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{item.ref ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-foreground/80 max-w-[200px] truncate">{item.description ?? '—'}</td>
                <td className="px-3 py-2 font-numeric text-xs text-emerald-400">{item.debit.toLocaleString()}</td>
                <td className="px-3 py-2 font-numeric text-xs text-rose-400">{item.credit.toLocaleString()}</td>
              </tr>
            )}
          />

          <ViolationTable
            title="قيود بدون رقم مرجعي"
            items={data.missing_reference_number}
            columns={['رقم القيد', 'الوصف']}
            renderRow={(item: any, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-numeric text-xs text-indigo-300">#{item.id}</td>
                <td className="px-3 py-2 text-xs text-foreground/80">{item.description ?? '—'}</td>
              </tr>
            )}
          />
        </div>
      )}
    </div>
  )
}
