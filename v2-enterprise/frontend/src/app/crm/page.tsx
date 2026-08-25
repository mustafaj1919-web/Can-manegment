'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Check, RefreshCw, Car, Phone,
  Clock, ChevronRight, Users, TrendingUp,
  CalendarDays, Share2, Calendar,
} from 'lucide-react'
import {
  getPipeline, createDeal, moveDealStage, deleteDeal,
  type Deal, type PipelineStage,
} from '@/lib/api/crm'
import { getCustomers } from '@/lib/api/customers'
import { getCars } from '@/lib/api/inventory'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

/* ─── Stage groups (mirroring SugarCRM journey sections) ────────────────── */

interface StageGroup {
  id: string
  label: string
  stages: PipelineStage[]
  color: string
  dotColor: string
}

const STAGE_GROUPS: StageGroup[] = [
  { id: 'allocation',   label: 'تخصيص العميل',       stages: ['lead'],                    color: 'border-slate-200 dark:border-slate-700/60',   dotColor: 'bg-blue-400' },
  { id: 'contact',      label: 'التواصل والاهتمام',   stages: ['contacted', 'test_drive'], color: 'border-blue-200 dark:border-blue-700/40',     dotColor: 'bg-violet-400' },
  { id: 'negotiation',  label: 'التفاوض والحجز',      stages: ['negotiating', 'reserved'], color: 'border-violet-200 dark:border-violet-700/40', dotColor: 'bg-amber-400' },
  { id: 'completion',   label: 'الإتمام',             stages: ['won', 'lost'],             color: 'border-emerald-200 dark:border-emerald-700/40', dotColor: 'bg-emerald-400' },
]

const STAGE_LABEL: Record<PipelineStage, string> = {
  lead: 'مهتم', contacted: 'تم التواصل', test_drive: 'تجربة قيادة',
  negotiating: 'تفاوض', reserved: 'محجوز', won: 'مكتمل ✅', lost: 'خسر ❌',
}

const STAGE_ICON: Record<PipelineStage, string> = {
  lead: '🎯', contacted: '📞', test_drive: '🚗',
  negotiating: '🤝', reserved: '📋', won: '✅', lost: '❌',
}

/* ─── Deal card (task-style like SugarCRM) ───────────────────────────────── */

