'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Download,
  FileDown,
  Filter,
  Landmark,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { getReports, type CustomerBalanceRow, type ReportRow, type ReportsResponse } from '@/lib/api/reports'
import { exportCsv, exportXlsx } from '@/lib/export'
import { cn, formatDate, formatMoney, translateStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Column<T> = {
  key: string
  label: string
  render: (row: T) => ReactNode
  className?: string
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const monthAgo = new Date()
monthAgo.setDate(today.getDate() - 30)

function money(value: number | null | undefined) {
  return formatMoney(value ?? 0, 'IQD')
}

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground">-</span>
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
      {translateStatus(status)}
    </span>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType
  label: string
  value: string
  tone: 'emerald' | 'rose' | 'cyan' | 'amber' | 'violet' | 'slate'
}) {
  const tones = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    slate: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
  }
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-numeric text-lg font-black text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function DataTable<T extends { id: number }>({
  title,
  rows,
  columns,
  emptyText,
}: {
  title: string
  rows: T[]
  columns: Column<T>[]
  emptyText: string
}) {
  return (
    <section className="glass overflow-hidden rounded-lg">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-muted-foreground">
          {rows.length} سجل
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="py-14 text-center">
          <ReceiptText className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                {columns.map((column) => (
                  <th key={column.key} className={cn('px-4 py-3 text-start text-xs font-medium text-muted-foreground', column.className)}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3 text-xs text-foreground/90', column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  )
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(toDateInput(monthAgo))
  const [endDate, setEndDate] = useState(toDateInput(today))
  const [branchId, setBranchId] = useState('all')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['reports', startDate, endDate, branchId],
    queryFn: () => getReports({ start_date: startDate, end_date: endDate, branch_id: branchId }),
    staleTime: 30_000,
    retry: 1,
  })

  const branches = data?.branches ?? []
  const canPickAllBranches = branches.length !== 1
  const summary = data?.summary

  useEffect(() => {
    if (branches.length === 1 && branchId === 'all') {
      setBranchId(String(branches[0].id))
    }
  }, [branches, branchId])

  const salesColumns = useMemo<Column<ReportRow>[]>(() => [
    { key: 'invoice', label: 'الفاتورة', render: (row) => <span className="font-mono text-amber-300">{row.invoice_number ?? '-'}</span> },
    { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.date) },
    { key: 'customer', label: 'العميل', render: (row) => row.customer ?? '-' },
    { key: 'car', label: 'السيارة', render: (row) => row.car ?? '-' },
    { key: 'total', label: 'الإجمالي', render: (row) => money(row.total_iqd), className: 'font-numeric' },
    { key: 'paid', label: 'المدفوع', render: (row) => money(row.paid_iqd), className: 'font-numeric text-emerald-300' },
    { key: 'remaining', label: 'المتبقي', render: (row) => money(row.remaining_iqd), className: 'font-numeric text-rose-300' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusPill status={row.status} /> },
  ], [])

  const purchaseColumns = useMemo<Column<ReportRow>[]>(() => [
    { key: 'invoice', label: 'الفاتورة', render: (row) => <span className="font-mono text-blue-300">{row.invoice_number ?? '-'}</span> },
    { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.date) },
    { key: 'seller', label: 'البائع', render: (row) => row.customer ?? '-' },
    { key: 'car', label: 'السيارة', render: (row) => row.car ?? '-' },
    { key: 'total', label: 'الإجمالي', render: (row) => money(row.total_iqd), className: 'font-numeric' },
    { key: 'paid', label: 'المدفوع', render: (row) => money(row.paid_iqd), className: 'font-numeric text-emerald-300' },
    { key: 'remaining', label: 'المتبقي', render: (row) => money(row.remaining_iqd), className: 'font-numeric text-rose-300' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusPill status={row.status} /> },
  ], [])

  const installmentColumns = useMemo<Column<ReportRow>[]>(() => [
    { key: 'invoice', label: 'الفاتورة', render: (row) => <span className="font-mono text-cyan-300">{row.invoice_number ?? '-'}</span> },
    { key: 'date', label: 'تاريخ الخطة', render: (row) => formatDate(row.date) },
    { key: 'customer', label: 'العميل', render: (row) => row.customer ?? '-' },
    { key: 'car', label: 'السيارة', render: (row) => row.car ?? '-' },
    { key: 'months', label: 'الأشهر', render: (row) => row.months ?? '-' },
    { key: 'total', label: 'الإجمالي', render: (row) => money(row.total_iqd), className: 'font-numeric' },
    { key: 'paid', label: 'المدفوع', render: (row) => money(row.paid_iqd), className: 'font-numeric text-emerald-300' },
    { key: 'remaining', label: 'المتبقي', render: (row) => money(row.remaining_iqd), className: 'font-numeric text-rose-300' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusPill status={row.status} /> },
  ], [])

  const overdueColumns = useMemo<Column<ReportRow>[]>(() => [
    { key: 'invoice', label: 'الفاتورة', render: (row) => <span className="font-mono text-rose-300">{row.invoice_number ?? '-'}</span> },
    { key: 'due_date', label: 'تاريخ الاستحقاق', render: (row) => formatDate(row.due_date) },
    { key: 'customer', label: 'العميل', render: (row) => row.customer ?? '-' },
    { key: 'amount', label: 'القسط', render: (row) => money(row.amount_iqd), className: 'font-numeric' },
    { key: 'paid', label: 'المدفوع', render: (row) => money(row.paid_iqd), className: 'font-numeric text-emerald-300' },
    { key: 'remaining', label: 'المتبقي', render: (row) => money(row.remaining_iqd), className: 'font-numeric text-rose-300' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusPill status={row.status} /> },
  ], [])

  const balanceColumns = useMemo<Column<CustomerBalanceRow>[]>(() => [
    { key: 'name', label: 'العميل', render: (row) => row.name },
    { key: 'type', label: 'النوع', render: (row) => translateStatus(row.type) },
    { key: 'balance', label: 'الرصيد', render: (row) => money(row.balance_iqd), className: 'font-numeric text-amber-300' },
  ], [])

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <BarChart3 className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">التقارير</h1>
            <p className="text-xs text-muted-foreground">جداول جاهزة للتصدير مبنية على بيانات النظام الفعلية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 border border-white/10">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            تحديث
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-2 border border-white/10">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        </div>
      </div>

      <div className="glass rounded-lg p-4 print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">من تاريخ</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-9 border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-9 border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">الفرع</label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 border-white/10 bg-white/5">
                <Filter className="me-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canPickAllBranches && <SelectItem value="all">كل الفروع المتاحة</SelectItem>}
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
              <CalendarDays className="me-1.5 inline h-3.5 w-3.5" />
              الفترة: {formatDate(startDate)} - {formatDate(endDate)}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data || !summary ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل التقارير</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <ReportsContent
          data={data}
          salesColumns={salesColumns}
          purchaseColumns={purchaseColumns}
          installmentColumns={installmentColumns}
          overdueColumns={overdueColumns}
          balanceColumns={balanceColumns}
        />
      )}
    </div>
  )
}

