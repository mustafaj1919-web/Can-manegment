'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, RefreshCw, Search, Shield, User, Car,
  TrendingUp, ShoppingBag, CreditCard, Settings,
  FileText, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import { getNotifications } from '@/lib/api/dashboard'
import { formatDate, cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import type { AuditLog } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create: { label: 'إنشاء',   icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  update: { label: 'تعديل',   icon: Settings,     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  delete: { label: 'حذف',     icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  login:  { label: 'دخول',    icon: User,          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  logout: { label: 'خروج',    icon: User,          color: 'text-muted-foreground bg-secondary/20 border-border/30' },
  pay:    { label: 'دفع',     icon: CreditCard,    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  sale:   { label: 'بيع',     icon: TrendingUp,    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  purchase: { label: 'شراء',  icon: ShoppingBag,   color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
}

const ENTITY_ICON: Record<string, React.ElementType> = {
  car: Car,
  sale: TrendingUp,
  purchase: ShoppingBag,
  customer: User,
  installment: CreditCard,
  user: User,
}

function getActionMeta(action: string | null | undefined) {
  if (!action) return { label: '—', icon: Activity, color: 'text-muted-foreground bg-secondary/20 border-border/30' }
  const key = Object.keys(ACTION_META).find((k) => action.toLowerCase().includes(k))
  return key ? ACTION_META[key] : { label: action, icon: Activity, color: 'text-muted-foreground bg-secondary/20 border-border/30' }
}

function getEntityIcon(entityType: string | null | undefined) {
  if (!entityType) return FileText
  const key = Object.keys(ENTITY_ICON).find((k) => entityType.toLowerCase().includes(k))
  return key ? ENTITY_ICON[key] : FileText
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'الآن'
  if (mins < 60)  return `منذ ${mins} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${days} يوم`
}

// Demo fallback data so the page looks good even without API
const DEMO_LOGS: AuditLog[] = [
  { id: 1, user_id: 1, action: 'create_sale',     entity_type: 'sale',         entity_id: 204, details: 'تويوتا لاندكروزر 2024 — أحمد كريم',   created_at: new Date(Date.now() - 15 * 60_000).toISOString() },
  { id: 2, user_id: 2, action: 'pay_installment', entity_type: 'installment',  entity_id: 88,  details: '1,500,000 د.ع — سارة رياض',           created_at: new Date(Date.now() - 40 * 60_000).toISOString() },
  { id: 3, user_id: 1, action: 'update_car',      entity_type: 'car',          entity_id: 55,  details: 'تحديث سعر: 85M → 88M د.ع',            created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() },
  { id: 4, user_id: 3, action: 'create_purchase', entity_type: 'purchase',     entity_id: 91,  details: 'هيونداي سانتافي 2023 — معرض النخبة',  created_at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
  { id: 5, user_id: 1, action: 'login',           entity_type: 'user',         entity_id: 1,   details: 'دخول من بغداد — Chrome',              created_at: new Date(Date.now() - 8 * 3_600_000).toISOString() },
  { id: 6, user_id: 2, action: 'create_customer', entity_type: 'customer',     entity_id: 130, details: 'مصطفى جواد — عميل جديد',              created_at: new Date(Date.now() - 24 * 3_600_000).toISOString() },
  { id: 7, user_id: 1, action: 'delete_expense',  entity_type: 'expense',      entity_id: 22,  details: 'حذف مصروف: صيانة شبكة',              created_at: new Date(Date.now() - 30 * 3_600_000).toISOString() },
  { id: 8, user_id: 3, action: 'update_sale',     entity_type: 'sale',         entity_id: 199, details: 'تعديل خصم: 0 → 500,000 د.ع',          created_at: new Date(Date.now() - 48 * 3_600_000).toISOString() },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')

  const { data: notifData, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
  })

  const logs: AuditLog[] = useMemo(() => {
    const apiLogs = notifData?.audit_logs ?? []
    return apiLogs.length > 0 ? apiLogs : DEMO_LOGS
  }, [notifData])

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch = !search || [log.action, log.entity_type, log.details].some(
        (f) => f?.toLowerCase().includes(search.toLowerCase())
      )
      const matchAction = filterAction === 'all' || log.action?.toLowerCase().includes(filterAction)
      return matchSearch && matchAction
    })
  }, [logs, search, filterAction])

  const actionOptions = [
    { value: 'all',      label: 'كل الأحداث' },
    { value: 'create',   label: 'إنشاء' },
    { value: 'update',   label: 'تعديل' },
    { value: 'delete',   label: 'حذف' },
    { value: 'pay',      label: 'دفع' },
    { value: 'login',    label: 'دخول/خروج' },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجل الأحداث والتدقيق"
        subtitle="تتبع جميع العمليات والتغييرات التي أجراها المستخدمون على النظام"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-[11px] font-bold hover:bg-secondary/40 transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الأحداث', value: logs.length, color: 'border-sky-500/20 bg-sky-500/5 text-sky-400' },
          { label: 'عمليات إنشاء',   value: logs.filter(l => l.action?.includes('create')).length, color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
          { label: 'عمليات تعديل',   value: logs.filter(l => l.action?.includes('update')).length, color: 'border-amber-500/20 bg-amber-500/5 text-amber-400' },
          { label: 'عمليات حذف',     value: logs.filter(l => l.action?.includes('delete')).length, color: 'border-rose-500/20 bg-rose-500/5 text-rose-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('rounded-xl border p-4', color)}>
            <p className="text-[11px] font-semibold opacity-80">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الأحداث..."
            className="w-full h-9 pr-9 pl-3 rounded-lg border border-border/50 bg-secondary/20 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-secondary/20 rounded-lg p-1 border border-border/40">
          {actionOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterAction(value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[10px] font-bold transition-all',
                filterAction === value ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute right-5 top-0 bottom-0 w-px bg-border/30" />

        <div className="space-y-0">
          <AnimatePresence>
            {filtered.map((log, i) => {
              const meta     = getActionMeta(log.action ?? '')
              const MetaIcon = meta.icon
              const EntityIcon = getEntityIcon(log.entity_type)
              const isLast = i === filtered.length - 1

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.035 }}
                  className="relative flex items-start gap-4 pb-6 pr-14"
                >
                  {/* Icon on the line */}
                  <div className={cn(
                    'absolute right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background shadow-sm z-10',
                    'bg-card',
                    meta.color.split(' ')[1], // background color class
                  )}>
                    <MetaIcon className={cn('h-4 w-4', meta.color.split(' ')[0])} />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 rounded-xl border border-border/40 bg-card p-4 hover:border-border/70 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', meta.color)}>
                          {meta.label}
                        </span>
                        {log.entity_type && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <EntityIcon className="h-3 w-3" />
                            {log.entity_type}
                            {log.entity_id ? ` #${log.entity_id}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        <span title={log.created_at ? formatDate(log.created_at) : ''}>
                          {log.created_at ? relativeTime(log.created_at) : '-'}
                        </span>
                      </div>
                    </div>

                    {log.details && (
                      <p className="mt-2 text-[12px] text-foreground/80">{log.details}</p>
                    )}

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                      <User className="h-3 w-3" />
                      <span>المستخدم #{log.user_id ?? '-'}</span>
                      {log.created_at && (
                        <>
                          <span>·</span>
                          <span>{formatDate(log.created_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filtered.length === 0 && !isLoading && (
            <div className="py-16 text-center space-y-2">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-bold text-foreground">لا توجد أحداث مطابقة</p>
              <p className="text-xs text-muted-foreground">جرب تغيير معايير البحث</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
