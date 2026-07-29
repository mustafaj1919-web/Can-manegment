'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Car,
  DollarSign,
  Package,
  Clock,
  ChevronDown,
  X,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  FileText,
  PieChart,
  Info
} from 'lucide-react'
import { getSuppliers, Supplier } from '@/lib/api/suppliers'
import { ReportBranch } from '@/lib/api/reports'
import { getExpenses } from '@/lib/api/accounting'
import {
  getSupplierProfitability,
  SupplierProfitabilityResponse,
  SupplierProfitabilityParams
} from '@/lib/api/accounting'
import { formatMoney, formatNumber } from '@/lib/utils'
import { exportXlsx } from '@/lib/export'

function formatCurrency(val: number | null | undefined): string {
  return formatMoney(val ?? 0, 'IQD')
}

export default function SupplierProfitabilityPage() {
  // Filters state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [branches, setBranches] = useState<ReportBranch[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [saleDateFrom, setSaleDateFrom] = useState<string>('')
  const [saleDateTo, setSaleDateTo] = useState<string>('')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [brand, setBrand] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [year, setYear] = useState<string>('')
  const [trim, setTrim] = useState<string>('')
  const [status, setStatus] = useState<string>('all')

  // Search & table filters
  const [tableSearch, setTableSearch] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<string>('saleDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedVehicle, setSelectedVehicle] = useState<SupplierProfitabilityResponse['vehicles'][0] | null>(null)

  // Loading & Data states
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(true)
  const [loadingReport, setLoadingReport] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<SupplierProfitabilityResponse | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string>('')

  // Load suppliers and branches on mount
  useEffect(() => {
    async function loadInitialData() {
      setLoadingSuppliers(true)
      try {
        const [supRes, expRes] = await Promise.all([
          getSuppliers({ per_page: 200 }),
          getExpenses().catch(() => ({ branches: [] }))
        ])
        const list = Array.isArray(supRes?.data) ? supRes.data : []
        setSuppliers(list)
        setBranches((expRes?.branches as any) ?? [])
        if (list.length > 0) {
          setSelectedSupplierId(list[0].id)
        }
      } catch (err: any) {
        setError('تعذر تحميل قائمة الموردين الفعالة.')
      } finally {
        setLoadingSuppliers(false)
      }
    }
    loadInitialData()
  }, [])

  // Fetch report when filters change
  const fetchReport = async () => {
    if (!selectedSupplierId) return
    setLoadingReport(true)
    setError(null)
    try {
      const params: SupplierProfitabilityParams = {
        supplierId: selectedSupplierId,
        saleDateFrom: saleDateFrom || undefined,
        saleDateTo: saleDateTo || undefined,
        branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
        brand: brand || undefined,
        model: model || undefined,
        year: year ? parseInt(year, 10) : undefined,
        trim: trim || undefined,
        status: status !== 'all' ? status : undefined
      }
      const data = await getSupplierProfitability(params)
      setReportData(data)
      setLastRefreshed(new Date().toLocaleTimeString('ar-IQ'))
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تحميل كشف ربحية المورد.')
    } finally {
      setLoadingReport(false)
    }
  }

  useEffect(() => {
    if (selectedSupplierId) {
      fetchReport()
    }
  }, [selectedSupplierId])

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReport()
  }

  const handleResetFilters = () => {
    setSaleDateFrom('')
    setSaleDateTo('')
    setSelectedBranchId('all')
    setBrand('')
    setModel('')
    setYear('')
    setTrim('')
    setStatus('all')
    setTableSearch('')
  }

  // Filtered & sorted detail rows
  const filteredVehicles = useMemo(() => {
    if (!reportData?.vehicles) return []
    let list = [...reportData.vehicles]

    if (tableSearch.trim()) {
      const query = tableSearch.toLowerCase().trim()
      list = list.filter(
        (v) =>
          v.vin.toLowerCase().includes(query) ||
          v.brand.toLowerCase().includes(query) ||
          v.model.toLowerCase().includes(query) ||
          v.stockNumber.toLowerCase().includes(query) ||
          (v.saleNumber && v.saleNumber.toLowerCase().includes(query))
      )
    }

    list.sort((a, b) => {
      let valA: any = a[sortColumn as keyof typeof a]
      let valB: any = b[sortColumn as keyof typeof b]

      if (sortColumn === 'saleDate') {
        valA = a.saleDate ? new Date(a.saleDate).getTime() : 0
        valB = b.saleDate ? new Date(b.saleDate).getTime() : 0
      } else if (sortColumn === 'purchaseDate') {
        valA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0
        valB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [reportData?.vehicles, tableSearch, sortColumn, sortDirection])

  // Table summary totals
  const tableTotals = useMemo(() => {
    return filteredVehicles.reduce(
      (acc, v) => {
        acc.purchaseCost += v.purchaseCost || 0
        acc.additionalCosts += v.additionalCosts || 0
        acc.totalVehicleCost += v.totalVehicleCost || 0
        acc.netRevenue += v.netRevenue || 0
        acc.realizedProfit += v.realizedProfit || 0
        return acc
      },
      { purchaseCost: 0, additionalCosts: 0, totalVehicleCost: 0, netRevenue: 0, realizedProfit: 0 }
    )
  }, [filteredVehicles])

  // Reconciliation check
  const isReconciled = useMemo(() => {
    if (!reportData?.summary) return true
    const s = reportData.summary
    const calcProfit = s.realizedRevenue - s.costOfSoldVehicles
    return Math.abs(s.realizedGrossProfit - calcProfit) < 1
  }, [reportData?.summary])

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (!reportData || filteredVehicles.length === 0) return

    const headers = [
      '#',
      'رقم الفاتورة/المرجع',
      'رقم الشاسي (VIN)',
      'الماركة',
      'الموديل',
      'السنة',
      'الفئة',
      'الفرع',
      'تاريخ الشراء',
      'تكلفة الشراء الأساسية',
      'التكاليف الإضافية',
      'إجمالي التكلفة',
      'تاريخ البيع',
      'رقم عقد البيع',
      'صافي الإيراد (IQD)',
      'الربح المحقق (IQD)',
      'هامش الربح %',
      'مدة البيع (أيام)',
      'الحالة'
    ]

    const rows = filteredVehicles.map((v, idx) => [
      idx + 1,
      v.stockNumber,
      v.vin,
      v.brand,
      v.model,
      v.year,
      v.trim,
      v.branchName,
      v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('ar-IQ') : '',
      v.purchaseCost,
      v.additionalCosts,
      v.totalVehicleCost,
      v.saleDate ? new Date(v.saleDate).toLocaleDateString('ar-IQ') : '-',
      v.saleNumber || '-',
      v.netRevenue,
      v.realizedProfit,
      `${v.profitMarginPercent}%`,
      v.daysToSell,
      v.status === 'Sold' ? 'مباعة' : 'في المخزون'
    ])

    const filename = `كشف_ربحية_المورد_${reportData.supplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
    await exportXlsx(filename, headers, rows)
  }

  // Print Handler
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 dir-rtl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                كشف ربحية المورد
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                SUPPLIER REALIZED PROFITABILITY STATEMENT
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50 hidden sm:inline-block">
              آخر تحديث: {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchReport}
            disabled={loadingReport || !selectedSupplierId}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingReport ? 'animate-spin' : ''}`} />
            تحديث Data
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData || filteredVehicles.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-950/20 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            طباعة A4
          </button>
        </div>
      </div>

      {/* Mandatory Notice Banner */}
      <div className="my-4 p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center gap-3 text-indigo-300 text-xs sm:text-sm print:hidden">
        <Info className="w-5 h-5 text-indigo-400 shrink-0" />
        <span>
          <strong>ملاحظة هامة:</strong> أرقام الربح تعتمد على تاريخ البيع، بينما المخزون المتبقي يمثل الحالة الحالية للسيارات غير المباعة.
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="my-4 p-4 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Section */}
      <form onSubmit={handleApplyFilters} className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 mb-6 space-y-4 shadow-xl print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Supplier Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              المورد المطلوب <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                disabled={loadingSuppliers}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loadingSuppliers ? (
                  <option value="">جاري تحميل الموردين...</option>
                ) : suppliers.length === 0 ? (
                  <option value="">لا يوجد موردين</option>
                ) : (
                  suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Sale Date From */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              تاريخ البيع من
            </label>
            <input
              type="date"
              value={saleDateFrom}
              onChange={(e) => setSaleDateFrom(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Sale Date To */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              تاريخ البيع إلى
            </label>
            <input
              type="date"
              value={saleDateTo}
              onChange={(e) => setSaleDateTo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              الفرع
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">كافة الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Extended Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-700/50">
          <div>
            <input
              type="text"
              placeholder="الماركة (Toyota...)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="الموديل (Camry...)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="سنة الصنع (2025)"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="الفئة / Trim"
              value={trim}
              onChange={(e) => setTrim(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">كافة الحالات</option>
              <option value="sold">المباعة فقط</option>
              <option value="unsold">غير المباعة فقط</option>
            </select>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all"
          >
            إعادة ضبط الفلاتر
          </button>
          <button
            type="submit"
            disabled={loadingReport}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-950/20"
          >
            تطبيق الفلترة
          </button>
        </div>
      </form>

      {/* Main Content Area */}
      {loadingReport ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">جاري احتساب كشف ربحية المورد والمخزون...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Supplier Header Banner */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                كود المورد: {reportData.supplier.code}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5">
                {reportData.supplier.name}
              </h2>
              {reportData.supplier.phone && (
                <p className="text-xs text-slate-400 mt-1">هاتف المورد: {reportData.supplier.phone}</p>
              )}
            </div>

            {/* Reconciliation Badge */}
            <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700/60">
              <CheckCircle2 className={`w-4 h-4 ${isReconciled ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-xs font-medium text-slate-300">
                {isReconciled ? 'مطابقة الحركات 100%' : 'تنبيه: يوجد تسوية'}
              </span>
            </div>
          </div>

          {/* 11 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Card 1 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>السيارات المرتبطة</span>
                <Car className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-lg sm:text-xl font-bold text-white">
                {formatNumber(reportData.summary.purchasedVehicleCount)}
              </p>
              <span className="text-[10px] text-slate-400">إجمالي مشتريات المورد</span>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>السيارات المباعة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg sm:text-xl font-bold text-emerald-400">
                {formatNumber(reportData.summary.soldVehicleCount)}
              </p>
              <span className="text-[10px] text-slate-400">حسب عقود البيع النشطة</span>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>السيارات غير المباعة</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-lg sm:text-xl font-bold text-amber-400">
                {formatNumber(reportData.summary.unsoldVehicleCount)}
              </p>
              <span className="text-[10px] text-slate-400">مخزون المورد الحالي</span>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>قيمة السيارات المرتبطة</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-white">
                {formatCurrency(reportData.summary.purchaseValue)}
              </p>
              <span className="text-[10px] text-slate-400">إجمالي التكلفة الكلية</span>
            </div>

            {/* Card 5 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>إيرادات السيارات المباعة</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-emerald-400">
                {formatCurrency(reportData.summary.realizedRevenue)}
              </p>
              <span className="text-[10px] text-slate-400">صافي قيمة عقود البيع</span>
            </div>

            {/* Card 6 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>تكلفة السيارات المباعة</span>
                <TrendingDown className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-200">
                {formatCurrency(reportData.summary.costOfSoldVehicles)}
              </p>
              <span className="text-[10px] text-slate-400">شراء + مصاريف إضافية</span>
            </div>

            {/* Card 7 */}
            <div className={`border rounded-xl p-3.5 shadow-md ${reportData.summary.realizedGrossProfit >= 0 ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'}`}>
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>الربح الإجمالي المحقق</span>
                <TrendingUp className={`w-4 h-4 ${reportData.summary.realizedGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <p className={`text-lg sm:text-xl font-bold ${reportData.summary.realizedGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(reportData.summary.realizedGrossProfit)}
              </p>
              <span className="text-[10px] text-slate-400">الإيراد - التكلفة الكلية</span>
            </div>

            {/* Card 8 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>هامش الربح %</span>
                <PieChart className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg sm:text-xl font-bold text-emerald-400">
                {reportData.summary.profitMarginPercent}%
              </p>
              <span className="text-[10px] text-slate-400">نسبة الربح من الإيراد</span>
            </div>

            {/* Card 9 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>متوسط الربح / سيارة</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-emerald-400">
                {formatCurrency(reportData.summary.averageProfitPerSoldVehicle)}
              </p>
              <span className="text-[10px] text-slate-400">للسيارات المباعة فقط</span>
            </div>

            {/* Card 10 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>تكلفة المخزون المتبقي</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-amber-400">
                {formatCurrency(reportData.summary.unsoldInventoryCost)}
              </p>
              <span className="text-[10px] text-slate-400">قيمة السيارات غير المباعة</span>
            </div>

            {/* Card 11 */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>متوسط مدة البيع</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-lg sm:text-xl font-bold text-white">
                {reportData.summary.averageDaysToSell} <span className="text-xs text-slate-400">يوم</span>
              </p>
              <span className="text-[10px] text-slate-400">من الشراء حتى عقد البيع</span>
            </div>
          </div>

          {/* Vehicle Detail Table & Controls */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-700/60 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-white">تفاصيل سيارات المورد</h3>
                <p className="text-xs text-slate-400">
                  عرض {filteredVehicles.length} من أصل {reportData.vehicles.length} سيارات
                </p>
              </div>

              {/* Table Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="بحث بالشاسي، الموديل، المرجع..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold sticky top-0 border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">الشاسي (VIN)</th>
                    <th className="py-3 px-3">السيارة</th>
                    <th className="py-3 px-3">الفرع</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => { setSortColumn('purchaseDate'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>
                      تاريخ الشراء
                    </th>
                    <th className="py-3 px-3">تكلفة الشراء</th>
                    <th className="py-3 px-3">المصاريف الإضافية</th>
                    <th className="py-3 px-3">إجمالي التكلفة</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => { setSortColumn('saleDate'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>
                      تاريخ البيع
                    </th>
                    <th className="py-3 px-3">رقم الفاتورة</th>
                    <th className="py-3 px-3">صافي الإيراد</th>
                    <th className="py-3 px-3">الربح المحقق</th>
                    <th className="py-3 px-3">الهامش %</th>
                    <th className="py-3 px-3">مدة البيع</th>
                    <th className="py-3 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400">
                        لا توجد سيارات مطابقة لخصائص البحث والفلترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr
                        key={v.vehicleId}
                        onClick={() => setSelectedVehicle(v)}
                        className="hover:bg-slate-700/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-medium text-slate-200">{v.stockNumber}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{v.vin}</td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {v.brand} {v.model} {v.year}
                        </td>
                        <td className="py-3 px-3 text-slate-400">{v.branchName}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('ar-IQ') : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono">{formatCurrency(v.purchaseCost)}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{formatCurrency(v.additionalCosts)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-100">{formatCurrency(v.totalVehicleCost)}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {v.saleDate ? new Date(v.saleDate).toLocaleDateString('ar-IQ') : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-medium">{v.saleNumber || '-'}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                          {v.status === 'Sold' ? formatCurrency(v.netRevenue) : '-'}
                        </td>
                        <td className={`py-3 px-3 font-mono font-bold ${v.status === 'Sold' ? (v.realizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                          {v.status === 'Sold' ? formatCurrency(v.realizedProfit) : '-'}
                        </td>
                        <td className={`py-3 px-3 font-semibold ${v.status === 'Sold' ? (v.profitMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                          {v.status === 'Sold' ? `${v.profitMarginPercent}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-300">{v.daysToSell} يوم</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              v.status === 'Sold'
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {v.status === 'Sold' ? 'مباعة' : 'في المخزون'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Totals Footer */}
                {filteredVehicles.length > 0 && (
                  <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-white">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-left">الإجمالي الفعلي:</td>
                      <td className="py-3 px-3 font-mono">{formatCurrency(tableTotals.purchaseCost)}</td>
                      <td className="py-3 px-3 font-mono">{formatCurrency(tableTotals.additionalCosts)}</td>
                      <td className="py-3 px-3 font-mono">{formatCurrency(tableTotals.totalVehicleCost)}</td>
                      <td colSpan={2}></td>
                      <td className="py-3 px-3 font-mono text-emerald-400">{formatCurrency(tableTotals.netRevenue)}</td>
                      <td className={`py-3 px-3 font-mono ${tableTotals.realizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(tableTotals.realizedProfit)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Slide-over Detail Drawer */}
      <AnimatePresence>
        {selectedVehicle && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-slate-900 border-r border-slate-800 h-full p-6 overflow-y-auto space-y-6 text-slate-200"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">تفاصيل ربحية السيارة</h3>
                  <p className="text-xs text-slate-400 font-mono">VIN: {selectedVehicle.vin}</p>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Vehicle Specs */}
              <div className="bg-slate-800/60 p-4 rounded-xl space-y-2 border border-slate-700/50 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">الماركة والموديل:</span><span className="font-semibold text-white">{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الفئة / Trim:</span><span className="text-slate-300">{selectedVehicle.trim || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الفرع:</span><span className="text-slate-300">{selectedVehicle.branchName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">رقم الفاتورة/المرجع:</span><span className="font-mono text-emerald-400">{selectedVehicle.stockNumber}</span></div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase">تفاصيل التكلفة الدفترية</h4>
                <div className="bg-slate-800/60 p-4 rounded-xl space-y-2 border border-slate-700/50 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-400">تكلفة الشراء الأساسية:</span><span>{formatCurrency(selectedVehicle.purchaseCost)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">المصاريف الإضافية (جمرك/شحن/صيانة):</span><span>{formatCurrency(selectedVehicle.additionalCosts)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-white text-sm">
                    <span>إجمالي تكلفة السيارة:</span><span>{formatCurrency(selectedVehicle.totalVehicleCost)}</span>
                  </div>
                </div>
              </div>

              {/* Sale Info (If Sold) */}
              {selectedVehicle.status === 'Sold' ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase">تفاصيل البيع والربح المحقق</h4>
                  <div className="bg-emerald-950/20 p-4 rounded-xl space-y-2 border border-emerald-500/30 text-xs font-mono">
                    <div className="flex justify-between"><span className="text-slate-400">رقم عقد البيع:</span><span className="text-emerald-400">{selectedVehicle.saleNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">تاريخ البيع:</span><span className="text-slate-300">{selectedVehicle.saleDate ? new Date(selectedVehicle.saleDate).toLocaleDateString('ar-IQ') : '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">سعر البيع الأساسي:</span><span>{formatCurrency(selectedVehicle.salePrice)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">الخصم الممنوح:</span><span>{formatCurrency(selectedVehicle.discount)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-700 text-sm font-bold text-emerald-400">
                      <span>صافي الإيراد:</span><span>{formatCurrency(selectedVehicle.netRevenue)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700 text-sm font-bold text-emerald-400">
                      <span>الربح الإجمالي المحقق:</span><span>{formatCurrency(selectedVehicle.realizedProfit)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-300">
                      <span>هامش الربح %:</span><span>{selectedVehicle.profitMarginPercent}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                  السيارة لا تزال في المخزون الحالي ولم يتم إنتاج عقد بيع مؤكد لها حتى الآن.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
