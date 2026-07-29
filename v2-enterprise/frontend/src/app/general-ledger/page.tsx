'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGeneralLedger, GeneralLedgerRow, GeneralLedgerParams } from '@/lib/api/general-ledger'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'

import { GeneralLedgerPageHeader } from '@/components/accounting/general-ledger/GeneralLedgerPageHeader'
import { GeneralLedgerSummaryStrip } from '@/components/accounting/general-ledger/GeneralLedgerSummaryStrip'
import { GeneralLedgerToolbar, TableDensity } from '@/components/accounting/general-ledger/GeneralLedgerToolbar'
import { GeneralLedgerTable } from '@/components/accounting/general-ledger/GeneralLedgerTable'
import { GeneralLedgerDrawer } from '@/components/accounting/general-ledger/GeneralLedgerDrawer'

export default function GeneralLedgerPage() {
  // State Declarations
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  const [density, setDensity] = useState<TableDensity>('standard')
  const [columnsVisibility, setColumnsVisibility] = useState<Record<string, boolean>>({
    doc_type: true,
    branch: true,
    user: true,
    status: true,
  })

  const [selectedRow, setSelectedRow] = useState<GeneralLedgerRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('ar-IQ'))

  // React Query Server-Side Data Fetching
  const queryParams: GeneralLedgerParams = useMemo(() => ({
    account_code: selectedAccount,
    start_date: startDate,
    end_date: endDate,
    document_type: docTypeFilter,
    status: statusFilter,
    search: searchQuery,
    page,
    per_page: perPage,
  }), [selectedAccount, startDate, endDate, docTypeFilter, statusFilter, searchQuery, page, perPage])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['general-ledger', queryParams],
    queryFn: () => getGeneralLedger(queryParams),
    staleTime: 30_000,
  })

  const summary = data?.summary ?? {
    opening_balance: 0,
    total_debit: 0,
    total_credit: 0,
    net_movement: 0,
    closing_balance: 0,
    total_entries: 0,
  }

  const rows = data?.items ?? []
  const accountsList = data?.accounts_list ?? []

  // Count Active Filters
  const activeFilterCount = (selectedAccount !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (docTypeFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0)

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedAccount('all')
    setStartDate('')
    setEndDate('')
    setDocTypeFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const handleColumnVisibilityToggle = (key: string) => {
    setColumnsVisibility(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }))
  }

  // Row Selection Drawer
  const handleSelectRow = (row: GeneralLedgerRow) => {
    setSelectedRow(row)
    setDrawerOpen(true)
  }

  // Export Excel Infrastructure
  const handleExportExcel = async () => {
    if (rows.length === 0) {
      toast.error('لا توجد حركات لمحاسبية لتصديرها')
      return
    }

    const headers = [
      'التاريخ', 'رقم القيد', 'رقم المستند', 'نوع المستند',
      'رمز الحساب', 'اسم الحساب', 'الوصف والبيان', 'الفرع',
      'المدين', 'الدائن', 'الرصيد الجاري', 'المستخدم', 'الحالة'
    ]

    const exportData = rows.map(r => [
      new Date(r.date).toLocaleDateString('ar-IQ'),
      r.journal_ref,
      r.document_number,
      r.document_type,
      r.account_code,
      r.account_name,
      r.description,
      r.branch_name,
      r.debit,
      r.credit,
      r.running_balance,
      r.created_by,
      r.status === 'posted' ? 'مرحل' : r.status === 'reversed' ? 'معكوس' : 'مسودة'
    ])

    await exportXlsx(`دفتر_الأستاذ_العام_${new Date().toISOString().split('T')[0]}`, headers, exportData)
    toast.success('تم تصدير دفتر الأستاذ العام بنجاح!')
  }

  // Print View Infrastructure
  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      data-layout="full-width"
      className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 space-y-4 text-right dir-rtl bg-[#F8FAFC] min-h-screen"
      dir="rtl"
    >
      
      {/* 1. Page Header */}
      <GeneralLedgerPageHeader
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportExcel}
        onPrint={handlePrint}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        lastSyncTime={lastSyncTime}
      />

      {/* 2. Financial Summary Strip */}
      <GeneralLedgerSummaryStrip
        openingBalance={summary.opening_balance}
        totalDebit={summary.total_debit}
        totalCredit={summary.total_credit}
        netMovement={summary.net_movement}
        closingBalance={summary.closing_balance}
        totalEntries={summary.total_entries}
        isLoading={isLoading}
      />

      {/* 3. Advanced Filter Bar */}
      <GeneralLedgerToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAccount={selectedAccount}
        onAccountChange={setSelectedAccount}
        accountsList={accountsList}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        docTypeFilter={docTypeFilter}
        onDocTypeChange={setDocTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onResetFilters={handleResetFilters}
        onRefresh={() => refetch()}
        density={density}
        onDensityChange={setDensity}
        columnsVisibility={columnsVisibility}
        onColumnVisibilityToggle={handleColumnVisibilityToggle}
        activeFilterCount={activeFilterCount}
      />

      {/* 4. Enterprise Ledger Table */}
      <GeneralLedgerTable
        rows={rows}
        onSelectRow={handleSelectRow}
        selectedRowId={selectedRow?.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        density={density}
        columnsVisibility={columnsVisibility}
      />

      {/* 5. Right-Side Drill-Down Details Drawer (540px) */}
      <GeneralLedgerDrawer
        row={selectedRow}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  )
}
