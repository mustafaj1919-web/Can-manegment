'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJournalEntries, reverseJournalEntry, getChartOfAccounts, JournalEntryItem } from '@/lib/api/accounting'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'

import { JournalEntriesPageHeader } from '@/components/accounting/journal-entries/JournalEntriesPageHeader'
import { JournalEntriesSummaryStrip } from '@/components/accounting/journal-entries/JournalEntriesSummaryStrip'
import { JournalEntriesToolbar, TableDensity } from '@/components/accounting/journal-entries/JournalEntriesToolbar'
import { JournalEntriesTable } from '@/components/accounting/journal-entries/JournalEntriesTable'
import { JournalEntriesDrawer } from '@/components/accounting/journal-entries/JournalEntriesDrawer'
import { NewJournalEntryModal } from '@/components/accounting/journal-entries/NewJournalEntryModal'

export default function JournalEntriesPage() {
  // State Declarations
  const [searchQuery, setSearchQuery] = useState('')
  const [refTypeFilter, setRefTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(30)

  const [density, setDensity] = useState<TableDensity>('standard')
  const [columnsVisibility, setColumnsVisibility] = useState<Record<string, boolean>>({
    ref_type: true,
    lines_count: true,
    status: true,
  })

  const [selectedEntry, setSelectedEntry] = useState<JournalEntryItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [lastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('ar-IQ'))

  const queryClient = useQueryClient()

  // Query Params
  const params = useMemo(() => ({
    page,
    per_page: perPage,
    search: searchQuery.trim() || undefined,
    ref_type: refTypeFilter !== 'all' ? refTypeFilter : undefined,
    date_from: startDate || undefined,
    date_to: endDate || undefined,
  }), [page, perPage, searchQuery, refTypeFilter, startDate, endDate])

  // Data Queries
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['journal-entries', params],
    queryFn: () => getJournalEntries(params),
    staleTime: 30_000,
  })

  const coaQuery = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts(),
    staleTime: 60_000,
  })

  // Reverse Entry Mutation
  const reverseMutation = useMutation({
    mutationFn: (item: JournalEntryItem) => reverseJournalEntry(Number(item.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['general-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      toast.success('تمت عملية عكس القيد المحاسبي بنجاح وترحيل القيد العكسي')
      setDrawerOpen(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'تعذر عكس القيد المحاسبي')
    },
  })

  const items = data?.items ?? []
  const totalEntries = data?.total ?? items.length

  // Calculate Aggregates
  const draftEntries = items.filter(i => i.status === 'draft').length
  const postedEntries = items.filter(i => i.status === 'posted').length
  const reversedEntries = items.filter(i => i.status === 'reversed').length
  const totalDebit = items.reduce((s, i) => s + (i.total_debit || 0), 0)
  const totalCredit = items.reduce((s, i) => s + (i.total_credit || 0), 0)

  const accountsList = (coaQuery.data?.flat || []).map(a => ({ code: a.code, name: a.name, id: (a as any).id || a.code }))

  // Active Filter Count
  const activeFilterCount = (refTypeFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0)

  const handleResetFilters = () => {
    setSearchQuery('')
    setRefTypeFilter('all')
    setStatusFilter('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleColumnVisibilityToggle = (key: string) => {
    setColumnsVisibility(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }))
  }

  const handleSelectRow = (item: JournalEntryItem) => {
    setSelectedEntry(item)
    setDrawerOpen(true)
  }

  const handleReverseEntry = (item: JournalEntryItem) => {
    if (confirm(`هل أنت تأكد من عكس القيد المحاسبي رقم (${item.reference_number})؟`)) {
      reverseMutation.mutate(item)
    }
  }

  // Export Excel
  const handleExportExcel = async () => {
    if (items.length === 0) {
      toast.error('لا توجد قيود يومية لتصديرها')
      return
    }

    const headers = [
      'التاريخ', 'رقم القيد', 'نوع القيد', 'البيان والوصف', 'المرجع',
      'عدد البنود', 'إجمالي المدين', 'إجمالي الدائن', 'الحالة'
    ]

    const exportData = items.map(i => [
      i.entry_date ? new Date(i.entry_date).toLocaleDateString('ar-IQ') : '—',
      i.reference_number,
      (i as any).ref_type || i.reference_type || 'قيد عام',
      i.description || '',
      (i as any).ref_id || i.reference_number || '',
      i.lines?.length || i.line_count || 0,
      i.total_debit,
      i.total_credit,
      i.status === 'posted' ? 'مرحل' : i.status === 'reversed' ? 'معكوس' : 'مسودة'
    ])

    await exportXlsx(`سجل_القيود_اليومية_${new Date().toISOString().split('T')[0]}`, headers, exportData)
    toast.success('تم تصدير سجل القيود اليومية بنجاح!')
  }

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
      <JournalEntriesPageHeader
        onNewEntry={() => setNewModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportExcel}
        onPrint={handlePrint}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        lastSyncTime={lastSyncTime}
      />

      {/* 2. Summary Strip */}
      <JournalEntriesSummaryStrip
        totalEntries={totalEntries}
        draftEntries={draftEntries}
        postedEntries={postedEntries}
        reversedEntries={reversedEntries}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isLoading={isLoading}
      />

      {/* 3. Toolbar & Filters */}
      <JournalEntriesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        refTypeFilter={refTypeFilter}
        onRefTypeChange={setRefTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={handleResetFilters}
        onRefresh={() => refetch()}
        density={density}
        onDensityChange={setDensity}
        columnsVisibility={columnsVisibility}
        onColumnVisibilityToggle={handleColumnVisibilityToggle}
        activeFilterCount={activeFilterCount}
      />

      {/* 4. Enterprise Table */}
      <JournalEntriesTable
        items={items}
        onSelectRow={handleSelectRow}
        selectedEntryId={selectedEntry?.id}
        onReverseEntry={handleReverseEntry}
        isReversing={reverseMutation.isPending}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        density={density}
        columnsVisibility={columnsVisibility}
      />

      {/* 5. Right-Side Drawer (540px) */}
      <JournalEntriesDrawer
        item={selectedEntry}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onReverse={handleReverseEntry}
      />

      {/* 6. New Journal Entry Workspace Modal */}
      <NewJournalEntryModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSuccess={() => refetch()}
        accountsList={accountsList}
      />

    </div>
  )
}
