'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, BookOpen, CheckCircle2, Database, FileArchive,
  RefreshCw, Scale, Server, ShieldCheck, Tag, XCircle, Power,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSystemHealth, getAdminLogs, getAutostart, setAutostart } from '@/lib/api/system'
import { useAuthStore } from '@/lib/stores/auth-store'
import { QuickAccountingTest } from '@/components/system/QuickAccountingTest'
import { toast } from 'sonner'

function formatBytes(value: number) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value, unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++ }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function StatusCard({ icon: Icon, label, value, tone = 'neutral' }: {
  icon: typeof Database; label: string; value: string; tone?: 'neutral' | 'ok' | 'warn' | 'error'
}) {
  const toneClass = tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : tone === 'error' ? 'text-rose-400' : 'text-primary'
  return (
    <div className="dash-card p-4">
      <div className="flex items-center gap-3">
        <div className="dash-icon-well">
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function SystemHealthPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin' || user?.role === 'Owner'

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: getSystemHealth,
    staleTime: 30_000,
    retry: 1,
  })

  const { data: logsData } = useQuery({
    queryKey: ['admin-logs'],
    queryFn:  getAdminLogs,
    staleTime: 30_000,
    enabled:  isAdmin,
    retry: 1,
  })

  const { data: autostartData, isLoading: autostartLoading } = useQuery({
    queryKey: ['autostart'],
    queryFn:  getAutostart,
    staleTime: 60_000,
    enabled:  isAdmin,
    retry: 1,
  })

  const autostartMut = useMutation({
    mutationFn: (enabled: boolean) => setAutostart(enabled),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['autostart'] })
      toast.success(res.enabled ? 'تم تفعيل التشغيل مع ويندوز' : 'تم إلغاء التشغيل مع ويندوز')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'فشل تعديل الإعداد'),
  })

  const tableRows = Object.entries(data?.database.table_counts ?? {}).sort(([a],[b]) => a.localeCompare(b))
  const accounting = data?.accounting

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">فحص النظام</h1>
          <p className="section-subtitle">
            حالة النظام والمحاسبة والنسخ الاحتياطية
            {data?.version && <span className="ms-2 text-xs text-muted-foreground/50">v{data.version}</span>}
          </p>
        </div>
        <Button variant="glass" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError || !data ? (
        <div className="dash-card p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
          <p className="mt-3 text-sm font-semibold text-foreground">تعذر تحميل فحص النظام</p>
        </div>
      ) : (
        <>
          {/* Status overview */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <StatusCard icon={data.status === 'ok' ? CheckCircle2 : AlertTriangle}
              label="الحالة العامة"
              value={data.status === 'ok' ? 'سليم' : 'يحتاج انتباه'}
              tone={data.status === 'ok' ? 'ok' : 'warn'} />
            <StatusCard icon={Database} label="قاعدة البيانات"
              value={data.database.integrity} tone={data.database.integrity === 'ok' ? 'ok' : 'warn'} />
            <StatusCard icon={Scale} label="ميزان المراجعة"
              value={accounting?.trial_balance === 'balanced' ? 'متوازن' : accounting?.trial_balance ?? '—'}
              tone={accounting?.trial_balance === 'balanced' ? 'ok' : 'warn'} />
            <StatusCard icon={BookOpen} label="قيود غير متوازنة"
              value={accounting ? `${accounting.unbalanced_entries} قيد` : '—'}
              tone={accounting?.unbalanced_entries === 0 ? 'ok' : 'error'} />
            <StatusCard icon={ShieldCheck} label="سلامة المحاسبة"
              value={accounting ? (accounting.integrity_issues === 0 ? 'لا مشاكل' : `${accounting.integrity_issues} مشكلة`) : '—'}
              tone={accounting?.integrity_issues === 0 ? 'ok' : 'warn'} />
            <StatusCard icon={Database} label="عدد الحسابات"
              value={accounting ? `${accounting.accounts_count} حساب` : '—'} />
            <StatusCard icon={BookOpen} label="عدد القيود"
              value={accounting ? `${accounting.journal_entries_count} قيد` : '—'} />
            <StatusCard icon={FileArchive} label="آخر نسخة احتياطية"
              value={data.backups.latest[0]?.created_at
                ? new Date(data.backups.latest[0].created_at).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'لا يوجد'}
              tone={data.backups.count > 0 ? 'ok' : 'warn'} />
          </div>

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div className="dash-card border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-foreground">تنبيهات تحتاج مراجعة</p>
                  <ul className="mt-1 space-y-0.5">
                    {data.warnings.map(w => (
                      <li key={w} className="text-xs text-muted-foreground">• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Database info */}
            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <div className="flex items-center gap-2.5">
                  <div className="dash-icon-well"><Database className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="dash-title">قاعدة البيانات</p>
                    <p className="dash-sub">{formatBytes(data.database.size)}</p>
                  </div>
                </div>
              </div>
              <div className="dash-body space-y-3">
                <p className="break-all text-xs text-muted-foreground">{data.database.path}</p>
                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {tableRows.map(([name, count]) => (
                        <tr key={name} className="border-b border-border last:border-0">
                          <td className="px-3 py-1.5 text-xs text-muted-foreground">{name}</td>
                          <td className="px-3 py-1.5 text-end font-numeric text-xs font-semibold text-foreground">{count ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Runtime + Logs */}
            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <div className="flex items-center gap-2.5">
                  <div className="dash-icon-well"><Server className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="dash-title">التشغيل</p>
                    <p className="dash-sub">آخر تحديث {data.checked_at}</p>
                  </div>
                </div>
              </div>
              <div className="dash-body space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">الإصدار:</span>
                  <span className="text-xs font-bold text-foreground">{data.version ?? '—'}</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="break-all">Data: {data.runtime.data_dir}</p>
                  <p className="break-all">Backups: {data.runtime.backup_folder}</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-foreground">ملفات الـ Log</p>
                  <div className="space-y-1.5">
                    {data.logs.slice(0, 5).map(log => (
                      <div key={log.path} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">{log.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{log.modified_at}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(log.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Autostart — admin only */}
          {isAdmin && (
            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <div className="flex items-center gap-2.5">
                  <div className="dash-icon-well">
                    <Power className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="dash-title">التشغيل التلقائي مع ويندوز</p>
                    <p className="dash-sub">يفتح السستم تلقائياً عند بدء تشغيل الكمبيوتر</p>
                  </div>
                </div>
              </div>
              <div className="dash-body">
                {autostartLoading ? (
                  <Skeleton className="h-12 w-full rounded-lg" />
                ) : !autostartData?.supported ? (
                  <p className="text-xs text-muted-foreground">غير متاح — ويندوز فقط</p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${autostartData.enabled ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {autostartData.enabled ? 'مفعّل — يشتغل مع ويندوز' : 'معطّل — يدوي فقط'}
                        </p>
                        {autostartData.exe_path && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground/50 break-all">{autostartData.exe_path}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={autostartMut.isPending}
                      onClick={() => autostartMut.mutate(!autostartData.enabled)}
                      className={autostartData.enabled
                        ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}
                    >
                      {autostartMut.isPending
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <Power className="h-3.5 w-3.5" />}
                      {autostartData.enabled ? 'إلغاء التشغيل التلقائي' : 'تفعيل التشغيل التلقائي'}
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Quick Accounting Test */}
          <QuickAccountingTest />

          {/* Error log — admin only */}
          {isAdmin && logsData && logsData.buffer.length > 0 && (
            <section className="dash-card overflow-hidden">
              <div className="dash-header">
                <div className="flex items-center gap-2.5">
                  <div className="dash-icon-well"><XCircle className="h-4 w-4 text-rose-400" /></div>
                  <div>
                    <p className="dash-title">آخر الأخطاء (Admin فقط)</p>
                    <p className="dash-sub">{logsData.buffer.length} خطأ في الذاكرة</p>
                  </div>
                </div>
              </div>
              <div className="dash-body">
                <div className="max-h-72 overflow-auto rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-1.5">
                  {logsData.buffer.map((entry, i) => (
                    <div key={i} className="text-[11px] font-mono text-rose-300/80">
                      <span className="text-muted-foreground/50">{entry.timestamp}</span>{' '}
                      <span className="text-rose-400">[{entry.level}]</span>{' '}
                      <span>{entry.logger}:</span>{' '}
                      <span>{entry.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
