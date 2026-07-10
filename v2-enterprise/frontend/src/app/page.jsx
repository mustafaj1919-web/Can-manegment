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
  LayoutDashboard, Calculator, Search, Bell, ShieldAlert,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatMoney } from '@/lib/utils'
import { getDashboardStats } from '@/lib/api/dashboard'

const RecentSalesWidget = dynamic(
  () => import('@/components/dashboard/RecentSalesWidget').then((m) => m.RecentSalesWidget),
  { ssr: false }
)
const SmartAlertsWidget = dynamic(
  () => import('@/components/dashboard/SmartAlertsWidget').then((m) => m.SmartAlertsWidget),
  { ssr: false }
)
const QuickStatsWidget = dynamic(
  () => import('@/components/dashboard/QuickStatsWidget').then((m) => m.QuickStatsWidget),
  { ssr: false }
)
const InstallmentSummaryPanel = dynamic(
  () => import('@/components/dashboard/InstallmentSummaryPanel').then((m) => m.InstallmentSummaryPanel),
  { ssr: false }
)
const RevenueChartWidget = dynamic(
  () => import('@/components/dashboard/RevenueChartWidget').then((m) => m.RevenueChartWidget),
  { ssr: false, loading: () => <div className="h-[316px] animate-pulse rounded-[22px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950" /> }
)
const CashFlowWaterfall = dynamic(
  () => import('@/components/charts/CashFlowWaterfall').then((m) => m.CashFlowWaterfall),
  { ssr: false }
)
const InventoryDonut = dynamic(
  () => import('@/components/charts/InventoryDonut').then((m) => m.InventoryDonut),
  { ssr: false }
)
const ArAgingChart = dynamic(
  () => import('@/components/charts/ArAgingChart').then((m) => m.ArAgingChart),
  { ssr: false }
)
const FinancialChartWidget = dynamic(
  () => import('@/components/dashboard/FinancialChartWidget').then((m) => m.FinancialChartWidget),
  { ssr: false }
)
const InventoryStatusWidget = dynamic(
  () => import('@/components/dashboard/InventoryStatusWidget').then((m) => m.InventoryStatusWidget),
  { ssr: false }
)

const TABS = [
  { id: 'overview',   label: 'نظرة عامة',       icon: LayoutDashboard },
  { id: 'financials', label: 'الأداء المالي',    icon: Calculator },
  { id: 'inventory',  label: 'المخزون والمبيعات', icon: Car },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const activeBranch = useBranchStore((s) => s.activeBranch)
  const [activeTab, setActiveTab] = useState('overview')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })

  const overdueCount = stats?.overdue_installments ?? 0

  return (
    <div className="space-y-5 pb-12 text-right" dir="rtl">

      {/* Header */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-950 p-5 rounded-[22px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button asChild className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl gap-2 shrink-0">
            <Link href="/cashier/new-sale">
              <Plus className="h-4 w-4" />
              بيع جديد (POS)
            </Link>
          </Button>
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          </Link>
          <div className="relative flex-1 md:w-56 flex items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 gap-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="البحث في النظام..."
              className="bg-transparent border-none text-xs outline-none text-slate-700 dark:text-slate-300 w-full text-right placeholder-slate-400"
            />
          </div>
        </div>

        <div className="text-right w-full md:w-auto">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            لوحة الإدارة — {activeBranch?.name ?? 'الفرع الرئيسي'}
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center justify-end gap-1.5">
            <span>{new Date().toLocaleDateString('ar-IQ', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'المخزون المتاح',
            value: isLoading ? '...' : (stats?.available_cars ?? 0),
            sub: `قيمة المخزون: ${isLoading ? '...' : formatMoney(stats?.inventory_value ?? 0, 'IQD')}`,
            badge: 'نشط',
            badgeColor: 'emerald',
            icon: Car,
          },
          {
            label: 'خطط أقساط نشطة',
            value: isLoading ? '...' : (stats?.installments ?? 0),
            sub: `عقود الشهر: ${stats?.cars_sold_month ?? 0}`,
            badge: 'مستقر',
            badgeColor: 'blue',
            icon: CalendarDays,
          },
          {
            label: 'تحصيلات الشهر',
            value: isLoading ? '...' : formatMoney(stats?.monthly_sales_paid ?? 0, 'IQD'),
            sub: `مبيعات: ${stats?.cars_sold_month ?? 0} سيارة`,
            badge: 'ممتاز',
            badgeColor: 'sky',
            icon: TrendingUp,
          },
          {
            label: 'أقساط متأخرة',
            value: isLoading ? '...' : overdueCount,
            sub: `المتأخرات: ${isLoading ? '...' : formatMoney(stats?.overdue_amount ?? 0, 'IQD')}`,
            badge: overdueCount > 0 ? 'مراجعة' : 'سليم',
            badgeColor: overdueCount > 0 ? 'rose' : 'slate',
            icon: ShieldAlert,
          },
        ].map(({ label, value, sub, badge, badgeColor, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-slate-950 p-5 rounded-[20px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-${badgeColor}-50 dark:bg-${badgeColor}-950/20 text-${badgeColor}-600`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-right min-w-0">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`rounded-full bg-${badgeColor}-50 dark:bg-${badgeColor}-950/30 px-2 py-0.5 text-[9px] font-bold text-${badgeColor}-600 border border-${badgeColor}-100 dark:border-${badgeColor}-800/40`}>
                  {badge}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{label}</span>
              </div>
              <p className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
              <p className="mt-1 text-[9px] text-slate-400 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-6">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'relative flex items-center gap-2 pb-3 text-[13px] font-bold transition-colors duration-200 focus:outline-none',
                active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {active && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-5"
        >
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <RevenueChartWidget />
                </div>
                <div className="space-y-5 xl:col-span-4">
                  <QuickStatsWidget />
                  <SmartAlertsWidget />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <RecentSalesWidget />
                </div>
                <div className="xl:col-span-4">
                  <InstallmentSummaryPanel />
                </div>
              </div>
            </>
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <CashFlowWaterfall />
                <InventoryDonut />
                <ArAgingChart />
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
              <InventoryStatusWidget />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quick shortcuts */}
      <section className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <div className="text-right">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">اختصارات التشغيل</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">أكثر الإجراءات استخداماً.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['بيع جديد',       '/sales/new'],
            ['تحصيل قسط',     '/cashier/installment-payment'],
            ['عميل جديد',     '/customers/new'],
            ['تقرير الأرباح', '/reports/monthly-profit'],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors hover:border-blue-200 dark:hover:border-blue-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
