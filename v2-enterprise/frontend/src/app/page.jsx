'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { Button } from '@/components/ui/button'
import {
  CalendarDays, Car, Plus, ReceiptText, TrendingUp,
  LayoutDashboard, Calculator, ChevronLeft, Search, Bell,
  ShieldAlert, Activity, CheckCircle2, ArrowUpRight, DollarSign,
  Droplet, Award, Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatMoney } from '@/lib/utils'
import { getDashboardStats, getNotifications } from '@/lib/api/dashboard'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

// Dynamic imports for other tabs to keep bundles lean
const RecentSalesWidget = dynamic(
  () => import('@/components/dashboard/RecentSalesWidget').then((mod) => mod.RecentSalesWidget),
  { ssr: false }
)
const QuickStatsWidget = dynamic(
  () => import('@/components/dashboard/QuickStatsWidget').then((mod) => mod.QuickStatsWidget),
  { ssr: false }
)
const InstallmentSummaryPanel = dynamic(
  () => import('@/components/dashboard/InstallmentSummaryPanel').then((mod) => mod.InstallmentSummaryPanel),
  { ssr: false }
)
const CashFlowWaterfall = dynamic(
  () => import('@/components/charts/CashFlowWaterfall').then((mod) => mod.CashFlowWaterfall),
  { ssr: false }
)
const InventoryDonut = dynamic(
  () => import('@/components/charts/InventoryDonut').then((mod) => mod.InventoryDonut),
  { ssr: false }
)
const ArAgingChart = dynamic(
  () => import('@/components/charts/ArAgingChart').then((mod) => mod.ArAgingChart),
  { ssr: false }
)
const FinancialChartWidget = dynamic(
  () => import('@/components/dashboard/FinancialChartWidget').then((mod) => mod.FinancialChartWidget),
  { ssr: false }
)
const InventoryStatusWidget = dynamic(
  () => import('@/components/dashboard/InventoryStatusWidget').then((mod) => mod.InventoryStatusWidget),
  { ssr: false }
)

