'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Scale, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { getBalanceSheet } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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

function SectionGroup({ group }: { group: SectionItem }) {
  const hasChildren = group.children.length > 0
  return (
    <div className="border-b border-white/[0.03] last:border-0">
      <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <span className="font-numeric text-xs text-cyan-300/70">{group.code}</span>
          <span className="text-sm font-semibold text-foreground">{group.name}</span>
        </div>
        <span className={`font-numeric text-sm font-bold ${group.balance < 0 ? 'text-rose-400' : 'text-foreground'}`}>
          {money(group.balance)}
        </span>
      </div>
      {hasChildren && (
        <div className="divide-y divide-white/[0.03]">
          {group.children.map(child => (
            <div key={child.id} className="flex items-center justify-between px-5 py-2 ps-12">
              <div className="flex items-center gap-2">
                <span className="font-numeric text-xs text-muted-foreground/60">{child.code}</span>
                <span className="text-xs text-foreground/80">{child.name}</span>
              </div>
              <span className={`font-numeric text-xs ${child.balance < 0 ? 'text-rose-400' : 'text-foreground/80'}`}>
                {money(child.balance)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BalanceSection({
  title, groups, total, type,
}: {
  title: string; groups: SectionItem[]; total: number; type: 'Asset' | 'Liability' | 'Equity'
}) {
  const tone = CLF_SECTION_TONE[type]
  return (
    <div className="glass overflow-hidden rounded-lg">
      <div className={`flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 ${tone.split(' ')[0]}`}>
        <h2 className={`text-sm font-bold ${tone.split(' ').at(-1)}`}>{title}</h2>
        <span className={`font-numeric text-base font-black ${tone.split(' ').at(-1)}`}>{money(total)}</span>
      </div>
      <div className="divide-y divide-white/[0.03]">
        {groups.map(g => <SectionGroup key={g.id} group={g} />)}
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function BalanceSheetPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['balance-sheet'],
    queryFn: getBalanceSheet,
    staleTime: 60_000,
    retry: 1,
  })

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
          <Scale className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">الميزانية العمومية</h1>
          <p className="text-xs text-muted-foreground">قائمة المركز المالي — الأصول = المطلوبات + حقوق الملكية</p>
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
            <div className="space-y-0 overflow-hidden rounded-lg glass">
              <div className="border-b border-white/[0.06] px-5 py-4 bg-cyan-500/[0.04]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-cyan-300">الأصول (الموجودات)</h2>
                  <span className="font-numeric text-xl font-black text-cyan-300">{money(data.total_assets)}</span>
                </div>
              </div>
              {data.assets.map(g => <SectionGroup key={g.id} group={g} />)}
              <div className="flex items-center justify-between bg-cyan-500/[0.06] px-5 py-3.5 border-t border-cyan-500/10">
                <span className="text-sm font-bold text-cyan-300">إجمالي الأصول</span>
                <span className="font-numeric text-base font-black text-cyan-300">{money(data.total_assets)}</span>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg glass">
                <div className="border-b border-white/[0.06] px-5 py-4 bg-rose-500/[0.04]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-rose-300">المطلوبات</h2>
                    <span className="font-numeric text-xl font-black text-rose-300">{money(data.total_liabilities)}</span>
                  </div>
                </div>
                {data.liabilities.map(g => <SectionGroup key={g.id} group={g} />)}
                <div className="flex items-center justify-between bg-rose-500/[0.06] px-5 py-3.5 border-t border-rose-500/10">
                  <span className="text-sm font-bold text-rose-300">إجمالي المطلوبات</span>
                  <span className="font-numeric text-base font-black text-rose-300">{money(data.total_liabilities)}</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg glass">
                <div className="border-b border-white/[0.06] px-5 py-4 bg-violet-500/[0.04]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-violet-300">حقوق الملكية</h2>
                    <span className="font-numeric text-xl font-black text-violet-300">{money(data.total_equity)}</span>
                  </div>
                </div>
                {data.equity.map(g => <SectionGroup key={g.id} group={g} />)}
                <div className="flex items-center justify-between bg-violet-500/[0.06] px-5 py-3.5 border-t border-violet-500/10">
                  <span className="text-sm font-bold text-violet-300">إجمالي حقوق الملكية</span>
                  <span className="font-numeric text-base font-black text-violet-300">{money(data.total_equity)}</span>
                </div>
              </div>

              {/* Total liabilities + equity */}
              <div className={`rounded-lg border p-4 ${data.is_balanced ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${data.is_balanced ? 'text-emerald-300' : 'text-rose-300'}`}>
                    إجمالي المطلوبات + حقوق الملكية
                  </span>
                  <span className={`font-numeric text-xl font-black ${data.is_balanced ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {money(data.total_liabilities_equity)}
                  </span>
                </div>
                {!data.is_balanced && (
                  <p className="mt-1.5 text-xs text-rose-400/70">
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
