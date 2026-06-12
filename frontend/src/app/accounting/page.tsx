'use client'

import Link from 'next/link'
import { useEffect, useState, type ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle, Banknote, CalendarDays, Landmark, Plus,
  ReceiptText, TrendingDown, TrendingUp, Wallet, Scale,
  ChevronRight, BookOpen, ListTree,
} from 'lucide-react'
import { getReports } from '@/lib/api/reports'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const today    = new Date()
const monthAgo = new Date(); monthAgo.setDate(today.getDate() - 30)

function money(value?: number | null) { return formatMoney(value ?? 0, 'IQD') }

/* ─── Metric Card ───────────────────────────────────────────────────────── */

function MetricCard({ icon: Icon, label, value, tone, sub }: {
  icon: ElementType; label: string; value: string; tone: string; sub?: string
}) {
  return (
    <div className="glass rounded-xl p-4 transition-all duration-200 hover:ring-1 hover:ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate font-numeric text-xl font-black text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{sub}</p>}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

/* ─── P&L Table ─────────────────────────────────────────────────────────── */

interface PnLRow { label: string; value: number; bold?: boolean; isTotal?: boolean; negative?: boolean; indent?: boolean }

function PnLTable({ rows, title, isLocalLight }: { rows: PnLRow[]; title: string; isLocalLight?: boolean }) {
  return (
    <div className={cn(
      "glass overflow-hidden rounded-xl transition-colors duration-200",
      isLocalLight && "bg-white border-slate-200 shadow-sm"
    )}>
      <div className={cn("border-b px-5 py-4 transition-colors", isLocalLight ? "border-slate-200 bg-slate-100/50" : "border-white/[0.06]")}>
        <h2 className={cn("text-sm font-bold transition-colors", isLocalLight ? "text-slate-800" : "text-foreground")}>{title}</h2>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn(
              'border-b last:border-0 transition-colors',
              isLocalLight
                ? cn('border-slate-200/80', row.isTotal ? 'bg-slate-100/60' : 'hover:bg-slate-50')
                : cn('border-white/[0.03]', row.isTotal ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]')
            )}>
              <td className={cn(
                'py-3 text-xs transition-colors',
                row.isTotal
                  ? cn('px-5 font-bold', isLocalLight ? 'text-slate-900' : 'text-foreground')
                  : row.indent
                    ? cn('pr-10 pl-5', isLocalLight ? 'text-slate-500' : 'text-muted-foreground')
                    : cn('px-5', isLocalLight ? 'text-slate-700' : 'text-foreground/80')
              )}>
                {row.label}
              </td>
              <td className={cn(
                'px-5 py-3 text-left font-numeric text-xs transition-colors',
                row.isTotal ? 'text-base font-black' : 'font-semibold',
                row.negative || row.value < 0
                  ? (isLocalLight ? 'text-rose-600' : 'text-rose-400')
                  : row.isTotal
                    ? (isLocalLight ? 'text-slate-900' : 'text-foreground')
                    : (isLocalLight ? 'text-slate-800' : 'text-foreground/90'),
              )}>
                {row.negative ? `(${money(Math.abs(row.value))})` : money(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Quick link card ───────────────────────────────────────────────────── */

function QuickLink({ href, icon: Icon, label, desc, tone }: { href: string; icon: ElementType; label: string; desc: string; tone: string }) {
  return (
    <Link href={href} className="glass group flex items-center gap-3 rounded-xl p-4 transition-all hover:ring-1 hover:ring-white/10">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors rtl:rotate-180" />
    </Link>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function AccountingPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate, setEndDate]     = useState(toDateInput(today))
  const [branchId, setBranchId]   = useState('all')
  const [tab, setTab]             = useState<'summary' | 'pnl'>('summary')
  const [isLocalLight, setIsLocalLight] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['accounting-dashboard', startDate, endDate, branchId],
    queryFn: () => getReports({ start_date: startDate, end_date: endDate, branch_id: branchId }),
    staleTime: 30_000,
    retry: 1,
  })

  const pl = data?.profit_loss
  const s  = data?.summary
  const branches = data?.branches ?? []
  const canPickAllBranches = branches.length !== 1

  useEffect(() => {
    if (branches.length === 1 && branchId === 'all') {
      setBranchId(String(branches[0].id))
    }
  }, [branches, branchId])

  const pnlRows: PnLRow[] = pl ? [
    { label: 'إجمالي المبيعات',       value: pl.sales_total,    indent: true },
    { label: 'خصومات المبيعات',       value: pl.sales_discount, indent: true, negative: true },
    { label: 'تكلفة السيارات (COGS)', value: pl.cost_of_cars,   indent: true, negative: true },
    { label: 'مجمل الربح',            value: pl.gross_profit,   isTotal: true, bold: true },
    { label: 'إيرادات أخرى',          value: pl.other_income,   indent: true },
    { label: 'المصاريف التشغيلية',     value: pl.expenses,       indent: true, negative: true },
    { label: 'صافي الربح / الخسارة',  value: pl.net_profit,     isTotal: true, bold: true },
  ] : []

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <Landmark className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المحاسبة</h1>
            <p className="text-xs text-muted-foreground">ملخص مالي وقائمة الأرباح والخسائر</p>
          </div>
        </div>
        <div className="flex gap-2">
          {tab === 'pnl' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLocalLight(p => !p)}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-white/5 bg-white/[0.02]"
            >
              {isLocalLight ? 'عرض الجداول داكنة' : 'عرض الجداول فاتحة'}
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="gap-2 border border-white/10 text-xs">
            <Link href="/expenses"><ReceiptText className="h-3.5 w-3.5" />المصاريف</Link>
          </Button>
          <Button asChild size="sm" className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500 text-xs">
            <Link href="/expenses/new"><Plus className="h-3.5 w-3.5" />مصروف جديد</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">من تاريخ</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">الفرع</label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {canPickAllBranches && <SelectItem value="all">كل الفروع المتاحة</SelectItem>}
                {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-9 w-full border border-white/10 text-xs">
              تحديث البيانات
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 w-fit">
        {[{ id: 'summary', label: 'ملخص الأرصدة' }, { id: 'pnl', label: 'قائمة الأرباح والخسائر' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-medium transition-all',
              tab === t.id
                ? 'bg-white/10 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="glass rounded-xl py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل بيانات المحاسبة</p>
        </div>
      ) : tab === 'summary' ? (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={TrendingUp}    label="مدفوعات المبيعات"    value={money(s?.sales_paid)}          tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300"  sub={`${s?.sales_count ?? 0} عملية بيع`} />
            <MetricCard icon={TrendingDown}  label="مدفوعات المشتريات"   value={money(s?.purchases_paid)}      tone="border-rose-500/20 bg-rose-500/10 text-rose-300"            sub={`${s?.purchases_count ?? 0} عملية شراء`} />
            <MetricCard icon={Banknote}      label="تحصيلات الأقساط"     value={money(s?.installment_income)}  tone="border-cyan-500/20 bg-cyan-500/10 text-cyan-300"            sub={`${s?.installment_plans_count ?? 0} خطة أقساط`} />
            <MetricCard icon={Wallet}        label="رصيد الصندوق"         value={money(data.cashbox?.balance)}  tone="border-violet-500/20 bg-violet-500/10 text-violet-300" />
            <MetricCard icon={ReceiptText}   label="المصاريف"            value={money(s?.expenses)}             tone="border-orange-500/20 bg-orange-500/10 text-orange-300" />
            <MetricCard icon={CalendarDays}  label="الذمم المدينة"        value={money(s?.sales_remaining)}     tone="border-amber-500/20 bg-amber-500/10 text-amber-300"         sub={`${s?.overdue_installments_count ?? 0} قسط متأخر`} />
            <MetricCard icon={CalendarDays}  label="الذمم الدائنة"        value={money(s?.purchases_remaining)} tone="border-blue-500/20 bg-blue-500/10 text-blue-300" />
            <MetricCard
              icon={Landmark}
              label="صافي الربح والخسارة"
              value={money(s?.net_profit)}
              tone={(s?.net_profit ?? 0) >= 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}
            />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickLink href="/chart-of-accounts"    icon={ListTree}   label="دليل الحسابات"       desc="الشجرة المحاسبية الكاملة مع الأرصدة"   tone="border-cyan-500/20 bg-cyan-500/10 text-cyan-300" />
            <QuickLink href="/journal-entries"      icon={BookOpen}   label="القيود اليومية"       desc="سجل جميع القيود المحاسبية"              tone="border-violet-500/20 bg-violet-500/10 text-violet-300" />
            <QuickLink href="/reports/balance-sheet" icon={Scale}     label="الميزانية العمومية"   desc="قائمة المركز المالي — الأصول والمطلوبات" tone="border-amber-500/20 bg-amber-500/10 text-amber-300" />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* P&L Table */}
          <PnLTable
            title={`قائمة الأرباح والخسائر — ${formatDate(startDate)} إلى ${formatDate(endDate)}`}
            rows={pnlRows}
            isLocalLight={isLocalLight}
          />

          {/* Cashbox summary */}
          <div className={cn(
            "glass overflow-hidden rounded-xl transition-colors duration-200",
            isLocalLight && "bg-white border-slate-200 shadow-sm"
          )}>
            <div className={cn("border-b px-5 py-4 transition-colors", isLocalLight ? "border-slate-200 bg-slate-100/50" : "border-white/[0.06]")}>
              <h2 className={cn("text-sm font-bold transition-colors", isLocalLight ? "text-slate-800" : "text-foreground")}>ملخص الصندوق</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: 'مدفوعات المبيعات',  value: data.cashbox?.sales_paid,        tone: isLocalLight ? 'text-emerald-600' : 'text-emerald-400' },
                  { label: 'تحصيلات الأقساط',  value: data.cashbox?.installment_income, tone: isLocalLight ? 'text-cyan-600' : 'text-cyan-400' },
                  { label: 'إيرادات أخرى',      value: data.cashbox?.other_income,       tone: isLocalLight ? 'text-teal-600' : 'text-teal-400' },
                  { label: 'مدفوعات المشتريات', value: data.cashbox?.purchases_paid,     tone: isLocalLight ? 'text-rose-600' : 'text-rose-400' },
                  { label: 'المصاريف',           value: data.cashbox?.expenses,           tone: isLocalLight ? 'text-orange-600' : 'text-orange-400' },
                  { label: 'رصيد الصندوق الصافي', value: data.cashbox?.balance,          tone: (data.cashbox?.balance ?? 0) >= 0 ? (isLocalLight ? 'text-emerald-700 font-bold' : 'text-emerald-300 font-bold') : (isLocalLight ? 'text-rose-700 font-bold' : 'text-rose-300 font-bold') },
                ].map(row => (
                  <tr key={row.label} className={cn(
                    "border-b last:border-0 hover:bg-white/[0.02] transition-colors",
                    isLocalLight ? "border-slate-200 hover:bg-slate-50" : "border-white/[0.03] hover:bg-white/[0.02]"
                  )}>
                    <td className={cn("px-5 py-3 text-xs transition-colors", isLocalLight ? "text-slate-700" : "text-foreground/80")}>{row.label}</td>
                    <td className={`px-5 py-3 text-left font-numeric text-xs font-semibold transition-colors ${row.tone}`}>{money(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
