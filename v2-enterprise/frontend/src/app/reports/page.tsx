'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Calculator,
  ChevronRight,
  FileText,
  Scale,
  Wallet,
  Building2,
  TrendingUp,
  Landmark,
  ShieldCheck,
} from 'lucide-react'

const REPORT_LINKS = [
  {
    href: '/trial-balance',
    icon: Scale,
    color: 'indigo' as const,
    title: 'ميزان المراجعة',
    description: 'كشف ميزان المراجعة متوازن ومقسم مدين ودائن',
    available: true,
  },
  {
    href: '/reports/balance-sheet',
    icon: Scale,
    color: 'amber' as const,
    title: 'الميزانية العمومية',
    description: 'قائمة المركز المالي — الأصول والمطلوبات وحقوق الملكية',
    available: true,
  },
  {
    href: '/reports/installment-aging',
    icon: AlertTriangle,
    color: 'rose' as const,
    title: 'كشف تقادم الديون والأقساط',
    description: 'تحليل الأقساط المتأخرة والذمم حسب مدة التأخير',
    available: true,
  },
  {
    href: '/reports/monthly-profit',
    icon: Calculator,
    color: 'emerald' as const,
    title: 'تقرير الأرباح الشهرية',
    description: 'تحليل الإيرادات والتكاليف والأرباح شهراً بشهر',
    available: true,
  },
  {
    href: '/accounting',
    icon: Calculator,
    color: 'emerald' as const,
    title: 'قائمة الأرباح والخسائر',
    description: 'مجمل صافي الربح والخسارة مع الحسابات المحاسبية',
    available: true,
  },
  {
    href: '/reports/vehicle-profitability',
    icon: TrendingUp,
    color: 'amber' as const,
    title: 'ربحية السيارات',
    description: 'صافي الربح وهامش الربح المالي لكل سيارة',
    available: true,
  },
  {
    href: '/reports/cashbox-movement',
    icon: Wallet,
    color: 'emerald' as const,
    title: 'حركة الصندوق التفصيلية',
    description: 'الحركات والعمليات النقدية التفصيلية للصندوق',
    available: true,
  },
  {
    href: '/reports/bank-movement',
    icon: Landmark,
    color: 'indigo' as const,
    title: 'حركة البنك',
    description: 'الحركات والعمليات البنكية التفصيلية',
    available: true,
  },
  {
    href: '/reports/cost-center',
    icon: Building2,
    color: 'indigo' as const,
    title: 'تقرير مراكز التكلفة',
    description: 'الإيرادات والمصاريف لكل مركز تكلفة',
    available: true,
  },
  {
    href: '/reports/branch-comparison',
    icon: Building2,
    color: 'indigo' as const,
    title: 'مقارنة الفروع',
    description: 'الأداء المالي والتشغيلي لكل فرع بالتفصيل',
    available: true,
  },
  {
    href: '/reports/accounting-rules',
    icon: ShieldCheck,
    color: 'amber' as const,
    title: 'فحص قواعد المحاسبة',
    description: 'التحقق من توازن وسلامة القيود المحاسبية',
    available: true,
  },
]

const COLOR_MAP = {
  indigo:  { wrapper: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500' },
  amber:   { wrapper: 'border-amber-500/20 bg-amber-500/10 text-amber-500' },
  rose:    { wrapper: 'border-rose-500/20 bg-rose-500/10 text-rose-500' },
  emerald: { wrapper: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' },
}

export default function ReportsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <FileText className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold text-foreground">التقارير المالية والمحاسبية</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">دفاتر حسابات ومحركات تقارير منسقة للطباعة الفورية والتصدير</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Report Links Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 max-w-4xl mx-auto">
          {REPORT_LINKS.map((item) => {
            const Icon = item.icon
            const c = COLOR_MAP[item.color] || COLOR_MAP.indigo
            
            if (!item.available) {
              return (
                <div
                  key={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 opacity-50 select-none relative"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-muted-foreground">{item.title}</p>
                      <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-muted-foreground border border-white/5">
                        قريباً
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">{item.description}</p>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4 transition-all duration-150 hover:border-primary/30 hover:bg-secondary/40 hover:shadow-sm"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${c.wrapper}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary rtl:rotate-180" />
              </Link>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