const TAB_FILENAME: Record<string, string> = {
  sales:        'sales',
  purchases:    'purchases',
  installments: 'installments',
  overdue:      'overdue-installments',
  balances:     'customer-balances',
  profit:       'profit-loss',
  cashbox:      'cashbox',
}

function prepareExportData(
  tab: string,
  data: ReportsResponse
): { headers: string[]; rows: (string | number)[][] } {
  const num = (n: number | null | undefined) => n ?? 0
  const dt  = (d: string | null | undefined)  => (d ? formatDate(d) : '')
  const st  = (s: string | null | undefined)  => (s ? translateStatus(s) : '')

  if (tab === 'sales') {
    return {
      headers: ['رقم الفاتورة', 'التاريخ', 'العميل', 'السيارة', 'الإجمالي (د.ع)', 'المدفوع (د.ع)', 'المتبقي (د.ع)', 'الحالة'],
      rows: data.sales.map((r) => [
        r.invoice_number ?? '', dt(r.date), r.customer ?? '', r.car ?? '',
        num(r.total_iqd), num(r.paid_iqd), num(r.remaining_iqd), st(r.status),
      ]),
    }
  }
  if (tab === 'purchases') {
    return {
      headers: ['رقم الفاتورة', 'التاريخ', 'البائع', 'السيارة', 'الإجمالي (د.ع)', 'المدفوع (د.ع)', 'المتبقي (د.ع)', 'الحالة'],
      rows: data.purchases.map((r) => [
        r.invoice_number ?? '', dt(r.date), r.customer ?? '', r.car ?? '',
        num(r.total_iqd), num(r.paid_iqd), num(r.remaining_iqd), st(r.status),
      ]),
    }
  }
  if (tab === 'installments') {
    return {
      headers: ['رقم الفاتورة', 'تاريخ الخطة', 'العميل', 'السيارة', 'الأشهر', 'الإجمالي (د.ع)', 'المدفوع (د.ع)', 'المتبقي (د.ع)', 'الحالة'],
      rows: data.installments.map((r) => [
        r.invoice_number ?? '', dt(r.date), r.customer ?? '', r.car ?? '',
        r.months ?? '', num(r.total_iqd), num(r.paid_iqd), num(r.remaining_iqd), st(r.status),
      ]),
    }
  }
  if (tab === 'overdue') {
    return {
      headers: ['رقم الفاتورة', 'تاريخ الاستحقاق', 'العميل', 'قيمة القسط (د.ع)', 'المدفوع (د.ع)', 'المتبقي (د.ع)', 'الحالة'],
      rows: data.overdue_installments.map((r) => [
        r.invoice_number ?? '', dt(r.due_date), r.customer ?? '',
        num(r.amount_iqd), num(r.paid_iqd), num(r.remaining_iqd), st(r.status),
      ]),
    }
  }
  if (tab === 'balances') {
    return {
      headers: ['العميل', 'النوع', 'الرصيد (د.ع)'],
      rows: data.customer_balances
        .filter((r) => r.balance_iqd > 0)
        .map((r) => [r.name, st(r.type), r.balance_iqd]),
    }
  }
  if (tab === 'profit') {
    const pl = data.profit_loss
    return {
      headers: ['البند', 'المبلغ (د.ع)'],
      rows: [
        ['إجمالي المبيعات',        pl.sales_total],
        ['خصومات المبيعات',        pl.sales_discount],
        ['تكلفة السيارات المباعة', pl.cost_of_cars],
        ['مجمل الربح',             pl.gross_profit],
        ['إيرادات أخرى',           pl.other_income],
        ['المصاريف',               pl.expenses],
        ['صافي الربح والخسارة',    pl.net_profit],
      ],
    }
  }
  if (tab === 'cashbox') {
    const cb = data.cashbox
    return {
      headers: ['البند', 'المبلغ (د.ع)'],
      rows: [
        ['مدفوعات المبيعات',   cb.sales_paid],
        ['تحصيلات الأقساط',   cb.installment_income],
        ['إيرادات أخرى',       cb.other_income],
        ['مدفوعات المشتريات', cb.purchases_paid],
        ['المصاريف',           cb.expenses],
        ['الرصيد',             cb.balance],
      ],
    }
  }
  return { headers: [], rows: [] }
}

