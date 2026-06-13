'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, Car, Lock, Loader2, User } from 'lucide-react'
import { loginUser } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormGroup, FormLabel } from '@/components/ui/form-field'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth }                    = useAuthStore()
  const { setBranches, setActiveBranch } = useBranchStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      const res = await loginUser(username.trim(), password) as any
      setAuth(res.user, res.token)
      setBranches(res.branches)
      if (res.active_branch) setActiveBranch(res.active_branch)
      router.push('/')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr?.response?.data?.error ?? 'اسم المستخدم أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-root" dir="rtl">
      {/* Background decoration */}
      <div className="login-bg-glow" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="login-card"
      >
        {/* Brand header */}
        <div className="login-brand">
          <div className="login-logo-ring">
            <img src="/logo.png" alt="شركة الأصدقاء" className="login-logo-img" />
          </div>
          <div>
            <h1 className="login-brand-name">الأصدقاء</h1>
            <p className="login-brand-sub">لتجارة السيارات · نظام الإدارة</p>
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider" />

        {/* Form header */}
        <div>
          <h2 className="login-form-title">تسجيل الدخول</h2>
          <p className="login-form-sub">أدخل بيانات حسابك للمتابعة</p>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="login-error"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <FormGroup>
            <FormLabel htmlFor="username">اسم المستخدم</FormLabel>
            <div className="relative">
              <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
                autoComplete="username"
                autoFocus
                className="ps-9"
                aria-label="اسم المستخدم"
              />
            </div>
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="password">كلمة المرور</FormLabel>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                autoComplete="current-password"
                className="ps-9"
                aria-label="كلمة المرور"
              />
            </div>
          </FormGroup>

          <Button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="login-submit-btn"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              <>
                <Car className="h-4 w-4" />
                تسجيل الدخول
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="login-footer-text">نظام إدارة المعرض · v2.0</p>
      </motion.div>
    </div>
  )
}
