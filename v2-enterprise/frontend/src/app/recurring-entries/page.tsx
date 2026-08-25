'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle, Plus, Play, Trash2, Loader2, RefreshCw,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import {
  getRecurringEntries,
  createRecurringEntry,
  deleteRecurringEntry,
  executeRecurringEntry,
  type RecurringLine,
} from '@/lib/api/recurring-entries'
import { getChartOfAccounts, type ChartAccountNode } from '@/lib/api/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/shared/SectionCard'
import { AccountCombobox } from '@/components/ui/AccountCombobox'
import { toast } from 'sonner'

function flatLeafAccounts(nodes: ChartAccountNode[]) {
  const result: { code: string; name: string }[] = []
  function walk(list: ChartAccountNode[]) {
    for (const n of list) {
      if (!n.children?.length) result.push({ code: n.code ?? '', name: n.name ?? '' })
      else walk(n.children)
    }
  }
  walk(nodes)
  return result
}

interface FormLine {
  accountCode: string
  accountName: string
  isDebit: boolean
  amount: number
  description: string
}

const FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'شهري' },
  { value: 'Quarterly', label: 'ربع سنوي' },
  { value: 'Yearly', label: 'سنوي' },
]

const FREQUENCY_LABELS: Record<string, string> = {
  Monthly: 'شهري',
  Quarterly: 'ربع سنوي',
  Yearly: 'سنوي',
}

function emptyLine(): FormLine {
  return { accountCode: '', accountName: '', isDebit: true, amount: 0, description: '' }
}

