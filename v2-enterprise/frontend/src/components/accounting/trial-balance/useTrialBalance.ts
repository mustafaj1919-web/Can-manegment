'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTrialBalance, TrialBalanceAccount, TrialBalanceResponse } from '@/lib/api/accounting'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'
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

  // Excel export delegation preserving exact production dataset & 6-column model
  const handleExport = useCallback(async () => {
    if (!filteredAccounts || filteredAccounts.length === 0) {
      toast.error('لا توجد بيانات مطابقة لتصديرها')
      return
    }

    setExporting(true)
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

      const rows = filteredAccounts.map((a: TrialBalanceAccount) => {
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
          getAccountTypeInfo(a.type).label,
          opDebit,
          opCredit,
          perDebit,
          perCredit,
          clDebit,
          clCredit,
        ]
      })

      // Section Totals: Opening Balance
      const opDebitTotal = data?.totals?.opening_debit ?? sumOpeningDebit
      const opCreditTotal = data?.totals?.opening_credit ?? sumOpeningCredit
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
      const perDebitTotal = data?.totals?.period_debit ?? sumPeriodDebit
      const perCreditTotal = data?.totals?.period_credit ?? sumPeriodCredit
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
      const clDebitTotal = data?.totals?.closing_debit ?? data?.total_debit ?? sumClosingDebit
      const clCreditTotal = data?.totals?.closing_credit ?? data?.total_credit ?? sumClosingCredit
      const clDiff = data?.totals?.difference ?? data?.difference ?? (clDebitTotal - clCreditTotal)

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

      const dateStr = new Date().toISOString().split('T')[0]
      await exportXlsx(`ميزان_المراجعة_${dateStr}.xlsx`, headers, rows)
      toast.success(`تم تصدير ميزان المراجعة (${filteredAccounts.length} حساب) بنجاح!`)
    } catch (err) {
      console.error('[TrialBalance Export Error]:', err)
      toast.error('تعذر إنشاء ملف Excel. يرجى المحاولة مرة أخرى.')
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
