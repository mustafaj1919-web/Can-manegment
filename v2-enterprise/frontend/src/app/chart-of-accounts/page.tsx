'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getChartOfAccounts, getTrialBalance, deleteAccount,
  updateAccount, recomputeAccountBalances, ChartAccountNode, AccountPayload
} from '@/lib/api/accounting'
import { exportXlsx } from '@/lib/export'
import { extractApiError } from '@/lib/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Archive, RefreshCw } from 'lucide-react'

import { ChartOfAccountsPageHeader } from '@/components/accounting/chart-of-accounts/ChartOfAccountsPageHeader'
import { AccountingSummaryStrip } from '@/components/accounting/chart-of-accounts/AccountingSummaryStrip'
import { ChartOfAccountsToolbar, TableDensity } from '@/components/accounting/chart-of-accounts/ChartOfAccountsToolbar'
import { AccountTreeGrid } from '@/components/accounting/chart-of-accounts/AccountTreeGrid'
import { AccountDetailsDrawer } from '@/components/accounting/chart-of-accounts/AccountDetailsDrawer'
import { AccountFormModal } from '@/components/accounting/chart-of-accounts/AccountFormModal'

function hasMatchInSubtree(node: ChartAccountNode, q: string): boolean {
  if (!q) return true
  const codeMatch = (node.code ?? '').toLowerCase().includes(q)
  const nameMatch = (node.name ?? '').toLowerCase().includes(q)
  if (codeMatch || nameMatch) return true
  return node.children ? node.children.some(c => hasMatchInSubtree(c, q)) : false
}

function collectMatchingAncestorIds(nodes: ChartAccountNode[], query: string): Set<number> {
  const result = new Set<number>()
  const q = query.trim().toLowerCase()
  if (!q) return result

  function searchInNode(node: ChartAccountNode): boolean {
    const isSelfMatch = (node.code ?? '').toLowerCase().includes(q) || (node.name ?? '').toLowerCase().includes(q)
    let childMatch = false

    if (node.children) {
      for (const child of node.children) {
        if (searchInNode(child)) {
          childMatch = true
        }
      }
    }

    if (isSelfMatch || childMatch) {
      if (node.children_count > 0 || (node.children && node.children.length > 0)) {
        result.add(node.id)
      }
      return true
    }
    return false
  }

  for (const node of nodes) {
    searchInNode(node)
  }

  return result
}

