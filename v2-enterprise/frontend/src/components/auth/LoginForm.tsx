'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, User, Info, ShieldAlert } from 'lucide-react'

interface LoginFormProps {
  username: string
  setUsername: (val: string) => void
  password: string
  setPassword: (val: string) => void
  loading: boolean
  success?: boolean
  error: string
  onSubmit: (e: React.FormEvent) => void
}

export function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  loading,
  success,
  error,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [showForgotInfo, setShowForgotInfo] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'))
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'))
    }
  }

  return (
    <div className="w-full space-y-6 select-none font-tajawal">
      {/* Workspace Form Header */}
      <div className="space-y-2 text-start">
        <h2 className="text-[28px] sm:text-[34px] lg:text-[38px] font-[800] text-[#0F172A] tracking-tight leading-[1.25]">
          مرحباً بعودتك
        </h2>
        <p className="text-[16px] text-[#64748B] font-[500] leading-relaxed">
          قم بتسجيل الدخول للوصول إلى نظام الإدارة
        </p>
      </div>

      {/* Error Announcement Banner (Subtle Single Shake) */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error-banner"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-start gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safe Forgot Password Info Alert */}
      <AnimatePresence>
        {showForgotInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-sm">
              <Info className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-[#0F172A]">إعادة تعيين كلمة المرور</p>
                <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                  تواصل مع مسؤول النظام لإعادة تعيين كلمة المرور الخاصة بحسابك.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotInfo(false)}
                className="text-xs text-[#059669] hover:underline shrink-0 font-semibold"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Form */}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {/* Username Field */}
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="block text-[14px] font-[700] text-[#334155]"
          >
            اسم المستخدم
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-[#94A3B8]">
              <User className="h-5 w-5" />
            </div>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              required
              autoComplete="username"
              autoFocus
              disabled={loading || success}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'auth-error' : undefined}
              className="w-full h-[56px] ps-11 pe-4 rounded-[16px] bg-white border border-[#DCE3EA] text-[#0F172A] placeholder:text-[#94A3B8] text-[16px] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] hover:border-[#CBD5E1] transition-all duration-200"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-[14px] font-[700] text-[#334155]"
            >
              كلمة المرور
            </label>
            <button
              type="button"
              onClick={() => setShowForgotInfo(true)}
              className="text-xs font-semibold text-[#059669] hover:text-[#047857] focus:outline-none focus:underline transition-colors"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-[#94A3B8]">
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              placeholder="أدخل كلمة المرور"
              required
              autoComplete="current-password"
              disabled={loading || success}
              aria-invalid={Boolean(error)}
              aria-describedby={capsLockActive ? 'caps-lock-warning' : undefined}
              className="w-full h-[56px] ps-11 pe-12 rounded-[16px] bg-white border border-[#DCE3EA] text-[#0F172A] placeholder:text-[#94A3B8] text-[16px] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] hover:border-[#CBD5E1] transition-all duration-200"
            />
            {/* Show/Hide Password Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              className="absolute inset-y-0 end-0 flex items-center pe-4 text-[#94A3B8] hover:text-[#334155] focus:outline-none focus:text-[#059669] transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Caps Lock Indicator */}
          {capsLockActive && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              id="caps-lock-warning"
              className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold pt-1"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>زر الأحرف الكبيرة (Caps Lock) مفعل</span>
            </motion.div>
          )}
        </div>

        {/* Primary Action Button (Full Strength Company Green #059669) */}
        <button
          type="submit"
          disabled={loading || success || !username.trim() || !password}
          className="relative w-full h-[58px] rounded-[16px] bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[18px] shadow-[0_10px_24px_rgba(16,185,129,0.20)] hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span>جارٍ تسجيل الدخول...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-white" />
              <span>تم تسجيل الدخول بنجاح</span>
            </>
          ) : (
            <span>تسجيل الدخول</span>
          )}
        </button>
      </form>
    </div>
  )
}
