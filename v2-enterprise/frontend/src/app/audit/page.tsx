'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, RefreshCw, Search, Shield, User, Car,
  TrendingUp, ShoppingBag, CreditCard, Settings,
  FileText, AlertTriangle, CheckCircle2, Clock,
  Database, ChevronDown, ChevronUp,
} from 'lucide-react'
import { get } from '@/lib/api/client'
import { formatDate, cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AuditEntry {
  id: string
  user_id: string | null
  username: string
  action: string
  raw_action: string
  entity_type: string
  table_name: string
  entity_id: number | null
  primary_key: string
  details: string | null
  old_values: string | null
  new_values: string | null
  created_at: string
}

interface AuditStats {
  total_all: number
  total_inserts: number
  total_updates: number
  total_deletes: number
}

interface AuditResponse {
  success: boolean
  total: number
  page: number
  per_page: number
  data: AuditEntry[]
  stats: AuditStats
}

/* ─── Meta maps ──────────────────────────────────────────────────────────── */

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create:   { label: 'إنشاء',  icon: CheckCircle2,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  update:   { label: 'تعديل', icon: Settings,       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'   },
  delete:   { label: 'حذف',   icon: AlertTriangle,  color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'     },
  login:    { label: 'دخول',  icon: User,           color: 'text-sky-400 bg-sky-500/10 border-sky-500/20'        },
  logout:   { label: 'خروج',  icon: User,           color: 'text-muted-foreground bg-secondary/20 border-border/30' },
  pay:      { label: 'دفع',   icon: CreditCard,     color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'     },
  insert:   { label: 'إضافة', icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

const ENTITY_ICON: Record<string, React.ElementType> = {
  car: Car, sale: TrendingUp, purchase: ShoppingBag,
  customer: User, installment: CreditCard, payment: CreditCard,
  user: User, expense: FileText, journal: Database,
}

function getActionMeta(action: string) {
  const key = Object.keys(ACTION_META).find(k => action.toLowerCase().includes(k))
  return key
    ? ACTION_META[key]
    : { label: action, icon: Activity, color: 'text-muted-foreground bg-secondary/20 border-border/30' }
}

function getEntityIcon(entityType: string) {
  const key = Object.keys(ENTITY_ICON).find(k => entityType.toLowerCase().includes(k))
  return key ? ENTITY_ICON[key] : FileText
}

function relativeTime(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'الآن'
  if (mins  < 60) return `منذ ${mins} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${days} يوم`
}

/* ─── Expandable detail panel ────────────────────────────────────────────── */

function ValuesExpander({ label, json }: { label: string; json: string | null }) {
  const [open, setOpen] = useState(false)
  if (!json) return null
  let pretty = json
  try { pretty = JSON.stringify(JSON.parse(json), null, 2) } catch { /* raw */ }
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {label}
      </button>
      {open && (
        <pre className="mt-1.5 overflow-auto rounded-lg border border-border/30 bg-secondary/30 p-2 text-[9px] text-muted-foreground max-h-32">
          {pretty}
        </pre>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AuditPage() {
  const [search, setSearch]           = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [page, setPage]               = useState(1)

  const { data, isLoading, refetch, isFetching } = useQuery<AuditResponse>({
    queryKey: ['audit-logs', page, search, filterAction],
    queryFn: () => get(`/Audit?page=${page}&per_page=50&search=${encodeURIComponent(search)}&action=${filterAction}`),
    staleTime: 30_000,
    retry: 1,
  })

  const logs   = data?.data   ?? []
  const stats  = data?.stats  ?? { total_all: 0, total_inserts: 0, total_updates: 0, total_deletes: 0 }
  const total  = data?.total  ?? 0
  const totalPages = Math.ceil(total / 50)

  const actionOptions = [
    { value: 'all',    label: 'كل الأحداث' },
    { value: 'INSERT', label: 'إنشاء'       },
    { value: 'UPDATE', label: 'تعديل'       },
    { value: 'DELETE', label: 'حذف'         },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجل الأحداث والتدقيق"
        subtitle="تتبع جميع العمليات والتغييرات التي أجراها المستخدمون على النظام"
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الأحداث', value: stats.total_all,     color: 'border-sky-500/20 bg-sky-500/5 text-sky-400'     },
          { label: 'عمليات إنشاء',   value: stats.total_inserts,  color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
          { label: 'عمليات تعديل',   value: stats.total_updates,  color: 'border-amber-500/20 bg-amber-500/5 text-amber-400'     },
          { label: 'عمليات حذف',     value: stats.total_deletes,  color: 'border-rose-500/20 bg-rose-500/5 text-rose-400'       },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('rounded-xl border p-4', color)}>
            <p className="text-[11px] font-semibold opacity-80">{label}</p>
            <p className="text-2xl font-black mt-1">
              {isLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-current/20" /> : value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث في الأحداث، الجداول، القيم..."
            className="w-full h-9 pr-9 pl-3 rounded-lg border border-border/50 bg-secondary/20 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary/20 rounded-lg p-1 border border-border/40">
          {actionOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setFilterAction(value); setPage(1) }}
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
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <Shield className="h-10 w-10 text-muted-foreground/20 mx-auto" />
          <p className="text-sm font-bold text-foreground">لا توجد أحداث مسجلة بعد</p>
          <p className="text-xs text-muted-foreground">ستظهر هنا كل العمليات التي تجري على بيانات النظام</p>
        </div>
      ) : (
        <>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute right-5 top-0 bottom-0 w-px bg-border/30" />

            <div className="space-y-0">
              <AnimatePresence initial={false}>
                {logs.map((log, i) => {
                  const meta       = getActionMeta(log.action)
                  const MetaIcon   = meta.icon
                  const EntityIcon = getEntityIcon(log.entity_type)

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="relative flex items-start gap-4 pb-5 pr-14"
                    >
                      {/* Icon on the line */}
                      <div className={cn(
                        'absolute right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background shadow-sm z-10 bg-card',
                        meta.color.split(' ')[1],
                      )}>
                        <MetaIcon className={cn('h-4 w-4', meta.color.split(' ')[0])} />
                      </div>

                      {/* Content card */}
                      <div className="flex-1 rounded-xl border border-border/40 bg-card p-4 hover:border-border/70 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', meta.color)}>
                              {meta.label}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <EntityIcon className="h-3 w-3" />
                              {log.table_name}
                              {log.primary_key ? ` #${log.primary_key}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                            <Clock className="h-3 w-3" />
                            <span title={log.created_at ? formatDate(log.created_at) : ''}>
                              {log.created_at ? relativeTime(log.created_at) : '-'}
                            </span>
                          </div>
                        </div>

                        {log.details && (
                          <p className="mt-2 text-[11px] text-foreground/80 font-mono leading-relaxed">{log.details}</p>
                        )}

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                          <User className="h-3 w-3" />
                          <span>{log.username}</span>
                          {log.created_at && (
                            <>
                              <span>·</span>
                              <span>{formatDate(log.created_at)}</span>
                            </>
                          )}
                        </div>

                        <div className="flex gap-4">
                          <ValuesExpander label="القيم الجديدة" json={log.new_values} />
                          <ValuesExpander label="القيم القديمة" json={log.old_values} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-lg border border-border/50 text-[11px] font-bold disabled:opacity-40 hover:bg-secondary/40 transition-colors"
              >
                السابق
              </button>
              <span className="text-[11px] text-muted-foreground font-bold">
                {page} / {totalPages} — {total.toLocaleString('ar')} حدث
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-lg border border-border/50 text-[11px] font-bold disabled:opacity-40 hover:bg-secondary/40 transition-colors"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
