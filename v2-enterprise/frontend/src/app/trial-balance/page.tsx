'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTrialBalance, TrialBalanceAccount } from '@/lib/api/accounting'
import { TrialBalancePageHeader } from '@/components/accounting/trial-balance/TrialBalancePageHeader'
import { TrialBalanceSummaryStrip } from '@/components/accounting/trial-balance/TrialBalanceSummaryStrip'
import { TrialBalanceToolbar, TableDensity, ViewMode } from '@/components/accounting/trial-balance/TrialBalanceToolbar'
import { TrialBalanceTable } from '@/components/accounting/trial-balance/TrialBalanceTable'
import { TrialBalanceDrawer } from '@/components/accounting/trial-balance/TrialBalanceDrawer'
import { exportXlsx } from '@/lib/export'
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
  const [isExporting, setIsExporting] = useState<boolean>(false)
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

  // Filter accounts over dataset according to screen presentation state
  const filteredAccounts = useMemo(() => {
    return rawAccounts.filter(a => {
      const matchSearch = !searchQuery.trim() || 
        a.code.includes(searchQuery.trim()) || 
        a.name.includes(searchQuery.trim())

      const matchType = accountTypeFilter === 'all' || a.type === accountTypeFilter
      
      const matchZero = !hideZeroBalances || 
        Math.abs(a.balance) > 0.001 || 
        Math.abs(a.debit || 0) > 0.001 || 
        Math.abs(a.credit || 0) > 0.001

      return matchSearch && matchType && matchZero
    })
  }, [rawAccounts, searchQuery, accountTypeFilter, hideZeroBalances])

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

  // Row Expand/Collapse Handler
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

  // Export Handlers — 6-Column Model XLSX Export
  const handleExportExcel = async () => {
    if (filteredAccounts.length === 0) {
      toast.error('لا توجد بيانات مطابقة لتصديرها')
      return
    }

    if (isExporting) return
    setIsExporting(true)

    try {
      const headers = [
        'رمز الحساب',
        'اسم الحساب',
        'نوع الحساب',
        'الافتتاحي مدين',
        'الافتتاحي دائن',
        'الحركة مدين',
        'الحركة دائن',
        'الختامي مدين',
        'الختامي دائن'
      ]

      let sumOpeningDebit = 0
      let sumOpeningCredit = 0
      let sumPeriodDebit = 0
      let sumPeriodCredit = 0
      let sumClosingDebit = 0
      let sumClosingCredit = 0

      const rows = filteredAccounts.map(a => {
        const opDebit = Number(a.opening_debit ?? (a.debit || 0))
        const opCredit = Number(a.opening_credit ?? (a.credit || 0))
        const perDebit = Number(a.period_debit ?? 0)
        const perCredit = Number(a.period_credit ?? 0)
        const clDebit = Number(a.closing_debit ?? (a.debit || 0))
        const clCredit = Number(a.closing_credit ?? (a.credit || 0))

        sumOpeningDebit += opDebit
        sumOpeningCredit += opCredit
        sumPeriodDebit += perDebit
        sumPeriodCredit += perCredit
        sumClosingDebit += clDebit
        sumClosingCredit += clCredit

        return [
          a.code,
          a.name,
          a.type,
          opDebit,
          opCredit,
          perDebit,
          perCredit,
          clDebit,
          clCredit,
        ]
      })

      // Section Totals: Opening Balance
      const opDebitTotal = backendTotals.opening_debit || sumOpeningDebit
      const opCreditTotal = backendTotals.opening_credit || sumOpeningCredit
      const opDiff = opDebitTotal - opCreditTotal

      rows.push([
        'إجمالي الرصيد الافتتاحي',
        '',
        '',
        opDebitTotal,
        opCreditTotal,
        '',
        '',
        '',
        ''
      ])
      rows.push([
        'فرق الافتتاحي (مدين - دائن)',
        '',
        '',
        opDiff,
        '',
        '',
        '',
        '',
        Math.abs(opDiff) < 0.001 ? 'متوازن' : 'غير متوازن'
      ])

      // Section Totals: Period Movements
      const perDebitTotal = backendTotals.period_debit || sumPeriodDebit
      const perCreditTotal = backendTotals.period_credit || sumPeriodCredit
      const perDiff = perDebitTotal - perCreditTotal

      rows.push([
        'إجمالي حركات الفترة',
        '',
        '',
        '',
        '',
        perDebitTotal,
        perCreditTotal,
        '',
        ''
      ])
      rows.push([
        'فرق الحركة (مدين - دائن)',
        '',
        '',
        '',
        '',
        perDiff,
        '',
        '',
        Math.abs(perDiff) < 0.001 ? 'متوازن' : 'غير متوازن'
      ])

      // Section Totals: Closing Balance
      const clDebitTotal = backendTotals.closing_debit || sumClosingDebit
      const clCreditTotal = backendTotals.closing_credit || sumClosingCredit
      const clDiff = backendTotals.difference ?? (clDebitTotal - clCreditTotal)

      rows.push([
        'إجمالي الرصيد الختامي',
        '',
        '',
        '',
        '',
        '',
        '',
        clDebitTotal,
        clCreditTotal
      ])
      rows.push([
        'فرق الختامي النهائي',
        '',
        '',
        '',
        '',
        '',
        '',
        clDiff,
        Math.abs(clDiff) < 0.001 ? 'متوازن' : 'غير متوازن'
      ])

      const dateSuffix = startDate || endDate 
        ? `${startDate || ''}_to_${endDate || ''}`
        : new Date().toISOString().split('T')[0]
      const filename = `mizan-al-marajaa-${dateSuffix}.xlsx`

      await exportXlsx(filename, headers, rows)
      toast.success(`تم تصدير ميزان المراجعة (${filteredAccounts.length} حساب) بنجاح!`)
    } catch (err) {
      console.error('[TrialBalance Export Error]:', err)
      toast.error('تعذر إنشاء ملف Excel. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsExporting(false)
    }
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
          isExporting={isExporting}
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
