'use client'

import { ActivityTimelineWidget }   from '../components/dashboard/ActivityTimelineWidget'
import { AnomalyWidget }            from '../components/dashboard/AnomalyWidget'
import { BranchPerformanceWidget }  from '../components/dashboard/BranchPerformanceWidget'
import { CashFlowForecastWidget }   from '../components/dashboard/CashFlowForecastWidget'
import { ExchangeRateWidget }       from '../components/dashboard/ExchangeRateWidget'
import { ExpenseAnalysisWidget }    from '../components/dashboard/ExpenseAnalysisWidget'
import { FinancialChartWidget }     from '../components/dashboard/FinancialChartWidget'
import { FinancialSummaryWidget }   from '../components/dashboard/FinancialSummaryWidget'
import { HeroBanner }               from '../components/dashboard/HeroBanner'
import { InstallmentRiskWidget }    from '../components/dashboard/InstallmentRiskWidget'
import { InventoryPreviewWidget }   from '../components/dashboard/InventoryPreviewWidget'
import { KpiCards }                 from '../components/dashboard/KpiCards'
import { ManagementPanel }          from '../components/dashboard/ManagementPanel'
import { MomComparisonWidget }      from '../components/dashboard/MomComparisonWidget'
import { RecentSalesWidget }        from '../components/dashboard/RecentSalesWidget'
import { SmartAlertsWidget }        from '../components/dashboard/SmartAlertsWidget'
import { SmartDailySummaryWidget }  from '../components/dashboard/SmartDailySummaryWidget'

export default function DashboardPage() {
  return (
    <div>

      {/* ── Zone 1: Command Center ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <HeroBanner />
        <KpiCards />
      </div>

      {/* ── Zone 2: Daily Operations ────────────────────────────────────────── */}
      <div className="mt-10 space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SmartDailySummaryWidget />
          <SmartAlertsWidget />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5"><CashFlowForecastWidget /></div>
          <div className="xl:col-span-4"><MomComparisonWidget /></div>
          <div className="xl:col-span-3"><AnomalyWidget /></div>
        </div>
      </div>

      {/* ── Zone 3: Management ──────────────────────────────────────────────── */}
      <div className="mt-8">
        <ManagementPanel />
      </div>

      {/* ── Zone 4: Analytics ───────────────────────────────────────────────── */}
      <div className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7"><FinancialChartWidget /></div>
          <div className="xl:col-span-5"><InstallmentRiskWidget /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ExpenseAnalysisWidget />
          <InventoryPreviewWidget />
        </div>
      </div>

      {/* ── Zone 5: Activity & Summary ──────────────────────────────────────── */}
      <div className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8"><RecentSalesWidget /></div>
          <div className="xl:col-span-4"><FinancialSummaryWidget /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ActivityTimelineWidget />
          <ExchangeRateWidget />
        </div>
        <BranchPerformanceWidget />
      </div>

    </div>
  )
}
