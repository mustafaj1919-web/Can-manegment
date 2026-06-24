'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { RecentSalesWidget } from '@/components/dashboard/RecentSalesWidget'
import { SmartAlertsWidget } from '@/components/dashboard/SmartAlertsWidget'
import { QuickStatsWidget } from '@/components/dashboard/QuickStatsWidget'
import { InstallmentSummaryPanel } from '@/components/dashboard/InstallmentSummaryPanel'
import { DashboardStatusBar } from '@/components/dashboard/DashboardStatusBar'
import { CashFlowWaterfall } from '@/components/charts/CashFlowWaterfall'
import { InventoryDonut } from '@/components/charts/InventoryDonut'
import { ArAgingChart } from '@/components/charts/ArAgingChart'
import { FinancialChartWidget } from '@/components/dashboard/FinancialChartWidget'
import { InventoryStatusWidget } from '@/components/dashboard/InventoryStatusWidget'
import { Button } from '@/components/ui/button'
import { CalendarDays, Car, Plus, ReceiptText, TrendingUp, LayoutDashboard, Calculator } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const RevenueChartWidget = dynamic(
  () => import('@/components/dashboard/RevenueChartWidget').then((mod) => mod.RevenueChartWidget),
  { ssr: false, loading: () => <div className="h-[316px] animate-pulse rounded-xl border border-border-subtle bg-bg-surface" /> }
)

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'صباح الخير'
  if (hour < 17) return 'مساء الخير'
  return 'مساء النور'
}

function getArabicDate() {
  return new Date().toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const activeBranch = useBranchStore((state) => state.activeBranch)
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6 pb-10"
      dir="rtl"
    >
      {/* Header Banner */}
      <section className="dashboard-command-header">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-bold text-primary">لوحة إدارة المعرض</p>
          <h1 className="mt-2 text-[28px] font-black tracking-tight text-foreground">
            {getGreeting()}{user?.username ? `، ${user.username}` : ''}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            هذه نظرة اليوم على المبيعات والسيولة والمخزون والتحصيل في {activeBranch?.name ?? 'الفرع الرئيسي'}.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground/75">
            <CalendarDays className="h-3.5 w-3.5" />
            {getArabicDate()}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-10 bg-bg-surface/70">
            <Link href="/inventory/new">
              <Car className="h-4 w-4" />
              إضافة سيارة
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 bg-bg-surface/70">
            <Link href="/expenses/new">
              <ReceiptText className="h-4 w-4" />
              تسجيل مصروف
            </Link>
          </Button>
          <Button asChild className="h-10">
            <Link href="/cashier/new-sale">
              <Plus className="h-4 w-4" />
              عملية بيع جديدة
            </Link>
          </Button>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/40 gap-6 text-sm font-semibold select-none pb-0 pt-2">
        {[
          { id: 'overview', label: 'نظرة عامة والتحذيرات', icon: LayoutDashboard },
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
                isActive ? 'text-primary font-black' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{tab.label}</span>
              {isActive && (
                <motion.span
                  layoutId="active-dashboard-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary"
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
            <>
              <DashboardStatusBar />
              <KpiCards />
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <RevenueChartWidget />
                </div>
                <div className="xl:col-span-4 flex flex-col">
                  <SmartAlertsWidget />
                </div>
              </div>

              {/* Quick shortcuts */}
              <section className="rounded-xl border border-border-subtle bg-bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black text-foreground">اختصارات التشغيل</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">أكثر الإجراءات استخداماً داخل المعرض.</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['بيع جديد', '/sales/new'],
                    ['تحصيل قسط', '/cashier/installment-payment'],
                    ['عميل جديد', '/customers/new'],
                    ['تقرير الأرباح', '/reports/monthly-profit'],
                  ].map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      className="rounded-lg border border-border-subtle bg-secondary/40 px-4 py-3 text-xs font-bold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.05] hover:text-primary text-center"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </section>
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
    </motion.div>
  )
}
