'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Phone, MessageSquare, Car, Mail, CalendarDays,
  Plus, X, Check, RefreshCw, AlertCircle, Clock,
} from 'lucide-react'
import {
  getCrmInteractions, getCrmSummary, createInteraction, updateInteraction, deleteInteraction,
  type InteractionType, type OutcomeType, INTERACTION_ICONS,
} from '@/lib/api/crm'
import { getCustomers } from '@/lib/api/customers'
import { getEmployees } from '@/lib/api/employees'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/api/client'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const TYPE_OPTS: Array<{ value: InteractionType; label: string; icon: string }> = [
  { value: 'call',       label: 'مكالمة هاتفية',  icon: '📞' },
  { value: 'whatsapp',   label: 'واتساب',          icon: '💬' },
  { value: 'visit',      label: 'زيارة للمعرض',    icon: '🏢' },
  { value: 'test_drive', label: 'تجربة قيادة',     icon: '🚗' },
  { value: 'email',      label: 'بريد إلكتروني',   icon: '📧' },
  { value: 'other',      label: 'أخرى',            icon: '📝' },
]

const OUTCOME_OPTS: Array<{ value: OutcomeType; label: string; tone: string }> = [
  { value: 'interested',     label: 'مهتم',           tone: 'text-emerald-400' },
  { value: 'follow_up',      label: 'متابعة لاحقة',   tone: 'text-amber-400' },
  { value: 'not_interested', label: 'غير مهتم',       tone: 'text-rose-400' },
  { value: 'closed',         label: 'أُغلق',          tone: 'text-cyan-400' },
]

/* ─── Stat Card ─────────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, sub, tone }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; tone: string
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-numeric text-2xl font-black text-foreground">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

/* ─── Interaction Card ──────────────────────────────────────────────────── */

