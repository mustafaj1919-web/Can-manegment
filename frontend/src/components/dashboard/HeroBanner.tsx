'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Car, CircleGauge, TrendingUp } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { getDashboardStats, getNotifications } from '@/lib/api/dashboard'
import { useBranchStore } from '@/lib/stores/branch-store'

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || previous.current === value) return
    if (reducedMotion) {
      element.textContent = formatNumber(value)
      previous.current = value
      return
    }

    const start = previous.current
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 900, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      element.textContent = formatNumber(Math.round(start + (value - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else previous.current = value
    }
    requestAnimationFrame(tick)
  }, [value, reducedMotion])

  return <span ref={ref}>{formatNumber(value)}</span>
}

function getCurrentPeriod() {
  return new Intl.DateTimeFormat('ar-IQ', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

export function HeroBanner() {
  const period = useMemo(getCurrentPeriod, [])
  const branch = useBranchStore((state) => state.activeBranch)
  const reducedMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 22 })
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 22 })
  const imageX = useTransform(smoothX, [-0.5, 0.5], [-14, 14])
  const imageY = useTransform(smoothY, [-0.5, 0.5], [-7, 7])

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
    retry: 1,
  })

  const urgentCount =
    (notifications?.overdue?.length ?? 0) +
    (notifications?.due_today?.length ?? 0)

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5)
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5)
  }

  function resetPointer() {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="revauto-hero overflow-hidden relative rounded-xl border border-white/10"
      style={{
        backgroundImage: "url('/hero_showroom_bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '660px'
      }}
    >
      {/* Top red accent bar */}
      <div className="absolute top-0 inset-inline-start-7 w-24 h-[3px] bg-red-600 shadow-[0_0_20px_rgba(239,27,45,0.7)] z-20" />
      
      {/* Glow flare */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 lg:p-10 items-center min-h-[520px]">
        {/* Info header (RTL safe) */}
        <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5 text-[11px] font-semibold text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-family-cairo">{branch?.name ?? 'المعرض الرئيسي'}</span>
            <span className="text-white/20">/</span>
            <span className="text-white/40">{period}</span>
          </div>
          {urgentCount > 0 && (
            <Link href="/installments" className="px-3 py-1 bg-red-600/20 border border-red-500/30 text-red-400 rounded-md text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all">
              {urgentCount} تنبيه يحتاج متابعة
            </Link>
          )}
        </div>

        {/* Left column: Typography and CTA */}
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-600/12 border border-red-500/25 text-red-400 rounded-full text-[11px] font-bold select-none w-fit tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            جديد في المعرض · New in Stock
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[3rem] font-black text-white leading-[1.1] tracking-tight font-family-cairo">
            Explore The Next <br />
            <span className="text-red-500">Generation</span> Of Cars
          </h1>

          <p className="text-[13px] text-neutral-400 max-w-lg leading-relaxed font-family-cairo">
            نظام إدارة صالة عرض السيارات الأحدث والأكثر تميزاً. تصفح أحدث الموديلات المتوفرة، وأدر مبيعاتك وعملائك بدقة فائقة من شاشة واحدة بأسلوب رياضي فخم.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/sales/new" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm rounded-lg transition-all shadow-lg shadow-red-600/35 font-family-cairo">
              إنشاء بيعة
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/inventory" className="inline-flex items-center gap-2 px-6 py-3 border border-white/15 hover:border-white/35 text-white/90 font-semibold text-sm rounded-lg transition-all bg-white/[0.05] hover:bg-white/[0.09] active:scale-95 font-family-cairo">
              استكشف المعرض
            </Link>
          </div>

          {/* Trust element */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/[0.07]">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-flex h-9 w-9 rounded-full ring-[2.5px] ring-[#0c0c0c] bg-red-600 items-center justify-center text-[11px] text-white font-black">A</div>
              <div className="inline-flex h-9 w-9 rounded-full ring-[2.5px] ring-[#0c0c0c] bg-neutral-700 items-center justify-center text-[11px] text-white font-black">D</div>
              <div className="inline-flex h-9 w-9 rounded-full ring-[2.5px] ring-[#0c0c0c] bg-neutral-600 items-center justify-center text-[10px] text-white font-black">99</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-[10px]">★</span>
                ))}
              </div>
              <p className="text-[11px] font-bold text-white font-family-cairo">1,500+ تقييم إيجابي من العملاء</p>
              <p className="text-[10px] text-neutral-500 font-family-cairo mt-0.5">ثقة، أمان وسرعة في إتمام المعاملات</p>
            </div>
          </div>
        </div>

        {/* Right column: Image showcase with glow */}
        <div className="lg:col-span-6 flex items-center justify-center relative min-h-[420px]">
          <div className="absolute w-[95%] h-[95%] bg-red-600/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/25 via-transparent to-transparent opacity-50 pointer-events-none" />
          <motion.div style={{ x: imageX, y: imageY }} className="z-10 w-full flex justify-center">
            <motion.img
              src="/fallback_car.png"
              alt="Premium Car Showcase"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: -10, opacity: 1 }}
              transition={{
                y: { repeat: Infinity, repeatType: "reverse", duration: 3.5, ease: "easeInOut" },
                opacity: { duration: 0.6 }
              }}
              className="w-full max-w-[600px] object-contain drop-shadow-[0_30px_80px_rgba(239,27,45,0.55)]"
            />
          </motion.div>
          {/* Reflection */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>

        {/* Bottom column: Stats display */}
        <div className="lg:col-span-12 border-t border-white/[0.07] pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 block font-bold font-family-cairo">إجمالي المبيعات</span>
              <div className="text-2xl font-black text-red-500 font-numeric tracking-tight flex items-baseline gap-1.5">
                <AnimatedCounter value={stats?.total_sales_amount ?? 0} />
                <small className="text-[11px] text-neutral-500 font-semibold">د.ع</small>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 block font-bold font-family-cairo">السيارات المتاحة</span>
              <div className="text-2xl font-black text-white font-numeric tracking-tight flex items-baseline gap-1.5">
                <AnimatedCounter value={stats?.available_cars ?? 0} />
                <small className="text-[11px] text-neutral-500 font-semibold">سيارة</small>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 block font-bold font-family-cairo">الصفقات المكتملة</span>
              <div className="text-2xl font-black text-white font-numeric tracking-tight flex items-baseline gap-1.5">
                <AnimatedCounter value={stats?.sales ?? 0} />
                <small className="text-[11px] text-neutral-500 font-semibold">بيعة</small>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Link href="/reports" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-red-600 hover:border-red-600 text-white transition-all active:scale-95" title="فتح التقارير">
                <CircleGauge className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
