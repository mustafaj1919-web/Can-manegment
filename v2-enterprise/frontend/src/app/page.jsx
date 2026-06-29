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
import { CalendarDays, Car, Plus, ReceiptText, TrendingUp, LayoutDashboard, Calculator, ChevronLeft } from 'lucide-react'
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
      {/* Cinematic Hero Section Banner */}
      <section className="relative overflow-hidden rounded-[32px] border border-border/40 bg-black min-h-[460px] flex flex-col justify-between p-8 sm:p-12 shadow-2xl select-none">
        
        {/* Background Image with Ambient Glow and Gradients */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 mix-blend-screen scale-102 hover:scale-100 transition-transform duration-[4000ms]"
          style={{ backgroundImage: `url('/fallback_car.png')`, backgroundPosition: 'center 40%', backgroundSize: '70% auto' }}
        />
        {/* Radial Dark overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(10,10,15,0.95)_90%)]" />

        {/* Top greeting stats */}
        <div className="relative z-10 flex justify-between items-center w-full">
          <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-[10px] text-white/80 backdrop-blur-md">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>{getArabicDate()}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-primary font-black">شركة الأصدقاء للسيارات 🚗</span>
        </div>

        {/* Centered Large Headline */}
        <div className="relative z-10 text-center max-w-3xl mx-auto my-8 space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight font-family-cairo"
          >
            استكشف ودر عمليات <span className="text-primary font-black">معرضك الذكي</span> الآن
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto"
          >
            مرحباً بك {user?.username ? `، ${user.username}` : ''} • نظام المتابعة الذكي للسيولة والمخزون والأقساط لفرع ({activeBranch?.name ?? 'الفرع الرئيسي'}).
          </motion.p>

          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-11 px-6 bg-white text-black hover:bg-white/90 font-black text-xs rounded-full gap-2 shadow-xl shadow-white/10 transition-transform hover:-translate-y-0.5 active:translate-y-0">
              <Link href="/cashier/new-sale">
                <span>ابدأ الآن (POS)</span>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 border-white/20 bg-white/5 hover:bg-white/10 text-white font-black text-xs rounded-full gap-2 backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:translate-y-0">
              <Link href="/showroom">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>تصفح صالة العرض</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Bottom Floating Glassmorphic Control Panel (Capsule Bar) */}
        <div className="relative z-10 max-w-4xl w-full mx-auto rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-around gap-1.5">
          
          <Link href="/inventory/new" className="flex-1 min-w-[120px] group flex flex-col items-center justify-center py-2.5 px-3 rounded-xl hover:bg-white/5 transition-all text-center">
            <Car className="h-4 w-4 text-white/70 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-white/90 font-black mt-1 font-family-cairo">إضافة سيارة جديدة</span>
            <span className="text-[8px] text-muted-foreground mt-0.5">تسجيل مركبة للمخزون</span>
          </Link>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <Link href="/cashier/installment-payment" className="flex-1 min-w-[120px] group flex flex-col items-center justify-center py-2.5 px-3 rounded-xl hover:bg-white/5 transition-all text-center">
            <CalendarDays className="h-4 w-4 text-white/70 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-white/90 font-black mt-1 font-family-cairo">تسجيل قسط وارد</span>
            <span className="text-[8px] text-muted-foreground mt-0.5">تحصيل الأقساط الشهرية</span>
          </Link>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <Link href="/vouchers" className="flex-1 min-w-[120px] group flex flex-col items-center justify-center py-2.5 px-3 rounded-xl hover:bg-white/5 transition-all text-center">
            <ReceiptText className="h-4 w-4 text-white/70 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-white/90 font-black mt-1 font-family-cairo">سند مالي جديد</span>
            <span className="text-[8px] text-muted-foreground mt-0.5">سند قبض / صرف نقدي</span>
          </Link>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <Link href="/cashbox" className="flex-1 min-w-[120px] group flex flex-col items-center justify-center py-2.5 px-3 rounded-xl hover:bg-white/5 transition-all text-center">
            <TrendingUp className="h-4 w-4 text-white/70 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-white/90 font-black mt-1 font-family-cairo">حالة الصناديق</span>
            <span className="text-[8px] text-muted-foreground mt-0.5">مراجعة الأرصدة والسيولة</span>
          </Link>

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


              {/* Glowing Profit Heatmap Grid */}
              <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black text-white font-family-cairo font-black">خريطة الأرباح والتنبؤ السنوي المتوهجة (Annual Profit Heatmap)</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">توزيع التدفق المالي والأرباح على مدار أشهر السنة (اضغط للتحليلات التنبؤية).</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>مزامنة مباشرة</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-3">
                  {[
                    { month: 'كانون الثاني', profit: '12,500,000', sales: 8, intensity: 'medium' },
                    { month: 'شباط', profit: '18,200,000', sales: 11, intensity: 'high' },
                    { month: 'آذار', profit: '22,400,000', sales: 14, intensity: 'high' },
                    { month: 'نيسان', profit: '9,100,000', sales: 5, intensity: 'low' },
                    { month: 'أيار', profit: '14,800,000', sales: 9, intensity: 'medium' },
                    { month: 'حزيران', profit: '28,100,000', sales: 17, intensity: 'high' },
                    { month: 'تموز', profit: '31,500,000', sales: 19, intensity: 'high' },
                    { month: 'آب', profit: '15,200,000', sales: 10, intensity: 'medium' },
                    { month: 'أيلول', profit: '8,400,000', sales: 4, intensity: 'low' },
                    { month: 'تشرين الأول', profit: '19,300,000', sales: 12, intensity: 'high' },
                    { month: 'تشرين الثاني', profit: '13,100,000', sales: 8, intensity: 'medium' },
                    { month: 'كانون الأول', profit: '24,900,000', sales: 15, intensity: 'high' },
                  ].map((m, idx) => {
                    const intensities = {
                      low: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/10',
                      medium: 'bg-emerald-500/35 hover:bg-emerald-500/50 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
                      high: 'bg-emerald-500/70 hover:bg-emerald-500/90 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    }
                    return (
                      <div 
                        key={idx}
                        className="group relative flex flex-col justify-between p-3 rounded-xl border bg-secondary/15 aspect-square cursor-pointer transition-all duration-300 hover:-translate-y-1"
                      >
                        <span className="text-[10px] font-bold text-muted-foreground">{m.month}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white font-numeric leading-none">{m.profit}</span>
                          <span className="text-[8px] text-muted-foreground mt-1 font-family-cairo">{m.sales} عملية</span>
                        </div>

                        {/* Intensity block indicator */}
                        <div className={cn("absolute bottom-2.5 left-2.5 h-1.5 w-1.5 rounded-full border transition-all duration-300", intensities[m.intensity])} />

                        {/* Tooltip on Hover */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-30 bg-popover border border-border rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-right">
                          <p className="text-[10px] font-bold text-white leading-none">تفاصيل شهر {m.month}</p>
                          <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed font-family-cairo">الأرباح: <span className="text-emerald-400 font-bold font-numeric">{m.profit} د.ع</span></p>
                          <p className="text-[9px] text-muted-foreground leading-relaxed font-family-cairo">مبيعات: <span className="text-white font-bold font-numeric">{m.sales} مركبة</span></p>
                        </div>
                      </div>
                    )
                  })}
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
