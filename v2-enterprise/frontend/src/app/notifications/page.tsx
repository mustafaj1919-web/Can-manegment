'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, AlertTriangle, Clock, CheckCircle2, RefreshCw,
  UserX, Activity, ArrowLeft, Package, Settings, Sliders,
  MessageSquare, Send, Save, History, Check, XCircle, Loader2,
  Phone, AlertCircle
} from 'lucide-react'
import { getNotifications } from '@/lib/api/dashboard'
import { get } from '@/lib/api/client'
import { formatMoney, formatRelativeDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  getReminderSettings,
  saveReminderSettings,
  triggerReminders,
  getReminderHistory,
  ReminderSettings
} from '@/lib/api/reminders'

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
  const [activeTab, setActiveTab] = useState<'alerts' | 'automation'>('alerts')
  const queryClient = useQueryClient()

  // Original Alert Queries
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

  // Phase 1 Automation Queries
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['reminder-settings'],
    queryFn: getReminderSettings,
    enabled: activeTab === 'automation',
  })

  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['reminder-history'],
    queryFn: getReminderHistory,
    enabled: activeTab === 'automation',
  })

  // Settings state and mutation
  const [localSettings, setLocalSettings] = useState<ReminderSettings | null>(null)

  // Sync loaded settings to local state
  if (settings && !localSettings) {
    setLocalSettings(settings)
  }

  const saveSettingsMutation = useMutation({
    mutationFn: saveReminderSettings,
    onSuccess: (data) => {
      toast.success(data.message || 'تم حفظ إعدادات التذكير بنجاح')
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] })
    },
    onError: () => {
      toast.error('فشل حفظ الإعدادات')
    }
  })

  const triggerRemindersMutation = useMutation({
    mutationFn: triggerReminders,
    onSuccess: (data) => {
      toast.success(`اكتمل التشغيل: تم إرسال ${data.smsSent} رسالة نصية و ${data.whatsAppSent} رسالة واتساب.`)
      queryClient.invalidateQueries({ queryKey: ['reminder-history'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
      queryClient.invalidateQueries({ queryKey: ['smart-alerts-page'] })
    },
    onError: () => {
      toast.error('فشل إرسال التذكيرات التلقائية')
    }
  })

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    if (localSettings) {
      saveSettingsMutation.mutate(localSettings)
    }
  }

  const handleRefreshAlerts = () => {
    refetchNotif()
    refetchAlerts()
  }

  const handleRefreshAutomation = () => {
    refetchSettings()
    refetchHistory()
  }

  const isLoading = notifLoading || alertsLoading

  const overdueCount  = notifData?.overdue?.length    ?? 0
  const todayCount    = notifData?.due_today?.length   ?? 0
  const soonCount     = notifData?.due_soon?.length    ?? 0
  const defaultCount  = notifData?.defaulting_customers?.length ?? 0
  const totalNotif    = overdueCount + todayCount + soonCount + defaultCount

  const criticalAlerts = (alertsData?.alerts ?? []).filter(a => a.severity === 'critical')
  const highAlerts     = (alertsData?.alerts ?? []).filter(a => a.severity === 'high')

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
            <Bell className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="section-title">مركز الإشعارات والتنبيهات</h1>
            <p className="section-subtitle">
              {activeTab === 'alerts'
                ? (totalNotif > 0 ? `${totalNotif} إشعار نشط — يحتاج انتباهاً فورياً` : 'جميع المؤشرات سليمة')
                : 'إدارة وإرسال رسائل التنبيهات للأقساط المتأخرة واليومية'}
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-lg bg-secondary/30 p-1 border border-border/30">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'alerts'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            الإشعارات الحالية
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'automation'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            أتمتة الرسائل والتنبيهات
          </button>
        </div>
      </div>

      {activeTab === 'alerts' ? (
        // ─── TAB 1: ALERTS DASHBOARD ──────────────────────────────────────────
        <>
          <div className="flex justify-end">
            <Button variant="glass" size="sm" onClick={handleRefreshAlerts} disabled={isFetchingNotif} className="gap-2 h-8">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingNotif ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
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
                  <p className={`mt-1 font-numeric text-2xl font-black ${criticalAlerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
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
            </>
          )}
        </>
      ) : (
        // ─── TAB 2: REMINDERS AUTOMATION WORKSPACE ────────────────────────────
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* Left panel: Configuration & Templates */}
          <div className="lg:col-span-8 space-y-6">
            {settingsLoading || !localSettings ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Gateway config */}
                <div className="glass rounded-xl p-5 space-y-4 border border-border/55">
                  <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                    <Settings className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-foreground">بوابة الإرسال والربط</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground">وسيلة الإرسال المفضلة</label>
                      <select
                        value={localSettings.smsProvider}
                        onChange={(e) => setLocalSettings({ ...localSettings, smsProvider: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Simulator">محاكي الإرسال (Simulator Mode - تجريبي)</option>
                        <option value="Twilio">رسائل نصية قصيرة (SMS via Twilio)</option>
                        <option value="WhatsApp">واتساب (WhatsApp Business API)</option>
                      </select>
                    </div>

                    {localSettings.smsProvider === 'WhatsApp' && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground">رمز الوصول (WhatsApp API Token)</label>
                        <input
                          type="password"
                          placeholder="أدخل رمز الوصول الخاص بالواتساب"
                          value={localSettings.whatsAppToken}
                          onChange={(e) => setLocalSettings({ ...localSettings, whatsAppToken: e.target.value })}
                          className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {localSettings.smsProvider === 'Twilio' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground">Twilio Account SID</label>
                          <input
                            type="text"
                            placeholder="ACxxxxxxxxxxxxxxxxxx"
                            value={localSettings.twilioAccountSid}
                            onChange={(e) => setLocalSettings({ ...localSettings, twilioAccountSid: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground">Twilio Auth Token</label>
                          <input
                            type="password"
                            placeholder="Auth Token"
                            value={localSettings.twilioAuthToken}
                            onChange={(e) => setLocalSettings({ ...localSettings, twilioAuthToken: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-muted-foreground">رقم الإرسال الخاص بـ Twilio</label>
                          <input
                            type="text"
                            placeholder="+1XXXXXXXXXX"
                            value={localSettings.twilioFromNumber}
                            onChange={(e) => setLocalSettings({ ...localSettings, twilioFromNumber: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {localSettings.smsProvider === 'Simulator' && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[10.5px] text-muted-foreground leading-normal">
                        <strong>وضع المحاكاة نشط</strong>: لن يتم فرض أي رسوم على إرسال الرسائل. سيتم تسجيل وتخزين كافة الرسائل في ملف المحاكاة المحلّي وسجل النظام لاختبار سير العمل بأمان وسهولة.
                      </p>
                    </div>
                  )}
                </div>

                {/* Message Templates */}
                <div className="glass rounded-xl p-5 space-y-5 border border-border/55">
                  <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-foreground">صياغة وقوالب الرسائل (العربية)</h3>
                  </div>

                  <div className="rounded-lg bg-secondary/30 p-3 border border-border/40">
                    <p className="text-[10px] font-bold text-foreground mb-1">المتغيرات الديناميكية المتاحة للاستخدام:</p>
                    <div className="flex flex-wrap gap-2 text-[9.5px]">
                      <span className="bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground">{"{Name}"} لاسم العميل</span>
                      <span className="bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground">{"{CarModel}"} لموديل السيارة</span>
                      <span className="bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground">{"{InstallmentNumber}"} لرقم القسط</span>
                      <span className="bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground">{"{Amount}"} لمبلغ القسط المتبقي</span>
                      <span className="bg-background border px-1.5 py-0.5 rounded font-mono text-muted-foreground">{"{DueDate}"} لتاريخ الاستحقاق</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>قالب رسالة اليوم المستحق (Due Today)</span>
                        <span className="rounded bg-amber-500/10 text-amber-500 px-1 py-0.5 text-[8.5px] border border-amber-500/25">يومي</span>
                      </label>
                      <textarea
                        rows={3}
                        value={localSettings.dueTodayTemplate}
                        onChange={(e) => setLocalSettings({ ...localSettings, dueTodayTemplate: e.target.value })}
                        className="flex w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>قالب رسالة التذكير المبكر (قبل الموعد بـ 3 أيام)</span>
                        <span className="rounded bg-teal-500/10 text-teal-500 px-1 py-0.5 text-[8.5px] border border-teal-500/25">تذكيري</span>
                      </label>
                      <textarea
                        rows={3}
                        value={localSettings.dueSoonTemplate}
                        onChange={(e) => setLocalSettings({ ...localSettings, dueSoonTemplate: e.target.value })}
                        className="flex w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>قالب رسالة المتأخرات والإنذارات (Overdue)</span>
                        <span className="rounded bg-rose-500/10 text-rose-500 px-1 py-0.5 text-[8.5px] border border-rose-500/25">إنذار قانوني</span>
                      </label>
                      <textarea
                        rows={3}
                        value={localSettings.overdueTemplate}
                        onChange={(e) => setLocalSettings({ ...localSettings, overdueTemplate: e.target.value })}
                        className="flex w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={saveSettingsMutation.isPending}
                    className="gap-2 text-xs h-9 bg-emerald-500 text-white hover:bg-emerald-600 border-none"
                  >
                    {saveSettingsMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    حفظ الإعدادات والقوالب
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Right panel: Controls & Sent History Log */}
          <div className="lg:col-span-4 space-y-6">

            {/* Run Engine Card */}
            <div className="glass rounded-xl p-5 space-y-4 border border-border/55 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Send className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">التشغيل اليدوي للتحصيل</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  قم بالبحث الفوري عن الأقساط المستحقة والمتأخرة لتشغيل محرك إرسال الرسائل والتذكيرات فوراً لجميع العملاء.
                </p>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => triggerRemindersMutation.mutate()}
                disabled={triggerRemindersMutation.isPending}
                className="w-full gap-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white h-9 border-none font-bold"
              >
                {triggerRemindersMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                إرسال التذكيرات الآن
              </Button>

              {triggerRemindersMutation.data && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5 text-right">
                  <p className="text-[10px] text-emerald-400 font-bold">نتائج التشغيل:</p>
                  <p className="text-[9.5px] text-muted-foreground mt-0.5">
                    الرسائل المرسلة: {triggerRemindersMutation.data.smsSent} SMS، و {triggerRemindersMutation.data.whatsAppSent} WhatsApp.
                  </p>
                  {triggerRemindersMutation.data.details.length > 0 && (
                    <ul className="mt-1 max-h-20 overflow-y-auto space-y-0.5 border-t border-border/30 pt-1 text-[9px] text-muted-foreground/80 list-disc list-inside">
                      {triggerRemindersMutation.data.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* History timeline log */}
            <div className="glass rounded-xl p-5 space-y-4 border border-border/55">
              <div className="flex items-center justify-between border-b border-border/20 pb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-foreground">سجل الإرسال التلقائي</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRefreshAutomation} className="h-6 w-6">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

              {historyLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !history || history.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-[10.5px]">
                  لا توجد رسائل مرسلة مؤخراً في السجل.
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div key={h.id} className="border-b border-border/10 pb-2.5 last:border-0 last:pb-0 space-y-1 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                          <span className={`inline-flex h-2 w-2 rounded-full ${h.type === 'whatsapp' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                          {h.customerName}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-numeric">
                          {formatRelativeDate(h.timestamp)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" /> {h.phone}
                      </p>
                      <p className="text-[10.5px] text-foreground/80 leading-normal bg-secondary/20 p-2 rounded border border-border/20 select-text">
                        {h.message}
                      </p>
                      <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 text-[8.5px] font-semibold">
                          <Check className="h-2.5 w-2.5" /> ناجحة
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  )
}
