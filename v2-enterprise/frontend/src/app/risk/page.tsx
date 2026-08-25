'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, TrendingDown, Phone, CreditCard,
  ChevronDown, ChevronUp, RefreshCw, User, Clock,
  Flame, Shield, ShieldAlert, ShieldOff, BarChart3,
  ArrowUpRight, Filter,
} from 'lucide-react'
import { getNotifications } from '@/lib/api/dashboard'
import { getArAgingReport } from '@/lib/api/reports'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { usePersistedState } from '@/hooks/usePersistedState'
import { PageHeader } from '@/components/shared/PageHeader'
import Link from 'next/link'

// ── Risk scoring ──────────────────────────────────────────────────────────────

function calcRiskScore(daysPastDue: number, amountIqd: number, overdueCount: number): number {
  const dayScore    = Math.min(daysPastDue / 90, 1) * 40
  const amountScore = Math.min(amountIqd / 10_000_000, 1) * 35
  const countScore  = Math.min(overdueCount / 5, 1) * 25
  return Math.round(dayScore + amountScore + countScore)
}

function RiskBadge({ score }: { score: number }) {
  if (score >= 70) return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
      <ShieldOff className="h-2.5 w-2.5" /> عالي {score}
    </span>
  )
  if (score >= 40) return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
      <ShieldAlert className="h-2.5 w-2.5" /> متوسط {score}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">
      <Shield className="h-2.5 w-2.5" /> منخفض {score}
    </span>
  )
}

