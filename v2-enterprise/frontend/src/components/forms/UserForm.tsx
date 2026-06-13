'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Users, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  createUser, updateUser, listUsers,
  type CreateUserPayload, type UpdateUserPayload,
} from '@/lib/api/users'
import { getCurrentUser } from '@/lib/api/auth'
import type { User } from '@/types'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserFormProps {
  user?: User
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-lg overflow-hidden">
      <div className="border-b border-border/50 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function UserForm({ user }: UserFormProps) {
  const router   = useRouter()
  const isEdit   = Boolean(user)
  const { user: me, setAuth } = useAuthStore()
  const { branches, setBranches, setActiveBranch }  = useBranchStore()
  const canGrantAll   = me?.can_access_all_branches ?? false

  /* ── Form state ── */
  const [username,   setUsername]   = useState(user?.username ?? '')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [role,       setRole]       = useState<string>(user?.role ?? 'Sales')
  const [branchId,   setBranchId]   = useState<string>(
    user?.branch_id != null ? String(user.branch_id) : ''
  )
  const [grantAll,   setGrantAll]   = useState(user?.can_access_all_branches ?? false)
  const [isActive,   setIsActive]   = useState(user?.is_active_user ?? true)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  /* ── Fetch roles from API ── */
  const { data: usersData } = useQuery({
    queryKey: ['users-roles'],
    queryFn:  () => listUsers({ per_page: 1 }),
    staleTime: 300_000,
  })
  const roles = usersData?.roles ?? [
    { value: 'Owner',      label: 'مالك المعرض' },
    { value: 'Admin',      label: 'مدير النظام' },
    { value: 'Accountant', label: 'محاسب' },
    { value: 'Sales',      label: 'موظف مبيعات' },
    { value: 'Viewer',     label: 'مشاهد' },
  ]

  /* ── When grantAll is checked, clear explicit branch ── */
  useEffect(() => {
    if (grantAll) setBranchId('')
  }, [grantAll])

  /* ── Password strength ── */
  function passwordStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 8)              score++
    if (pw.length >= 12)             score++
    if (/[A-Z]/.test(pw))            score++
    if (/[0-9]/.test(pw))            score++
    if (/[^A-Za-z0-9]/.test(pw))     score++
    if (score <= 1) return { score, label: 'ضعيفة',     color: 'bg-rose-500' }
    if (score <= 2) return { score, label: 'مقبولة',     color: 'bg-orange-400' }
    if (score <= 3) return { score, label: 'جيدة',       color: 'bg-amber-400' }
    return               { score, label: 'قوية جداً',   color: 'bg-emerald-400' }
  }

  const pwStrength = passwordStrength(password)

  /* ── Validation ── */
  function validate(): boolean {
    const e: Record<string, string> = {}
    if (username.trim().length < 3)    e.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'
    if (!/^[a-zA-Z0-9_\-.@]+$/.test(username.trim())) e.username = 'اسم المستخدم يحتوي على أحرف غير مسموح بها'
    if (!role)                          e.role     = 'الدور مطلوب'
    if (!isEdit || password) {
      if (password.length < 8)          e.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
      else if (pwStrength.score < 2)    e.password = 'كلمة المرور ضعيفة جداً — أضف أرقاماً أو رموزاً'
      if (password !== confirm)         e.confirm  = 'كلمتا المرور غير متطابقتين'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: (saved) => {
      toast.success(`تم إنشاء المستخدم "${saved.username}"`)
      router.push('/users')
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ أثناء الحفظ')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUser(user!.id, payload),
    onSuccess: async (saved) => {
      toast.success(`تم تحديث بيانات "${saved.username}"`)
      if (saved.id === me?.id) {
        const refreshed = await getCurrentUser()
        setAuth(refreshed.user)
        setBranches(refreshed.branches)
        if (refreshed.active_branch) setActiveBranch(refreshed.active_branch)
      }
      router.push('/users')
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ أثناء الحفظ')
    },
  })

  const busy = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const bid = branchId ? parseInt(branchId) : null

    if (isEdit) {
      const payload: UpdateUserPayload = {
        username: username.trim(),
        role:     role as User['role'],
        branch_id: canGrantAll ? bid : undefined,
        can_access_all_branches: canGrantAll ? grantAll : undefined,
        is_active_user: isActive,
      }
      if (password) payload.password = password
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate({
        username:               username.trim(),
        password,
        role:                   role as User['role'],
        branch_id:              canGrantAll ? bid : undefined,
        can_access_all_branches: canGrantAll ? grantAll : false,
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
          <Users className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {isEdit ? `تعديل: ${user!.username}` : 'مستخدم جديد'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEdit ? 'تعديل بيانات المستخدم' : 'إنشاء حساب مستخدم جديد'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Account Info */}
        <Section title="معلومات الحساب">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">اسم المستخدم *</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              className={cn('bg-secondary/30 border-border/50 h-9', errors.username && 'border-rose-500/50')}
            />
            <FieldError msg={errors.username} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {isEdit ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور *'}
            </Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? 'اتركها فارغة للإبقاء على الحالية' : '8 أحرف على الأقل، أرقام ورموز'}
                className={cn('bg-secondary/30 border-border/50 h-9 pe-9', errors.password && 'border-rose-500/50')}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {/* Password strength bar */}
            {password && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-0.5">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', pwStrength.score >= i ? pwStrength.color : 'bg-secondary/40')} />
                  ))}
                </div>
                <p className={cn('text-[10px]', pwStrength.score <= 1 ? 'text-rose-400' : pwStrength.score <= 2 ? 'text-orange-400' : pwStrength.score <= 3 ? 'text-amber-400' : 'text-emerald-400')}>
                  قوة كلمة المرور: {pwStrength.label}
                </p>
              </div>
            )}
            <FieldError msg={errors.password} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {isEdit ? 'تأكيد كلمة المرور الجديدة' : 'تأكيد كلمة المرور *'}
            </Label>
            <div className="relative">
              <Input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="أعد كتابة كلمة المرور"
                className={cn('bg-secondary/30 border-border/50 h-9', errors.confirm && 'border-rose-500/50')}
              />
              {confirm && password === confirm && (
                <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-emerald-400 text-[10px]">✓</span>
              )}
            </div>
            <FieldError msg={errors.confirm} />
          </div>
        </Section>

        {/* Role & Access */}
        <Section title="الدور والصلاحيات">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">الدور *</Label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className={cn(
                'w-full h-9 rounded-md border border-border/50 bg-secondary/30 px-3 text-sm text-foreground',
                'focus:outline-none focus:ring-1 focus:ring-violet-500/40',
                errors.role && 'border-rose-500/50'
              )}
            >
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <FieldError msg={errors.role} />
          </div>

          {canGrantAll && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">الفرع</Label>
                <select
                  value={branchId}
                  onChange={e => { setBranchId(e.target.value); if (e.target.value) setGrantAll(false) }}
                  disabled={grantAll}
                  className="w-full h-9 rounded-md border border-border/50 bg-secondary/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:opacity-40"
                >
                  <option value="">— اختر الفرع —</option>
                  {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <input
                  id="grant-all"
                  type="checkbox"
                  checked={grantAll}
                  onChange={e => setGrantAll(e.target.checked)}
                  className="h-4 w-4 rounded border-border/60 bg-secondary/30 accent-violet-500"
                />
                <Label htmlFor="grant-all" className="text-sm text-foreground cursor-pointer">
                  منح صلاحية الوصول لجميع الفروع
                </Label>
              </div>
            </>
          )}

          {isEdit && (
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <input
                id="is-active-user"
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border/60 bg-secondary/30 accent-violet-500"
              />
              <Label htmlFor="is-active-user" className="text-sm text-foreground cursor-pointer">
                الحساب فعال ويمكنه تسجيل الدخول
              </Label>
            </div>
          )}
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost"
            className="border border-border/50"
            onClick={() => router.push('/users')}
            disabled={busy}>
            إلغاء
          </Button>
          <Button type="submit" disabled={busy}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
            {busy
              ? <><RefreshCw className="h-4 w-4 animate-spin" />جاري الحفظ...</>
              : isEdit ? 'حفظ التعديلات' : 'إنشاء المستخدم'
            }
          </Button>
        </div>

        {/* Password security note */}
        <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
          <Lock className="h-3 w-3 shrink-0" />
          كلمات المرور مشفرة ولا تُخزَّن بصيغة نصية. لا يمكن استرجاعها — فقط إعادة تعيينها.
        </p>
      </form>
    </div>
  )
}