export default function RecurringEntriesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('Monthly')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [lines, setLines] = useState<FormLine[]>([emptyLine(), emptyLine()])

  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['recurring-entries'],
    queryFn: getRecurringEntries,
  })

  const { data: coaData } = useQuery({ queryKey: ['coa'], queryFn: getChartOfAccounts, staleTime: 300_000 })
  const leafAccounts = coaData ? flatLeafAccounts(coaData.items) : []

  const createMutation = useMutation({
    mutationFn: () => createRecurringEntry({ name, description, frequency, dayOfMonth, lines }),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إنشاء القيد الدوري')
      qc.invalidateQueries({ queryKey: ['recurring-entries'] })
      resetForm()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'فشل إنشاء القيد الدوري'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurringEntry(id),
    onSuccess: () => {
      toast.success('تم حذف القيد الدوري')
      qc.invalidateQueries({ queryKey: ['recurring-entries'] })
      setDeletingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'فشل الحذف')
      setDeletingId(null)
    },
  })

  const executeMutation = useMutation({
    mutationFn: (id: string) => executeRecurringEntry(id),
    onSuccess: (res, id) => {
      toast.success(res.message || `تم تنفيذ القيد — ${res.entry_number}`)
      qc.invalidateQueries({ queryKey: ['recurring-entries'] })
      setExecutingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'فشل تنفيذ القيد')
      setExecutingId(null)
    },
  })

  function resetForm() {
    setName('')
    setDescription('')
    setFrequency('Monthly')
    setDayOfMonth(1)
    setLines([emptyLine(), emptyLine()])
    setShowForm(false)
  }

  function updateLine(index: number, field: keyof FormLine, value: string | boolean | number) {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  function addLine() {
    setLines(prev => [...prev, emptyLine()])
  }

  function removeLine(index: number) {
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  const totalDebit = lines.filter(l => l.isDebit).reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const totalCredit = lines.filter(l => !l.isDebit).reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const canCreate = name.trim() && lines.length >= 2 && isBalanced && lines.every(l => l.accountCode.trim() && l.amount > 0)

  return (
    <div className="space-y-5 mx-auto max-w-4xl" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">القيود الدورية</h1>
          <p className="text-xs text-muted-foreground">قوالب القيود المحاسبية المتكررة والدورية</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1.5 bg-cyan-600 text-white hover:bg-cyan-500">
            <Plus className="h-3.5 w-3.5" />
            قيد جديد
          </Button>
        </div>
      </div>

      {/* New Template Form */}
      {showForm && (
        <SectionCard title="إنشاء قيد دوري جديد">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">اسم القيد *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: إيجار المستودع الشهري" className="bg-secondary/30" />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">الوصف</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="اختياري..." className="bg-secondary/30" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">التكرار</Label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">يوم التنفيذ من الشهر</Label>
              <Input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} min={1} max={31} className="bg-secondary/30" />
            </div>
          </div>

          {/* Lines Table */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">أسطر القيد</Label>
              <div className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium border',
                isBalanced
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              )}>
                {isBalanced
                  ? <><CheckCircle2 className="h-3 w-3" />متوازن</>
                  : <><XCircle className="h-3 w-3" />غير متوازن — مدين: {formatMoney(totalDebit, 'IQD')} | دائن: {formatMoney(totalCredit, 'IQD')}</>
                }
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20 text-muted-foreground">
                    <th className="px-3 py-2 text-right" colSpan={2}>الحساب</th>
                    <th className="px-3 py-2 text-center">مدين/دائن</th>
                    <th className="px-3 py-2 text-left">المبلغ</th>
                    <th className="px-3 py-2 text-right">البيان</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="px-2 py-1.5" colSpan={2}>
                        <AccountCombobox
                          value={line.accountCode}
                          accounts={leafAccounts}
                          onChange={v => {
                            const acct = leafAccounts.find(a => a.code === v)
                            updateLine(i, 'accountCode', v)
                            if (acct) updateLine(i, 'accountName', acct.name)
                          }}
                          placeholder="اختر الحساب..."
                          className="h-7 text-xs min-w-[200px]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => updateLine(i, 'isDebit', !line.isDebit)}
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors',
                            line.isDebit
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          )}
                        >
                          {line.isDebit ? 'مدين' : 'دائن'}
                        </button>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={line.amount || ''}
                          onChange={e => updateLine(i, 'amount', Number(e.target.value))}
                          placeholder="0"
                          min={0}
                          className="h-7 text-xs bg-secondary/20 w-28 font-numeric"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={line.description}
                          onChange={e => updateLine(i, 'description', e.target.value)}
                          placeholder="بيان..."
                          className="h-7 text-xs bg-secondary/20 w-32"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="text-rose-400/60 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLine}
              className="mt-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              إضافة سطر
            </Button>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/30">
            <Button variant="ghost" size="sm" onClick={resetForm}>إلغاء</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !canCreate}
              className="bg-cyan-600 text-white hover:bg-cyan-500"
            >
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'إنشاء القيد'}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Templates List */}
      <SectionCard title={`القيود الدورية (${templates.length})`}>
        {isLoading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <AlertCircle className="h-7 w-7 text-rose-400/60" />
            <p className="text-sm text-muted-foreground">تعذر التحميل</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-10 text-center">
            <RotateCcw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد قيود دورية — أنشئ أول قيد</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {templates.map(t => (
              <div key={t.id} className="py-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="flex items-center gap-2 min-w-0 text-right"
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        t.is_active
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                          : 'border-border/40 bg-secondary/30 text-muted-foreground'
                      )}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{t.name}</span>
                          <span className={cn(
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium border',
                            t.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-secondary text-muted-foreground border-border/40'
                          )}>
                            {t.is_active ? 'نشط' : 'معطل'}
                          </span>
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] bg-secondary/40 text-muted-foreground border border-border/30">
                            {FREQUENCY_LABELS[t.frequency] ?? t.frequency}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          يوم {t.day_of_month} من كل فترة
                          {t.last_run_at && <> · آخر تنفيذ: {formatDate(t.last_run_at)}</>}
                          {' · '}{t.lines.length} سطر
                        </p>
                      </div>
                      {expandedId === t.id
                        ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                      }
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 mr-3">
                    {/* Execute */}
                    {executingId === t.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-cyan-400">تأكيد التنفيذ؟</span>
                        <Button size="sm" variant="ghost" onClick={() => setExecutingId(null)} className="text-xs h-7">لا</Button>
                        <Button
                          size="sm"
                          onClick={() => executeMutation.mutate(t.id)}
                          disabled={executeMutation.isPending}
                          className="h-7 text-xs bg-cyan-600 text-white hover:bg-cyan-500 gap-1"
                        >
                          {executeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Play className="h-3 w-3" />نعم، نفّذ</>}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExecutingId(t.id)}
                        className="h-7 text-xs gap-1 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20"
                      >
                        <Play className="h-3 w-3" />
                        تنفيذ
                      </Button>
                    )}

                    {/* Delete */}
                    {deletingId === t.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400">حذف؟</span>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)} className="text-xs h-7">لا</Button>
                        <Button
                          size="sm"
                          onClick={() => deleteMutation.mutate(t.id)}
                          disabled={deleteMutation.isPending}
                          className="h-7 text-xs bg-rose-600 text-white hover:bg-rose-500 gap-1"
                        >
                          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'نعم، احذف'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingId(t.id)}
                        className="h-7 w-7 p-0 text-rose-400/60 hover:text-rose-400 border border-rose-500/10 hover:border-rose-500/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded lines */}
                {expandedId === t.id && (
                  <div className="mt-3 rounded-lg border border-border/20 bg-secondary/10 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/20 text-muted-foreground">
                          <th className="px-3 py-2 text-right">الحساب</th>
                          <th className="px-3 py-2 text-center">نوع</th>
                          <th className="px-3 py-2 text-left">المبلغ</th>
                          <th className="px-3 py-2 text-right">البيان</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.lines.map((l, i) => (
                          <tr key={i} className="border-b border-border/10 last:border-0">
                            <td className="px-3 py-2">
                              <p className="font-medium">{l.account_name}</p>
                              <p className="text-muted-foreground">{l.account_code}</p>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-bold border',
                                l.is_debit
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              )}>
                                {l.is_debit ? 'مدين' : 'دائن'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-numeric text-left">{formatMoney(l.amount, 'IQD')}</td>
                            <td className="px-3 py-2 text-muted-foreground">{l.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
