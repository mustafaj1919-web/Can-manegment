'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { LoginShell } from '@/components/auth/LoginShell'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { setBranches, setActiveBranch } = useBranchStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password || loading) return
    setError('')
    setLoading(true)

    try {
      const res = (await loginUser(username.trim(), password)) as any
      setSuccess(true)
      setAuth(res.user, res.token)
      setBranches(res.branches)
      if (res.active_branch) setActiveBranch(res.active_branch)
      router.push('/')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr?.response?.data?.error ?? 'اسم المستخدم أو كلمة المرور غير صحيحة')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginShell>
      <LoginForm
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loading={loading}
        success={success}
        error={error}
        onSubmit={handleSubmit}
      />
    </LoginShell>
  )
}
