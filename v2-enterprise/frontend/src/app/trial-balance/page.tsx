'use client'

import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle, CheckCircle2, Download, RefreshCw,
  Scale, Search, TrendingDown, TrendingUp, X, XCircle,
} from 'lucide-react'
import { getTrialBalance, type TrialBalanceAccount } from '@/lib/api/accounting'
import { cn, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { exportCsv } from '@/lib/export'

const TYPE_OPTS = [
  { value: 'all',       label: 'كل الأنواع' },
  { value: 'Asset',     label: 'موجودات' },
  { value: 'Liability', label: 'مطلوبات' },
  { value: 'Equity',    label: 'حقوق الملكية' },
  { value: 'Income',    label: 'إيرادات' },
  { value: 'Expense',   label: 'مصروفات' },
]

const TYPE_TONE: Record<string, string> = {
  Asset:     'text-cyan-300',
  Liability: 'text-rose-300',
  Equity:    'text-violet-300',
  Income:    'text-emerald-300',
  Expense:   'text-orange-300',
}
const TYPE_LABEL: Record<string, string> = {
  Asset: 'موجودات', Liability: 'مطلوبات', Equity: 'حقوق ملكية',
  Income: 'إيرادات', Expense: 'مصروفات',
}

export default function TrialBalancePage() {
  const [search,   setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [isLocalLight, setIsLocalLight] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trial-balance'],
    queryFn:  getTrialBalance,
    staleTime: 60_000,
    retry: 1,
  })

  const allAccounts = data?.accounts ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allAccounts.filter(a => {
      const matchSearch = !q || (a.code ?? '').toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
      const matchType   = typeFilter === 'all' || a.type === typeFilter
      return matchSearch && matchType
    })
  }, [allAccounts, search, typeFilter])

  const isBalanced   = data?.status === 'balanced'
  const activeFilter = search || typeFilter !== 'all'

  function resetFilters() { setSearch(''); setTypeFilter('all') }

  const handleExport = useCallback(() => {
    setExporting(true)
    try {
      const headers = ['رمز الحساب', 'اسم الحساب', 'النوع', 'مدين', 'دائن', 'الرصيد']
      const rows = filtered.map((a: TrialBalanceAccount) => [
        a.code,
        a.name,
        TYPE_LABEL[a.type] ?? a.type,
        a.debit,
        a.credit,
        a.balance,
      ])
      // Add totals row
      rows.push(['', 'الإجمالي', '', data?.total_debit ?? 0, data?.total_credit ?? 0, ''])
      exportCsv(`ميزان_المراجعة_${new Date().toISOString().split('T')[0]}`, headers, rows)
    } finally {
      setExporting(false)
    }
  }, [filtered, data])

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <Scale className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">ميزان المراجعة</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'جاري التحميل...' : `${filtered.length} من ${allAccounts.length} حساب`}
              {activeFilter && <span className="text-cyan-400"> (مفلترة)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLocalLight(p => !p)}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/40 bg-secondary/10"
          >
            {isLocalLight ? 'عرض الجدول داكن' : 'عرض الجدول فاتح'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />تحديث
          </Button>
          <Button variant="outline" size="sm"
            onClick={handleExport} disabled={exporting || isLoading || filtered.length === 0}
            className="h-9 gap-2 border-border/50 bg-secondary/30 text-xs hover:bg-secondary/40">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass rounded-lg p-4">
            <p className="text-xs text-muted-foreground">إجمالي المدين</p>
            <p className="mt-1 font-numeric text-base font-black text-emerald-400">{formatMoney(data.total_debit, 'IQD')}</p>
          </div>
          <div className="glass rounded-lg p-4">
            <p className="text-xs text-muted-foreground">إجمالي الدائن</p>
            <p className="mt-1 font-numeric text-base font-black text-rose-400">{formatMoney(data.total_credit, 'IQD')}</p>
          </div>
          <div className="glass rounded-lg p-4">
            <p className="text-xs text-muted-foreground">الفرق</p>
            <p className={`mt-1 font-numeric text-base font-black ${isBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatMoney(data.difference, 'IQD')}
            </p>
          </div>
          <div className="glass rounded-lg p-4 flex items-center gap-3">
            {isBalanced
              ? <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              : <XCircle className="h-6 w-6 text-rose-400 shrink-0" />}
            <div>
              <p className="text-xs text-muted-foreground">الحالة</p>
              <p className={`text-sm font-semibold ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBalanced ? 'متوازن' : 'غير متوازن'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="بحث برمز أو اسم الحساب..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-9 bg-secondary/30 border-border/50 h-9 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 bg-secondary/30 border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {activeFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />مسح
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={cn(
        "glass overflow-hidden rounded-lg transition-colors duration-200",
        isLocalLight && "bg-white border-slate-200 shadow-sm"
      )}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر تحميل ميزان المراجعة</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3 text-xs">إعادة المحاولة</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Scale className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
            <p className={cn("font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground/70")}>
              {activeFilter ? 'لا توجد حسابات تطابق البحث' : 'لا توجد حسابات في الميزان'}
            </p>
            {activeFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 text-xs gap-1.5">
                <X className="h-3 w-3" />مسح الفلاتر
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[640px] text-sm transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground")}>
              <thead>
                <tr className={cn("border-b transition-colors", isLocalLight ? "border-slate-200 bg-slate-100/50" : "border-border/50 bg-secondary/20")}>
                  <th className={cn("px-5 py-3 text-start text-xs font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground")}>رمز الحساب</th>
                  <th className={cn("px-4 py-3 text-start text-xs font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground")}>اسم الحساب</th>
                  <th className={cn("px-4 py-3 text-start text-xs font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground")}>النوع</th>
                  <th className={cn("px-4 py-3 text-end text-xs font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground")}>
                    <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />مدين</span>
                  </th>
                  <th className={cn("px-4 py-3 text-end text-xs font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground")}>
                    <span className="inline-flex items-center gap-1"><TrendingDown className="h-3 w-3" />دائن</span>
                  </th>
                  <th className={cn("px-4 py-3 text-end text-xs font-medium transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground")}>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => (
                  <tr key={account.code} className={cn(
                    "border-b transition-colors",
                    isLocalLight ? "border-slate-100 hover:bg-slate-50" : "border-border/20 hover:bg-secondary/10"
                  )}>
                    <td className={cn("px-5 py-2.5 font-numeric text-xs font-bold transition-colors", isLocalLight ? "text-cyan-700" : "text-cyan-300")}>{account.code}</td>
                    <td className={cn("px-4 py-2.5 text-xs transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground/90")}>{account.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-medium ${TYPE_TONE[account.type] ?? 'text-muted-foreground'}`}>
                        {TYPE_LABEL[account.type] ?? account.type}
                      </span>
                    </td>
                    <td className={cn("px-4 py-2.5 text-end font-numeric text-xs transition-colors", isLocalLight ? "text-emerald-600" : "text-emerald-400/90")}>
                      {account.debit > 0 ? formatMoney(account.debit, 'IQD') : '—'}
                    </td>
                    <td className={cn("px-4 py-2.5 text-end font-numeric text-xs transition-colors", isLocalLight ? "text-rose-600" : "text-rose-400/90")}>
                      {account.credit > 0 ? formatMoney(account.credit, 'IQD') : '—'}
                    </td>
                    <td className={cn("px-4 py-2.5 text-end font-numeric text-xs font-bold transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground")}>
                      {formatMoney(account.balance, 'IQD')}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              {!activeFilter && data && (
                <tfoot>
                  <tr className={cn("border-t transition-colors", isLocalLight ? "border-slate-300 bg-slate-100" : "border-border/50 bg-secondary/20")}>
                    <td colSpan={3} className={cn("px-5 py-3 text-xs font-semibold transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground")}>الإجمالي</td>
                    <td className={cn("px-4 py-3 text-end font-numeric text-xs font-bold transition-colors", isLocalLight ? "text-emerald-700" : "text-emerald-400")}>
                      {formatMoney(data.total_debit, 'IQD')}
                    </td>
                    <td className={cn("px-4 py-3 text-end font-numeric text-xs font-bold transition-colors", isLocalLight ? "text-rose-700" : "text-rose-400")}>
                      {formatMoney(data.total_credit, 'IQD')}
                    </td>
                    <td className={cn("px-4 py-3 text-end font-numeric text-xs font-bold transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground")}>
                      {formatMoney(data.difference, 'IQD')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
