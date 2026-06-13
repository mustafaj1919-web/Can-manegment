'use client'

import { useMemo, useState, type ElementType, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet,
  GitBranch, Layers3, ListTree, Plus, RefreshCw, Scale, Search,
  TrendingDown, TrendingUp, Archive, ArchiveRestore, Pencil, XCircle, Check, X,
} from 'lucide-react'
import {
  getChartOfAccounts, getTrialBalance, createAccount, updateAccount,
  deleteAccount, recomputeAccountBalances,
  type ChartAccountNode, type AccountClassification, type AccountPayload,
  CLASSIFICATION_LABELS,
} from '@/lib/api/accounting'
import { formatMoney } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/api/client'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const TYPE_TONE: Record<string, string> = {
  Asset:     'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  Liability: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  Equity:    'border-violet-500/20 bg-violet-500/10 text-violet-300',
  Income:    'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  Expense:   'border-orange-500/20 bg-orange-500/10 text-orange-300',
}

const CLF_TONE: Record<string, string> = {
  current_asset:       'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  fixed_asset:         'border-sky-400/25 bg-sky-400/10 text-sky-200',
  current_liability:   'border-rose-400/25 bg-rose-400/10 text-rose-200',
  long_term_liability: 'border-red-400/25 bg-red-400/10 text-red-200',
  equity:              'border-violet-400/25 bg-violet-400/10 text-violet-200',
  operating_revenue:   'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  other_revenue:       'border-teal-400/25 bg-teal-400/10 text-teal-200',
  cogs:                'border-amber-400/25 bg-amber-400/10 text-amber-200',
  operating_expense:   'border-orange-400/25 bg-orange-400/10 text-orange-200',
  admin_expense:       'border-yellow-400/25 bg-yellow-400/10 text-yellow-200',
}

const CLF_ORDER: AccountClassification[] = [
  'current_asset', 'fixed_asset',
  'current_liability', 'long_term_liability',
  'equity',
  'operating_revenue', 'other_revenue',
  'cogs', 'operating_expense', 'admin_expense',
]

const ACCOUNT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'Asset',     label: 'موجودات' },
  { value: 'Liability', label: 'مطلوبات' },
  { value: 'Equity',    label: 'حقوق ملكية' },
  { value: 'Income',    label: 'إيرادات' },
  { value: 'Expense',   label: 'مصروفات' },
]

const CLF_OPTIONS: Array<{ value: AccountClassification; label: string }> = CLF_ORDER.map(k => ({
  value: k,
  label: CLASSIFICATION_LABELS[k],
}))

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function matchesSearch(node: ChartAccountNode, q: string): boolean {
  return (node.code ?? '').toLowerCase().includes(q) || (node.name ?? '').toLowerCase().includes(q)
}

