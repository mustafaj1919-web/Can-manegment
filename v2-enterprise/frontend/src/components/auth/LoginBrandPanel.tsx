'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Car, ShieldCheck, BarChart3, Building2 } from 'lucide-react'

export function LoginBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full p-8 lg:p-12 text-slate-100 overflow-hidden select-none">
      {/* Top Brand Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6 z-10"
      >
        {/* Logo Container */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-900/80 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 backdrop-blur-md p-2">
            <img
              src="/logo.png"
              alt="شركة الأصدقاء لتجارة السيارات"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-tajawal">
              الأصدقاء
            </h1>
            <p className="text-xs font-medium text-emerald-400/90 tracking-wide font-tajawal">
              لتجارة السيارات
            </p>
          </div>
        </div>

        {/* Value Statement */}
        <div className="space-y-2 max-w-lg pt-4">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight font-tajawal">
            منصة الإدارة المتكاملة
          </h2>
          <p className="text-base text-slate-300/90 leading-relaxed font-tajawal">
            نظام موحد لإدارة معارض السيارات والمبيعات والمخزون بأعلى معايير الدقة والأمان.
          </p>
        </div>
      </motion.div>

      {/* Capability Highlights (Max 3 compact items) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 gap-3.5 my-auto py-6 z-10 max-w-lg"
      >
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-tajawal">
              إدارة موحدة للمخزون والمبيعات
            </h3>
            <p className="text-xs text-slate-400 font-tajawal mt-0.5">
              متابعة دقيقة لكل سيارة وحالة المعرض في الوقت الفعلي.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-tajawal">
              محاسبة دقيقة وتقارير لحظية
            </h3>
            <p className="text-xs text-slate-400 font-tajawal mt-0.5">
              قوائم مالية، أقساط، وتقارير أداء فورية لمتخذي القرار.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-tajawal">
              تشغيل آمن متعدد الفروع
            </h3>
            <p className="text-xs text-slate-400 font-tajawal mt-0.5">
              صلاحيات موسعة وحماية شاملة مع ربط كامل بين الفروع.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Trust & Security Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center gap-2 text-xs text-slate-400 z-10 font-tajawal"
      >
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span>بيئة تشغيل عالية الأمان · حماية البيانات والأذونات</span>
      </motion.div>
    </div>
  )
}