function DaysBar({ days }: { days: number }) {
  const pct = Math.min(days / 90 * 100, 100)
  const color = days > 60 ? 'bg-rose-500' : days > 30 ? 'bg-amber-500' : 'bg-sky-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary/40 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-numeric text-muted-foreground w-10">{days} يوم</span>
    </div>
  )
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function RiskSummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType, label: string, value: string, sub?: string, color: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 space-y-2', color)}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="text-xl font-black font-numeric">{value}</p>
      {sub && <p className="text-[10px] opacity-70">{sub}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RiskPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = usePersistedState<'score' | 'days' | 'amount'>('risk_sort', 'score')
  const [minRisk, setMinRisk] = usePersistedState<number>('risk_min', 0)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: notifData, isLoading: loadingNotif, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 5 * 60_000,
  })

  const { data: agingData, isLoading: loadingAging } = useQuery({
    queryKey: ['ar-aging'],
    queryFn: getArAgingReport,
    staleTime: 5 * 60_000,
  })

  // Build unified risk rows
  const riskRows = useMemo(() => {
    const customerMap = new Map<number, {
      id: number
      name: string
      phone: string | null
      overdueCount: number
      overdueAmount: number
      oldestDays: number
    }>()

    // From defaulting customers
    for (const dc of notifData?.defaulting_customers ?? []) {
      customerMap.set(dc.customer_id, {
        id: dc.customer_id,
        name: dc.customer_name,
        phone: dc.customer_phone,
        overdueCount: dc.overdue_count,
        overdueAmount: dc.overdue_amount,
        oldestDays: 0,
      })
    }

    // From aging report customers
    for (const ac of agingData?.customers ?? []) {
      const existing = customerMap.get(ac.customer_id)
      if (existing) {
        existing.overdueAmount = Math.max(existing.overdueAmount, ac.total_iqd)
        existing.oldestDays = ac.oldest_days_past_due
      } else {
        customerMap.set(ac.customer_id, {
          id: ac.customer_id,
          name: ac.customer_name,
          phone: null,
          overdueCount: ac.items_count,
          overdueAmount: ac.total_iqd,
          oldestDays: ac.oldest_days_past_due,
        })
      }
    }

    // Also pull from overdue notifications for any missing customers
    for (const notif of notifData?.overdue ?? []) {
      // overdue notifications don't have customer_id easily — skip if already covered
    }

    return Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        score: calcRiskScore(c.oldestDays, c.overdueAmount, c.overdueCount),
      }))
      .filter((c) => c.score >= minRisk)
      .sort((a, b) => {
        if (sortBy === 'score')  return b.score - a.score
        if (sortBy === 'days')   return b.oldestDays - a.oldestDays
        if (sortBy === 'amount') return b.overdueAmount - a.overdueAmount
        return 0
      })
  }, [notifData, agingData, sortBy, minRisk])

  // Summary stats
  const totalOverdue    = agingData?.total_iqd ?? 0
  const highRiskCount   = riskRows.filter(r => r.score >= 70).length
  const medRiskCount    = riskRows.filter(r => r.score >= 40 && r.score < 70).length
  const agingBuckets    = agingData?.buckets ?? []

  const isLoading = loadingNotif || loadingAging

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="لوحة مراقبة مخاطر الأقساط"
        subtitle="تتبع العملاء المتأخرين وتقييم درجة الخطر وإجراء تحصيل فوري"
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RiskSummaryCard
          icon={AlertTriangle} label="إجمالي الذمم المتأخرة"
          value={formatMoney(totalOverdue, 'IQD')}
          sub={`${agingData?.total_count ?? 0} قسط متأخر`}
          color="border-rose-500/20 bg-rose-500/5 text-rose-400"
        />
        <RiskSummaryCard
          icon={ShieldOff} label="عملاء خطر عالي"
          value={String(highRiskCount)}
          sub="درجة ≥ 70"
          color="border-rose-500/20 bg-rose-500/5 text-rose-400"
        />
        <RiskSummaryCard
          icon={ShieldAlert} label="عملاء خطر متوسط"
          value={String(medRiskCount)}
          sub="درجة 40 – 69"
          color="border-amber-500/20 bg-amber-500/5 text-amber-400"
        />
        <RiskSummaryCard
          icon={BarChart3} label="إجمالي العملاء المراقبين"
          value={String(riskRows.length)}
          sub="جميع درجات الخطر"
          color="border-sky-500/20 bg-sky-500/5 text-sky-400"
        />
      </div>

      {/* Aging Buckets Bar */}
      {agingBuckets.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <h3 className="text-[12px] font-bold">توزيع الذمم حسب عمر التأخير</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {agingBuckets.map((b) => {
              const pct = totalOverdue > 0 ? (b.total_iqd / totalOverdue) * 100 : 0
              const isHot = b.bucket === 'over_60' || b.bucket === '31-60'
              return (
                <div key={b.bucket} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">{b.label}</span>
                    <span className="text-[10px] font-bold font-numeric">{b.count} قسط</span>
                  </div>
                  <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', isHot ? 'bg-rose-500' : 'bg-sky-500')}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="text-[10px] font-numeric font-bold">{formatMoney(b.total_iqd, 'IQD')}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-secondary/20 rounded-lg p-1 border border-border/40">
          {([
            { key: 'score',  label: 'درجة الخطر' },
            { key: 'days',   label: 'أيام التأخير' },
            { key: 'amount', label: 'المبلغ' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[11px] font-bold transition-all',
                sortBy === key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>حد أدنى للخطر:</span>
          {[0, 40, 70].map((v) => (
            <button
              key={v}
              onClick={() => setMinRisk(v)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors',
                minRisk === v
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'border-border/40 hover:border-border/70 hover:text-foreground'
              )}
            >
              {v === 0 ? 'الكل' : `≥ ${v}`}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_auto] gap-4 px-4 py-2.5 bg-secondary/20 border-b border-border/40 text-[10px] font-bold text-muted-foreground">
          <span>العميل</span>
          <span>درجة الخطر</span>
          <span>أيام التأخير</span>
          <span>المبلغ المتأخر</span>
          <span>إجراءات</span>
        </div>

        {isLoading && (
          <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            جاري تحميل بيانات المخاطر...
          </div>
        )}

        {!isLoading && riskRows.length === 0 && (
          <div className="py-16 text-center space-y-2">
            <Shield className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">لا يوجد عملاء في هذا المستوى من الخطر</p>
            <p className="text-xs text-muted-foreground">جميع الأقساط في حالة جيدة</p>
          </div>
        )}

        <AnimatePresence>
          {riskRows.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {/* Main row */}
              <div
                className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_auto] gap-4 px-4 py-3 border-b border-border/20 hover:bg-secondary/10 transition-colors cursor-pointer items-center"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                {/* Customer */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black border',
                    row.score >= 70 ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                    row.score >= 40 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                     'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  )}>
                    {row.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate">{row.name}</p>
                    {row.phone && (
                      <p className="text-[10px] text-muted-foreground font-numeric">{row.phone}</p>
                    )}
                  </div>
                </div>

                {/* Risk badge */}
                <div>
                  <RiskBadge score={row.score} />
                </div>

                {/* Days bar */}
                <div className="min-w-0">
                  <DaysBar days={row.oldestDays} />
                </div>

                {/* Amount */}
                <div>
                  <p className="text-[12px] font-black font-numeric text-rose-400">
                    {formatMoney(row.overdueAmount, 'IQD')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{row.overdueCount} قسط</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/cashier/installment-payment?customer_id=${row.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                  >
                    <CreditCard className="h-3 w-3" />
                    تحصيل
                  </Link>
                  {row.phone && (
                    <a
                      href={`tel:${row.phone}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border/40 text-muted-foreground text-[10px] font-bold hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                  )}
                  <Link
                    href={`/customers/${row.id}`}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border/30 text-muted-foreground text-[10px] hover:text-foreground transition-colors"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <button className="text-muted-foreground">
                    {expandedId === row.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expandedId === row.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-4 bg-secondary/5 border-b border-border/20 space-y-3">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-border/40 bg-card p-3">
                          <p className="text-[9px] text-muted-foreground mb-1">أكبر تأخير</p>
                          <p className="text-sm font-black text-rose-400">{row.oldestDays} يوم</p>
                        </div>
                        <div className="rounded-lg border border-border/40 bg-card p-3">
                          <p className="text-[9px] text-muted-foreground mb-1">عدد الأقساط المتأخرة</p>
                          <p className="text-sm font-black">{row.overdueCount}</p>
                        </div>
                        <div className="rounded-lg border border-border/40 bg-card p-3">
                          <p className="text-[9px] text-muted-foreground mb-1">إجمالي المبلغ</p>
                          <p className="text-sm font-black font-numeric">{formatMoney(row.overdueAmount, 'IQD')}</p>
                        </div>
                        <div className="rounded-lg border border-border/40 bg-card p-3">
                          <p className="text-[9px] text-muted-foreground mb-1">درجة المخاطرة المحسوبة</p>
                          <p className={cn('text-sm font-black', row.score >= 70 ? 'text-rose-400' : row.score >= 40 ? 'text-amber-400' : 'text-sky-400')}>
                            {row.score} / 100
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/cashier/installment-payment?customer_id=${row.id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 transition-colors"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          تحصيل الأقساط الآن
                        </Link>
                        <Link
                          href={`/customers/${row.id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 text-[11px] font-bold hover:bg-secondary/40 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <User className="h-3.5 w-3.5" />
                          ملف العميل الكامل
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