function hasMatchInSubtree(node: ChartAccountNode, q: string): boolean {
  if (!q) return true
  if (matchesSearch(node, q)) return true
  return node.children.some(c => hasMatchInSubtree(c, q))
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-numeric text-xl font-black text-foreground">{value.toLocaleString('en-US')}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function TrialCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: ReactNode; tone: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate font-numeric text-lg font-black text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

/* ─── Account Form Dialog ────────────────────────────────────────────────── */

interface AccountFormProps {
  mode: 'add' | 'edit'
  initial?: Partial<AccountPayload & { id: number }>
  allAccounts: Array<{ id: number; code: string; name: string }>
  onClose: () => void
  onSuccess: () => void
}

function AccountFormDialog({ mode, initial, allAccounts, onClose, onSuccess }: AccountFormProps) {
  const [code, setCode]         = useState(initial?.code ?? '')
  const [name, setName]         = useState(initial?.name ?? '')
  const [type, setType]         = useState<string>(initial?.type ?? '')
  const [clf, setClf]           = useState<string>(initial?.classification ?? '')
  const [parentId, setParentId] = useState<string>(String(initial?.parent_id ?? ''))

  const createMut = useMutation({ mutationFn: createAccount, onSuccess: () => { toast.success('تم إضافة الحساب بنجاح'); onSuccess() }, onError: (e) => toast.error(extractApiError(e)) })
  const updateMut = useMutation({ mutationFn: ({ id, ...p }: AccountPayload & { id: number }) => updateAccount(id, p), onSuccess: () => { toast.success('تم تعديل الحساب بنجاح'); onSuccess() }, onError: (e) => toast.error(extractApiError(e)) })

  const isPending = createMut.isPending || updateMut.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: AccountPayload = {
      code: code.trim(),
      name: name.trim(),
      type: type as AccountPayload['type'],
      classification: (clf as AccountClassification) || undefined,
      parent_id: parentId ? Number(parentId) : null,
    }
    if (mode === 'add') {
      createMut.mutate(payload)
    } else if (initial?.id) {
      updateMut.mutate({ id: initial.id, ...payload })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="glass w-full max-w-md rounded-xl border border-border/50 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{mode === 'add' ? 'إضافة حساب جديد' : 'تعديل الحساب'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">رمز الحساب <span className="text-rose-400">*</span></label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="111001" required className="h-9 border-border/50 bg-secondary/30 font-numeric" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">نوع الحساب <span className="text-rose-400">*</span></label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">اسم الحساب <span className="text-rose-400">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الحساب بالعربية" required className="h-9 border-border/50 bg-secondary/30" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">الحساب الأب</label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue placeholder="بدون أب (حساب رئيسي)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">بدون أب (حساب رئيسي)</SelectItem>
                {allAccounts.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">التصنيف المحاسبي</label>
            <Select value={clf} onValueChange={setClf}>
              <SelectTrigger className="h-9 border-border/50 bg-secondary/30"><SelectValue placeholder="بدون تصنيف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">بدون تصنيف</SelectItem>
                {CLF_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white">
              {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {mode === 'add' ? 'إضافة الحساب' : 'حفظ التعديلات'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="border border-border/50">إلغاء</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ─── Tree Row ───────────────────────────────────────────────────────────── */

interface TreeRowProps {
  node: ChartAccountNode
  depth: number
  search: string
  expanded: Set<number>
  onToggle: (id: number) => void
  onEdit: (node: ChartAccountNode) => void
  onDelete: (node: ChartAccountNode) => void
  onReactivate: (node: ChartAccountNode) => void
  onAddChild: (node: ChartAccountNode) => void
}

function TreeRow({ node, depth, search, expanded, onToggle, onEdit, onDelete, onReactivate, onAddChild }: TreeRowProps) {
  const hasChildren = node.children.length > 0
  const isExpanded  = expanded.has(node.id)
  const query       = search.trim().toLowerCase()
  const isMatch     = query ? matchesSearch(node, query) : false

  const debit   = node.subtree_debit   ?? node.debit
  const credit  = node.subtree_credit  ?? node.credit
  const balance = node.subtree_balance ?? node.balance
  const clfTone = CLF_TONE[node.classification] ?? 'border-border/50 bg-secondary/30 text-muted-foreground'

  const visibleChildren = query
    ? node.children.filter(c => hasMatchInSubtree(c, query))
    : node.children

  return (
    <>
      <tr
        className={`border-b border-border/40 transition-colors ${
          !node.is_active ? 'bg-slate-500/[0.06] opacity-65' : isMatch ? 'bg-cyan-500/[0.06]' : 'hover:bg-secondary/50'
        }`}
      >
        {/* Code */}
        <td className="px-5 py-2.5 font-numeric text-xs font-bold text-cyan-300 whitespace-nowrap">{node.code}</td>

        {/* Name + tree indent */}
        <td className="px-5 py-2.5">
          <div className="flex items-center gap-1.5" style={{ paddingRight: depth * 20 }}>
            {hasChildren ? (
              <button
                onClick={() => onToggle(node.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="h-5 w-5 shrink-0" />
            )}
            <span className={`text-sm font-medium ${depth === 0 ? 'text-foreground' : 'text-foreground/85'}`}>
              {node.name}
            </span>
            {!node.is_active && (
              <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 text-[10px] text-foreground/70">
                مؤرشف
              </span>
            )}
            {hasChildren && (
              <span className="rounded-full bg-secondary/30 px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0">
                {node.children_count}
              </span>
            )}
          </div>
        </td>

        {/* Level */}
        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{node.level}</td>

        {/* Type */}
        <td className="px-4 py-2.5 whitespace-nowrap">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${TYPE_TONE[node.type] ?? 'border-border/50 bg-secondary/30'}`}>
            {node.type_label}
          </span>
        </td>

        {/* Classification */}
        <td className="px-4 py-2.5 whitespace-nowrap">
          {node.classification_label ? (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${clfTone}`}>
              {node.classification_label}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/40">—</span>
          )}
        </td>

        {/* Debit */}
        <td className="px-4 py-2.5 text-left font-numeric text-xs text-muted-foreground">{formatMoney(debit, 'IQD')}</td>

        {/* Credit */}
        <td className="px-4 py-2.5 text-left font-numeric text-xs text-muted-foreground">{formatMoney(credit, 'IQD')}</td>

        {/* Balance */}
        <td className={`px-4 py-2.5 text-left font-numeric text-xs font-bold ${balance < 0 ? 'text-rose-400' : 'text-foreground'}`}>
          {formatMoney(balance, 'IQD')}
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity [tr:hover_&]:opacity-100">
            {node.is_active && (
              <button onClick={() => onAddChild(node)} title="إضافة حساب فرعي" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors">
                <Plus className="h-3 w-3" />
              </button>
            )}
            {node.is_active && (
              <button onClick={() => onEdit(node)} title="تعديل" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {!hasChildren && node.is_active && (
              <button onClick={() => onDelete(node)} title="أرشفة" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-400/10 transition-colors">
                <Archive className="h-3 w-3" />
              </button>
            )}
            {!node.is_active && (
              <button onClick={() => onReactivate(node)} title="إعادة تفعيل" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
                <ArchiveRestore className="h-3 w-3" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Children */}
      <AnimatePresence initial={false}>
        {(isExpanded || !!query) && visibleChildren.map(child => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            search={search}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onReactivate={onReactivate}
            onAddChild={onAddChild}
          />
        ))}
      </AnimatePresence>
    </>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [activeClf, setActiveClf] = useState<string>('')
  const [expanded, setExpanded]   = useState<Set<number>>(new Set())
  const [dialog, setDialog]       = useState<null | { mode: 'add' | 'edit'; initial?: Partial<AccountPayload & { id: number }> }>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChartAccountNode | null>(null)

  const { data, isLoading, isError } = useQuery({ queryKey: ['chart-of-accounts'], queryFn: getChartOfAccounts, staleTime: 60_000, retry: 1 })
  const { data: trialBalance, isLoading: isTrialLoading } = useQuery({ queryKey: ['trial-balance'], queryFn: getTrialBalance, staleTime: 60_000, retry: 1 })

  const deleteMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { toast.success('تمت أرشفة الحساب بنجاح'); setDeleteTarget(null); qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }); qc.invalidateQueries({ queryKey: ['trial-balance'] }) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const reactivateMut = useMutation({
    mutationFn: (id: number) => updateAccount(id, { is_active: true }),
    onSuccess: () => { toast.success('تمت إعادة تفعيل الحساب'); qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const recomputeMut = useMutation({
    mutationFn: recomputeAccountBalances,
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }); qc.invalidateQueries({ queryKey: ['trial-balance'] }) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const allFlatAccounts = useMemo(
    () => (data?.flat ?? []).filter(a => a.is_active).map(a => ({ id: a.id, code: a.code, name: a.name })),
    [data?.flat],
  )

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll() {
    const allIds = (data?.flat ?? []).filter(a => a.children_count > 0).map(a => a.id)
    setExpanded(new Set(allIds))
  }

  function collapseAll() { setExpanded(new Set()) }

  const isBalanced = trialBalance?.status === 'balanced'

  const clfOptions = useMemo(() => {
    if (!data?.classification_summary) return []
    return CLF_ORDER.filter(k => data.classification_summary[k])
  }, [data?.classification_summary])

  // Filter roots by classification when active
  const visibleRoots = useMemo(() => {
    const items = data?.items ?? []
    if (!activeClf) return items
    function nodeHasClf(node: ChartAccountNode): boolean {
      if (node.classification === activeClf) return true
      return node.children.some(nodeHasClf)
    }
    return items.filter(nodeHasClf)
  }, [data?.items, activeClf])

  const query = search.trim().toLowerCase()

  function handleDialogSuccess() {
    setDialog(null)
    qc.invalidateQueries({ queryKey: ['chart-of-accounts'] })
    qc.invalidateQueries({ queryKey: ['trial-balance'] })
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <ListTree className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">دليل الحسابات</h1>
            <p className="text-xs text-muted-foreground">شجرة محاسبية سداسية مع تصانيف مالية احترافية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => recomputeMut.mutate()} disabled={recomputeMut.isPending} className="gap-2 border border-border/50 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${recomputeMut.isPending ? 'animate-spin' : ''}`} />
            إعادة حساب الأرصدة
          </Button>
          <Button size="sm" onClick={() => setDialog({ mode: 'add' })} className="gap-2 bg-cyan-600 text-white hover:bg-cyan-500 text-xs">
            <Plus className="h-3.5 w-3.5" />
            حساب جديد
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالرمز أو اسم الحساب..." className="h-10 border-border/50 bg-secondary/30 pr-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-[520px] rounded-lg" />
        </div>
      ) : isError || !data ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل دليل الحسابات</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={FileSpreadsheet} label="إجمالي الحسابات" value={data.total}          tone="border-cyan-500/20 bg-cyan-500/10 text-cyan-300" />
            <StatCard icon={Layers3}        label="حسابات رئيسية"   value={data.summary.main}   tone="border-violet-500/20 bg-violet-500/10 text-violet-300" />
            <StatCard icon={GitBranch}      label="حسابات فرعية"    value={data.summary.branch} tone="border-amber-500/20 bg-amber-500/10 text-amber-300" />
            <StatCard icon={ListTree}       label="حسابات تفصيلية"  value={data.summary.detail} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300" />
          </div>

          {/* Trial balance cards */}
          {isTrialLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
          ) : trialBalance ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TrialCard icon={TrendingUp}                          label="إجمالي المدين" value={formatMoney(trialBalance.total_debit, 'IQD')}  tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300" />
              <TrialCard icon={TrendingDown}                        label="إجمالي الدائن" value={formatMoney(trialBalance.total_credit, 'IQD')} tone="border-rose-500/20 bg-rose-500/10 text-rose-300" />
              <TrialCard icon={Scale}                               label="الفرق"          value={formatMoney(trialBalance.difference, 'IQD')}   tone="border-cyan-500/20 bg-cyan-500/10 text-cyan-300" />
              <TrialCard icon={isBalanced ? CheckCircle2 : XCircle} label="الحالة"         value={isBalanced ? 'متوازن' : 'غير متوازن'}          tone={isBalanced ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'} />
            </div>
          ) : null}

          {/* Classification summary */}
          {data.classification_summary && Object.keys(data.classification_summary).length > 0 && (
            <div className="glass overflow-hidden rounded-lg">
              <div className="border-b border-border/50 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-foreground">تصانيف الحسابات</h2>
              </div>
              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-white/[0.04] sm:grid-cols-3 lg:grid-cols-5">
                {CLF_ORDER.filter(k => data.classification_summary[k]).map(key => {
                  const entry = data.classification_summary[key]
                  const tone  = CLF_TONE[key] ?? 'border-border/50 bg-secondary/30 text-foreground/70'
                  return (
                    <div key={key} className="flex flex-col gap-1 p-4">
                      <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>{entry.label}</span>
                      <p className="mt-1 font-numeric text-base font-black text-foreground">{formatMoney(Math.abs(entry.balance), 'IQD')}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.count} حساب</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filter pills */}
          {clfOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">تصفية:</span>
              <button onClick={() => setActiveClf('')} className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${activeClf === '' ? 'border-primary/50 bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-border/60 hover:text-foreground'}`}>الكل</button>
              {clfOptions.map(key => (
                <button key={key} onClick={() => setActiveClf(activeClf === key ? '' : key)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${activeClf === key ? (CLF_TONE[key] ?? 'border-primary/50 bg-primary/20 text-primary') : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-border/60 hover:text-foreground'}`}>
                  {CLASSIFICATION_LABELS[key as AccountClassification]}
                </button>
              ))}
            </div>
          )}

          {/* Tree table */}
          <div className="glass overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">الشجرة المحاسبية</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {query || activeClf ? `نتائج الفلترة` : 'انقر على السهم لتوسيع الحسابات'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={expandAll}   className="rounded-lg border border-border/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">توسيع الكل</button>
                <button onClick={collapseAll} className="rounded-lg border border-border/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">طي الكل</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20 text-xs text-muted-foreground">
                    <th className="px-5 py-3 text-right">رمز الحساب</th>
                    <th className="px-5 py-3 text-right">اسم الحساب</th>
                    <th className="px-4 py-3 text-right">المستوى</th>
                    <th className="px-4 py-3 text-right">النوع</th>
                    <th className="px-4 py-3 text-right">التصنيف</th>
                    <th className="px-4 py-3 text-left">مدين</th>
                    <th className="px-4 py-3 text-left">دائن</th>
                    <th className="px-4 py-3 text-left">الرصيد</th>
                    <th className="px-3 py-3 text-right w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRoots.map(node => (
                    <TreeRow
                      key={node.id}
                      node={node}
                      depth={0}
                      search={search}
                      expanded={expanded}
                      onToggle={toggleExpand}
                      onEdit={(n) => setDialog({ mode: 'edit', initial: { id: n.id, code: n.code, name: n.name, type: n.type, classification: n.classification, parent_id: n.parent_id } })}
                      onDelete={setDeleteTarget}
                      onReactivate={(n) => reactivateMut.mutate(n.id)}
                      onAddChild={(n) => setDialog({ mode: 'add', initial: { parent_id: n.id, type: n.type } })}
                    />
                  ))}
                  {visibleRoots.length === 0 && (
                    <tr><td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">لا توجد نتائج</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Account Form Dialog */}
      <AnimatePresence>
        {dialog && (
          <AccountFormDialog
            mode={dialog.mode}
            initial={dialog.initial}
            allAccounts={allFlatAccounts}
            onClose={() => setDialog(null)}
            onSuccess={handleDialogSuccess}
          />
        )}
      </AnimatePresence>

      {/* Archive Confirm Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass w-full max-w-sm rounded-xl border border-border/50 p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                <Archive className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="mb-1.5 text-sm font-bold text-foreground">أرشفة الحساب</h3>
              <p className="mb-5 text-xs text-muted-foreground">هل تريد أرشفة الحساب <span className="font-semibold text-foreground">{deleteTarget.code} — {deleteTarget.name}</span>؟ سيبقى الحساب وسجله المحاسبي محفوظين ويمكن إعادة تفعيله لاحقاً.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteTarget.id)} className="flex-1">
                  {deleteMut.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'أرشفة'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1 border border-border/50">إلغاء</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