export default function ChartOfAccountsPage() {
  const qc = useQueryClient()

  // State Declarations
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [clfFilter, setClfFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [onlyWithBalance, setOnlyWithBalance] = useState(false)
  const [density, setDensity] = useState<TableDensity>('standard')
  const [columnsVisibility, setColumnsVisibility] = useState<Record<string, boolean>>({
    level: true,
    type: true,
    classification: true,
    debit: true,
    credit: true,
    balance: true,
    status: true,
  })

  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [selectedAccount, setSelectedAccount] = useState<ChartAccountNode | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dialog, setDialog] = useState<null | { mode: 'add' | 'edit'; initial?: Partial<AccountPayload> }>(null)
  const [archiveTarget, setArchiveTarget] = useState<ChartAccountNode | null>(null)
  const [lastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('ar-IQ'))

  // React Query Fetchers
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: getChartOfAccounts,
    staleTime: 60_000,
  })

  const { data: trialBalance, isLoading: isTrialLoading } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => getTrialBalance(),
    staleTime: 60_000,
  })

  // Initial Tree Expansion Strategy: Expand Root Accounts ONLY (depth 0)
  useEffect(() => {
    if (data?.items && expanded.size === 0) {
      const rootIds = data.items.map(item => item.id)
      setExpanded(new Set(rootIds))
    }
  }, [data?.items])

  // Search Auto-Expansion: Expand all ancestor nodes when searching, restore default when search is cleared
  useEffect(() => {
    if (searchQuery.trim() && data?.items) {
      const ancestorIds = collectMatchingAncestorIds(data.items, searchQuery)
      setExpanded(prev => {
        const next = new Set(prev)
        ancestorIds.forEach(id => next.add(id))
        return next
      })
    } else if (!searchQuery.trim() && data?.items) {
      const rootIds = data.items.map(item => item.id)
      setExpanded(new Set(rootIds))
    }
  }, [searchQuery, data?.items])

  // Mutations
  const recomputeMut = useMutation({
    mutationFn: recomputeAccountBalances,
    onSuccess: (r) => {
      toast.success(r.message || 'تمت إعادة احتساب الأرصدة بنجاح')
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success('تمت أرشفة الحساب بنجاح')
      setArchiveTarget(null)
      if (selectedAccount?.code === archiveTarget?.code) {
        setDrawerOpen(false)
        setSelectedAccount(null)
      }
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const reactivateMut = useMutation({
    mutationFn: (code: string) => updateAccount(code, { is_active: true }),
    onSuccess: () => {
      toast.success('تمت إعادة تفعيل الحساب')
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      qc.invalidateQueries({ queryKey: ['trial-balance'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  // Account List & Flat Mapping
  const allFlatAccounts = useMemo(
    () => (data?.flat ?? []).filter(a => a.is_active).map(a => ({ id: a.id, code: a.code, name: a.name })),
    [data?.flat]
  )

  // Filtered Tree Nodes Calculation
  const filteredNodes = useMemo(() => {
    const rawItems = data?.items ?? []
    const q = searchQuery.trim().toLowerCase()

    function filterNode(node: ChartAccountNode): ChartAccountNode | null {
      // 1. Search Query Match
      if (q && !hasMatchInSubtree(node, q)) return null

      // 2. Type Filter
      if (typeFilter !== 'all' && node.type !== typeFilter) return null

      // 3. Classification Filter
      if (clfFilter !== 'all' && node.classification !== clfFilter) return null

      // 4. Level Filter
      if (levelFilter !== 'all' && node.level !== levelFilter) return null

      // 5. Status Filter
      if (statusFilter === 'active' && !node.is_active) return null
      if (statusFilter === 'archived' && node.is_active) return null

      // 6. Non-zero balance filter
      if (onlyWithBalance) {
        const bal = node.subtree_balance ?? node.balance ?? 0
        if (bal === 0) return null
      }

      // Recursively filter children
      const filteredChildren = node.children
        ? (node.children.map(filterNode).filter(Boolean) as ChartAccountNode[])
        : []

      return {
        ...node,
        children: filteredChildren,
      }
    }

    return rawItems.map(filterNode).filter(Boolean) as ChartAccountNode[]
  }, [data?.items, searchQuery, typeFilter, clfFilter, levelFilter, statusFilter, onlyWithBalance])

  // Count active filters
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) +
    (clfFilter !== 'all' ? 1 : 0) +
    (levelFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (onlyWithBalance ? 1 : 0)

  // Expand / Collapse Handlers
  const handleExpandAll = () => {
    const allParentIds = (data?.flat ?? []).filter(a => a.children_count > 0).map(a => a.id)
    setExpanded(new Set(allParentIds))
  }

  const handleCollapseAll = () => {
    setExpanded(new Set())
  }

  const handleToggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setClfFilter('all')
    setLevelFilter('all')
    setStatusFilter('all')
    setOnlyWithBalance(false)
  }

  const handleColumnVisibilityToggle = (key: string) => {
    setColumnsVisibility(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }))
  }

  // Row Selection & Drawer
  const handleSelectRow = (node: ChartAccountNode) => {
    setSelectedAccount(node)
    setDrawerOpen(true)
  }

  // Excel Export
  const handleExportExcel = async () => {
    if (!data?.flat || data.flat.length === 0) {
      toast.error('لا توجد بيانات لتصديرها')
      return
    }

    const headers = ['رمز الحساب', 'اسم الحساب', 'المستوى', 'النوع', 'التصنيف', 'المدين', 'الدائن', 'الرصيد', 'الحالة']
    const rows = data.flat.map(node => {
      const indent = '  '.repeat(Math.max(0, node.depth))
      const displayName = node.depth > 0 ? `${indent}└ ${node.name}` : node.name
      const debit = node.subtree_debit ?? node.debit ?? 0
      const credit = node.subtree_credit ?? node.credit ?? 0
      const balance = node.subtree_balance ?? node.balance ?? 0

      return [
        node.code,
        displayName,
        node.level,
        node.type_label || node.type,
        node.classification_label || node.classification || '—',
        debit,
        credit,
        balance,
        node.is_active ? 'نشط' : 'مؤرشف'
      ]
    })

    await exportXlsx(`دليل_الحسابات_${new Date().toISOString().split('T')[0]}`, headers, rows)
    toast.success('تم تصدير دليل الحسابات بنجاح!')
  }

  const isBalanced = trialBalance?.status === 'balanced'

  return (
    <div
      data-layout="full-width"
      className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 space-y-4 text-right dir-rtl bg-[#F8FAFC] min-h-screen"
      dir="rtl"
    >
      
      {/* 1. Compact Enterprise Page Header */}
      <ChartOfAccountsPageHeader
        onAddAccount={() => setDialog({ mode: 'add' })}
        onExportExcel={handleExportExcel}
        onRecomputeBalances={() => recomputeMut.mutate()}
        isRecomputing={recomputeMut.isPending}
        lastSyncTime={lastSyncTime}
      />

      {/* 2. Financial Summary Strip */}
      <AccountingSummaryStrip
        totalAccounts={data?.total ?? 0}
        mainAccounts={data?.summary?.main ?? 0}
        branchAccounts={data?.summary?.branch ?? 0}
        detailAccounts={data?.summary?.detail ?? 0}
        totalDebit={trialBalance?.total_debit ?? 0}
        totalCredit={trialBalance?.total_credit ?? 0}
        difference={trialBalance?.difference ?? 0}
        isBalanced={isBalanced}
        isLoading={isLoading || isTrialLoading}
      />

      {/* 3. Enterprise Filter & Command Bar */}
      <ChartOfAccountsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        clfFilter={clfFilter}
        onClfChange={setClfFilter}
        levelFilter={levelFilter}
        onLevelChange={setLevelFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onlyWithBalance={onlyWithBalance}
        onOnlyWithBalanceToggle={() => setOnlyWithBalance(prev => !prev)}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onRefresh={() => refetch()}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        density={density}
        onDensityChange={setDensity}
        columnsVisibility={columnsVisibility}
        onColumnVisibilityToggle={handleColumnVisibilityToggle}
      />

      {/* 4. Chart of Accounts Tree Grid */}
      <AccountTreeGrid
        nodes={filteredNodes}
        searchQuery={searchQuery}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        onSelectRow={handleSelectRow}
        selectedAccountId={selectedAccount?.id}
        onEdit={(n) => setDialog({ mode: 'edit', initial: { code: n.code, name: n.name, type: n.type, classification: n.classification, parent_code: n.parent_code } })}
        onDelete={setArchiveTarget}
        onReactivate={(n) => reactivateMut.mutate(n.code)}
        onAddChild={(n) => setDialog({ mode: 'add', initial: { parent_code: n.code, type: n.type } })}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        density={density}
        columnsVisibility={columnsVisibility}
      />

      {/* 5. Right-Side Enterprise Details Drawer */}
      <AccountDetailsDrawer
        account={selectedAccount}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={(n) => setDialog({ mode: 'edit', initial: { code: n.code, name: n.name, type: n.type, classification: n.classification, parent_code: n.parent_code } })}
        onAddChild={(n) => setDialog({ mode: 'add', initial: { parent_code: n.code, type: n.type } })}
        onArchive={setArchiveTarget}
        onReactivate={(n) => reactivateMut.mutate(n.code)}
      />

      {/* 6. Account Form Modal (Add / Edit) */}
      <AnimatePresence>
        {dialog && (
          <AccountFormModal
            mode={dialog.mode}
            initial={dialog.initial}
            allAccounts={allFlatAccounts}
            onClose={() => setDialog(null)}
            onSuccess={() => {
              setDialog(null)
              qc.invalidateQueries({ queryKey: ['chart-of-accounts'] })
              qc.invalidateQueries({ queryKey: ['trial-balance'] })
            }}
          />
        )}
      </AnimatePresence>

      {/* 7. Archive Confirmation Modal */}
      <AnimatePresence>
        {archiveTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 dir-rtl"
            dir="rtl"
            onClick={(e) => e.target === e.currentTarget && setArchiveTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-xl text-right space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3F2] text-[#B42318]">
                <Archive className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#101828]">تأكيد أرشفة الحساب</h3>
              <p className="text-xs text-[#667085]">
                هل تريد أرشفة الحساب <span className="font-bold text-[#101828]">{archiveTarget.code} — {archiveTarget.name}</span>؟
                سيبقى الحساب وسجله المحاسبي محفوظين في النظام ويمكن إعادة تفعيله لاحقاً.
              </p>
              <div className="flex gap-2.5 pt-2 border-t border-[#EAECF0]">
                <Button
                  size="sm"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(archiveTarget.code)}
                  className="flex-1 bg-[#B42318] hover:bg-[#912018] text-white font-bold text-xs h-9 gap-1.5"
                >
                  {deleteMut.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'أرشفة الحساب'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setArchiveTarget(null)}
                  className="flex-1 border-[#D0D5DD] text-xs h-9"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
