'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Car, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import { loginUser } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const { setBranches, setActiveBranch } = useBranchStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginUser(username, password)
      setAuth(res.user)
      setBranches(res.branches)
      if (res.active_branch) setActiveBranch(res.active_branch)
      router.push('/')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr?.response?.data?.error ?? 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="شركة الأصدقاء"
            className="mx-auto w-[220px] object-contain"
            width={220}
          />
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">تسجيل الدخول</h2>
            <p className="text-xs text-muted-foreground mt-0.5">أدخل بيانات حسابك للمتابعة</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2.5"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-400">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoComplete="username"
                  className="w-full h-10 rounded-lg bg-white/5 border border-white/10 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                  autoComplete="current-password"
                  className="w-full h-10 rounded-lg bg-white/5 border border-white/10 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />جاري تسجيل الدخول...</>
                : 'تسجيل الدخول'
              }
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