// Mock 30-day area graph trends matching Vitalis chart shape
const MOCK_TRENDS_DATA = [
  { day: 'Apr 24', cash: 40, sales: 24, installments: 30 },
  { day: 'May 01', cash: 45, sales: 28, installments: 35 },
  { day: 'May 08', cash: 42, sales: 30, installments: 38 },
  { day: 'May 15', cash: 50, sales: 35, installments: 45 },
  { day: 'May 23', cash: 48, sales: 32, installments: 40 },
]

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const activeBranch = useBranchStore((state) => state.activeBranch)
  const [activeTab, setActiveTab] = useState('overview')
  const [trendMetric, setTrendMetric] = useState('cash') // cash | sales | installments

  // Load live statistics from dashboard endpoints
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })

  // Load real logs/notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30_000,
  })

  const overdueCount = stats?.overdue_installments ?? 0
  const activeContractsCount = stats?.installments ?? 0

  return (
    <div className="space-y-6 pb-12 text-right select-none" dir="rtl">
      
      {/* ─── 1. TOP HEADER BAR (Vitalis Mockup Layout) ─── */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-950 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
        
        {/* Left Side: Search, Notification Bell, Log Entry Call-To-Action */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {/* Action button */}
          <Button asChild className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 gap-2 shrink-0">
            <Link href="/cashier/new-sale">
              <Plus className="h-4 w-4" />
              <span>إجراء بيع (POS)</span>
            </Link>
          </Button>

          {/* Notification Bell */}
          <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 hover:text-slate-800 transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          </Link>

          {/* Search Bar Capsule */}
          <div className="relative flex-1 md:w-60 flex items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2">
            <Search className="h-4 w-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="البحث في النظام..."
              className="bg-transparent border-none text-xs outline-none text-slate-700 dark:text-slate-300 w-full text-right placeholder-slate-400"
            />
          </div>
        </div>

        {/* Right Side: Title & Synchronized Status */}
        <div className="text-right w-full md:w-auto">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white font-family-cairo">
            لوحة الإدارة والتحليل
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center justify-end gap-1.5">
            <span>مزامنة مباشرة • {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </p>
        </div>

      </section>

      {/* ─── 2. TOP METRICS GRID (Row of 4 Cards matching Vitalis) ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI Card 1: Vehicles Count */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
            <Car className="h-5 w-5" />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-100 dark:border-emerald-800/40">
                نشط
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-family-cairo">المخزون المتاح</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white leading-none font-numeric">
              {statsLoading ? '...' : (stats?.available_cars ?? 72)}
            </p>
            <p className="mt-1 text-[9px] text-slate-400 font-semibold">
              المخزون الكلي: {statsLoading ? '...' : formatMoney(stats?.inventory_value ?? 0, 'IQD')}
            </p>
          </div>
        </div>

        {/* KPI Card 2: Active Contracts */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-100 dark:border-blue-800/40">
                مستقر
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-family-cairo">خطة قسط نشطة</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white leading-none font-numeric">
              {statsLoading ? '...' : activeContractsCount}
            </p>
            <p className="mt-1 text-[9px] text-slate-400 font-semibold">
              إجمالي العملاء: {stats?.installments ?? 0} خطة عقد
            </p>
          </div>
        </div>

        {/* KPI Card 3: Collection Rate */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950/20 text-sky-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="rounded-full bg-sky-50 dark:bg-sky-950/30 px-2 py-0.5 text-[9px] font-bold text-sky-600 border border-sky-100 dark:border-sky-800/40">
                ممتاز
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-family-cairo">تحصيلات الشهر</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white leading-none font-numeric">
              {statsLoading ? '...' : formatMoney(stats?.monthly_sales_paid ?? 0, 'IQD')}
            </p>
            <p className="mt-1 text-[9px] text-slate-400 font-semibold">
              تم بيع {stats?.cars_sold_month ?? 0} سيارة هذا الشهر
            </p>
          </div>
        </div>

        {/* KPI Card 4: Overdue Collections */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-bold border",
                overdueCount > 0
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 border-rose-100 dark:border-rose-800/40"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100"
              )}>
                {overdueCount > 0 ? 'مراجعة' : 'سليم'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-family-cairo">أقساط متأخرة</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white leading-none font-numeric">
              {statsLoading ? '...' : overdueCount}
            </p>
            <p className="mt-1 text-[9px] text-slate-400 font-semibold">
              إجمالي المتأخرات: {statsLoading ? '...' : formatMoney(stats?.overdue_amount ?? 0, 'IQD')}
            </p>
          </div>
        </div>

      </section>

      {/* ─── 3. TABS NAVIGATION ─── */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-6 text-sm font-semibold pb-0 pt-2">
        {[
          { id: 'overview', label: 'نظرة عامة والتحليلات', icon: LayoutDashboard },
          { id: 'financials', label: 'الأداء المالي والسيولة', icon: Calculator },
          { id: 'inventory', label: 'المخزون وحركة المبيعات', icon: Car },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 pb-3 transition-colors duration-200 focus:outline-none text-[13px] sm:text-sm font-bold',
                isActive ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="active-dashboard-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* ─── LEFT COLUMN (Trends, Hydration, Metrics, Aging) ─── */}
              <div className="xl:col-span-8 space-y-6">
                
                {/* 30-Day Trends (Area Chart Card) */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    {/* Metric Selectors */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                      {[
                        { id: 'cash', label: 'السيولة' },
                        { id: 'sales', label: 'المبيعات' },
                        { id: 'installments', label: 'الأقساط' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setTrendMetric(m.id)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                            trendMetric === m.id
                              ? "bg-white dark:bg-slate-850 text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800/80"
                              : "text-slate-400 hover:text-slate-700"
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Left title info */}
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">تحليلات الأداء المالي</span>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-family-cairo mt-1">حركة الصندوق والسيولة (30 يوماً)</h2>
                    </div>
                  </div>

                  {/* Recharts Area Chart Stage */}
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_TRENDS_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} textAnchor="end" />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey={trendMetric}
                          stroke="#2563EB"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorTrend)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sub-grid: Hydration (Daily Inflows), Quick KPIs, Debt Aging (Sleep style) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card A: Inflow Levels (Hydration cup style) */}
                  <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 font-family-cairo">هدف التدفق المالي</span>
                        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white font-family-cairo">حركة الصناديق اليومية</h3>
                      </div>
                      
                      {/* 5 Fluid level bars */}
                      <div className="flex items-end justify-center gap-2 my-5 h-16">
                        {[
                          { val: 'h-16', active: true },
                          { val: 'h-16', active: true },
                          { val: 'h-16', active: true },
                          { val: 'h-10', active: true },
                          { val: 'h-6', active: false },
                        ].map((cup, i) => (
                          <div key={i} className="w-6 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 rounded-md overflow-hidden flex flex-col justify-end">
                            {cup.active && (
                              <div className={cn("w-full bg-blue-500 rounded-b-[4px]", cup.val)} />
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="text-center text-xs font-bold text-slate-800 dark:text-slate-200 font-numeric">
                        1.6M <span className="text-[9px] text-slate-400">من 2.5M د.ع الهدف اليومي</span>
                      </p>
                    </div>

                    <Button asChild className="w-full mt-4 h-9 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl gap-1">
                      <Link href="/vouchers">
                        <Plus className="h-3.5 w-3.5" />
                        <span>تسجيل دفعة كاش</span>
                      </Link>
                    </Button>
                  </div>

                  {/* Card B: Quick Metrics Grid */}
                  <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 dark:text-white font-family-cairo mb-4 text-right">
                        المؤشرات السريعة اليوم
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* Transaction box */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                          <Activity className="h-3.5 w-3.5 text-blue-500 mx-auto" />
                          <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1.5">12</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">معاملة</p>
                        </div>
                        {/* Journal Entry box */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                          <ReceiptText className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                          <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1.5">1</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">قيد نشط</p>
                        </div>
                        {/* Credit score */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                          <Award className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                          <p className="text-[10px] font-black text-slate-800 dark:text-white mt-1.5">7/10</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">الائتمان</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 text-center">
                      <span className="text-[9px] font-bold text-slate-400">معدل تحصيل الأسبوع</span>
                      <p className="text-[10px] font-extrabold text-emerald-500 font-numeric mt-0.5">94.2% ممتاز</p>
                    </div>
                  </div>

                  {/* Card C: Debt Aging distribution (Sleep style) */}
                  <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-slate-400">جودة الذمم</span>
                        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white font-family-cairo">أعمار الديون والذمم</h3>
                      </div>
                      
                      <div className="text-center my-3">
                        <p className="text-lg font-black text-slate-800 dark:text-white font-numeric leading-none">
                          7 أيام
                        </p>
                        <p className="text-[8px] text-slate-400 mt-1">متوسط فترة التحصيل</p>
                      </div>

                      {/* Segmented color bar (safe | warning | overdue) */}
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex flex-row">
                        <div className="bg-blue-500 w-[70%]" />
                        <div className="bg-amber-500 w-[20%]" />
                        <div className="bg-rose-500 w-[10%]" />
                      </div>

                      <div className="grid grid-cols-3 gap-1 mt-3 text-center text-[8px] font-bold">
                        <div>
                          <p className="text-slate-400">ديون سليمة</p>
                          <p className="text-blue-500 font-numeric mt-0.5">70%</p>
                        </div>
                        <div>
                          <p className="text-slate-400">قيد الانتظار</p>
                          <p className="text-amber-500 font-numeric mt-0.5">20%</p>
                        </div>
                        <div>
                          <p className="text-slate-400">متأخرة</p>
                          <p className="text-rose-500 font-numeric mt-0.5">10%</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-3 flex items-center justify-between text-[9px] font-bold text-slate-500">
                      <span className="font-numeric">88/100</span>
                      <span>مؤشر الأمان المالي</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* ─── RIGHT COLUMN (Goals & Real-time Action Logs) ─── */}
              <div className="xl:col-span-4 space-y-6">
                
                {/* Goals Card (Daily Goals) */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-bold text-slate-400 font-family-cairo">الأهداف التشغيلية</span>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white font-family-cairo">أهداف المعرض الحالية</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Goal item 1 */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-emerald-500 font-numeric">84%</span>
                        <span className="text-slate-600 dark:text-slate-300">تحصيل أقساط هذا الشهر</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[84%] rounded-full" />
                      </div>
                    </div>
                    {/* Goal item 2 */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-blue-500 font-numeric">64%</span>
                        <span className="text-slate-600 dark:text-slate-300">تصفية مخزون السيارات</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[64%] rounded-full" />
                      </div>
                    </div>
                    {/* Goal item 3 */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-amber-500 font-numeric">96%</span>
                        <span className="text-slate-600 dark:text-slate-300">إبرام وتوثيق العقود اليومية</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[96%] rounded-full" />
                      </div>
                    </div>
                    {/* Goal item 4 */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-rose-500 font-numeric">73%</span>
                        <span className="text-slate-600 dark:text-slate-300">تدقيق عهد الموظفين النقدية</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full w-[73%] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Today's Log Card (Feed logs & due installment checklist) */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                  
                  {/* Timeline Feed Log Section */}
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white font-family-cairo mb-4 text-right">
                      سجل النشاط المالي الفوري
                    </h3>
                    
                    <div className="space-y-3.5">
                      {[
                        { time: '06:44 AM', text: 'تم تسجيل عقد بيع سيارة مرسيدس C300' },
                        { time: '07:15 AM', text: 'استلام قسط وارد بقيمة 2.5M د.ع' },
                        { time: '07:30 AM', text: 'تسجيل سند صرف مصاريف تشغيلية' },
                        { time: '08:00 AM', text: 'تعديل حالة مركبة نيسان باترول' },
                      ].map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-right">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">{log.text}</p>
                            <span className="text-[8px] text-slate-400 font-numeric mt-0.5 block">{log.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800/80" />

                  {/* Installment checklist (Today's due checks) */}
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white font-family-cairo mb-4 text-right">
                      متابعة تحصيل الأقساط العاجلة
                    </h3>
                    
                    <div className="space-y-2.5">
                      {[
                        { name: 'أحمد حسن - قسط #5', status: 'مستلم', paid: true },
                        { name: 'جعفر علي - قسط #2', status: 'مستلم', paid: true },
                        { name: 'سيف الدين - قسط #8', status: '6:00 PM', paid: false },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/40">
                          <span className={cn(
                            "text-[8px] font-bold rounded px-1.5 py-0.5 border",
                            item.paid
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-800/40"
                              : "bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200"
                          )}>
                            {item.status}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-full flex items-center justify-center border",
                              item.paid ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300"
                            )}>
                              {item.paid && <CheckCircle2 className="h-2.5 w-2.5" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {activeTab === 'financials' && (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <FinancialChartWidget />
                </div>
                <div className="xl:col-span-4">
                  <QuickStatsWidget />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <CashFlowWaterfall />
                </div>
                <div className="xl:col-span-4">
                  <InstallmentSummaryPanel />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <ArAgingChart />
                </div>
              </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <RecentSalesWidget />
                </div>
                <div className="xl:col-span-4">
                  <InventoryDonut />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <InventoryStatusWidget />
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
