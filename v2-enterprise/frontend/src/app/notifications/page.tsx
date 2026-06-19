'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Bell, AlertTriangle, Clock, CheckCircle2, RefreshCw,
  Car, UserX, Activity, ShieldAlert, ArrowLeft, Package
} from 'lucide-react'
import { getNotifications } from '@/lib/api/dashboard'
import { get } from '@/lib/api/client'
import { formatMoney, formatRelativeDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function money(v: number) { return formatMoney(v, 'IQD') }

interface Alert {
  type: string
  severity: 'critical' | 'high' | 'warning' | 'info'
  title: string
  body: string
  link?: string
  count?: number
  amount?: number
  currency?: string
}

async function getSmartAlerts(): Promise<{ alerts: Alert[]; counts: Record<string, number> }> {
  const res = await get<any>('/smart-alerts')
  return res?.alerts ? res : { alerts: [], counts: {} }
}

const SEVERITY_MAP = {
  critical: { color: 'text-rose-400',  bg: 'bg-rose-500/10',  ring: 'ring-rose-500/20',  border: 'border-rose-500/20',  label: 'حرج',    icon: AlertTriangle },
  high:     { color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20', border: 'border-amber-500/20', label: 'عالي',   icon: AlertTriangle },
  warning:  { color: 'text-yellow-400',bg: 'bg-yellow-500/10',ring: 'ring-yellow-500/20',border: 'border-yellow-500/20',label: 'تحذير',  icon: Clock },
  info:     { color: 'text-blue-400',  bg: 'bg-blue-500/10',  ring: 'ring-blue-500/20',  border: 'border-blue-500/20',  label: 'معلومة', icon: Bell },
}

export default function NotificationsPage() {
  const { data: notifData, isLoading: notifLoading, refetch: refetchNotif, isFetching: isFetchingNotif } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: getNotifications,
    staleTime: 30_000,
    retry: 1,
  })

  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['smart-alerts-page'],
    queryFn: getSmartAlerts,
    staleTime: 30_000,
    retry: 1,
  })

  const isLoading = notifLoading || alertsLoading

  const overdueCount  = notifData?.overdue?.length    ?? 0
  const todayCount    = notifData?.due_today?.length   ?? 0
  const soonCount     = notifData?.due_soon?.length    ?? 0
  const defaultCount  = notifData?.defaulting_customers?.length ?? 0
  const totalNotif    = overdueCount + todayCount + soonCount + defaultCount

  const criticalAlerts = (alertsData?.alerts ?? []).filter(a => a.severity === 'critical')
  const highAlerts     = (alertsData?.alerts ?? []).filter(a => a.severity === 'high')
  const warnAlerts     = (alertsData?.alerts ?? []).filter(a => a.severity === 'warning')

  function handleRefresh() { refetchNotif(); refetchAlerts() }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
            <Bell className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="section-title">مركز الإشعارات والتنبيهات</h1>
            <p className="section-subtitle">
              {totalNotif > 0
                ? `${totalNotif} إشعار نشط — ${overdueCount + criticalAlerts.length} يحتاج انتباهاً فورياً`
                : 'جميع المؤشرات سليمة'}
            </p>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={handleRefresh} disabled={isFetchingNotif} className="gap-2 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetchingNotif ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">متأخرة</p>
              <p className={`mt-1 font-numeric text-2xl font-black ${overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {overdueCount}
              </p>
              <p className="text-[10px] text-muted-foreground/60">قسط متأخر</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">مستحقة اليوم</p>
              <p className={`mt-1 font-numeric text-2xl font-black ${todayCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {todayCount}
              </p>
              <p className="text-[10px] text-muted-foreground/60">قسط اليوم</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">عملاء متعثرون</p>
              <p className={`mt-1 font-numeric text-2xl font-black ${defaultCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {defaultCount}
              </p>
              <p className="text-[10px] text-muted-foreground/60">عميل</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground">تنبيهات النظام</p>
              <p className={`mt-1 font-numeric text-2xl font-black ${criticalAlerts.length > 0 ? 'text-rose-400' : highAlerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {(alertsData?.alerts ?? []).length}
              </p>
              <p className="text-[10px] text-muted-foreground/60">تنبيه نشط</p>
            </div>
          </div>

          {/* Smart System Alerts */}
          {(alertsData?.alerts ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">تنبيهات النظام الذكي</p>
              {(alertsData?.alerts ?? []).map((alert, i) => {
                const s = SEVERITY_MAP[alert.severity] ?? SEVERITY_MAP.info
                const Icon = alert.type === 'low_inventory' ? Package : s.icon
                return (
                  <div key={i} className={`glass rounded-xl p-4 border ${s.border}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ring-1 ${s.bg} ${s.ring} ${s.border}`}>
                        <Icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-bold ${s.color}`}>{alert.title}</p>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${s.bg} ${s.ring} ${s.color}`}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.body}</p>
                        {alert.amount && alert.amount > 0 && (
                          <p className={`text-xs font-numeric font-bold mt-1 ${s.color}`}>
                            {money(alert.amount)}
                          </p>
                        )}
                      </div>
                      {alert.link && (
                        <Link href={alert.link} className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold ${s.color} hover:underline`}>
                          عرض <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* All Clear */}
          {totalNotif === 0 && (alertsData?.alerts ?? []).length === 0 && (
            <div className="glass rounded-xl py-16 text-center border border-emerald-500/20">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">ممتاز! لا توجد إشعارات أو تنبيهات نشطة</p>
              <p className="mt-1 text-xs text-muted-foreground">جميع الأقساط في موعدها والمخزون كافٍ</p>
            </div>
          )}

          {/* Overdue Installments */}
          {overdueCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <p className="text-sm font-semibold text-rose-400">أقساط متأخرة ({overdueCount})</p>
                </div>
                <Link href="/installments?filter=overdue" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  عرض الكل <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
                </Link>
              </div>
              <div className="glass overflow-hidden rounded-xl border border-rose-500/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 bg-rose-500/5">
                      <th className="py-2.5 pr-4 text-right font-semibold text-muted-foreground">العميل</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">السيارة</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">الاستحقاق</th>
                      <th className="py-2.5 pl-4 text-left font-semibold text-rose-400">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifData?.overdue?.slice(0, 10).map((n, i) => (
                      <tr key={i} className="border-b border-border/10 last:border-0 hover:bg-rose-500/5 transition-colors">
                        <td className="py-2.5 pr-4 font-semibold text-foreground">{n.customer_name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{n.car_name}</td>
                        <td className="py-2.5 px-3 text-rose-400 font-semibold whitespace-nowrap">
                          {n.due_date ? formatRelativeDate(n.due_date) : '—'}
                        </td>
                        <td className="py-2.5 pl-4 text-left font-numeric font-bold text-rose-400 whitespace-nowrap">
                          {money(n.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Due Today */}
          {todayCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-400">مستحقة اليوم ({todayCount})</p>
                </div>
                <Link href="/installments?filter=due_today" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  عرض الكل <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
                </Link>
              </div>
              <div className="glass overflow-hidden rounded-xl border border-amber-500/10">
                <div className="divide-y divide-border/20">
                  {notifData?.due_today?.slice(0, 5).map((n, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{n.customer_name}</p>
                        <p className="text-[11px] text-muted-foreground">{n.car_name} · {n.invoice_number}</p>
                      </div>
                      <p className="font-numeric text-xs font-bold text-amber-400 whitespace-nowrap">{money(n.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Due Soon */}
          {soonCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                <p className="text-sm font-semibold text-teal-400">مستحقة خلال 7 أيام ({soonCount})</p>
              </div>
              <div className="glass rounded-xl px-4 py-2 border border-teal-500/10">
                <div className="divide-y divide-border/10">
                  {notifData?.due_soon?.slice(0, 5).map((n, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{n.customer_name}</p>
                        <p className="text-[11px] text-muted-foreground">{n.due_date ? formatRelativeDate(n.due_date) : '—'}</p>
                      </div>
                      <p className="font-numeric text-xs font-bold text-teal-400 whitespace-nowrap">{money(n.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Defaulting Customers */}
          {defaultCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-rose-400" />
                <p className="text-sm font-semibold text-rose-400">عملاء متعثرون ({defaultCount})</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {notifData?.defaulting_customers?.map((c, i) => (
                  <div key={i} className="glass rounded-xl p-4 border border-rose-500/10">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <UserX className="h-4 w-4 text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{c.customer_name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.customer_phone ?? '—'}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-bold text-rose-400">{c.overdue_count} قسط متأخر</span>
                          <span className="font-numeric text-[10px] font-black text-rose-400">{money(c.overdue_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {(notifData?.audit_logs ?? []).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground">آخر النشاطات</p>
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <div className="divide-y divide-border/20">
                  {notifData?.audit_logs?.slice(0, 8).map((log, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/80 truncate">{log.action}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">{formatRelativeDate(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