function InteractionCard({ item, onDelete }: {
  item: ReturnType<typeof getCrmInteractions> extends Promise<infer T> ? T extends { items: Array<infer I> } ? I : never : never
  onDelete: () => void
}) {
  const typeOpt = TYPE_OPTS.find(t => t.value === item.interaction_type)
  const outcomeOpt = OUTCOME_OPTS.find(o => o.value === item.outcome)
  const isOverdue = item.follow_up_date && new Date(item.follow_up_date) < new Date()

  return (
    <div className="group glass rounded-xl p-4 transition-all hover:ring-1 hover:ring-white/10">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg">
          {typeOpt?.icon ?? '📝'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{item.customer_name}</p>
              <p className="text-[11px] text-muted-foreground">{typeOpt?.label} · {item.interaction_date ? formatDate(item.interaction_date) : '—'}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {outcomeOpt && (
                <span className={`text-[10px] font-medium ${outcomeOpt.tone}`}>{outcomeOpt.label}</span>
              )}
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          {item.notes && <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-2">{item.notes}</p>}
          {item.follow_up_date && (
            <div className={`mt-2 flex items-center gap-1 text-[11px] ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
              <Clock className="h-3 w-3" />
              متابعة: {formatDate(item.follow_up_date)}
              {isOverdue && ' (متأخرة)'}
            </div>
          )}
          {item.employee_name && (
            <p className="mt-1 text-[10px] text-muted-foreground/50">بواسطة: {item.employee_name}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Add Interaction Form ──────────────────────────────────────────────── */

function AddInteractionForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customerId,       setCustomerId]       = useState('')
  const [type,             setType]             = useState<InteractionType>('call')
  const [notes,            setNotes]            = useState('')
  const [outcome,          setOutcome]          = useState<OutcomeType | ''>('')
  const [followUpDate,     setFollowUpDate]     = useState('')
  const [interactionDate,  setInteractionDate]  = useState(new Date().toISOString().slice(0, 10))
  const [employeeId,       setEmployeeId]       = useState('')

  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => getCustomers({ per_page: 200 }), staleTime: 60_000 })
  const { data: employeesData } = useQuery({ queryKey: ['employees-list'], queryFn: () => getEmployees({ per_page: 200 }), staleTime: 60_000 })
  const employees = employeesData?.items ?? []

  const mutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: () => { toast.success('تم تسجيل التفاعل'); onSuccess() },
    onError: (e) => toast.error(extractApiError(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) { toast.error('اختر العميل'); return }
    mutation.mutate({
      customer_id:      parseInt(customerId),
      interaction_type: type,
      notes:            notes || undefined,
      outcome:          (outcome as OutcomeType) || undefined,
      follow_up_date:   followUpDate || undefined,
      interaction_date: interactionDate,
      employee_id:      employeeId ? parseInt(employeeId) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glass w-full max-w-md rounded-xl border border-white/10 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">تسجيل تفاعل جديد</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">العميل *</label>
            <Select value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger className="h-9 border-white/10 bg-white/5"><SelectValue placeholder="اختر العميل..." /></SelectTrigger>
              <SelectContent>
                {(customers?.items ?? []).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.full_name || c.name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">نوع التفاعل</label>
              <Select value={type} onValueChange={v => setType(v as InteractionType)}>
                <SelectTrigger className="h-9 border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTS.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">النتيجة</label>
              <Select value={outcome} onValueChange={v => setOutcome(v as OutcomeType)}>
                <SelectTrigger className="h-9 border-white/10 bg-white/5"><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {OUTCOME_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="ما الذي تم التحدث عنه..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">تاريخ التفاعل</label>
              <Input type="date" value={interactionDate} onChange={e => setInteractionDate(e.target.value)} className="h-9 border-white/10 bg-white/5" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">موعد المتابعة</label>
              <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="h-9 border-white/10 bg-white/5" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">موظف المبيعات</label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9 border-white/10 bg-white/5"><SelectValue placeholder="اختياري" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {employees.map((emp) => <SelectItem key={emp.id} value={String(emp.id)}>{emp.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending} size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white gap-2">
              {mutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              تسجيل التفاعل
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="border border-white/10">إلغاء</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function CrmPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')

  const { data: summary } = useQuery({ queryKey: ['crm-summary'], queryFn: getCrmSummary, staleTime: 60_000 })
  const { data, isLoading } = useQuery({
    queryKey: ['crm-interactions', typeFilter],
    queryFn: () => getCrmInteractions({ type: typeFilter || undefined }),
    staleTime: 30_000,
  })

  const deleteMut = useMutation({
    mutationFn: deleteInteraction,
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['crm-interactions'] }); qc.invalidateQueries({ queryKey: ['crm-summary'] }) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  function handleSuccess() {
    setShowForm(false)
    qc.invalidateQueries({ queryKey: ['crm-interactions'] })
    qc.invalidateQueries({ queryKey: ['crm-summary'] })
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <Users className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">إدارة علاقات العملاء (CRM)</h1>
            <p className="text-xs text-muted-foreground">تتبع كل تفاعل مع عملائك</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs">
          <Plus className="h-3.5 w-3.5" />تفاعل جديد
        </Button>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users}       label="إجمالي العملاء"   value={summary.total_customers}   sub={`+${summary.new_this_month} هذا الشهر`} tone="border-cyan-500/20 bg-cyan-500/10 text-cyan-300" />
          <StatCard icon={MessageSquare} label="تفاعلات الأسبوع"  value={summary.interactions_week} tone="border-violet-500/20 bg-violet-500/10 text-violet-300" />
          <StatCard icon={Clock}        label="متابعات مستحقة"   value={summary.follow_ups_due}    tone={summary.follow_ups_due > 0 ? 'border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'} />
          <StatCard icon={Car}          label="مهتمون حالياً"    value={summary.by_outcome?.interested?.count ?? 0} tone="border-amber-500/20 bg-amber-500/10 text-amber-300" />
        </div>
      )}

      {/* Follow-ups due */}
      {(data?.due_soon ?? []).length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">متابعات مستحقة ({data!.due_soon.length})</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data!.due_soon.map(item => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-base">{INTERACTION_ICONS[item.interaction_type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{item.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.follow_up_date ? formatDate(item.follow_up_date) : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setTypeFilter('')} className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${!typeFilter ? 'border-primary/50 bg-primary/20 text-primary' : 'border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'}`}>الكل</button>
        {TYPE_OPTS.map(t => (
          <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
            className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${typeFilter === t.value ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300' : 'border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Interactions list */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (data?.items ?? []).length === 0 ? (
        <div className="glass rounded-xl py-16 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">لا توجد تفاعلات مسجلة</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-cyan-400 hover:underline">+ سجّل أول تفاعل</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(data?.items ?? []).map(item => (
            <InteractionCard
              key={item.id}
              item={item as any}
              onDelete={() => deleteMut.mutate(item.id)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <AnimatePresence>
        {showForm && <AddInteractionForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />}
      </AnimatePresence>
    </div>
  )
}
