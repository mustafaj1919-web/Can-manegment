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
  Tag,
  BarChart3,
  LineChart as LineIcon,
  UserCheck,
  Hash,
  PhoneCall,
  MapPin,
  CalendarRange,
  Zap,
  ArrowRight
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

  // UI Table density, search & drawer
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

  // Derived Supplier Profile Meta (First/Last purchase dates, avg purchase cost)
  const supplierProfileMeta = useMemo(() => {
    if (!reportData?.vehicles || reportData.vehicles.length === 0) {
      return { firstPurchase: '-', latestPurchase: '-', avgPurchaseCost: 0 }
    }
    const dates = reportData.vehicles
      .map((v) => (v.purchaseDate ? new Date(v.purchaseDate).getTime() : 0))
      .filter((d) => d > 0)
      .sort((a, b) => a - b)

    const firstPurchase = dates.length > 0 ? new Date(dates[0]).toLocaleDateString('ar-IQ') : '-'
    const latestPurchase = dates.length > 0 ? new Date(dates[dates.length - 1]).toLocaleDateString('ar-IQ') : '-'

    const totalCostSum = reportData.vehicles.reduce((sum, v) => sum + (v.totalVehicleCost || 0), 0)
    const avgPurchaseCost = reportData.vehicles.length > 0 ? totalCostSum / reportData.vehicles.length : 0

    return { firstPurchase, latestPurchase, avgPurchaseCost }
  }, [reportData?.vehicles])

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
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] font-sans px-4 sm:px-8 py-6 dir-rtl" dir="rtl">
      {/* HEADER SECTION: Executive ERP Header */}
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] print:hidden">
        {/* LEFT: Breadcrumbs */}
        <div className="flex flex-col">
          <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] font-medium mb-1">
            <span>التقارير المالية</span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 rotate-180" />
            <span className="text-[#111827] font-semibold">كشف ربحية المورد</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[34px] font-bold text-[#111827] tracking-tight leading-tight">
              كشف ربحية المورد
            </h1>
            <span className="px-3 py-1 bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold rounded-full">
              IQD · الدينار العراقي
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5 font-mono tracking-wide">
            Supplier Realized Gross Profitability Statement — CFO Cockpit Mode
          </p>
        </div>

        {/* RIGHT: Action Tools */}
        <div className="flex items-center gap-2.5">
          {lastRefreshed && (
            <span className="text-xs text-[#6B7280] bg-white px-3 py-2 rounded-lg border border-[#E5E7EB] shadow-xs hidden sm:inline-block">
              تحديث: <strong className="text-[#111827]">{lastRefreshed}</strong>
            </span>
          )}
          <button
            onClick={fetchReport}
            disabled={loadingReport || !selectedSupplierId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#111827] border border-[#E5E7EB] rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#6B7280] ${loadingReport ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData || filteredVehicles.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#0F766E] border border-teal-200 rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0F766E]" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F766E] hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة A4
          </button>
        </div>
      </header>

      {/* FILTER BAR SECTION: Single Sticky Enterprise Toolbar */}
      <div className="sticky top-0 z-30 bg-white border border-[#E5E7EB] rounded-xl p-3.5 my-6 shadow-xs print:hidden">
        <form onSubmit={handleApplyFilters} className="flex flex-wrap items-center gap-3">
          {/* Supplier Selector (Large Searchable) */}
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
              المورد المستهدف <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              disabled={loadingSuppliers}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white focus:ring-1 focus:ring-[#0F766E] disabled:opacity-50"
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

          {/* Sale Date From */}
          <div className="w-36">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">تاريخ البيع من</label>
            <input
              type="date"
              value={saleDateFrom}
              onChange={(e) => setSaleDateFrom(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            />
          </div>

          {/* Sale Date To */}
          <div className="w-36">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">تاريخ البيع إلى</label>
            <input
              type="date"
              value={saleDateTo}
              onChange={(e) => setSaleDateTo(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-32">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">الفرع</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            >
              <option value="all">كافة الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="w-28">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">الماركة</label>
            <input
              type="text"
              placeholder="Toyota..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            />
          </div>

          {/* Model */}
          <div className="w-28">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">الموديل</label>
            <input
              type="text"
              placeholder="Camry..."
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            />
          </div>

          {/* Year */}
          <div className="w-20">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">السنة</label>
            <input
              type="number"
              placeholder="2025"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            />
          </div>

          {/* Status */}
          <div className="w-28">
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">الحالة</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E] focus:bg-white"
            >
              <option value="all">كافة الحالات</option>
              <option value="sold">المباعة فقط</option>
              <option value="unsold">غير المباعة</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mr-auto pt-4 sm:pt-0">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#111827] rounded-lg text-xs font-semibold transition-all"
            >
              تصفير
            </button>
            <button
              type="submit"
              disabled={loadingReport}
              className="px-4 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
            >
              تطبيق
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      {loadingReport ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 bg-white border border-[#E5E7EB] rounded-xl">
          <RefreshCw className="w-8 h-8 text-[#0F766E] animate-spin" />
          <p className="text-[#6B7280] text-xs font-semibold">جاري احتساب البيانات وتسوية الأرباح...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* SUPPLIER PROFILE PANEL: CRM Style Executive Panel */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] font-bold text-xl shadow-xs">
                {reportData.supplier.name ? reportData.supplier.name.substring(0, 2) : 'SUP'}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-[#111827]">{reportData.supplier.name}</h2>
                  <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-[#6B7280] text-[11px] font-mono rounded-md font-semibold">
                    كود: {reportData.supplier.code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] mt-1.5">
                  {reportData.supplier.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                      {reportData.supplier.phone}
                    </span>
                  )}
                  <span>أول عملية شراء: <strong className="text-[#111827] font-mono">{supplierProfileMeta.firstPurchase}</strong></span>
                  <span>آخر عملية شراء: <strong className="text-[#111827] font-mono">{supplierProfileMeta.latestPurchase}</strong></span>
                  <span>متوسط تكلفة السيارة: <strong className="text-[#111827] font-mono">{formatCurrency(supplierProfileMeta.avgPurchaseCost)}</strong></span>
                </div>
              </div>
            </div>

            {/* Reconciliation Shield */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg">
              <ShieldCheck className={`w-5 h-5 ${isReconciled ? 'text-[#16A34A]' : 'text-[#D97706]'}`} />
              <div>
                <span className="block text-xs font-bold text-[#111827]">
                  {isReconciled ? 'مطابقة محاسبية بنسبة 100%' : 'تحذير عدم مطابقة'}
                </span>
                <span className="text-[10px] text-[#6B7280]">
                  {isReconciled ? 'جميع أرقام الإيراد والتكلفة متطابقة كلياً' : 'توجد فروقات تتطلب المراجعة'}
                </span>
              </div>
            </div>
          </div>

          {/* EXECUTIVE KPI SECTION: Strict Visual Hierarchy */}
          <div className="space-y-4">
            {/* ROW 1: Hero Card (40%) + Medium Cards (60%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* HERO CARD: Realized Gross Profit (40% width / 5 cols) */}
              <div className={`lg:col-span-5 p-6 rounded-xl border shadow-xs flex flex-col justify-between ${
                reportData.summary.realizedGrossProfit >= 0
                  ? 'bg-gradient-to-br from-[#0F766E] to-slate-900 text-white border-teal-800'
                  : 'bg-gradient-to-br from-[#DC2626] to-slate-900 text-white border-red-800'
              }`}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-teal-100">
                      الربح الإجمالي المحقق (Realized Gross Profit)
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/10 backdrop-blur-xs text-xs rounded-md font-bold">
                      الرئيسي
                    </span>
                  </div>
                  <div className="text-[42px] font-bold font-mono tracking-tight leading-none my-4">
                    {formatCurrency(reportData.summary.realizedGrossProfit)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15 text-xs text-teal-100/90">
                  <div>
                    <span className="block text-[11px] text-teal-200/70">هامش الربح الإجمالي</span>
                    <span className="text-lg font-bold font-mono">{reportData.summary.profitMarginPercent}%</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-teal-200/70">نسبة الإضافة (Markup %)</span>
                    <span className="text-lg font-bold font-mono">{reportData.summary.markupPercent}%</span>
                  </div>
                </div>
              </div>

              {/* ROW 1 RIGHT: Revenue & Cost of Goods Sold (7 cols) */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#6B7280] font-semibold mb-2">
                      <span>إيرادات السيارات المباعة</span>
                      <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <div className="text-[28px] font-bold font-mono text-[#111827] tracking-tight my-2">
                      {formatCurrency(reportData.summary.realizedRevenue)}
                    </div>
                  </div>
                  <div className="text-xs text-[#6B7280] pt-3 border-t border-[#E5E7EB]">
                    صافي إيراد {reportData.summary.soldVehicleCount} عقود بيع مؤكدة
                  </div>
                </div>

                {/* COGS Card */}
                <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#6B7280] font-semibold mb-2">
                      <span>تكلفة السيارات المباعة</span>
                      <TrendingDown className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-[28px] font-bold font-mono text-[#111827] tracking-tight my-2">
                      {formatCurrency(reportData.summary.costOfSoldVehicles)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6B7280] pt-3 border-t border-[#E5E7EB]">
                    <span>أصل الشراء: {formatCurrency(reportData.summary.costOfSoldVehicles - reportData.summary.directCosts)}</span>
                    <span>المصاريف: {formatCurrency(reportData.summary.directCosts)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Secondary Metrics Strip (8 Metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">السيارات المباعة</span>
                <span className="text-base font-bold text-[#16A34A] font-mono mt-0.5 block">
                  {formatNumber(reportData.summary.soldVehicleCount)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">السيارات المتبقية</span>
                <span className="text-base font-bold text-[#D97706] font-mono mt-0.5 block">
                  {formatNumber(reportData.summary.unsoldVehicleCount)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">متوسط الربح / سيارة</span>
                <span className="text-sm font-bold text-[#111827] font-mono mt-0.5 block">
                  {formatCurrency(reportData.summary.averageProfitPerSoldVehicle)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">تكلفة المخزون المتبقي</span>
                <span className="text-sm font-bold text-[#D97706] font-mono mt-0.5 block">
                  {formatCurrency(reportData.summary.unsoldInventoryCost)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">إجمالي الشراء الأساسي</span>
                <span className="text-sm font-bold text-[#111827] font-mono mt-0.5 block">
                  {formatCurrency(reportData.summary.purchaseValue)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">متوسط سرعة البيع</span>
                <span className="text-base font-bold text-[#111827] font-mono mt-0.5 block">
                  {reportData.summary.averageDaysToSell} <span className="text-xs font-normal text-[#6B7280]">يوم</span>
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">السيارات المرتبطة</span>
                <span className="text-base font-bold text-[#111827] font-mono mt-0.5 block">
                  {formatNumber(reportData.summary.purchasedVehicleCount)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-xs">
                <span className="block text-[11px] font-semibold text-[#6B7280]">نسبة Markup</span>
                <span className="text-base font-bold text-[#0F766E] font-mono mt-0.5 block">
                  {reportData.summary.markupPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* CHARTS SECTION: Executive 5 Financial Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Chart 1: Monthly Profit Trend */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#111827]">1. مسار الأرباح الشهري</h3>
                <span className="text-[11px] text-[#6B7280]">Line Trend</span>
              </div>
              {reportData.monthlyTrend.length === 0 ? (
                <p className="text-xs text-[#6B7280] py-12 text-center">لا توجد حركات بيع شهري في الفترة المحددة</p>
              ) : (
                <div className="space-y-3">
                  {reportData.monthlyTrend.map((m) => (
                    <div key={m.period} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#111827]">{m.period}</span>
                        <span className="font-mono text-[#16A34A]">{formatCurrency(m.profit)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#16A34A] h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, (m.profit / (reportData.summary.realizedGrossProfit || 1)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart 2: Revenue vs Cost Comparison */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#111827]">2. التناسب بين الإيراد والتكلفة</h3>
                <span className="text-[11px] text-[#6B7280]">Area Ratio</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#111827]">إيرادات المباع (Net Revenue)</span>
                    <span className="font-mono text-[#16A34A]">{formatCurrency(reportData.summary.realizedRevenue)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-[#16A34A] h-full rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#111827]">تكلفة المباع (COGS)</span>
                    <span className="font-mono text-slate-700">{formatCurrency(reportData.summary.costOfSoldVehicles)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-slate-700 h-full rounded-full"
                      style={{
                        width: `${reportData.summary.realizedRevenue > 0 ? (reportData.summary.costOfSoldVehicles / reportData.summary.realizedRevenue) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 3: Sold vs Unsold Ratio */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#111827]">3. نسبة المبيعات إلى المخزون</h3>
                <span className="text-[11px] text-[#6B7280]">Donut Ratio</span>
              </div>
              <div className="flex items-center justify-around py-4">
                <div className="text-center">
                  <span className="block text-2xl font-bold font-mono text-[#16A34A]">
                    {reportData.summary.soldVehicleCount}
                  </span>
                  <span className="text-xs text-[#6B7280]">سيارات مباعة</span>
                </div>
                <div className="h-10 w-px bg-[#E5E7EB]" />
                <div className="text-center">
                  <span className="block text-2xl font-bold font-mono text-[#D97706]">
                    {reportData.summary.unsoldVehicleCount}
                  </span>
                  <span className="text-xs text-[#6B7280]">في المخزون</span>
                </div>
              </div>
            </div>
          </div>

          {/* ENTERPRISE VEHICLE DETAIL TABLE SECTION */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
            {/* Control Toolbar */}
            <div className="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#F8FAFC] print:hidden">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">جدول حركات وتفاصيل السيارات</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  عرض {filteredVehicles.length} من أصل {reportData.vehicles.length} سيارات
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث بالشاسي، الموديل، المرجع..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg pr-8 pl-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0F766E]"
                  />
                </div>

                <button
                  onClick={() => setTableDensity(d => d === 'comfortable' ? 'compact' : 'comfortable')}
                  className="px-2.5 py-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#111827] rounded-lg text-xs font-semibold"
                >
                  {tableDensity === 'comfortable' ? 'عرض مدمج' : 'عرض مريح'}
                </button>
              </div>
            </div>

            {/* Financial Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-[#111827]">
                <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-[#E5E7EB] sticky top-0 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">الشاسي (VIN)</th>
                    <th className="py-3 px-3">الماركة والموديل</th>
                    <th className="py-3 px-3">الفرع</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-[#0F766E]" onClick={() => { setSortColumn('purchaseDate'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>
                      تاريخ الشراء
                    </th>
                    <th className="py-3 px-3 text-left">تكلفة الشراء</th>
                    <th className="py-3 px-3 text-left">المصاريف الإضافية</th>
                    <th className="py-3 px-3 text-left">إجمالي التكلفة</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-[#0F766E]" onClick={() => { setSortColumn('saleDate'); setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }}>
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
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-[#6B7280] text-xs">
                        لا توجد سجلات سيارات مطابقة لشروط البحث المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr
                        key={v.vehicleId}
                        onClick={() => setSelectedVehicle(v)}
                        className={`hover:bg-teal-50/50 cursor-pointer transition-colors ${
                          tableDensity === 'compact' ? 'py-1.5' : 'py-3'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{v.stockNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-[#6B7280]">{v.vin}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#111827]">
                          {v.brand} {v.model} {v.year}
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7280]">{v.branchName}</td>
                        <td className="py-2.5 px-3 text-[#6B7280]">
                          {v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('ar-IQ') : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-left">{formatCurrency(v.purchaseCost)}</td>
                        <td className="py-2.5 px-3 font-mono text-left text-[#6B7280]">{formatCurrency(v.additionalCosts)}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-left text-[#111827]">{formatCurrency(v.totalVehicleCost)}</td>
                        <td className="py-2.5 px-3 text-[#6B7280]">
                          {v.saleDate ? new Date(v.saleDate).toLocaleDateString('ar-IQ') : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#0F766E] font-medium">{v.saleNumber || '-'}</td>
                        <td className="py-2.5 px-3 font-mono text-left font-semibold text-[#16A34A]">
                          {v.status === 'Sold' ? formatCurrency(v.netRevenue) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 font-mono text-left font-bold ${
                          v.status === 'Sold' ? (v.realizedProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]') : 'text-slate-400'
                        }`}>
                          {v.status === 'Sold' ? formatCurrency(v.realizedProfit) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 text-left font-semibold ${
                          v.status === 'Sold' ? (v.profitMarginPercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]') : 'text-slate-400'
                        }`}>
                          {v.status === 'Sold' ? `${v.profitMarginPercent}%` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#6B7280]">{v.daysToSell} يوم</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              v.status === 'Sold'
                                ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                                : 'bg-amber-50 text-[#D97706] border border-amber-200'
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
                  <tfoot className="bg-[#F8FAFC] font-bold border-t-2 border-[#E5E7EB] text-[#111827] text-xs">
                    <tr>
                      <td colSpan={5} className="py-3.5 px-3 text-left">الإجمالي الفعلي لجدول العرض:</td>
                      <td className="py-3.5 px-3 font-mono text-left">{formatCurrency(tableTotals.purchaseCost)}</td>
                      <td className="py-3.5 px-3 font-mono text-left">{formatCurrency(tableTotals.additionalCosts)}</td>
                      <td className="py-3.5 px-3 font-mono text-left">{formatCurrency(tableTotals.totalVehicleCost)}</td>
                      <td colSpan={2}></td>
                      <td className="py-3.5 px-3 font-mono text-left text-[#16A34A]">{formatCurrency(tableTotals.netRevenue)}</td>
                      <td className={`py-3.5 px-3 font-mono text-left ${tableTotals.realizedProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
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

      {/* RIGHT SLIDE-OVER DRAWER WITH VISUAL WATERFALL BREAKDOWN */}
      <AnimatePresence>
        {selectedVehicle && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-white border-r border-[#E5E7EB] h-full p-6 overflow-y-auto space-y-6 text-[#111827] shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                <div>
                  <h3 className="text-base font-bold text-[#111827]">تفاصيل الربحية الفردية للسيارة</h3>
                  <p className="text-xs text-[#6B7280] font-mono mt-0.5">VIN: {selectedVehicle.vin}</p>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-[#6B7280] rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Vehicle Identity */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2 border border-[#E5E7EB] text-xs">
                <div className="flex justify-between"><span className="text-[#6B7280]">الماركة والموديل:</span><span className="font-bold text-[#111827]">{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">الفئة / Trim:</span><span className="text-slate-700">{selectedVehicle.trim || '-'}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">الفرع:</span><span className="text-slate-700">{selectedVehicle.branchName}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">رقم الفاتورة المرجعي:</span><span className="font-mono text-[#0F766E] font-bold">{selectedVehicle.stockNumber}</span></div>
              </div>

              {/* FINANCIAL WATERFALL COMPONENT */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  شجرة التسلسل المالي والربح المحقق (Waterfall Breakdown)
                </h4>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-700">
                    <span>1. سعر الشراء الأساسي (Supplier Price):</span>
                    <span>{formatCurrency(selectedVehicle.purchaseCost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pl-4 border-r-2 border-slate-300">
                    <span>+ مصاريف صيانة وجمرك وشحن:</span>
                    <span>{formatCurrency(selectedVehicle.additionalCosts)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E5E7EB] font-bold text-[#111827]">
                    <span>= إجمالي تكلفة السيارة الكلية (Total Cost):</span>
                    <span>{formatCurrency(selectedVehicle.totalVehicleCost)}</span>
                  </div>

                  {selectedVehicle.status === 'Sold' ? (
                    <>
                      <div className="flex justify-between pt-2 text-[#16A34A]">
                        <span>2. صافي إيراد البيع بالعقد (Net Revenue):</span>
                        <span>{formatCurrency(selectedVehicle.netRevenue)}</span>
                      </div>
                      <div className={`flex justify-between pt-2 border-t-2 border-[#E5E7EB] font-bold text-base ${
                        selectedVehicle.realizedProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}>
                        <span>= الربح الإجمالي المحقق (Realized Profit):</span>
                        <span>{formatCurrency(selectedVehicle.realizedProfit)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="pt-2 text-amber-700 text-[11px] font-sans">
                      السيارة متوفرة في المخزون حالياً (لم تُباع بعد).
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
