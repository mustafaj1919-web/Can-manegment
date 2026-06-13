'use client'

import { useEffect, useState } from 'react'
import type { ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Banknote, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { getCashbox } from '@/lib/api/accounting'
import { getCashDashboard } from '@/lib/api/vouchers'
import { cn, formatDate, formatMoney, translateStatus } from '@/lib/utils'
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

function money(value?: number | null) {
  return formatMoney(value ?? 0, 'IQD')
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-numeric text-lg font-black text-foreground">{money(value)}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function CashboxPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate, setEndDate] = useState(toDateInput(today))
  const [branchId, setBranchId] = useState('all')

  const { data: dashData } = useQuery({
    queryKey: ['cash-dashboard'],
    queryFn:  getCashDashboard,
    staleTime: 60_000,
  })

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['cashbox', startDate, endDate, branchId],
    queryFn: () => getCashbox({ start_date: startDate, end_date: endDate, branch_id: branchId }),
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <Wallet className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">الصندوق</h1>
            <p className="text-xs text-muted-foreground">حركة النقد الداخلة والخارجة من البيانات الفعلية</p>
          </div>
        </div>
      </div>

      {/* Financial Dashboard */}
      {dashData && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: 'رصيد الصندوق', value: dashData.cashbox_balance_iqd, icon: Wallet,        cls: 'text-cyan-400',    tone: 'border-cyan-500/20 bg-cyan-500/10' },
            { label: 'رصيد البنك',   value: dashData.bank_balance_iqd,    icon: Banknote,      cls: 'text-sky-400',     tone: 'border-sky-500/20 bg-sky-500/10' },
            { label: 'وارد اليوم',   value: dashData.today_inflow_iqd,    icon: ArrowDownLeft, cls: 'text-emerald-400', tone: 'border-emerald-500/20 bg-emerald-500/10' },
            { label: 'صادر اليوم',   value: dashData.today_outflow_iqd,   icon: ArrowUpRight,  cls: 'text-rose-400',    tone: 'border-rose-500/20 bg-rose-500/10' },
            ...(dashData.last_close ? [{
              label: `إقفال ${dashData.last_close.date}`,
              value: dashData.last_close.difference,
              icon: ReceiptText,
              cls:  dashData.last_close.difference === 0 ? 'text-emerald-400' : 'text-amber-400',
              tone: 'border-amber-500/20 bg-amber-500/10',
            }] : []),
          ].map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="glass rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg border shrink-0', card.tone)}>
                    <Icon className={cn('h-3.5 w-3.5', card.cls)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{card.label}</p>
                </div>
                <p className={cn('font-numeric text-sm font-bold', card.cls)}>{money(card.value)}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="glass rounded-lg p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue /></SelectTrigger>
            <SelectContent>
              {canPickAllBranches && <SelectItem value="all">كل الفروع المتاحة</SelectItem>}
              {branches.map((branch) => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-9 border border-border/50">تحديث</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : isError || !data ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل بيانات الصندوق</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard icon={TrendingUp} label="مدفوعات المبيعات" value={data.summary.sales_paid} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300" />
            <SummaryCard icon={Banknote} label="تحصيلات الأقساط" value={data.summary.installment_paid} tone="border-cyan-500/20 bg-cyan-500/10 text-cyan-300" />
            <SummaryCard icon={TrendingDown} label="مدفوعات المشتريات" value={data.summary.purchase_paid} tone="border-rose-500/20 bg-rose-500/10 text-rose-300" />
            <SummaryCard icon={ReceiptText} label="المصاريف" value={data.summary.expenses} tone="border-orange-500/20 bg-orange-500/10 text-orange-300" />
            <SummaryCard icon={ArrowDownLeft} label="إيرادات أخرى" value={data.summary.other_income} tone="border-violet-500/20 bg-violet-500/10 text-violet-300" />
            <SummaryCard icon={Wallet} label="الرصيد" value={data.summary.balance} tone={data.summary.balance >= 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'} />
          </div>

          <div className="glass overflow-hidden rounded-lg">
            <div className="border-b border-border/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-foreground">حركة الصندوق</h2>
            </div>
            {data.movements.length === 0 ? (
              <div className="py-16 text-center">
                <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">لا توجد حركة ضمن الفترة المحددة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {['التاريخ', 'النوع', 'الوصف', 'داخل', 'خارج'].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.movements.map((movement) => (
                      <tr key={movement.id} className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(movement.date)}</td>
                        <td className="px-4 py-3 text-xs text-foreground">{translateStatus(movement.type)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{movement.description ?? '-'}</td>
                        <td className="px-4 py-3 font-numeric text-xs font-semibold text-emerald-300">
                          {movement.inflow_iqd > 0 ? <><ArrowDownLeft className="me-1 inline h-3 w-3" />{money(movement.inflow_iqd)}</> : '-'}
                        </td>
                        <td className="px-4 py-3 font-numeric text-xs font-semibold text-rose-300">
                          {movement.outflow_iqd > 0 ? <><ArrowUpRight className="me-1 inline h-3 w-3" />{money(movement.outflow_iqd)}</> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
