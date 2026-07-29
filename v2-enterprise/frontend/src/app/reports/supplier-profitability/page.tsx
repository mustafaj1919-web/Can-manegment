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
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Car,
  DollarSign,
  Package,
  Clock,
  ChevronLeft,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  FileText,
  PieChart,
  Info,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Tag
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

  // UI Table density & search
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>('comfortable')
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

  // Fetch report when supplier or filters change
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
      setLastRefreshed(new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }))
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء احتساب كشف ربحية المورد.')
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

  // Automated reconciliation check
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-4 sm:p-6 lg:p-8 dir-rtl" dir="rtl">
      {/* SECTION 1: Executive Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 print:hidden">
        <div>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
            <span>التقارير المالية</span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 rotate-180" />
            <span className="text-slate-900 font-semibold">كشف ربحية المورد</span>
          </nav>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              كشف ربحية المورد
            </h1>
            <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold rounded-full">
              IQD · الدينار العراقي
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wide">
            Supplier Realized Gross Profitability Statement
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {lastRefreshed && (
            <span className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hidden sm:inline-block">
              تحديث: {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchReport}
            disabled={loadingReport || !selectedSupplierId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingReport ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData || filteredVehicles.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة A4
          </button>
        </div>
      </div>

      {/* SECTION 2: Enterprise Single Container Filter Bar */}
      <form onSubmit={handleApplyFilters} className="bg-white border border-slate-200 rounded-xl p-4 my-6 shadow-sm print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          {/* Supplier Selector (Primary Focus) */}
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              المورد المستهدف <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                disabled={loadingSuppliers}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 disabled:opacity-50"
              >
                {loadingSuppliers ? (
                  <option value="">جاري تحميل الموردين...</option>
                ) : suppliers.length === 0 ? (
                  <option value="">لا يوجد موردين متاحين</option>
                ) : (
                  suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ({s.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Sale Date From */}
          <div className="w-36">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              تاريخ البيع من
            </label>
            <input
              type="date"
              value={saleDateFrom}
              onChange={(e) => setSaleDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          {/* Sale Date To */}
          <div className="w-36">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              تاريخ البيع إلى
            </label>
            <input
              type="date"
              value={saleDateTo}
              onChange={(e) => setSaleDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-36">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              الفرع
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            >
              <option value="all">كافة الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="w-28">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">الماركة</label>
            <input
              type="text"
              placeholder="Toyota..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          {/* Model */}
          <div className="w-28">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">الموديل</label>
            <input
              type="text"
              placeholder="Camry..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          {/* Year */}
          <div className="w-24">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">السنة</label>
            <input
              type="number"
              placeholder="2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>

          {/* Status */}
          <div className="w-32">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">الحالة</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
            >
              <option value="all">كافة الحالات</option>
              <option value="sold">المباعة فقط</option>
              <option value="unsold">غير المباعة فقط</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
            >
              إعادة ضبط
            </button>
            <button
              type="submit"
              disabled={loadingReport}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              تطبيق الفلترة
            </button>
          </div>
        </div>

        {/* Informational Disclosure Rule Note */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>
            <strong>قاعدة احتساب الفترة:</strong> أرقام الإيراد والربح تعتمد على تاريخ عقد البيع المؤكد، بينما المخزون المتبقي يمثل الوضع الحالي للسيارات غير المباعة.
          </span>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Financial Analytics Workspace */}
      {loadingReport ? (
        <div className="py-28 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl">
          <RefreshCw className="w-8 h-8 text-teal-700 animate-spin" />
          <p className="text-slate-600 text-xs font-semibold">جاري احتساب البيانات المالية وتسوية الحركات...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* SECTION 4: Executive Supplier Overview Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-bold text-lg">
                {reportData.supplier.name ? reportData.supplier.name.substring(0, 2) : 'SUP'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{reportData.supplier.name}</h2>
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono rounded">
                    {reportData.supplier.code}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  {reportData.supplier.phone && <span>الهاتف: {reportData.supplier.phone}</span>}
                  <span>إجمالي السيارات: <strong className="text-slate-900">{reportData.summary.purchasedVehicleCount}</strong></span>
                  <span>المباعة: <strong className="text-emerald-700">{reportData.summary.soldVehicleCount}</strong></span>
                  <span>المتبقية: <strong className="text-amber-700">{reportData.summary.unsoldVehicleCount}</strong></span>
                </div>
              </div>
            </div>

            {/* Integrity Reconciliation Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <ShieldCheck className={`w-4 h-4 ${isReconciled ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="font-semibold text-slate-700">
                {isReconciled ? 'حسابات مطابقة 100%' : 'تنبيه تسوية'}
              </span>
            </div>
          </div>

          {/* SECTION 3: Executive KPI Strip with Visual Hierarchy */}
          <div className="space-y-4">
            {/* Primary Dominant KPIs (Row 1) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primary KPI 1: Realized Gross Profit */}
              <div className={`p-6 rounded-xl border shadow-sm transition-all ${
                reportData.summary.realizedGrossProfit >= 0
                  ? 'bg-gradient-to-br from-teal-900 to-slate-900 text-white border-teal-800'
                  : 'bg-gradient-to-br from-red-900 to-slate-900 text-white border-red-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-teal-200 uppercase tracking-wider">
                    الربح الإجمالي المحقق (Realized Profit)
                  </span>
                  {reportData.summary.realizedGrossProfit >= 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="text-3xl font-bold font-mono tracking-tight my-1">
                  {formatCurrency(reportData.summary.realizedGrossProfit)}
                </div>
                <div className="flex items-center justify-between text-xs text-teal-200/80 mt-3 pt-2 border-t border-teal-800/60">
                  <span>هامش الربح الإجمالي: <strong>{reportData.summary.profitMarginPercent}%</strong></span>
                  <span>نسبة العلامة: <strong>{reportData.summary.markupPercent}%</strong></span>
                </div>
              </div>

              {/* Primary KPI 2: Realized Revenue */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    إيرادات السيارات المباعة (Net Revenue)
                  </span>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight my-1">
                  {formatCurrency(reportData.summary.realizedRevenue)}
                </div>
                <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                  صافي قيمة عقود البيع النشطة للسيارات المباعة
                </div>
              </div>

              {/* Primary KPI 3: Cost of Sold Vehicles */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    تكلفة المباع (Cost of Goods Sold)
                  </span>
                  <TrendingDown className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight my-1">
                  {formatCurrency(reportData.summary.costOfSoldVehicles)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                  <span>شراء أساسي: {formatCurrency(reportData.summary.costOfSoldVehicles - reportData.summary.directCosts)}</span>
                  <span>مصاريف إضافية: {formatCurrency(reportData.summary.directCosts)}</span>
                </div>
              </div>
            </div>

            {/* Secondary Metrics Strip (Row 2) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="block text-[11px] font-semibold text-slate-500">السيارات المباعة</span>
                <span className="text-lg font-bold text-emerald-600 font-mono mt-0.5 block">
                  {formatNumber(reportData.summary.soldVehicleCount)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="block text-[11px] font-semibold text-slate-500">السيارات غير المباعة</span>
                <span className="text-lg font-bold text-amber-600 font-mono mt-0.5 block">
                  {formatNumber(reportData.summary.unsoldVehicleCount)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="block text-[11px] font-semibold text-slate-500">متوسط الربح / سيارة</span>
                <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                  {formatCurrency(reportData.summary.averageProfitPerSoldVehicle)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="block text-[11px] font-semibold text-slate-500">تكلفة المخزون المتبقي</span>
                <span className="text-base font-bold text-amber-700 font-mono mt-0.5 block">
                  {formatCurrency(reportData.summary.unsoldInventoryCost)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="block text-[11px] font-semibold text-slate-500">إجمالي قيم المشتريات</span>
                <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                  {formatCurrency(reportData.summary.purchaseValue)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="block text-[11px] font-semibold text-slate-500">متوسط سرعة البيع</span>
                <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                  {reportData.summary.averageDaysToSell} <span className="text-xs font-normal text-slate-500">يوم</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5 & 6: Financial Analytics & Model Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Profit Trend (Card 1) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">مسار الأرباح الشهرية</h3>
                <span className="text-[11px] text-slate-500">حسب تاريخ عقد البيع</span>
              </div>
              {reportData.monthlyTrend.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">لا توجد حركات بيع شهري في الفترة المحددة</p>
              ) : (
                <div className="space-y-3">
                  {reportData.monthlyTrend.map((m) => (
                    <div key={m.period} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{m.period}</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(m.profit)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, (m.profit / (reportData.summary.realizedGrossProfit || 1)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>مبيعات: {m.soldCount} سيارات</span>
                        <span>إيراد: {formatCurrency(m.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Model Profitability Breakdown (Card 2 & 3) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">ربحية الموديلات الأكثر مبيعاً</h3>
                <span className="text-[11px] text-slate-500">مرتبة حسب أعلى إجمالي ربح محقق</span>
              </div>
              {reportData.modelBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">لا توجد بيانات موديلات مبيعة</p>
              ) : (
                <div className="space-y-3">
                  {reportData.modelBreakdown.slice(0, 5).map((mb) => (
                    <div key={`${mb.brand}-${mb.model}`} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{mb.brand} {mb.model}</span>
                        <span className="text-[11px] text-slate-500 block">عدد المباع: {mb.soldCount} سيارات</span>
                      </div>
                      <div className="text-left font-mono">
                        <div className="font-bold text-emerald-700">{formatCurrency(mb.profit)}</div>
                        <div className="text-[10px] text-slate-500">هامش: {mb.marginPercent}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 7: Executive Enterprise Vehicle Detail Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Table Control Header */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 print:hidden">
              <div>
                <h3 className="text-sm font-bold text-slate-900">جدول حركات وتفاصيل السيارات</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  عرض {filteredVehicles.length} من أصل {reportData.vehicles.length} سيارات مرتبطة بالمورد
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث بالشاسي، الموديل، المرجع..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                {/* Density Toggle */}
                <button
                  onClick={() => setTableDensity(d => d === 'comfortable' ? 'compact' : 'comfortable')}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  {tableDensity === 'comfortable' ? 'عرض مدمج' : 'عرض مريح'}
                </button>
              </div>
            </div>

            {/* Financial Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-slate-800">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">الشاسي (VIN)</th>
                    <th className="py-3 px-3">السيارة والموديل</th>
                    <th className="py-3 px-3">الفرع</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-teal-800" onClick={() => { setSortColumn('purchaseDate'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>
                      تاريخ الشراء
                    </th>
                    <th className="py-3 px-3 text-left">تكلفة الشراء</th>
                    <th className="py-3 px-3 text-left">المصاريف الإضافية</th>
                    <th className="py-3 px-3 text-left">إجمالي التكلفة</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-teal-800" onClick={() => { setSortColumn('saleDate'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>
                      تاريخ البيع
                    </th>
                    <th className="py-3 px-3">عقد البيع</th>
                    <th className="py-3 px-3 text-left">صافي الإيراد</th>
                    <th className="py-3 px-3 text-left">الربح المحقق</th>
                    <th className="py-3 px-3 text-left">الهامش %</th>
                    <th className="py-3 px-3 text-center">المدة</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-500 text-xs">
                        لا توجد سجلات سيارات مطابقة لشروط البحث المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr
                        key={v.vehicleId}
                        onClick={() => setSelectedVehicle(v)}
                        className={`hover:bg-teal-50/40 cursor-pointer transition-colors ${
                          tableDensity === 'compact' ? 'py-1.5' : 'py-3'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{v.stockNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{v.vin}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {v.brand} {v.model} {v.year}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{v.branchName}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('ar-IQ') : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-left">{formatCurrency(v.purchaseCost)}</td>
                        <td className="py-2.5 px-3 font-mono text-left text-slate-500">{formatCurrency(v.additionalCosts)}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-left text-slate-900">{formatCurrency(v.totalVehicleCost)}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {v.saleDate ? new Date(v.saleDate).toLocaleDateString('ar-IQ') : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-teal-700 font-medium">{v.saleNumber || '-'}</td>
                        <td className="py-2.5 px-3 font-mono text-left font-semibold text-emerald-700">
                          {v.status === 'Sold' ? formatCurrency(v.netRevenue) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 font-mono text-left font-bold ${
                          v.status === 'Sold' ? (v.realizedProfit >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-400'
                        }`}>
                          {v.status === 'Sold' ? formatCurrency(v.realizedProfit) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 text-left font-semibold ${
                          v.status === 'Sold' ? (v.profitMarginPercent >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-400'
                        }`}>
                          {v.status === 'Sold' ? `${v.profitMarginPercent}%` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{v.daysToSell} يوم</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.status === 'Sold'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {v.status === 'Sold' ? 'مباعة' : 'في المخزون'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Sticky Totals Footer */}
                {filteredVehicles.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-left">الإجمالي الفعلي لجدول العرض:</td>
                      <td className="py-3 px-3 font-mono text-left">{formatCurrency(tableTotals.purchaseCost)}</td>
                      <td className="py-3 px-3 font-mono text-left">{formatCurrency(tableTotals.additionalCosts)}</td>
                      <td className="py-3 px-3 font-mono text-left">{formatCurrency(tableTotals.totalVehicleCost)}</td>
                      <td colSpan={2}></td>
                      <td className="py-3 px-3 font-mono text-left text-emerald-700">{formatCurrency(tableTotals.netRevenue)}</td>
                      <td className={`py-3 px-3 font-mono text-left ${tableTotals.realizedProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
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

      {/* Professional Right Slide-over Detail Drawer */}
      <AnimatePresence>
        {selectedVehicle && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-white border-r border-slate-200 h-full p-6 overflow-y-auto space-y-6 text-slate-800 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">تفاصيل الربحية الفردية للسيارة</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">VIN: {selectedVehicle.vin}</p>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Vehicle Identity */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">الماركة والموديل:</span><span className="font-bold text-slate-900">{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">الفئة / Trim:</span><span className="text-slate-700">{selectedVehicle.trim || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">الفرع:</span><span className="text-slate-700">{selectedVehicle.branchName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">رقم الفاتورة المرجعي:</span><span className="font-mono text-teal-700 font-bold">{selectedVehicle.stockNumber}</span></div>
              </div>

              {/* Cost Accounting Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">احتساب تكلفة الاستحواذ (Acquisition Cost)</h4>
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">سعر الشراء الأساسي للمورد:</span><span>{formatCurrency(selectedVehicle.purchaseCost)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">مصاريف مباشرة (جمرك/تحسين/صيانة):</span><span>{formatCurrency(selectedVehicle.additionalCosts)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                    <span>إجمالي تكلفة السيارة الفعالية:</span><span>{formatCurrency(selectedVehicle.totalVehicleCost)}</span>
                  </div>
                </div>
              </div>

              {/* Sale & Profit Realization Details */}
              {selectedVehicle.status === 'Sold' ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase">نتائج البيع والربح المحقق</h4>
                  <div className="bg-emerald-50/50 p-4 rounded-xl space-y-2 border border-emerald-200 text-xs font-mono">
                    <div className="flex justify-between"><span className="text-slate-500">رقم عقد البيع:</span><span className="text-teal-800 font-bold">{selectedVehicle.saleNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">تاريخ إبرام البيع:</span><span className="text-slate-700">{selectedVehicle.saleDate ? new Date(selectedVehicle.saleDate).toLocaleDateString('ar-IQ') : '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">سعر البيع بالعقد:</span><span>{formatCurrency(selectedVehicle.salePrice)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">الخصم الممنوح:</span><span>{formatCurrency(selectedVehicle.discount)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-emerald-200 text-sm font-bold text-emerald-800">
                      <span>صافي الإيراد المحصل:</span><span>{formatCurrency(selectedVehicle.netRevenue)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-emerald-200 text-sm font-bold text-emerald-800">
                      <span>الربح الإجمالي المحقق:</span><span>{formatCurrency(selectedVehicle.realizedProfit)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-800">
                      <span>هامش الربح %:</span><span>{selectedVehicle.profitMarginPercent}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  السيارة ما زالت متوفرة في المخزون الحالي، ولن يتم احتساب إيرادات أو أرباح محققة لها لحين توثيق عقد بيع نشط.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
