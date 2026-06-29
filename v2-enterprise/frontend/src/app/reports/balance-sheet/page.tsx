'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Scale, TrendingDown, TrendingUp, XCircle, Download, RefreshCw } from 'lucide-react'
import { getBalanceSheet } from '@/lib/api/accounting'
import { cn, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { exportXlsx } from '@/lib/export'

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function money(v: number) { return formatMoney(v, 'IQD') }

const CLF_SECTION_TONE: Record<string, string> = {
  Asset:     'border-cyan-500/20   bg-cyan-500/5   text-cyan-300',
  Liability: 'border-rose-500/20   bg-rose-500/5   text-rose-300',
  Equity:    'border-violet-500/20 bg-violet-500/5 text-violet-300',
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

interface SectionItem {
  id: number; code: string; name: string; balance: number
  children: Array<{ id: number; code: string; name: string; balance: number; classification: string }>
}

function SectionGroup({ group, isLocalLight }: { group: SectionItem; isLocalLight?: boolean }) {
  const hasChildren = group.children.length > 0
  return (
    <div className={cn(
      "border-b last:border-0 transition-colors",
      isLocalLight ? "border-slate-200" : "border-border/20"
    )}>
      <div className={cn(
        "flex items-center justify-between px-5 py-3 transition-colors",
        isLocalLight ? "bg-slate-50" : "bg-secondary/10"
      )}>
        <div className="flex items-center gap-2.5">
          <span className={cn("font-numeric text-xs transition-colors", isLocalLight ? "text-cyan-800 font-bold" : "text-cyan-300/70")}>{group.code}</span>
          <span className={cn("text-sm font-semibold transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground")}>{group.name}</span>
        </div>
        <span className={cn(
          "font-numeric text-sm font-bold transition-colors",
          group.balance < 0 
            ? (isLocalLight ? 'text-rose-600' : 'text-rose-400')
            : (isLocalLight ? 'text-muted-foreground' : 'text-foreground')
        )}>
          {money(group.balance)}
        </span>
      </div>
      {hasChildren && (
        <div className={cn("divide-y transition-colors", isLocalLight ? "divide-slate-100 bg-white" : "divide-white/[0.03]")}>
          {group.children.map(child => (
            <div key={child.id} className="flex items-center justify-between px-5 py-2 ps-12">
              <div className="flex items-center gap-2">
                <span className={cn("font-numeric text-xs transition-colors", isLocalLight ? "text-muted-foreground" : "text-muted-foreground/60")}>{child.code}</span>
                <span className={cn("text-xs transition-colors", isLocalLight ? "text-muted-foreground" : "text-foreground/80")}>{child.name}</span>
              </div>
              <span className={cn(
                "font-numeric text-xs transition-colors",
                child.balance < 0 
                  ? (isLocalLight ? 'text-rose-600' : 'text-rose-400')
                  : (isLocalLight ? 'text-muted-foreground' : 'text-foreground/80')
              )}>
                {money(child.balance)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function BalanceSheetPage() {
  const [isLocalLight, setIsLocalLight] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: getBalanceSheet,
    staleTime: 60_000,
    retry: 1,
  })

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    try {
      const headers = ['التصنيف الرئيسي', 'التصنيف الفرعي', 'رمز الحساب', 'اسم الحساب', 'المبلغ (د.ع)']
      const rows: (string | number)[][] = []

      // Helper to push section groups
      const pushSection = (sectionName: string, groups: any[]) => {
        groups.forEach(g => {
          // Push group header row
          rows.push([sectionName, g.name, g.code, 'حساب رئيسي', g.balance])
          // Push children accounts
          g.children.forEach((c: any) => {
            rows.push([sectionName, g.name, c.code, c.name, c.balance])
          })
        })
      }

      // Add Assets
      pushSection('الموجودات (الأصول)', data.assets)
      rows.push(['إجمالي الموجودات (الأصول)', '', '', '', data.total_assets])
      rows.push(['', '', '', '', ''])

      // Add Liabilities
      pushSection('المطلوبات (الخصوم)', data.liabilities)
      rows.push(['إجمالي المطلوبات (الخصوم)', '', '', '', data.total_liabilities])
      rows.push(['', '', '', '', ''])

      // Add Equity
      pushSection('حقوق الملكية', data.equity)
      rows.push(['إجمالي حقوق الملكية', '', '', '', data.total_equity])
      rows.push(['', '', '', '', ''])

      // Add Summary Balance Check
      rows.push(['حالة الميزانية', data.is_balanced ? 'متوازنة' : 'غير متوازنة', 'الفرق', '', data.difference])

      await exportXlsx(`الميزانية_العمومية`, headers, rows)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <Scale className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">الميزانية العمومية</h1>
            <p className="text-xs text-muted-foreground">قائمة المركز المالي — الأصول = المطلوبات + حقوق الملكية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLocalLight(p => !p)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/40 bg-secondary/10"
          >
            {isLocalLight ? 'عرض الجداول داكنة' : 'عرض الجداول فاتحة'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || isLoading || !data}
            className="h-8 gap-2 border-border/50 bg-secondary/30 text-xs hover:bg-secondary/40"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}</div>
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : isError || !data ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل الميزانية العمومية</p>
        </div>
      ) : (
        <>
          {/* Summary KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي الأصول</p>
                  <p className="mt-1 font-numeric text-lg font-black text-cyan-300">{money(data.total_assets)}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                  <TrendingUp className="h-5 w-5 text-cyan-300" />
                </div>
              </div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المطلوبات</p>
                  <p className="mt-1 font-numeric text-lg font-black text-rose-300">{money(data.total_liabilities)}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
                  <TrendingDown className="h-5 w-5 text-rose-300" />
                </div>
              </div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">حقوق الملكية</p>
                  <p className="mt-1 font-numeric text-lg font-black text-violet-300">{money(data.total_equity)}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
                  <Scale className="h-5 w-5 text-violet-300" />
                </div>
              </div>
            </div>
            <div className={`glass rounded-lg p-4 ${data.is_balanced ? 'ring-1 ring-emerald-500/20' : 'ring-1 ring-rose-500/20'}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">حالة الميزانية</p>
                  <p className={`mt-1 text-sm font-bold ${data.is_balanced ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {data.is_balanced ? 'متوازنة' : 'غير متوازنة'}
                  </p>
                  {!data.is_balanced && (
                    <p className="text-[10px] text-rose-400/70 font-numeric">فرق: {money(data.difference)}</p>
                  )}
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${data.is_balanced ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'}`}>
                  {data.is_balanced
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    : <XCircle className="h-5 w-5 text-rose-300" />}
                </div>
              </div>
            </div>
          </div>

          {/* Two-column layout: Assets | Liabilities + Equity */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* Assets */}
            <div className={cn(
              "space-y-0 overflow-hidden rounded-lg transition-colors duration-200",
              isLocalLight ? "bg-white border border-slate-200 shadow-sm" : "glass"
            )}>
              <div className={cn(
                "border-b px-5 py-4 transition-colors",
                isLocalLight ? "border-slate-200 bg-slate-100/50" : "border-border/50 bg-cyan-50/[0.04]"
              )}>
                <div className="flex items-center justify-between">
                  <h2 className={cn("text-base font-bold transition-colors", isLocalLight ? "text-cyan-800" : "text-cyan-300")}>الأصول (الموجودات)</h2>
                  <span className={cn("font-numeric text-xl font-black transition-colors", isLocalLight ? "text-cyan-900" : "text-cyan-300")}>{money(data.total_assets)}</span>
                </div>
              </div>
              {data.assets.map(g => <SectionGroup key={g.id} group={g} isLocalLight={isLocalLight} />)}
              <div className={cn(
                "flex items-center justify-between px-5 py-3.5 border-t transition-colors",
                isLocalLight ? "border-slate-200 bg-slate-100" : "border-cyan-50/10 bg-cyan-50/[0.06]"
              )}>
                <span className={cn("text-sm font-bold transition-colors", isLocalLight ? "text-cyan-800" : "text-cyan-300")}>إجمالي الأصول</span>
                <span className={cn("font-numeric text-base font-black transition-colors", isLocalLight ? "text-cyan-900" : "text-cyan-300")}>{money(data.total_assets)}</span>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div className="space-y-4">
              <div className={cn(
                "overflow-hidden rounded-lg transition-colors duration-200",
                isLocalLight ? "bg-white border border-slate-200 shadow-sm" : "glass"
              )}>
                <div className={cn(
                  "border-b px-5 py-4 transition-colors",
                  isLocalLight ? "border-slate-200 bg-slate-100/50" : "border-border/50 bg-rose-50/[0.04]"
                )}>
                  <div className="flex items-center justify-between">
                    <h2 className={cn("text-base font-bold transition-colors", isLocalLight ? "text-rose-800" : "text-rose-300")}>المطلوبات</h2>
                    <span className={cn("font-numeric text-xl font-black transition-colors", isLocalLight ? "text-rose-900" : "text-rose-300")}>{money(data.total_liabilities)}</span>
                  </div>
                </div>
                {data.liabilities.map(g => <SectionGroup key={g.id} group={g} isLocalLight={isLocalLight} />)}
                <div className={cn(
                  "flex items-center justify-between px-5 py-3.5 border-t transition-colors",
                  isLocalLight ? "border-slate-200 bg-slate-100" : "border-rose-50/10 bg-rose-50/[0.06]"
                )}>
                  <span className={cn("text-sm font-bold transition-colors", isLocalLight ? "text-rose-800" : "text-rose-300")}>إجمالي المطلوبات</span>
                  <span className={cn("font-numeric text-base font-black transition-colors", isLocalLight ? "text-rose-900" : "text-rose-300")}>{money(data.total_liabilities)}</span>
                </div>
              </div>

              <div className={cn(
                "overflow-hidden rounded-lg transition-colors duration-200",
                isLocalLight ? "bg-white border border-slate-200 shadow-sm" : "glass"
              )}>
                <div className={cn(
                  "border-b px-5 py-4 transition-colors",
                  isLocalLight ? "border-slate-200 bg-slate-100/50" : "border-border/50 bg-violet-50/[0.04]"
                )}>
                  <div className="flex items-center justify-between">
                    <h2 className={cn("text-base font-bold transition-colors", isLocalLight ? "text-violet-800" : "text-violet-300")}>حقوق الملكية</h2>
                    <span className={cn("font-numeric text-xl font-black transition-colors", isLocalLight ? "text-violet-900" : "text-violet-300")}>{money(data.total_equity)}</span>
                  </div>
                </div>
                {data.equity.map(g => <SectionGroup key={g.id} group={g} isLocalLight={isLocalLight} />)}
                <div className={cn(
                  "flex items-center justify-between px-5 py-3.5 border-t transition-colors",
                  isLocalLight ? "border-slate-200 bg-slate-100" : "border-violet-50/10 bg-violet-50/[0.06]"
                )}>
                  <span className={cn("text-sm font-bold transition-colors", isLocalLight ? "text-violet-800" : "text-violet-300")}>إجمالي حقوق الملكية</span>
                  <span className={cn("font-numeric text-base font-black transition-colors", isLocalLight ? "text-violet-900" : "text-violet-300")}>{money(data.total_equity)}</span>
                </div>
              </div>

              {/* Total liabilities + equity */}
              <div className={cn(
                "rounded-lg border p-4 transition-colors duration-200",
                data.is_balanced
                  ? (isLocalLight ? 'border-emerald-200 bg-emerald-50/30' : 'border-emerald-500/20 bg-emerald-50/5')
                  : (isLocalLight ? 'border-rose-200 bg-rose-50/30' : 'border-rose-500/20 bg-rose-50/5')
              )}>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm font-bold transition-colors",
                    data.is_balanced 
                      ? (isLocalLight ? 'text-emerald-800' : 'text-emerald-300') 
                      : (isLocalLight ? 'text-rose-800' : 'text-rose-300')
                  )}>
                    إجمالي المطلوبات + حقوق الملكية
                  </span>
                  <span className={cn(
                    "font-numeric text-xl font-black transition-colors",
                    data.is_balanced 
                      ? (isLocalLight ? 'text-emerald-900' : 'text-emerald-300') 
                      : (isLocalLight ? 'text-rose-900' : 'text-rose-300')
                  )}>
                    {money(data.total_liabilities_equity)}
                  </span>
                </div>
                {!data.is_balanced && (
                  <p className={cn("mt-1.5 text-xs transition-colors", isLocalLight ? "text-rose-700" : "text-rose-400/70")}>
                    الفرق مع إجمالي الأصول: {money(Math.abs(data.difference))} — يجب مراجعة القيود المحاسبية
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
