'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTrialBalance, TrialBalanceAccount } from '@/lib/api/accounting'
import { TrialBalancePageHeader } from '@/components/accounting/trial-balance/TrialBalancePageHeader'
import { TrialBalanceSummaryStrip } from '@/components/accounting/trial-balance/TrialBalanceSummaryStrip'
import { TrialBalanceToolbar, TableDensity, ViewMode } from '@/components/accounting/trial-balance/TrialBalanceToolbar'
import { TrialBalanceTable } from '@/components/accounting/trial-balance/TrialBalanceTable'
import { TrialBalanceDrawer } from '@/components/accounting/trial-balance/TrialBalanceDrawer'
import { exportCsv } from '@/lib/export'
import { useToast } from '@/lib/hooks/useToast'

export default function TrialBalancePage() {
  const toast = useToast()

  // State Management
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all')
  const [accountLevelFilter, setAccountLevelFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('flat')
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(false)
  const [density, setDensity] = useState<TableDensity>('standard')
  const [isComparing, setIsComparing] = useState<boolean>(false)
  const [selectedAccount, setSelectedAccount] = useState<TrialBalanceAccount | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set(['1', '11', '111', '2', '3', '4', '5']))

  const [columnsVisibility, setColumnsVisibility] = useState<Record<string, boolean>>({
    opening: true,
    period: true,
    closing: true,
  })

  // Fetch Authoritative Trial Balance Data from Backend
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['trial-balance', startDate, endDate],
    queryFn: () => getTrialBalance({ start_date: startDate, end_date: endDate }),
    staleTime: 60000,
  })

  // Normalize Accounts List
  const rawAccounts = useMemo(() => data?.accounts ?? [], [data])
  const backendTotals = useMemo(() => data?.totals ?? {
    opening_debit: 0,
    opening_credit: 0,
    period_debit: 0,
    period_credit: 0,
    closing_debit: 0,
    closing_credit: 0,
    difference: 0,
    is_balanced: true,
  }, [data])

  // Filter Accounts Based on User Criteria
  const filteredAccounts = useMemo(() => {
    return rawAccounts.filter(acc => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchCode = acc.code.toLowerCase().includes(q)
        const matchName = acc.name.toLowerCase().includes(q)
        if (!matchCode && !matchName) return false
      }

      // 2. Account Type Filter
      if (accountTypeFilter !== 'all' && acc.type !== accountTypeFilter) {
        return false
      }

      // 3. Account Level Filter
      if (accountLevelFilter !== 'all') {
        const len = acc.code.length
        if (accountLevelFilter === '1' && len !== 1) return false
        if (accountLevelFilter === '2' && len !== 2) return false
        if (accountLevelFilter === '3' && len !== 3) return false
        if (accountLevelFilter === '4' && len < 4) return false
      }

      // 4. Zero Balance Filter
      if (hideZeroBalances) {
        const isZero =
          acc.opening_debit === 0 &&
          acc.opening_credit === 0 &&
          acc.period_debit === 0 &&
          acc.period_credit === 0 &&
          acc.closing_debit === 0 &&
          acc.closing_credit === 0
        if (isZero) return false
      }

      return true
    })
  }, [rawAccounts, searchQuery, accountTypeFilter, accountLevelFilter, hideZeroBalances])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count++
    if (startDate || endDate) count++
    if (accountTypeFilter !== 'all') count++
    if (accountLevelFilter !== 'all') count++
    if (hideZeroBalances) count++
    return count
  }, [searchQuery, startDate, endDate, accountTypeFilter, accountLevelFilter, hideZeroBalances])

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
    setAccountTypeFilter('all')
    setAccountLevelFilter('all')
    setHideZeroBalances(false)
  }

  // Toggle Hierarchy Folder Node
  const handleToggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  // Column Visibility Toggle
  const handleColumnVisibilityToggle = (colKey: string) => {
    setColumnsVisibility(prev => ({
      ...prev,
      [colKey]: !prev[colKey],
    }))
  }

  // Handle Account Selection for Drawer
  const handleSelectAccount = (acc: TrialBalanceAccount) => {
    setSelectedAccount(acc)
    setIsDrawerOpen(true)
  }

  // Export Handlers
  const handleExportExcel = () => {
    if (filteredAccounts.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const headers = ['رمز الحساب', 'اسم الحساب', 'نوع الحساب', 'افتتاحي مدين', 'افتتاحي دائن', 'حركة الفترة مدين', 'حركة الفترة دائن', 'ختامي مدين', 'ختامي دائن', 'صافي الرصيد']
    const rows = filteredAccounts.map(a => [
      a.code,
      a.name,
      a.type,
      a.opening_debit,
      a.opening_credit,
      a.period_debit,
      a.period_credit,
      a.closing_debit,
      a.closing_credit,
      a.balance,
    ])

    exportCsv(`mizan_al_marajaa_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast.success('تم تصدير ملف ميزان المراجعة بنجاح')
  }

  const handleExportPdf = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 md:px-6" dir="rtl">
      <div className="max-w-[1760px] mx-auto space-y-4">
        
        {/* 1. Page Header */}
        <TrialBalancePageHeader
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
          onPrint={handleExportPdf}
          onRefresh={refetch}
          onToggleComparison={() => setIsComparing(prev => !prev)}
          isComparing={isComparing}
          isRefreshing={isFetching}
        />

        {/* 2. Authoritative Financial Summary Strip */}
        <TrialBalanceSummaryStrip
          openingDebit={backendTotals.opening_debit}
          openingCredit={backendTotals.opening_credit}
          periodDebit={backendTotals.period_debit}
          periodCredit={backendTotals.period_credit}
          closingDebit={backendTotals.closing_debit}
          closingCredit={backendTotals.closing_credit}
          difference={backendTotals.difference}
          isBalanced={backendTotals.is_balanced}
          accountCount={filteredAccounts.length}
          isLoading={isLoading}
        />

        {/* 3. Filter Toolbar */}
        <TrialBalanceToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          accountTypeFilter={accountTypeFilter}
          onAccountTypeChange={setAccountTypeFilter}
          accountLevelFilter={accountLevelFilter}
          onAccountLevelChange={setAccountLevelFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hideZeroBalances={hideZeroBalances}
          onHideZeroBalancesToggle={() => setHideZeroBalances(prev => !prev)}
          onResetFilters={handleResetFilters}
          onRefresh={refetch}
          density={density}
          onDensityChange={setDensity}
          columnsVisibility={columnsVisibility}
          onColumnVisibilityToggle={handleColumnVisibilityToggle}
          activeFilterCount={activeFilterCount}
        />

        {/* 4. Enterprise Trial Balance Grid */}
        <TrialBalanceTable
          accounts={filteredAccounts}
          totals={backendTotals}
          onSelectAccount={handleSelectAccount}
          selectedAccountId={selectedAccount?.id}
          viewMode={viewMode}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          density={density}
          columnsVisibility={columnsVisibility}
          expandedCodes={expandedCodes}
          onToggleExpand={handleToggleExpand}
        />

        {/* 5. Account Details Drawer */}
        <TrialBalanceDrawer
          account={selectedAccount}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />

      </div>
    </div>
  )
}
