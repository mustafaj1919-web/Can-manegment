'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AlertCircle, Package, Play, Loader2, RefreshCw } from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { computeDepreciation, getDepreciationReport, type DepreciationVehicleRow } from '@/lib/api/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/shared/SectionCard'
import { toast } from 'sonner'

export default function DepreciationPage() {
  const today = new Date()
  const [runMonth, setRunMonth] = useState(today.getMonth() + 1)
  const [runYear, setRunYear] = useState(today.getFullYear())
  const [annualRate, setAnnualRate] = useState(20)
  const [result, setResult] = useState<{ entries_created: number; total_depreciation: number; vehicles: DepreciationVehicleRow[] } | null>(null)

  const [reportMonth, setReportMonth] = useState(today.getMonth() + 1)
  const [reportYear, setReportYear] = useState(today.getFullYear())
  const [reportApplied, setReportApplied] = useState({ month: today.getMonth() + 1, year: today.getFullYear() })

  const { data: report, isLoading: reportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['depreciation-report', reportApplied.month, reportApplied.year],
    queryFn: () => getDepreciationReport(reportApplied.month, reportApplied.year),
  })

  const runMutation = useMutation({
    mutationFn: () => computeDepreciation(runMonth, runYear, annualRate),
    onSuccess: (data) => {
      toast.success(data.message || `تم احتساب إهلاك ${data.entries_created} سيارة`)
      setResult(data)
      setReportApplied({ month: runMonth, year: runYear })
      refetchReport()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'فشل في احتساب الإهلاك'),
  })

  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

  return (
    <div className="space-y-5 mx-auto max-w-4xl" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">← التقارير</Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">إهلاك السيارات</h1>
          <p className="text-xs text-muted-foreground">احتساب الإهلاك الشهري بطريقة القسط الثابت</p>
        </div>
      </div>

      {/* Run Depreciation */}
      <SectionCard title="تشغيل الإهلاك الشهري">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">الشهر</Label>
            <select
              value={runMonth}
              onChange={e => setRunMonth(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">السنة</Label>
            <Input type="number" value={runYear} onChange={e => setRunYear(Number(e.target.value))} className="bg-secondary/30" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">معدل الإهلاك السنوي %</Label>
            <Input type="number" value={annualRate} onChange={e => setAnnualRate(Number(e.target.value))} min={1} max={100} className="bg-secondary/30" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="w-full gap-1.5 bg-cyan-600 text-white hover:bg-cyan-500">
              {runMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحساب...</>
                : <><Play className="h-3.5 w-3.5" />تشغيل الإهلاك</>
              }
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-amber-400/70">⚠ لا يمكن تكرار الإهلاك لنفس الشهر والسنة</p>

        {result && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400 mb-3">
              نتيجة الإهلاك: {result.entries_created} سيارة — إجمالي {formatMoney(result.total_depreciation, 'IQD')}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground">
                    <th className="py-2 px-3 text-right">السيارة</th>
                    <th className="py-2 px-3 text-left">القيمة قبل</th>
                    <th className="py-2 px-3 text-left">الإهلاك</th>
                    <th className="py-2 px-3 text-left">القيمة بعد</th>
                  </tr>
                </thead>
                <tbody>
                  {result.vehicles.map((v, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="py-2 px-3">
                        <p className="font-medium">{v.vehicle_name}</p>
                        <p className="text-muted-foreground">{v.chassis_number}</p>
                      </td>
                      <td className="py-2 px-3 font-numeric text-left text-foreground">{formatMoney(v.book_value_before, 'IQD')}</td>
                      <td className="py-2 px-3 font-numeric text-left text-rose-400">- {formatMoney(v.depreciation_amount, 'IQD')}</td>
                      <td className="py-2 px-3 font-numeric text-left text-emerald-400">{formatMoney(v.book_value_after, 'IQD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Depreciation Report */}
      <SectionCard
        title="تقرير الإهلاك"
        action={
          <Button variant="ghost" size="sm" onClick={() => refetchReport()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">الشهر</Label>
            <select
              value={reportMonth}
              onChange={e => setReportMonth(Number(e.target.value))}
              className="h-9 rounded-md border border-border/60 bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">السنة</Label>
            <Input type="number" value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="h-9 bg-secondary/30 w-24" />
          </div>
          <Button size="sm" onClick={() => setReportApplied({ month: reportMonth, year: reportYear })} className="bg-cyan-600 text-white">عرض</Button>
        </div>

        {reportLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : !report || report.entries_count === 0 ? (
          <div className="py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لم يُحتسب إهلاك لهذه الفترة</p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{report.entries_count} قيد إهلاك</p>
              <p className="font-numeric text-sm font-bold text-rose-400">إجمالي: {formatMoney(report.total_depreciation, 'IQD')}</p>
            </div>
            <div className="space-y-1.5">
              {report.entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border/20 bg-secondary/10 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">{e.description}</p>
                    <p className="text-[10px] text-muted-foreground">{e.entry_number} · {formatDate(e.entry_date)}</p>
                  </div>
                  <p className="font-numeric text-xs font-bold text-rose-400">{formatMoney(e.amount, 'IQD')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
