'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Fuel } from 'lucide-react'
import { Button } from './button'
import Link from 'next/link'

interface FeatureUnavailableProps {
  title?: string
  description?: string
  icon?: 'gauge' | 'lock'
}

export function FeatureUnavailable({
  title = 'الميزة غير متوفرة',
  description = 'عذراً، هذه الميزة غير متاحة حالياً في هذا الإصدار لعدم توفر نقاط الاتصال الخاصة بها في خادم الخلفية.',
}: FeatureUnavailableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="relative mx-auto my-8 flex max-w-lg flex-col items-center justify-center overflow-hidden rounded-2xl border border-border-default bg-bg-surface px-8 py-16 text-center shadow-sm transition-colors duration-500 hover:border-primary/20 group"
      dir="rtl"
    >
      {/* Subtle corner glows */}
      <div className="absolute -top-12 -left-12 h-48 w-48 rounded-full blur-[70px] bg-primary/10 opacity-60 pointer-events-none transition-opacity duration-700 group-hover:opacity-100" />
      <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full blur-[70px] bg-[#f4a522]/10 opacity-60 pointer-events-none transition-opacity duration-700 group-hover:opacity-100" />

      {/* Icon container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center"
      >
        {/* Spinning ring */}
        <div className="absolute inset-0 animate-[spin_40s_linear_infinite] rounded-full border border-dashed border-primary/20 transition-colors group-hover:border-primary/40" />

        {/* Icon plate */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border-default bg-secondary/60 shadow-inner backdrop-blur-md">
          <div className="relative flex h-16 w-16 items-center justify-center">
            {/* SVG Gauge */}
            <svg className="h-14 w-14" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e63946" />
                  <stop offset="60%" stopColor="#f4a522" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="needleGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path d="M 20 80 A 40 40 0 1 1 80 80" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" strokeLinecap="round" />
              <path d="M 20 80 A 40 40 0 0 1 50 14" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="94" strokeDashoffset="20" />
              <motion.g
                initial={{ rotate: -120 }}
                animate={{ rotate: [-120, -118, -121, -117, -120] }}
                transition={{ rotate: { repeat: Infinity, duration: 3, ease: 'easeInOut' } }}
                style={{ originX: '50px', originY: '50px' }}
              >
                <line x1="50" y1="50" x2="22" y2="22" stroke="#e63946" strokeWidth="3.5" strokeLinecap="round" filter="url(#needleGlow)" />
                <circle cx="50" cy="50" r="5" fill="#e63946" />
              </motion.g>
            </svg>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
          </div>
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 mb-2 text-base font-black leading-tight tracking-wide text-foreground"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 mb-8 max-w-sm px-2 text-xs font-medium leading-relaxed text-muted-foreground"
      >
        {description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 flex flex-wrap items-center justify-center gap-3"
      >
        <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
          <Fuel className="h-3 w-3 shrink-0" />
          غير متاح حالياً
        </span>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href="/" className="flex items-center gap-1.5">
            العودة للرئيسية
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  )
}
