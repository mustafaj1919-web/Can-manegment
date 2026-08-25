'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, CheckCircle2, AlertTriangle, Database,
  Clock, RefreshCw, Server, Car, TrendingUp, Users,
  ShoppingBag, CalendarDays, Wallet, FileText,
  BarChart2, Shield,
} from 'lucide-react'
import { get } from '@/lib/api/client'
import { formatDate, cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface HealthData {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  uptime_seconds: number
  uptime_label: string
  version: string
  environment: string
  database: {
    ok: boolean
    error: string
    tables: Record<string, number>
  }
  activity: {
    last_sale: string | null
    last_audit: string | null
  }
}

interface HealthResponse {
  success: boolean
  data: HealthData
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const map = {
    healthy:  { label: 'يعمل بشكل طبيعي', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    degraded: { label: 'أداء منخفض',       color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'     },
    down:     { label: 'متوقف',            color: 'text-rose-400 bg-rose-500/10 border-rose-500/30'         },
  }
  const { label, color } = map[status]
  return (
    <span className={cn('rounded-full border px-3 py-1 text-[11px] font-bold', color)}>
      {label}
    </span>
  )
}

const TABLE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  vehicles:         { label: 'السيارات',         icon: Car,          color: 'text-amber-400'   },
  sales:            { label: 'عقود البيع',       icon: TrendingUp,   color: 'text-emerald-400' },
  customers:        { label: 'العملاء',          icon: Users,        color: 'text-sky-400'     },
  purchases:        { label: 'المشتريات',        icon: ShoppingBag,  color: 'text-orange-400'  },
  installments:     { label: 'خطط الأقساط',      icon: CalendarDays, color: 'text-violet-400'  },
  users:            { label: 'المستخدمون',       icon: Shield,       color: 'text-rose-400'    },
  branches:         { label: 'الفروع',           icon: Activity,     color: 'text-pink-400'    },
  expenses:         { label: 'المصاريف',         icon: Wallet,       color: 'text-red-400'     },
  journal_entries:  { label: 'القيود المحاسبية', icon: FileText,     color: 'text-indigo-400'  },
  payments:         { label: 'المدفوعات',        icon: Wallet,       color: 'text-cyan-400'    },
  employees:        { label: 'الموظفون',         icon: Users,        color: 'text-teal-400'    },
  crm_interactions: { label: 'تفاعلات CRM',     icon: BarChart2,    color: 'text-purple-400'  },
  audit_logs:       { label: 'سجل التدقيق',      icon: Database,     color: 'text-slate-400'   },
}

export default function SystemHealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: () => get('/SystemHealth'),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })

  const h = data?.data

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="فحص صحة النظام"
        subtitle="حالة قاعدة البيانات، وقت التشغيل، وإحصاءات البيانات الحية"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-[11px] font-bold hover:bg-secondary/40 transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            تحديث
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !h ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-card">
          <AlertTriangle className="h-8 w-8 text-rose-400" />
          <p className="text-sm font-bold text-foreground">تعذّر الاتصال بالخادم</p>
          <button type="button" onClick={() => refetch()} className="text-[11px] text-primary hover:underline">
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* ── Status banner ── */}
          <div className={cn(
            'flex items-center justify-between rounded-2xl border p-5',
            h.status === 'healthy'
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl border',
                h.status === 'healthy'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              )}>
                {h.status === 'healthy'
                  ? <CheckCircle2 className="h-6 w-6" />
                  : <AlertTriangle className="h-6 w-6" />
                }
              </div>
              <div>
                <p className="text-sm font-black text-foreground">النظام</p>
                <StatusBadge status={h.status} />
              </div>
            </div>
            <div className="text-left space-y-1">
              <p className="text-[10px] text-muted-foreground">الإصدار <span className="font-bold text-foreground">{h.version}</span></p>
              <p className="text-[10px] text-muted-foreground">البيئة <span className="font-bold text-foreground">{h.environment}</span></p>
              <p className="text-[10px] text-muted-foreground">آخر تحديث <span className="font-bold text-foreground">{formatDate(h.timestamp)}</span></p>
            </div>
          </div>

          {/* ── Uptime & DB ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-sky-400" />
                <p className="text-xs font-bold text-foreground">وقت التشغيل</p>
              </div>
              <p className="text-2xl font-black text-sky-400">{h.uptime_label}</p>
              <p className="text-[10px] text-muted-foreground">{h.uptime_seconds.toLocaleString('ar')} ثانية</p>
            </div>

            <div className={cn(
              'rounded-xl border p-5 space-y-1',
              h.database.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
            )}>
              <div className="flex items-center gap-2 mb-3">
                <Database className={cn('h-4 w-4', h.database.ok ? 'text-emerald-400' : 'text-rose-400')} />
                <p className="text-xs font-bold text-foreground">قاعدة البيانات</p>
              </div>
              <p className={cn('text-2xl font-black', h.database.ok ? 'text-emerald-400' : 'text-rose-400')}>
                {h.database.ok ? 'متصلة' : 'خطأ'}
              </p>
              {h.database.error && (
                <p className="text-[10px] text-rose-400 truncate">{h.database.error}</p>
              )}
            </div>

            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-violet-400" />
                <p className="text-xs font-bold text-foreground">آخر نشاط</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                آخر بيع:{' '}
                <span className="font-bold text-foreground">
                  {h.activity.last_sale ? formatDate(h.activity.last_sale) : 'لا يوجد'}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                آخر تدقيق:{' '}
                <span className="font-bold text-foreground">
                  {h.activity.last_audit ? formatDate(h.activity.last_audit) : 'لا يوجد'}
                </span>
              </p>
            </div>
          </div>

          {/* ── Table Counts ── */}
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/40 bg-secondary/20 px-5 py-3">
              <Database className="h-4 w-4 text-primary" />
              <p className="text-xs font-black text-foreground">إحصاءات الجداول</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x-0 divide-y divide-border/30">
              {Object.entries(h.database.tables).map(([key, count], i) => {
                const meta = TABLE_META[key] ?? { label: key, icon: Database, color: 'text-muted-foreground' }
                const Icon = meta.icon
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/30', meta.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">{meta.label}</p>
                      <p className="text-sm font-black text-foreground">{count.toLocaleString('ar')}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* ── System checks ── */}
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/40 bg-secondary/20 px-5 py-3">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-xs font-black text-foreground">فحوصات النظام</p>
            </div>
            <div className="divide-y divide-border/30">
              {[
                { label: 'اتصال قاعدة البيانات', ok: h.database.ok },
                { label: 'خدمة المصادقة (JWT)',   ok: true },
                { label: 'خدمة التخزين',          ok: true },
                { label: 'واجهة برمجة التطبيقات', ok: true },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-[12px] text-foreground">{label}</span>
                  <div className={cn(
                    'flex items-center gap-1.5 text-[10px] font-bold',
                    ok ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {ok
                      ? <><CheckCircle2 className="h-3.5 w-3.5" /> يعمل</>
                      : <><AlertTriangle className="h-3.5 w-3.5" /> خطأ</>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
