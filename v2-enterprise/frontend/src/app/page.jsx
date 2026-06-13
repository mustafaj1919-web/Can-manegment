'use client'

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
import { DashboardInsights } from '@/components/dashboard/DashboardInsights'
import { CashFlowWaterfall } from '@/components/charts/CashFlowWaterfall'
import { InventoryDonut } from '@/components/charts/InventoryDonut'
import { ArAgingChart } from '@/components/charts/ArAgingChart'
import { SalesTrendSparkline } from '@/components/charts/SalesTrendSparkline'
import { TopModelsChart } from '@/components/charts/TopModelsChart'
import { WeeklySalesHeatmap } from '@/components/charts/WeeklySalesHeatmap'
import { Button } from '@/components/ui/button'
import { CalendarDays, Car, Plus, ReceiptText, TrendingUp } from 'lucide-react'

import { motion } from 'framer-motion'

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 pb-10" 
      dir="rtl"
    >
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

      <DashboardStatusBar />
      <KpiCards />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <RevenueChartWidget />
        </div>
        <div className="xl:col-span-4">
          <QuickStatsWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <RecentSalesWidget />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <SmartAlertsWidget />
          <DashboardInsights />
        </div>
      </div>

      <InstallmentSummaryPanel />

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <CashFlowWaterfall />
        <InventoryDonut />
        <ArAgingChart />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SalesTrendSparkline />
        <TopModelsChart />
        <WeeklySalesHeatmap />
      </div>

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
            <Link key={href} href={href} className="rounded-lg border border-border-subtle bg-secondary/40 px-4 py-3 text-xs font-bold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.05] hover:text-primary">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </motion.div>
  )
}
