'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTrialBalance, TrialBalanceAccount, TrialBalanceResponse } from '@/lib/api/accounting'
import { exportXlsx } from '@/lib/export'
import { normalizeArabicSearch, adaptTrialBalanceStatus, getAccountTypeInfo } from './trialBalanceAdapter'

export function useTrialBalance() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [hideZero, setHideZero] = useState(false)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => getTrialBalance(),
    staleTime: 60_000,
    retry: 1,
  })

  const allAccounts = data?.accounts ?? []

  // Filter accounts over dataset
  const filteredAccounts = useMemo(() => {
    const q = normalizeArabicSearch(search)
    return allAccounts.filter(a => {
      const normalizedCode = normalizeArabicSearch(a.code)
      const normalizedName = normalizeArabicSearch(a.name)
      const matchSearch = !q || normalizedCode.includes(q) || normalizedName.includes(q)

      const matchType = typeFilter === 'all' || a.type === typeFilter
      
      // Preserve production zero-balance condition
      const matchZero = !hideZero || Math.abs(a.balance) > 0.001 || Math.abs(a.debit) > 0.001 || Math.abs(a.credit) > 0.001

      return matchSearch && matchType && matchZero
    })
  }, [allAccounts, search, typeFilter, hideZero])

  // Adapted status
  const statusAdapter = useMemo(() => adaptTrialBalanceStatus(data), [data])

  const isFilterActive = Boolean(search || typeFilter !== 'all' || hideZero)

  const resetFilters = useCallback(() => {
    setSearch('')
    setTypeFilter('all')
    setHideZero(false)
  }, [])

  // Excel export delegation preserving exact production dataset
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const headers = ['رمز الحساب', 'اسم الحساب', 'النوع', 'مدين', 'دائن', 'الرصيد']
      const rows = filteredAccounts.map((a: TrialBalanceAccount) => [
        a.code,
        a.name,
        getAccountTypeInfo(a.type).label,
        a.debit,
        a.credit,
        a.balance,
      ])
      // Add authoritative totals row
      rows.push(['', 'الإجمالي الرسمي', '', data?.total_debit ?? 0, data?.total_credit ?? 0, ''])
      await exportXlsx(`ميزان_المراجعة_${new Date().toISOString().split('T')[0]}`, headers, rows)
    } finally {
      setExporting(false)
    }
  }, [filteredAccounts, data])

  return {
    data,
    allAccounts,
    filteredAccounts,
    statusAdapter,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    hideZero,
    setHideZero,
    density,
    setDensity,
    isFilterActive,
    resetFilters,
    isLoading,
    isError,
    isFetching,
    refetch,
    exporting,
    handleExport,
  }
}
