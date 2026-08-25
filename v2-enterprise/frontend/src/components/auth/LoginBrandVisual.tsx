'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Building2 } from 'lucide-react'

export function LoginBrandVisual() {
  return (
    <div className="relative flex flex-col justify-between h-full py-4 lg:py-6 pe-4 lg:pe-8 select-none font-tajawal">
      {/* ── Strengthened Brand Area ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-5 z-10 max-w-xl"
      >
        {/* Company Logo & Name Header */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-2.5 shrink-0">
            <img
              src="/logo.png"
              alt="شركة الأصدقاء لتجارة السيارات"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] font-[800] text-[#0F172A] tracking-tight leading-tight">
              شركة الأصدقاء لتجارة السيارات
            </h1>
            <p className="text-[18px] sm:text-[20px] font-[700] text-[#059669] tracking-tight mt-1">
              منصة إدارة المعرض المتكاملة
            </p>
          </div>
        </div>

        {/* Supporting Statement */}
        <p className="text-[16px] sm:text-[17px] text-[#475569] leading-[1.8] max-w-lg font-normal">
          إدارة موحدة للمبيعات والمخزون والمحاسبة والفروع ضمن بيئة تشغيل آمنة ودقيقة.
        </p>

        {/* Max 2 Concise Trust Points (One-line items, tight inline flow) */}
        <div className="flex flex-wrap items-center gap-6 pt-1 text-[14px] font-[650] text-[#334155]">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-[#059669]/10 text-[#059669]">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span>تشغيل آمن متعدد الفروع</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-[#059669]/10 text-[#059669]">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <span>بيانات محمية وصلاحيات دقيقة</span>
          </div>
        </div>
      </motion.div>

      {/* ── Landscape Vehicle Visual (Integrated into Canvas with Studio Reflection) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative my-auto pt-6 pb-2 z-10 flex flex-col items-center justify-center w-full"
      >
        {/* Studio Floor Light Glow & Shadow Layer */}
        <div className="relative w-full max-w-2xl aspect-[16/8] flex items-center justify-center">
          <img
            src="/fallback_car.png"
            alt="Porsche Luxury Vehicle Studio Integration"
            className="w-full h-full object-contain filter contrast-[1.03] mix-blend-multiply drop-shadow-[0_16px_30px_rgba(15,23,42,0.08)]"
          />
          {/* Subtle Grounded Floor Reflection / Shadow Oval */}
          <div className="absolute bottom-0 inset-x-8 h-4 bg-slate-900/[0.08] rounded-[100%] blur-md pointer-events-none" />
        </div>
      </motion.div>
    </div>
  )
}
