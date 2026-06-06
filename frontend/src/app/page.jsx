'use client'

import { ActivityTimelineWidget } from '../components/dashboard/ActivityTimelineWidget'
import { BranchPerformanceWidget } from '../components/dashboard/BranchPerformanceWidget'
import { ExchangeRateWidget } from '../components/dashboard/ExchangeRateWidget'
import { FinancialChartWidget } from '../components/dashboard/FinancialChartWidget'
import { FinancialSummaryWidget } from '../components/dashboard/FinancialSummaryWidget'
import { HeroBanner } from '../components/dashboard/HeroBanner'
import { InstallmentRiskWidget } from '../components/dashboard/InstallmentRiskWidget'
import { InventoryPreviewWidget } from '../components/dashboard/InventoryPreviewWidget'
import { KpiCards } from '../components/dashboard/KpiCards'
import { ManagementPanel } from '../components/dashboard/ManagementPanel'
import { RecentSalesWidget } from '../components/dashboard/RecentSalesWidget'
import { SmartAlertsWidget } from '../components/dashboard/SmartAlertsWidget'
import { SmartDailySummaryWidget } from '../components/dashboard/SmartDailySummaryWidget'
import { CashFlowForecastWidget } from '../components/dashboard/CashFlowForecastWidget'
import { MomComparisonWidget } from '../components/dashboard/MomComparisonWidget'
import { AnomalyWidget } from '../components/dashboard/AnomalyWidget'
import { ExpenseAnalysisWidget } from '../components/dashboard/ExpenseAnalysisWidget'

function RowLabel({ children }) {
  return <p className="dash-row-label">{children}</p>
}

export default function DashboardPage() {
  return (
    <div className="space-y-3">
      <HeroBanner />
      <KpiCards />

      {/* ── الذكاء — الصف الأول ── */}
      <RowLabel>النظام الذكي</RowLabel>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <SmartDailySummaryWidget />
        <SmartAlertsWidget />
      </div>

      {/* ── تحليل مالي ذكي ── */}
      <RowLabel>التحليل الذكي</RowLabel>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-5"><CashFlowForecastWidget /></div>
        <div className="xl:col-span-4"><MomComparisonWidget /></div>
        <div className="xl:col-span-3"><AnomalyWidget /></div>
      </div>

      <ManagementPanel />

      {/* ── التحليل المالي ── */}
      <RowLabel>التحليل المالي</RowLabel>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-7"><FinancialChartWidget /></div>
        <div className="xl:col-span-5"><InstallmentRiskWidget /></div>
      </div>

      {/* ── المصاريف ── */}
      <RowLabel>المصاريف والمخزون</RowLabel>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ExpenseAnalysisWidget />
        <InventoryPreviewWidget />
      </div>

      <RowLabel>العمليات</RowLabel>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-8"><RecentSalesWidget /></div>
        <div className="xl:col-span-4"><FinancialSummaryWidget /></div>
      </div>

      <RowLabel>النشاط والبيانات</RowLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ActivityTimelineWidget />
        <ExchangeRateWidget />
      </div>

      <RowLabel>أداء الفروع</RowLabel>
      <BranchPerformanceWidget />
    </div>
  )
}
