'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Plus, X, Check, RefreshCw, ChevronRight,
  User, Car as CarIcon, AlertTriangle,
} from 'lucide-react'
import {
  getPipeline, createDeal, moveDealStage, deleteDeal,
  STAGE_LABELS, STAGE_TONE,
  type Deal, type PipelineStage,
} from '@/lib/api/crm'
import { getCustomers } from '@/lib/api/customers'
import { getAvailableCars } from '@/lib/api/sales'
import { getEmployees } from '@/lib/api/employees'
import { cn, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/api/client'

const STAGES: PipelineStage[] = ['lead', 'contacted', 'test_drive', 'negotiating', 'reserved', 'won', 'lost']

const STAGE_HEADER: Record<PipelineStage, string> = {
  lead:        'border-slate-500/30  bg-slate-500/[0.06]',
  contacted:   'border-cyan-500/30   bg-cyan-500/[0.06]',
  test_drive:  'border-violet-500/30 bg-violet-500/[0.06]',
  negotiating: 'border-amber-500/30  bg-amber-500/[0.06]',
  reserved:    'border-orange-500/30 bg-orange-500/[0.06]',
  won:         'border-emerald-500/30 bg-emerald-500/[0.06]',
  lost:        'border-rose-500/30   bg-rose-500/[0.06]',
}

function money(v: number) { return formatMoney(v, 'IQD') }

/* ─── Deal Card ─────────────────────────────────────────────────────────── */

function DealCard({ deal, onMove, onDelete }: {
  deal: Deal
  onMove: (stage: PipelineStage) => void
  onDelete: () => void
}) {
  const [showMove, setShowMove] = useState(false)
  const tone = STAGE_TONE[deal.stage]
  const nextStages = STAGES.filter(s => s !== deal.stage && s !== 'lost')

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="group glass rounded-xl border border-border/50 p-3.5 hover:border-border/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <p className="text-sm font-semibold text-foreground truncate">{deal.customer_name}</p>
          </div>
          {deal.customer_phone && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 mr-4">{deal.customer_phone}</p>
          )}
          {deal.car_name && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <CarIcon className="h-3 w-3 text-violet-400/60 shrink-0" />
              <p className="text-[11px] text-violet-300/80 truncate">{deal.car_name}</p>
            </div>
          )}
          {deal.expected_price && (
            <p className="mt-1 text-xs font-numeric font-semibold text-amber-300">
              {deal.expected_price.toLocaleString()} {deal.currency}
            </p>
          )}
          {deal.assigned_name && (
            <p className="mt-1 text-[10px] text-muted-foreground/50">👤 {deal.assigned_name}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button onClick={onDelete} aria-label="حذف الصفقة" className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-rose-400 transition-all">
            <X className="h-3 w-3" />
          </button>
          {deal.days_in_stage > 7 && (
            <span className="text-[9px] text-amber-400/70">{deal.days_in_stage}ي</span>
          )}
        </div>
      </div>

      {deal.notes && (
        <p className="mt-2 text-[11px] text-muted-foreground/70 line-clamp-2 border-t border-border/30 pt-2">{deal.notes}</p>
      )}

      {/* Move buttons */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {STAGES.filter(s => s !== deal.stage).slice(0, 3).map(s => (
          <button key={s} onClick={() => onMove(s)}
            className={`rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors ${STAGE_TONE[s]} opacity-60 hover:opacity-100`}>
            → {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── Add Deal Form ─────────────────────────────────────────────────────── */

function AddDealForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customerId,     setCustomerId]     = useState('')
  const [carId,          setCarId]          = useState('')
  const [assignedId,     setAssignedId]     = useState('')
  const [expectedPrice,  setExpectedPrice]  = useState('')
  const [currency,       setCurrency]       = useState('USD')
  const [notes,          setNotes]          = useState('')
  const [stage,          setStage]          = useState<PipelineStage>('lead')

  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => getCustomers({ per_page: 200 }), staleTime: 60_000 })
  const { data: cars       } = useQuery({ queryKey: ['available-cars'], queryFn: getAvailableCars, staleTime: 60_000 })
  const { data: employeesData } = useQuery({ queryKey: ['employees-list'], queryFn: () => getEmployees({ per_page: 200 }), staleTime: 60_000 })
  const employees = employeesData?.items ?? []

  const mutation = useMutation({
    mutationFn: createDeal,
    onSuccess: () => { toast.success('تمت إضافة الصفقة'); onSuccess() },
    onError: (e) => toast.error(extractApiError(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) { toast.error('اختر العميل'); return }
    mutation.mutate({
      customer_id:     customerId,
      car_id:          carId || undefined,
      assigned_to_id:  assignedId || undefined,
      expected_price:  expectedPrice ? parseFloat(expectedPrice) : undefined,
      currency,
      notes:           notes || undefined,
      stage,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass w-full max-w-md rounded-xl border border-border/50 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">صفقة جديدة في Pipeline</h3>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/40"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">العميل *</label>
            <Select value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue placeholder="اختر العميل..." /></SelectTrigger>
              <SelectContent>{(customers?.items ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.full_name || c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">المرحلة</label>
            <Select value={stage} onValueChange={v => setStage(v as PipelineStage)}>
              <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.filter(s => s !== 'won' && s !== 'lost').map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">السيارة المهتم بها</label>
            <Select value={carId} onValueChange={setCarId}>
              <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue placeholder="اختياري" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {(cars ?? []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.brand} {c.model} {c.manufacturing_year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">السعر المتوقع</label>
              <input type="number" value={expectedPrice} onChange={e => setExpectedPrice(e.target.value)} placeholder="0" className="h-9 w-full rounded-lg border border-border/50 bg-secondary/30 px-3 text-xs text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">العملة</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">الموظف المسؤول</label>
            <Select value={assignedId} onValueChange={setAssignedId}>
              <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue placeholder="اختياري" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {employees.map(emp => <SelectItem key={emp.id} value={String(emp.id)}>{emp.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="deal-notes" className="mb-1.5 block text-xs text-muted-foreground">ملاحظات</label>
            <textarea id="deal-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs resize-none focus:outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={mutation.isPending} size="sm" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
              {mutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              إضافة للـ Pipeline
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="border border-border/50">إلغاء</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

import { FeatureUnavailable } from '@/components/ui/FeatureUnavailable'

/* ─── Main Page ─────────────────────────────────────────────────────────── */

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function PipelinePage() {
  const qc = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterEmployee, setFilterEmployee] = useState<string>('all')

  const { data: employeesData } = useQuery({ queryKey: ['employees-list'], queryFn: () => getEmployees({ per_page: 200 }), staleTime: 60_000 })
  const employees = employeesData?.items ?? []

  const { data: pipelineData, isLoading, refetch } = useQuery({
    queryKey: ['pipeline', filterEmployee],
    queryFn: () => getPipeline(filterEmployee === 'all' ? {} : { employee_id: filterEmployee }),
    staleTime: 30_000,
  })

  const moveMutation = useMutation({
    mutationFn: ({ dealId, stage }: { dealId: string | number; stage: PipelineStage }) => 
      moveDealStage(dealId, stage),
    onSuccess: () => {
      toast.success('تم نقل الصفقة بنجاح')
      refetch()
    },
    onError: (e) => toast.error(extractApiError(e))
  })

  const deleteMutation = useMutation({
    mutationFn: (dealId: string | number) => deleteDeal(dealId),
    onSuccess: () => {
      toast.success('تم حذف الصفقة')
      refetch()
    },
    onError: (e) => toast.error(extractApiError(e))
  })

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    const dealId = e.dataTransfer.getData('dealId')
    if (dealId) {
      moveMutation.mutate({ dealId, stage: targetStage })
    }
  }

  const dealStagesData = (pipelineData?.by_stage ?? {}) as Record<PipelineStage, Deal[]>

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <TrendingUp className="h-6 w-6 text-violet-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-family-cairo">خط أنابيب الصفقات والمبيعات (CRM Pipeline)</h1>
            <p className="text-xs text-muted-foreground">قم بسحب وإفلات الصفقات بين المراحل لتحديث حالتها فورياً.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Employee Filter */}
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="h-10 w-44 border-border/50 bg-secondary/30 text-xs font-semibold rounded-xl text-white">
              <SelectValue placeholder="تصفية بالمسؤول..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المسؤولين</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={String(emp.id)}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setShowAddForm(true)} 
            size="sm" 
            className="gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-lg shadow-violet-600/25 active:scale-95"
          >
            <Plus className="h-4 w-4" /> صفقة جديدة
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {STAGES.map((s, idx) => (
            <div key={idx} className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin select-none">
          {STAGES.map((stage) => {
            const deals = (dealStagesData[stage] ?? []) as Deal[]
            const totalSum = deals.reduce((sum, d) => sum + (d.expected_price ?? 0), 0)
            
            return (
              <div 
                key={stage}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                className={cn(
                  "flex-1 min-w-[280px] max-w-[320px] flex flex-col rounded-2xl border bg-black/20 p-4 transition-all duration-300",
                  STAGE_HEADER[stage]
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", 
                      stage === 'lead' && 'bg-slate-400',
                      stage === 'contacted' && 'bg-cyan-400',
                      stage === 'test_drive' && 'bg-violet-400',
                      stage === 'negotiating' && 'bg-amber-400',
                      stage === 'reserved' && 'bg-orange-400',
                      stage === 'won' && 'bg-emerald-400',
                      stage === 'lost' && 'bg-rose-400'
                    )} />
                    <h3 className="text-xs font-black text-white font-family-cairo">{STAGE_LABELS[stage]}</h3>
                    <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-black text-muted-foreground">
                      {deals.length}
                    </span>
                  </div>
                  {totalSum > 0 && (
                    <span className="text-[10px] font-numeric font-black text-white/90">
                      {totalSum.toLocaleString()} د.ع
                    </span>
                  )}
                </div>

                {/* Deals List */}
                <div className="flex-1 space-y-3 min-h-[300px] overflow-y-auto scrollbar-none">
                  {deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-44 rounded-xl border border-dashed border-border/20 text-center p-4">
                      <span className="text-[10px] text-muted-foreground/40 font-family-cairo">اسحب الصفقات إلى هنا</span>
                    </div>
                  ) : (
                    deals.map((deal) => (
                      <div 
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, String(deal.id))}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <DealCard 
                          deal={deal}
                          onMove={(newStage) => moveMutation.mutate({ dealId: deal.id, stage: newStage })}
                          onDelete={() => deleteMutation.mutate(deal.id)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddForm && (
        <AddDealForm 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => { setShowAddForm(false); refetch() }}
        />
      )}
    </div>
  )
}
