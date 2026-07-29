'use client'

import React from 'react'
import { motion } from 'framer-motion'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { LoginBrandVisual } from './LoginBrandVisual'
import { LoginFooter } from './LoginFooter'

interface LoginShellProps {
  children: React.ReactNode
}

export function LoginShell({ children }: LoginShellProps) {
  return (
    <div
      className="relative min-h-screen w-full bg-[#F6F8FB] text-[#0F172A] flex items-center justify-center overflow-x-hidden font-tajawal"
      dir="rtl"
    >
      {/* ── Spatial Background Light & Faded Technical Contour ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Studio Spotlight */}
        <div className="absolute -top-[10%] start-[15%] w-[50%] h-[50%] rounded-full bg-[#059669]/[0.03] blur-[150px]" />
        <div className="absolute bottom-[0%] end-[10%] w-[40%] h-[40%] rounded-full bg-slate-400/[0.04] blur-[130px]" />

        {/* Faded Technical Contour Curve */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 520 C 320 300, 780 700, 1280 400 C 1480 270, 1620 540, 1720 500" stroke="#0F172A" strokeWidth="1.5" />
        </svg>
      </div>

      {/* ── Top Bar Header with Circular Ghost Theme Control ── */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-6 sm:p-8 max-w-[1480px] mx-auto w-full pointer-events-auto">
        {/* Mobile Compact Brand Mark */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white border border-[#E2E8F0] shadow-sm p-1.5 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="الأصدقاء" className="h-full w-full object-contain" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A] leading-none">شركة الأصدقاء</h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">لتجارة السيارات</p>
          </div>
        </div>

        {/* Theme Toggle (Unified Circular Control) */}
        <div className="ms-auto flex items-center">
          <div className="rounded-full bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md p-1 transition-all">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Unified Page Composition (Max-width 1480px, Centered) ── */}
      <main className="relative z-20 w-full max-w-[1480px] mx-auto min-h-screen lg:min-h-[820px] flex items-center p-4 sm:p-6 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full items-center">

          {/* LEFT: Automotive Brand & Integrated Vehicle Visual (58% => 7 columns) */}
          <div className="hidden lg:block lg:col-span-7 h-full">
            <LoginBrandVisual />
          </div>

          {/* RIGHT: Floating Authentication Panel (42% => 5 columns) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col items-center lg:items-end w-full">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[450px] bg-white border border-[#E2E8F0] rounded-[28px] shadow-[0_24px_64px_rgba(15,23,42,0.10)] p-8 sm:p-10 lg:p-11"
            >
              {/* Form Content */}
              {children}

              {/* Panel Footer */}
              <LoginFooter />
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  )
}
