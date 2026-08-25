'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck, ShieldAlert, ShieldX, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Scale
} from 'lucide-react'
import { getAccountingRulesCheck } from '@/lib/api/reports'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function money(v: number) { return formatMoney(v, 'IQD') }

export default function AccountingRulesPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['accounting-rules'],
    queryFn:  getAccountingRulesCheck,
    staleTime: 30_000,
    retry: 1,
  })

  const scoreColor = !data ? 'text-muted-foreground'
    : data.score >= 90 ? 'text-emerald-400'
    : data.score >= 60 ? 'text-amber-400'
    : 'text-rose-400'

  const ScoreIcon = !data ? ShieldCheck
    : data.score >= 90 ? ShieldCheck
    : data.score >= 60 ? ShieldAlert
    : ShieldX

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="section-title">فحص قواعد المحاسبة</h1>
            <p className="section-subtitle">
              {data?.summary ?? 'التحقق التلقائي من توازن وسلامة جميع القيود المحاسبية'}
            </p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          فحص الآن
        </Button>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="glass rounded-xl py-12 text-center text-sm text-muted-foreground">
          تعذر تحميل نتائج فحص قواعد المحاسبة
        </div>
      ) : data ? (
        <>
          {/* Score Card */}
          <div className="glass rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Score Circle */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-border/30">
                <div className={`absolute inset-0 rounded-full border-4 transition-all ${data.score >= 90 ? 'border-emerald-500/60' : data.score >= 60 ? 'border-amber-500/60' : 'border-rose-500/60'}`} />
                <div className="text-center">
                  <p className={`font-numeric text-2xl font-black leading-none ${scoreColor}`}>{data.score}</p>
                  <p className="text-[9px] text-muted-foreground">/ 100</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <ScoreIcon className={`h-5 w-5 ${scoreColor}`} />
                  <p className={`text-base font-bold ${scoreColor}`}>
                    {data.passed ? 'جميع القيود سليمة' : 'توجد مشكلات تحتاج مراجعة'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{data.summary}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-4 shrink-0">
                <div className="text-center">
                  <p className="font-numeric text-xl font-black text-foreground">{data.stats.total_entries}</p>
                  <p className="text-[10px] text-muted-foreground">قيد محاسبي</p>
                </div>
                <div className="text-center">
                  <p className="font-numeric text-xl font-black text-foreground">{data.stats.total_accounts}</p>
                  <p className="text-[10px] text-muted-foreground">حساب محاسبي</p>
                </div>
                <div className="text-center">
                  <p className={`font-numeric text-xl font-black ${data.issues.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.issues.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">مشكلة</p>
                </div>
                <div className="text-center">
                  <p className={`font-numeric text-xl font-black ${data.warnings.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {data.warnings.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">تحذير</p>
                </div>
              </div>
            </div>
          </div>

          {/* Passed State */}
          {data.passed && data.issues.length === 0 && data.warnings.length === 0 && (
            <div className="glass rounded-xl py-12 text-center border border-emerald-500/20">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">ممتاز! جميع القيود المحاسبية متوازنة وسليمة</p>
              <p className="mt-1 text-xs text-muted-foreground">لا توجد أي مشكلات أو تحذيرات في قواعد المحاسبة</p>
            </div>
          )}

          {/* Issues */}
          {data.issues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-400" />
                <p className="text-sm font-semibold text-rose-400">المشكلات ({data.issues.length})</p>
              </div>
              <div className="glass overflow-hidden rounded-xl border border-rose-500/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 bg-rose-500/5">
                      <th className="py-2.5 pr-4 text-right font-semibold text-muted-foreground">النوع</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">المرجع</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">التاريخ</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">مدين</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">دائن</th>
                      <th className="py-2.5 pl-4 text-left font-semibold text-rose-400">الفارق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.issues.map((issue, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-rose-500/5 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                            {issue.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground/80">{issue.ref_num ?? '—'}</td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {issue.date ? new Date(issue.date).toLocaleDateString('ar-IQ') : '—'}
                        </td>
                        <td className="py-3 px-3 text-left font-numeric text-muted-foreground whitespace-nowrap">
                          {issue.debit !== undefined ? money(issue.debit) : '—'}
                        </td>
                        <td className="py-3 px-3 text-left font-numeric text-muted-foreground whitespace-nowrap">
                          {issue.credit !== undefined ? money(issue.credit) : '—'}
                        </td>
                        <td className="py-3 pl-4 text-left font-numeric font-bold text-rose-400 whitespace-nowrap">
                          {issue.diff !== undefined ? money(issue.diff) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold text-amber-400">التحذيرات ({data.warnings.length})</p>
              </div>
              <div className="glass overflow-hidden rounded-xl border border-amber-500/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 bg-amber-500/5">
                      <th className="py-2.5 pr-4 text-right font-semibold text-muted-foreground">النوع</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">التفاصيل</th>
                      <th className="py-2.5 pl-4 text-left font-semibold text-muted-foreground">عدد القيود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.warnings.map((warn, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-amber-500/5 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                            {warn.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {warn.account_code
                            ? `${warn.account_code} — ${warn.account_name ?? ''}`
                            : warn.ref_num ?? '—'}
                        </td>
                        <td className="py-3 pl-4 text-left font-numeric text-muted-foreground">
                          {warn.lines_count !== undefined ? warn.lines_count : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rules Legend */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">قواعد الفحص المطبّقة</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { icon: XCircle, color: 'text-rose-400', title: 'قيود غير متوازنة', desc: 'القيود التي لا يتساوى فيها المدين والدائن' },
                { icon: AlertTriangle, color: 'text-amber-400', title: 'قيود بدون سطور', desc: 'القيود التي لا تحتوي على أي سطور محاسبية' },
                { icon: AlertTriangle, color: 'text-amber-400', title: 'حسابات غير نشطة', desc: 'حسابات موقفة لكن يحتوي عليها قيود' },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-secondary/20 p-3">
                  <rule.icon className={`h-4 w-4 shrink-0 mt-0.5 ${rule.color}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{rule.title}</p>
                    <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
