'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, TrendingUp, Sparkles, Loader2 } from 'lucide-react'
import { getCars } from '@/lib/api/inventory'
import { getDashboardStats } from '@/lib/api/dashboard'
import { getSales } from '@/lib/api/sales'
import { cn } from '@/lib/utils'

function shortenMoney(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B IQD`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M IQD`
  return `${amount.toLocaleString()} IQD`
}

export function DashboardInsights() {
  // Query Stats
  const { data: stats, isLoading: loadStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  // Query Cars to check stagnant inventory
  const { data: carsData, isLoading: loadCars } = useQuery({
    queryKey: ['dash-insights-cars'],
    queryFn: () => getCars({ status: 'Available', per_page: 50 }),
  })

  // Query Sales to check recent performance
  const { data: salesData, isLoading: loadSales } = useQuery({
    queryKey: ['dash-insights-sales'],
    queryFn: () => getSales({ per_page: 10 }),
  })

  const isLoading = loadStats || loadCars || loadSales

  if (isLoading) {
    return (
      <div className="bg-bg-surface border border-subtle rounded-xl p-5 flex items-center justify-center h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground ms-2 font-family-cairo">جاري توليد الرؤى والتحليلات...</span>
      </div>
    )
  }

  // 1. Calculate Stagnant Capital
  const cars = carsData?.items || []
  const now = Date.now()
  const stagnantCars = cars.filter(c => {
    if (!c.created_at) return false
    const diff = now - new Date(c.created_at).getTime()
    return diff > 30 * 24 * 3600 * 1000 // Over 30 days
  })
  const stagnantCount = stagnantCars.length
  const stagnantValue = stagnantCars.reduce((acc, c) => acc + (c.purchase_price || 0), 0)

  // 2. Overdue Installments Analysis
  const overdueCount = stats?.overdue_installments ?? 0
  const overdueAmount = stats?.overdue_amount ?? 0

  // 3. Average Sales Value
  const sales = salesData?.items || []
  const avgSalesValue = sales.length > 0 
    ? sales.reduce((acc, s) => acc + (s.selling_price || 0), 0) / sales.length
    : 0

  return (
    <div className="bg-bg-surface border border-subtle rounded-xl p-5 space-y-4 shadow-sm" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-subtle">
        <div className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-black text-foreground font-family-cairo">الرؤى والتحليلات الذكية</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">مؤشرات تشغيلية مستنتجة تلقائياً لتوجيه أداء المعرض</p>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3.5">
        {/* Insight 1: Stagnant inventory */}
        {stagnantCount > 0 ? (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-semibold font-family-cairo">
              <span>{stagnantCount} سيارات راكدة في المخزون منذ أكثر من 30 يوماً</span>
              <span className="opacity-60 block mt-0.5">تكلفة رأس المال المجمد: {shortenMoney(stagnantValue)} · يُنصح بتسويقها أو عمل خصومات لتسهيل السيولة.</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-semibold font-family-cairo">
              <span>معدل دوران المخزون ممتاز</span>
              <span className="opacity-60 block mt-0.5">لا توجد سيارات راكدة لأكثر من 30 يوماً في الصالة حالياً.</span>
            </div>
          </div>
        )}

        {/* Insight 2: Overdue payments */}
        {overdueCount > 0 ? (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-semibold font-family-cairo">
              <span>رصد {overdueCount} أقساط متعثرة ومستحقة السداد فوراً</span>
              <span className="opacity-60 block mt-0.5">إجمالي قيمة ذمم التعثر الحالية: {shortenMoney(overdueAmount)} · يرجى مراجعة لوحة المخاطر وجدولة الاتصال بالعملاء.</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-semibold font-family-cairo">
              <span>جميع الأقساط تسير في الموعد</span>
              <span className="opacity-60 block mt-0.5">نسبة سداد الدفعات ممتازة وخالية من أي تعثر مالي حالياً.</span>
            </div>
          </div>
        )}

        {/* Insight 3: Performance average */}
        {avgSalesValue > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 text-sky-400">
            <TrendingUp className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal font-semibold font-family-cairo">
              <span>متوسط القيمة التعاقدية لآخر عمليات البيع: {shortenMoney(avgSalesValue)}</span>
              <span className="opacity-60 block mt-0.5">تؤكد البيانات الحالية على زيادة الطلب على السيارات ذات الفئات المتوسطة والعليا.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