function ReportsContent({
  data,
  salesColumns,
  purchaseColumns,
  installmentColumns,
  overdueColumns,
  balanceColumns,
}: {
  data: ReportsResponse
  salesColumns: Column<ReportRow>[]
  purchaseColumns: Column<ReportRow>[]
  installmentColumns: Column<ReportRow>[]
  overdueColumns: Column<ReportRow>[]
  balanceColumns: Column<CustomerBalanceRow>[]
}) {
  const { summary } = data
  const balances = data.customer_balances.filter((row) => row.balance_iqd > 0)
  const [activeTab, setActiveTab] = useState('sales')
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport(format: 'csv' | 'xlsx') {
    const { headers, rows } = prepareExportData(activeTab, data)
    if (headers.length === 0) return
    const filename = `report-${TAB_FILENAME[activeTab] ?? activeTab}-${data.filters.start_date}-${data.filters.end_date}`
    setIsExporting(true)
    try {
      if (format === 'csv') {
        exportCsv(filename, headers, rows)
      } else {
        await exportXlsx(filename, headers, rows)
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={TrendingUp} label="مبيعات الفترة" value={money(summary.sales_paid)} tone="emerald" />
        <SummaryCard icon={TrendingDown} label="مشتريات الفترة" value={money(summary.purchases_paid)} tone="rose" />
        <SummaryCard icon={Wallet} label="رصيد الصندوق" value={money(summary.cashbox_balance)} tone={summary.cashbox_balance >= 0 ? 'cyan' : 'rose'} />
        <SummaryCard icon={Landmark} label="صافي الربح والخسارة" value={money(summary.net_profit)} tone={summary.net_profit >= 0 ? 'emerald' : 'rose'} />
        <SummaryCard icon={ReceiptText} label="فواتير المبيعات" value={String(summary.sales_count)} tone="amber" />
        <SummaryCard icon={ReceiptText} label="فواتير المشتريات" value={String(summary.purchases_count)} tone="violet" />
        <SummaryCard icon={CalendarDays} label="خطط الأقساط" value={String(summary.installment_plans_count)} tone="cyan" />
        <SummaryCard icon={AlertCircle} label="أقساط متأخرة" value={String(summary.overdue_installments_count)} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-muted-foreground">تصدير بيانات التبويب الحالي</p>
        <div className="flex gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="gap-2 border border-white/10"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => handleExport('xlsx')}
            disabled={isExporting}
            className="gap-2 border border-white/10"
          >
            {isExporting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto print:hidden">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-white/[0.04] p-1">
            <TabsTrigger value="sales">المبيعات</TabsTrigger>
            <TabsTrigger value="purchases">المشتريات</TabsTrigger>
            <TabsTrigger value="installments">الأقساط</TabsTrigger>
            <TabsTrigger value="overdue">المتأخرة</TabsTrigger>
            <TabsTrigger value="balances">أرصدة العملاء</TabsTrigger>
            <TabsTrigger value="profit">الأرباح والخسائر</TabsTrigger>
            <TabsTrigger value="cashbox">الصندوق</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales">
          <DataTable title="تقرير المبيعات" rows={data.sales} columns={salesColumns} emptyText="لا توجد مبيعات ضمن الفترة المحددة" />
        </TabsContent>
        <TabsContent value="purchases">
          <DataTable title="تقرير المشتريات" rows={data.purchases} columns={purchaseColumns} emptyText="لا توجد مشتريات ضمن الفترة المحددة" />
        </TabsContent>
        <TabsContent value="installments">
          <DataTable title="تقرير الأقساط" rows={data.installments} columns={installmentColumns} emptyText="لا توجد خطط أقساط ضمن الفترة المحددة" />
        </TabsContent>
        <TabsContent value="overdue">
          <DataTable title="تقرير الأقساط المتأخرة" rows={data.overdue_installments} columns={overdueColumns} emptyText="لا توجد أقساط متأخرة ضمن الفترة المحددة" />
        </TabsContent>
        <TabsContent value="balances">
          <DataTable title="تقرير أرصدة العملاء" rows={balances} columns={balanceColumns} emptyText="لا توجد أرصدة مستحقة للعملاء" />
        </TabsContent>
        <TabsContent value="profit">
          <KeyValueReport
            title="تقرير الأرباح والخسائر"
            rows={[
              ['إجمالي المبيعات', data.profit_loss.sales_total],
              ['خصومات المبيعات', data.profit_loss.sales_discount],
              ['تكلفة السيارات المباعة', data.profit_loss.cost_of_cars],
              ['مجمل الربح', data.profit_loss.gross_profit],
              ['إيرادات أخرى', data.profit_loss.other_income],
              ['المصاريف', data.profit_loss.expenses],
              ['صافي الربح والخسارة', data.profit_loss.net_profit],
            ]}
          />
        </TabsContent>
        <TabsContent value="cashbox">
          <KeyValueReport
            title="ملخص الصندوق"
            rows={[
              ['مدفوعات المبيعات', data.cashbox.sales_paid],
              ['تحصيلات الأقساط', data.cashbox.installment_income],
              ['إيرادات أخرى', data.cashbox.other_income],
              ['مدفوعات المشتريات', data.cashbox.purchases_paid],
              ['المصاريف', data.cashbox.expenses],
              ['الرصيد', data.cashbox.balance],
            ]}
          />
        </TabsContent>
      </Tabs>

      <div className="hidden print:block space-y-5">
        <DataTable title="تقرير المبيعات" rows={data.sales} columns={salesColumns} emptyText="لا توجد مبيعات ضمن الفترة المحددة" />
        <DataTable title="تقرير المشتريات" rows={data.purchases} columns={purchaseColumns} emptyText="لا توجد مشتريات ضمن الفترة المحددة" />
        <DataTable title="تقرير الأقساط" rows={data.installments} columns={installmentColumns} emptyText="لا توجد خطط أقساط ضمن الفترة المحددة" />
        <DataTable title="تقرير الأقساط المتأخرة" rows={data.overdue_installments} columns={overdueColumns} emptyText="لا توجد أقساط متأخرة ضمن الفترة المحددة" />
        <DataTable title="تقرير أرصدة العملاء" rows={balances} columns={balanceColumns} emptyText="لا توجد أرصدة مستحقة للعملاء" />
      </div>
    </>
  )
}

function KeyValueReport({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <section className="glass overflow-hidden rounded-lg">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <tbody>
            {rows.map(([label, value], index) => (
              <tr key={label} className={cn('border-b border-white/[0.03]', index === rows.length - 1 && 'bg-white/[0.03]')}>
                <td className="px-5 py-3 text-xs text-muted-foreground">{label}</td>
                <td className={cn('px-5 py-3 text-end font-numeric text-xs font-semibold', value >= 0 ? 'text-foreground' : 'text-rose-300')}>
                  {money(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
