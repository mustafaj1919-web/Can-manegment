'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Trophy, TrendingUp, Target, Users, Star,
  Crown, Medal, Award, CheckCircle2, X, Check, RefreshCw,
} from 'lucide-react'
import { getEmployeePerformance, setEmployeeTarget, type EmployeePerf } from '@/lib/api/crm'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/api/client'

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function money(v: number) { return formatMoney(v, 'IQD') }

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown  className="h-4 w-4 text-amber-400" />
  if (rank === 2) return <Medal  className="h-4 w-4 text-foreground/70" />
  if (rank === 3) return <Award  className="h-4 w-4 text-orange-400" />
  return <span className="font-numeric text-xs text-muted-foreground/60">#{rank}</span>
}

function AchievementBar({ pct, color }: { pct: number | null; color: string }) {
  if (pct === null) return <div className="h-1.5 rounded-full bg-secondary/30 text-[9px] text-center text-muted-foreground/30">—</div>
  const capped = Math.min(pct, 150)
  const bg = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? `bg-${color}-500` : 'bg-rose-500'
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px] text-muted-foreground/60">
        <span>{pct.toFixed(0)}%</span>
        <span>{pct >= 100 ? '✓' : ''}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${Math.min(capped, 100)}%` }} />
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground/40">—</span>
  const color = score >= 80 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : score >= 60 ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    : 'text-rose-300 border-rose-500/30 bg-rose-500/10'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Star className="h-2.5 w-2.5" />{score.toFixed(0)}
    </span>
  )
}

/* ─── Employee Card ─────────────────────────────────────────────────────── */

function EmployeeCard({ emp, onSetTarget }: { emp: EmployeePerf; onSetTarget: (emp: EmployeePerf) => void }) {
  const hasTarget = emp.target.sales > 0 || emp.target.revenue > 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl border p-5 ${emp.rank === 1 ? 'border-amber-500/30 ring-1 ring-amber-500/20' : 'border-border/50'}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${emp.rank <= 3 ? 'border-amber-500/25 bg-amber-500/10' : 'border-border/50 bg-secondary/30'}`}>
            <RankIcon rank={emp.rank} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{emp.employee_name}</p>
            <p className="text-[11px] text-muted-foreground/60">{emp.title || 'موظف مبيعات'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={emp.performance_score} />
          <Button variant="ghost" size="sm" onClick={() => onSetTarget(emp)} className="h-7 px-2 text-[11px] border border-border/50 gap-1">
            <Target className="h-3 w-3" />هدف
          </Button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary/20 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground/60">مبيعات</p>
          <p className="font-numeric text-lg font-black text-foreground">{emp.sales_count}</p>
          {hasTarget && <AchievementBar pct={emp.achievement.sales_pct} color="emerald" />}
        </div>
        <div className="rounded-lg bg-secondary/20 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground/60">الإيراد</p>
          <p className="font-numeric text-sm font-black text-emerald-300 mt-0.5">{money(emp.revenue_iqd)}</p>
          {hasTarget && <AchievementBar pct={emp.achievement.revenue_pct} color="emerald" />}
        </div>
        <div className="rounded-lg bg-secondary/20 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground/60">الربح</p>
          <p className="font-numeric text-sm font-black text-violet-300 mt-0.5">{money(emp.profit_iqd)}</p>
          {hasTarget && <AchievementBar pct={emp.achievement.profit_pct} color="violet" />}
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center gap-3 border-t border-border/30 pt-3 text-[11px] text-muted-foreground/60">
        <span>💬 {emp.crm_interactions} تفاعل</span>
        <span>📊 {emp.pipeline_active} في Pipeline</span>
        {emp.total_commission_iqd > 0 && (
          <span className="text-amber-300/70">🎯 {money(emp.total_commission_iqd)} عمولة</span>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Set Target Form ───────────────────────────────────────────────────── */

function SetTargetForm({ emp, period, onClose }: { emp: EmployeePerf; period: string; onClose: () => void }) {
  const [salesCount,  setSalesCount]  = useState(String(emp.target.sales))
  const [revenue,     setRevenue]     = useState(String(emp.target.revenue))
  const [profit,      setProfit]      = useState(String(emp.target.profit))
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: setEmployeeTarget,
    onSuccess: () => { toast.success('تم حفظ الهدف'); qc.invalidateQueries({ queryKey: ['employee-performance'] }); onClose() },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass w-full max-w-sm rounded-xl border border-border/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">تحديد الهدف الشهري</h3>
            <p className="text-[11px] text-muted-foreground">{emp.employee_name} — {period}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/40"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">هدف عدد المبيعات</label>
            <Input type="number" value={salesCount} onChange={e => setSalesCount(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">هدف الإيراد (USD)</label>
            <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">هدف الربح (USD)</label>
            <Input type="number" value={profit} onChange={e => setProfit(e.target.value)} className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({
                employee_id: emp.employee_id, period,
                target_sales_count: parseInt(salesCount) || 0,
                target_revenue: parseFloat(revenue) || 0,
                target_profit:  parseFloat(profit) || 0,
              })}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
            >
              {mutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              حفظ الهدف
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="border border-border/50">إلغاء</Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function EmployeePerformancePage() {
  const today = new Date()
  const [period, setPeriod] = useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`)
  const [targetEmp, setTargetEmp] = useState<EmployeePerf | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['employee-performance', period],
    queryFn:  () => getEmployeePerformance({ period }),
    staleTime: 60_000,
  })

  // Last 6 months for period selector
  const periodOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    return { value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' }) }
  })

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <Trophy className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">أداء الموظفين</h1>
            <p className="text-xs text-muted-foreground">ترتيب المبيعات والإيرادات والعمولات</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 h-9 border-border/50 bg-secondary/30 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{periodOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            <p className="font-numeric text-2xl font-black text-foreground mt-1">{data.summary.total_sales}</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">الإيراد الكلي</p>
            <p className="font-numeric text-sm font-black text-emerald-300 mt-1">{money(data.summary.total_revenue)}</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">الربح الكلي</p>
            <p className="font-numeric text-sm font-black text-violet-300 mt-1">{money(data.summary.total_profit)}</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">الأفضل أداءً</p>
            <p className="text-sm font-bold text-amber-300 mt-1 truncate">{data.summary.best_employee ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Employee cards */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : (data?.employees ?? []).length === 0 ? (
        <div className="glass rounded-xl py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">لا يوجد موظفون نشطون أو لا توجد مبيعات في هذه الفترة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.employees ?? []).map(emp => (
            <EmployeeCard key={emp.employee_id} emp={emp} onSetTarget={setTargetEmp} />
          ))}
        </div>
      )}

      {targetEmp && <SetTargetForm emp={targetEmp} period={period} onClose={() => setTargetEmp(null)} />}
    </div>
  )
}
