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
  const [isExporting, setIsExporting] = useState(false)
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
    if (isExporting) return
    setIsExporting(true)

    try {
      const fetchPerPage = 200
      const MAX_EXPORT_ROWS = 5000

      const exportParams = {
        page: 1,
        per_page: fetchPerPage,
        search: searchQuery.trim() || undefined,
        ref_type: refTypeFilter !== 'all' ? refTypeFilter : undefined,
        date_from: startDate || undefined,
        date_to: endDate || undefined,
      }

      const firstPageRes = await getJournalEntries(exportParams)
      const totalMatching = firstPageRes?.total ?? 0
      let collectedItems: JournalEntryItem[] = [...(firstPageRes?.items ?? [])]

      if (totalMatching === 0 || collectedItems.length === 0) {
        toast.error('لا توجد قيود مطابقة لتصديرها')
        return
      }

      const targetCount = Math.min(totalMatching, MAX_EXPORT_ROWS)
      const maxPagesNeeded = Math.ceil(targetCount / fetchPerPage)

      const seenIds = new Set<string | number>(collectedItems.map(i => i.id))

      if (maxPagesNeeded > 1 && collectedItems.length < targetCount) {
        for (let p = 2; p <= maxPagesNeeded; p++) {
          const res = await getJournalEntries({ ...exportParams, page: p })
          if (!res?.items || res.items.length === 0) break

          let newItemsAdded = 0
          for (const item of res.items) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id)
              collectedItems.push(item)
              newItemsAdded++
              if (collectedItems.length >= targetCount) break
            }
          }
          if (newItemsAdded === 0) break
        }
      }

      const exportedItems = collectedItems.slice(0, MAX_EXPORT_ROWS)

      const headers = [
        'رقم القيد',
        'تاريخ القيد',
        'نوع القيد',
        'الوصف / البيان',
        'المرجع',
        'عدد البنود',
        'إجمالي المدين',
        'إجمالي الدائن',
        'الحالة',
        'الفرع',
        'أنشئ بواسطة',
        'تاريخ الإنشاء'
      ]

      let totalDebitSum = 0
      let totalCreditSum = 0

      const rows = exportedItems.map(i => {
        const debit = Number(i.total_debit || 0)
        const credit = Number(i.total_credit || 0)
        totalDebitSum += debit
        totalCreditSum += credit

        return [
          i.reference_number || String(i.id),
          i.entry_date ? new Date(i.entry_date).toLocaleDateString('ar-IQ') : '',
          (i as any).ref_type || i.reference_type || 'قيد عام',
          i.description || '',
          (i as any).ref_id || i.reference_id || i.reference_number || '',
          i.lines?.length || i.line_count || 0,
          debit,
          credit,
          i.status === 'posted' ? 'مرحل' : i.status === 'reversed' ? 'معكوس' : 'مسودة',
          (i as any).branch_name || 'الفرع الرئيسي',
          (i as any).created_by || 'النظام',
          (i as any).created_at ? new Date((i as any).created_at).toLocaleDateString('ar-IQ') : (i.entry_date ? new Date(i.entry_date).toLocaleDateString('ar-IQ') : '')
        ]
      })

      // Summary row for Totals (12 columns)
      rows.push([
        'الإجمالي',
        '',
        '',
        '',
        '',
        exportedItems.length,
        totalDebitSum,
        totalCreditSum,
        '',
        '',
        '',
        ''
      ])

      // Summary row for Difference (12 columns)
      const diff = totalDebitSum - totalCreditSum
      rows.push([
        'الفرق (المدين - الدائن)',
        '',
        '',
        '',
        '',
        '',
        diff,
        '',
        Math.abs(diff) < 0.001 ? 'متوازن' : 'غير متوازن',
        '',
        '',
        ''
      ])

      const dateSuffix = startDate || endDate 
        ? `${startDate || ''}_to_${endDate || ''}`
        : new Date().toISOString().split('T')[0]
      const filename = `journal-entries-${dateSuffix}.xlsx`

      await exportXlsx(filename, headers, rows)

      if (totalMatching > MAX_EXPORT_ROWS) {
        toast.warning(`تم تصدير أول 5,000 قيد من أصل ${totalMatching.toLocaleString('ar-IQ')} قيد. يرجى تضييق نطاق البحث أو التاريخ لتصدير جميع النتائج.`)
      } else {
        toast.success(`تم تصدير ${exportedItems.length} قيد محاسبي بنجاح!`)
      }
    } catch (err) {
      console.error('[JournalEntries Export Error]:', err)
      toast.error('تعذر إنشاء ملف Excel. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsExporting(false)
    }
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
        isExporting={isExporting}
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
