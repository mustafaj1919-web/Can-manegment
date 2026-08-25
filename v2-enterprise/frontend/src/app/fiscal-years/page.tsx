'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Lock, Plus, Calendar, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getFiscalYears, createFiscalYear, closeFiscalYear } from '@/lib/api/fiscal-years'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/shared/SectionCard'
import { toast } from 'sonner'

export default function FiscalYearsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)

  // Form state
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`)
  const [notes, setNotes] = useState('')

  const { data: years = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: getFiscalYears,
  })

  const createMutation = useMutation({
    mutationFn: () => createFiscalYear({ year: Number(year), startDate, endDate, notes: notes || undefined }),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إنشاء السنة المالية')
      qc.invalidateQueries({ queryKey: ['fiscal-years'] })
      setShowForm(false)
      setNotes('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'فشل إنشاء السنة المالية'),
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeFiscalYear(id),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إقفال السنة المالية')
      qc.invalidateQueries({ queryKey: ['fiscal-years'] })
      setClosingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'فشل إقفال السنة المالية')
      setClosingId(null)
    },
  })

  return (
    <div className="space-y-5 mx-auto max-w-3xl" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">السنوات المالية</h1>
          <p className="text-xs text-muted-foreground">إدارة الفترات والسنوات المالية وإقفالها</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1.5 bg-cyan-600 text-white hover:bg-cyan-500">
            <Plus className="h-3.5 w-3.5" />
            سنة جديدة
          </Button>
        </div>
      </div>

      {/* New Year Form */}
      {showForm && (
        <SectionCard title="إنشاء سنة مالية جديدة">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">السنة *</Label>
              <Input
                type="number"
                value={year}
                onChange={e => {
                  setYear(e.target.value)
                  setStartDate(`${e.target.value}-01-01`)
                  setEndDate(`${e.target.value}-12-31`)
                }}
                className="bg-secondary/30"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ البداية *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary/30" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ النهاية *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-secondary/30" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary/30" placeholder="اختياري..." />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !year} className="bg-cyan-600 text-white">
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'إنشاء'}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* List */}
      <SectionCard title={`السنوات المالية (${years.length})`}>
        {isLoading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <AlertCircle className="h-7 w-7 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر التحميل</p>
          </div>
        ) : years.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد سنوات مالية — أنشئ أول سنة</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {years.map(fy => (
              <div key={fy.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold',
                    fy.status === 'Open'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-border/40 bg-secondary/30 text-muted-foreground'
                  )}>
                    {fy.year}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">السنة المالية {fy.year}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        fy.status === 'Open'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-secondary text-muted-foreground border border-border/40'
                      )}>
                        {fy.status === 'Open' ? 'مفتوحة' : 'مغلقة'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(fy.start_date)} ← {formatDate(fy.end_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fy.status === 'Open' && (
                    closingId === fy.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400">تأكيد الإقفال؟</span>
                        <Button size="sm" variant="ghost" onClick={() => setClosingId(null)} className="text-xs h-7">لا</Button>
                        <Button
                          size="sm"
                          onClick={() => closeMutation.mutate(fy.id)}
                          disabled={closeMutation.isPending}
                          className="h-7 text-xs bg-rose-600 text-white hover:bg-rose-500 gap-1"
                        >
                          {closeMutation.isPending
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <><Lock className="h-3 w-3" />نعم، أقفل</>
                          }
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setClosingId(fy.id)}
                        className="h-7 text-xs gap-1 text-amber-400 hover:text-amber-300 border border-amber-500/20"
                      >
                        <Lock className="h-3 w-3" />
                        إقفال السنة
                      </Button>
                    )
                  )}
                  {fy.status === 'Closed' && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60" />
                      مغلقة
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
