'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { formatMoney, cn } from '@/lib/utils'
import type { Car } from '@/lib/api/inventory'

// ── Market price model (frontend-only, no backend required) ──────────────────

const BRAND_PREMIUM: Record<string, number> = {
  'تويوتا':     1.08,
  'لكزس':       1.20,
  'مرسيدس':    1.18,
  'BMW':         1.16,
  'هيونداي':   0.96,
  'كيا':        0.95,
  'نيسان':     0.98,
  'شفروليه':   1.02,
  'جيب':        1.05,
  'فورد':       1.00,
}

const MILEAGE_DEDUCT_PER_10K = 0.012  // 1.2% per 10,000 km
const YEAR_DEDUCT_PER_YEAR   = 0.08   // 8% per year (depreciation)

function estimateMarketPrice(car: Car): number {
  const currentYear = new Date().getFullYear()
  const age = Math.max(0, currentYear - car.manufacturing_year)
  const brandPremium = BRAND_PREMIUM[car.brand] ?? 1.0
  const mileageKm   = car.mileage ?? 0

  // Base: purchase price × brand premium
  let base = car.purchase_price * brandPremium

  // Depreciation by age
  base *= Math.pow(1 - YEAR_DEDUCT_PER_YEAR, age)

  // Mileage penalty
  const mileageUnits = mileageKm / 10_000
  base *= Math.pow(1 - MILEAGE_DEDUCT_PER_10K, mileageUnits)

  return Math.round(base / 100_000) * 100_000  // round to nearest 100K
}

type PriceSignal = 'overpriced' | 'fair' | 'underpriced'

function getPriceSignal(currentPrice: number, marketPrice: number): PriceSignal {
  const ratio = currentPrice / marketPrice
  if (ratio > 1.10) return 'overpriced'
  if (ratio < 0.90) return 'underpriced'
  return 'fair'
}

const SIGNAL_META: Record<PriceSignal, { label: string; icon: React.ElementType; color: string; tip: string }> = {
  overpriced:  { label: 'مرتفع',    icon: TrendingUp,   color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',     tip: 'السعر الحالي أعلى من تقدير السوق بأكثر من 10%. قد يُطيل وقت البيع.' },
  fair:        { label: 'مناسب',    icon: Minus,        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', tip: 'السعر في النطاق المنطقي مقارنةً بتقدير السوق.' },
  underpriced: { label: 'منخفض',   icon: TrendingDown, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   tip: 'السعر أقل من التقدير بأكثر من 10%. فرصة للرفع لتحقيق هامش أفضل.' },
}

interface Props {
  car: Car
}

export function AiPriceInsight({ car }: Props) {
  const [expanded, setExpanded] = useState(false)

  const marketPrice = useMemo(() => estimateMarketPrice(car), [car])
  const currentPrice = car.selling_price ?? car.purchase_price
  const signal = getPriceSignal(currentPrice, marketPrice)
  const meta = SIGNAL_META[signal]
  const SignalIcon = meta.icon

  const diff = currentPrice - marketPrice
  const diffPct = Math.abs(Math.round((diff / marketPrice) * 100))

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      {/* Header trigger */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-bold text-foreground">تحليل السعر الذكي</span>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1', meta.color)}>
            <SignalIcon className="h-2.5 w-2.5" />
            {meta.label}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30">
              {/* Price comparison */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="rounded-lg border border-border/40 bg-secondary/10 p-3">
                  <p className="text-[9px] text-muted-foreground mb-1">السعر الحالي</p>
                  <p className="text-sm font-black font-numeric">{formatMoney(currentPrice, 'IQD')}</p>
                </div>
                <div className={cn('rounded-lg border p-3', meta.color)}>
                  <p className="text-[9px] opacity-70 mb-1">تقدير السوق</p>
                  <p className="text-sm font-black font-numeric">{formatMoney(marketPrice, 'IQD')}</p>
                </div>
              </div>

              {/* Diff bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>الفارق</span>
                  <span className={cn('font-bold font-numeric', diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-amber-400' : 'text-emerald-400')}>
                    {diff > 0 ? '+' : ''}{formatMoney(diff, 'IQD')} ({diffPct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', signal === 'overpriced' ? 'bg-rose-500' : signal === 'underpriced' ? 'bg-amber-500' : 'bg-emerald-500')}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(diffPct * 5, 100)}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
              </div>

              {/* Factors */}
              <div className="rounded-lg bg-secondary/10 border border-border/30 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground mb-2">عوامل التقدير</p>
                {[
                  { label: 'عمر السيارة', value: `${new Date().getFullYear() - car.manufacturing_year} سنة` },
                  { label: 'العلامة التجارية', value: `${car.brand} (×${(BRAND_PREMIUM[car.brand] ?? 1.0).toFixed(2)})` },
                  { label: 'المسافة المقطوعة', value: car.mileage ? `${(car.mileage / 1000).toFixed(0)}k كم` : 'غير محدد' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-secondary/10 rounded-lg p-2.5 border border-border/30">
                <Info className="h-3 w-3 shrink-0 mt-0.5 text-violet-400" />
                <span>{meta.tip}</span>
              </div>

              <p className="text-[9px] text-muted-foreground/50 text-center">
                * التقدير مبني على نموذج داخلي يأخذ العمر والعلامة والمسافة — ليس سعراً رسمياً للسوق
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