function DealCard({ deal, stage, onMove, onDelete }: {
  deal: Deal
  stage: PipelineStage
  onMove: (s: PipelineStage) => void
  onDelete: () => void
}) {
  const initials = (deal.customer_name ?? '?').charAt(0)
  const isDone   = stage === 'won'
  const isLost   = stage === 'lost'

  return (
    <div className={cn(
      'group flex items-start gap-3 rounded-xl border bg-white dark:bg-slate-900 px-3.5 py-3 shadow-sm transition-all',
      'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700/60',
      isDone ? 'border-emerald-200 dark:border-emerald-700/40' :
      isLost ? 'border-rose-200 dark:border-rose-700/40' :
               'border-slate-200 dark:border-slate-700/50'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black',
        isDone ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
        isLost ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' :
                 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
      )}>
        {initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'truncate text-[13px] font-bold leading-tight',
          isDone ? 'text-emerald-700 dark:text-emerald-300 line-through opacity-70' : 'text-slate-800 dark:text-slate-100'
        )}>
          {deal.customer_name ?? '—'}
        </p>
        {deal.car_name && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
            <Car className="h-2.5 w-2.5 shrink-0" />
            {deal.car_name}
          </p>
        )}
        {deal.expected_price ? (
          <p className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            {formatMoney(deal.expected_price, (deal.currency as 'IQD' | 'USD') ?? 'IQD')}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Days badge */}
        <span className="flex items-center gap-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
          <Clock className="h-2.5 w-2.5" />{deal.days_in_stage}ي
        </span>
        {/* Check button */}
        {!isDone && !isLost && (
          <button
            onClick={() => onMove('won')}
            title="مكتمل"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-500 transition-colors"
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        {/* Calendar */}
        <button className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-300 hover:border-blue-400 hover:text-blue-400 transition-colors">
          <CalendarDays className="h-3 w-3" />
        </button>
        {/* Delete */}
        <button
          onClick={onDelete}
          className="flex h-6 w-6 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

/* ─── Journey Group Column ───────────────────────────────────────────────── */

function JourneyGroup({
  group, byStage, onMove, onDelete, onAdd, isLast,
}: {
  group: StageGroup
  byStage: Record<PipelineStage, Deal[]>
  onMove: (deal: Deal, stage: PipelineStage) => void
  onDelete: (deal: Deal) => void
  onAdd: () => void
  isLast: boolean
}) {
  const deals = group.stages.flatMap(s => (byStage[s] ?? []).map(d => ({ deal: d, stage: s })))

  return (
    <div className="relative flex shrink-0 flex-col" style={{ width: 260 }}>
      {/* Group container */}
      <div className={cn(
        'flex-1 rounded-2xl border-2 bg-slate-50/60 dark:bg-slate-800/30 p-3',
        group.color
      )}>
        {/* Group header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">
            {group.label}
          </span>
          {!isLast && (
            <button
              onClick={onAdd}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Stage sub-labels */}
        {group.stages.length > 1 && (
          <div className="mb-2 flex gap-1 flex-wrap">
            {group.stages.map(s => (
              <span key={s} className="rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                {STAGE_ICON[s]} {STAGE_LABEL[s]}
              </span>
            ))}
          </div>
        )}

        {/* Deal cards */}
        <div className="space-y-2">
          <AnimatePresence>
            {deals.map(({ deal, stage }) => (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <DealCard
                  deal={deal}
                  stage={stage}
                  onMove={(s) => onMove(deal, s)}
                  onDelete={() => onDelete(deal)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Completion group: grid of outcomes */}
          {isLast && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'بيع مكتمل',       count: byStage['won']?.length ?? 0,  color: 'bg-emerald-600 dark:bg-emerald-700 text-white', icon: '✅' },
                { label: 'تسليم السيارة',    count: '',                           color: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700', icon: '🚗' },
                { label: 'تواصل ما بعد البيع', count: '',                         color: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700', icon: '📞' },
                { label: 'صفقات خسرت',       count: byStage['lost']?.length ?? 0, color: 'bg-white dark:bg-slate-800 text-rose-500 border border-rose-200 dark:border-rose-800/40', icon: '❌' },
              ].map(item => (
                <div key={item.label} className={cn('rounded-xl px-3 py-2.5 text-center shadow-sm', item.color)}>
                  <div className="text-base">{item.icon}</div>
                  <p className="mt-1 text-[10px] font-bold leading-tight">{item.label}</p>
                  {item.count !== '' && (
                    <p className="mt-0.5 text-xs font-black opacity-80">{item.count}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {deals.length === 0 && !isLast && (
            <div
              onClick={onAdd}
              className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة صفقة
            </div>
          )}
        </div>
      </div>

      {/* Stage footer label */}
      <p className="mt-2 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">{group.label}</p>

      {/* Connector dots */}
      {!isLast && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <span className={cn('h-2 w-2 rounded-full', group.dotColor)} />
          <span className={cn('h-1.5 w-1.5 rounded-full opacity-50', group.dotColor)} />
          <span className={cn('h-1 w-1 rounded-full opacity-25', group.dotColor)} />
        </div>
      )}
    </div>
  )
}

/* ─── Add Deal Modal ─────────────────────────────────────────────────────── */

function AddDealModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [customerId, setCustomerId] = useState('')
  const [carId,      setCarId]      = useState('')
  const [stage,      setStage]      = useState<PipelineStage>('lead')
  const [price,      setPrice]      = useState('')
  const [notes,      setNotes]      = useState('')

  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => getCustomers({ per_page: 200 }), staleTime: 60_000 })
  const { data: carsData }  = useQuery({ queryKey: ['cars-available'], queryFn: () => getCars({ status: 'available', per_page: 200 }), staleTime: 60_000 })
  const cars = carsData?.items ?? []

  const mutation = useMutation({
    mutationFn: createDeal,
    onSuccess: () => { toast.success('تم إضافة الصفقة'); qc.invalidateQueries({ queryKey: ['pipeline'] }); onClose() },
    onError:   (e) => toast.error(extractApiError(e)),
  })

  const allStages: { value: PipelineStage; label: string }[] = [
    { value: 'lead',        label: '🎯 مهتم' },
    { value: 'contacted',   label: '📞 تم التواصل' },
    { value: 'test_drive',  label: '🚗 تجربة قيادة' },
    { value: 'negotiating', label: '🤝 تفاوض' },
    { value: 'reserved',    label: '📋 محجوز' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">إضافة صفقة جديدة</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">العميل *</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="اختر العميل..." /></SelectTrigger>
              <SelectContent>
                {(customers?.items ?? []).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.full_name || c.name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">السيارة المهتم بها</label>
            <Select value={carId} onValueChange={setCarId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="اختر سيارة..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— بدون سيارة محددة</SelectItem>
                {cars.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.brand} {c.model} {c.manufacturing_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">المرحلة</label>
              <Select value={stage} onValueChange={v => setStage(v as PipelineStage)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allStages.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">السعر المتوقع (د.ع)</label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="h-9" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="تفاصيل..." className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:border-blue-400" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => {
                if (!customerId) { toast.error('اختر العميل'); return }
                mutation.mutate({
                  customer_id:    customerId,
                  car_id:         (carId && carId !== 'none') ? carId : undefined,
                  stage,
                  expected_price: price ? Number(price) : undefined,
                  currency:       'IQD' as const,
                  notes:          notes || undefined,
                })
              }}
              disabled={mutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              size="sm"
            >
              {mutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              إضافة الصفقة
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function CrmPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn:  () => getPipeline(),
    staleTime: 30_000,
  })

  const moveMutation = useMutation({
    mutationFn: ({ deal, stage }: { deal: Deal; stage: PipelineStage }) => moveDealStage(deal.id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
    onError:   (e) => toast.error(extractApiError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (deal: Deal) => deleteDeal(deal.id),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['pipeline'] }) },
    onError:   (e) => toast.error(extractApiError(e)),
  })

  const byStage: Record<PipelineStage, Deal[]> = data?.by_stage ?? { lead: [], contacted: [], test_drive: [], negotiating: [], reserved: [], won: [], lost: [] }

  /* Collect unique customers across all active stages for avatar strip */
  const allActiveDeals = (['lead','contacted','test_drive','negotiating','reserved'] as PipelineStage[])
    .flatMap(s => byStage[s] ?? [])
  const uniqueInitials = [...new Set(allActiveDeals.map(d => (d.customer_name ?? '?').charAt(0)))]

  return (
    <div className="flex flex-col gap-6 pb-10" dir="rtl">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">رحلة العميل</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">تتبع كل عميل من الاهتمام إلى إتمام البيع</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
            <Share2 className="h-3.5 w-3.5" /> مشاركة
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
            <Calendar className="h-3.5 w-3.5" /> جدولة
          </Button>
          <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs">
            <Plus className="h-3.5 w-3.5" /> صفقة جديدة
          </Button>
        </div>
      </div>

      {/* ── Journey Card ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">

        {/* Journey header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">رحلة المبيعات الرئيسية</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{data?.active_deals ?? 0} صفقة نشطة · {data?.total_deals ?? 0} إجمالي</p>
          </div>

          {/* Customer avatar strip */}
          <div className="flex items-center gap-1">
            {isLoading ? null : uniqueInitials.slice(0, 8).map((init, i) => {
              const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-pink-500','bg-indigo-500']
              return (
                <div key={i} className={cn('relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 text-xs font-black text-white shadow-sm', colors[i % colors.length])}>
                  {init}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-black text-white border border-white dark:border-slate-900">
                    {allActiveDeals.filter(d => (d.customer_name ?? '?').charAt(0) === init).length}
                  </span>
                </div>
              )
            })}
            {uniqueInitials.length > 8 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400">
                +{uniqueInitials.length - 8}
              </div>
            )}
            <div className="mr-2 flex gap-1.5">
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                <Calendar className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Journey board */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin ml-2" /> جاري التحميل...
          </div>
        ) : (
          <div className="overflow-x-auto p-5">
            <div className="flex items-stretch gap-6 min-w-max">
              {STAGE_GROUPS.map((group, idx) => (
                <div key={group.id} className="flex items-center gap-6">
                  <JourneyGroup
                    group={group}
                    byStage={byStage}
                    onMove={(deal, stage) => moveMutation.mutate({ deal, stage })}
                    onDelete={(deal) => deleteMutation.mutate(deal)}
                    onAdd={() => setShowAdd(true)}
                    isLast={idx === STAGE_GROUPS.length - 1}
                  />
                  {idx < STAGE_GROUPS.length - 1 && (
                    <div className="flex flex-col items-center gap-1 self-center">
                      <div className="h-px w-8 bg-slate-200 dark:bg-slate-700" />
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stage labels row */}
            <div className="mt-4 flex gap-6 min-w-max border-t border-slate-100 dark:border-slate-800 pt-3">
              {STAGE_GROUPS.map((group, idx) => (
                <div key={group.id} className="flex items-center gap-6" style={{ width: 260 }}>
                  <p className="w-full text-center text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {group.label}
                  </p>
                  {idx < STAGE_GROUPS.length - 1 && <div className="w-14 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'صفقات نشطة',     value: data?.active_deals ?? 0,                               icon: Users,       bg: 'bg-blue-50 dark:bg-blue-950/30',    text: 'text-blue-600 dark:text-blue-400' },
          { label: 'إجمالي متوقع',   value: formatMoney(data?.total_expected_iqd ?? 0, 'IQD'),     icon: TrendingUp,  bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'معدل التحويل',   value: `${(data?.conversion_rate ?? 0).toFixed(0)}%`,         icon: ChevronRight, bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400' },
          { label: 'مكتملة / خسرت', value: `${data?.won_count ?? 0} / ${data?.lost_count ?? 0}`,  icon: Check,       bg: 'bg-amber-50 dark:bg-amber-950/30',   text: 'text-amber-600 dark:text-amber-400' },
        ].map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className={cn('flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4', bg)}>
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bg, text)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
              <p className={cn('mt-0.5 text-lg font-black', text)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddDealModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
