'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Search, RefreshCw, Pencil, Power, KeyRound,
  Trash2, AlertTriangle, ShieldCheck, ShieldOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  listUsers, toggleUserActive, resetUserPassword, deleteUser, ROLE_COLORS,
  type RoleOption,
} from '@/lib/api/users'
import type { User } from '@/types'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

/* ─── Confirm Dialog ──────────────────────────────────────────────────────── */

function ConfirmDialog({
  title, description, confirmLabel, danger,
  onConfirm, onCancel, busy,
}: {
  title: string; description: string; confirmLabel: string
  danger?: boolean; busy?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" dir="rtl">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a1628] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('h-5 w-5 shrink-0', danger ? 'text-rose-400' : 'text-amber-400')} />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>إلغاء</Button>
          <Button
            size="sm"
            disabled={busy}
            className={cn('text-white', danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500')}
            onClick={onConfirm}
          >
            {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Reset Password Dialog ───────────────────────────────────────────────── */

function ResetPasswordDialog({
  user, onClose,
}: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [pw, setPw]     = useState('')
  const [pw2, setPw2]   = useState('')
  const [err, setErr]   = useState('')

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user.id, { password: pw }),
    onSuccess: () => {
      toast.success('تمت إعادة تعيين كلمة المرور')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (pw.length < 6) { setErr('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (pw !== pw2)    { setErr('كلمتا المرور غير متطابقتين'); return }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" dir="rtl">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a1628] p-6 shadow-2xl">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          إعادة تعيين كلمة مرور: <span className="text-primary">{user.username}</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">كلمة المرور الجديدة</label>
            <Input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="6 أحرف على الأقل" className="bg-white/5 border-white/10 h-9 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">تأكيد كلمة المرور</label>
            <Input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              placeholder="أعد كتابة كلمة المرور" className="bg-white/5 border-white/10 h-9 text-sm" />
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
            <Button size="sm" type="submit" disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'حفظ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── User Row ────────────────────────────────────────────────────────────── */

function UserRow({
  user, currentUserId, canDelete, onToggle, onReset, onDelete,
}: {
  user: User
  currentUserId: number
  canDelete: boolean
  onToggle: (u: User) => void
  onReset: (u: User) => void
  onDelete: (u: User) => void
}) {
  const isSelf = user.id === currentUserId
  const roleColor = ROLE_COLORS[user.role] ?? 'border-slate-500/30 bg-slate-500/10 text-slate-300'

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0',
            user.is_active_user ? roleColor : 'border-slate-700 bg-slate-800 text-slate-500'
          )}>
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{user.username}</p>
            {isSelf && <p className="text-[10px] text-primary/70">أنت</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', roleColor)}>
          {user.role_label ?? user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {user.branch?.name ?? (user.branch_id ? `فرع ${user.branch_id}` : '—')}
        {user.can_access_all_branches && (
          <span className="mr-1 text-[10px] text-muted-foreground">(جميع الفروع)</span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.is_active_user
          ? <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px]">نشط</Badge>
          : <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px]">معطّل</Badge>
        }
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-100">
            <Link href={`/users/${user.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-100"
            onClick={() => onReset(user)} title="إعادة تعيين كلمة المرور">
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          {!isSelf && (
            <Button variant="ghost" size="sm"
              className={cn('h-7 w-7 p-0',
                user.is_active_user
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-emerald-400 hover:text-emerald-300'
              )}
              onClick={() => onToggle(user)}
              title={user.is_active_user ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}>
              {user.is_active_user ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            </Button>
          )}
          {canDelete && !isSelf && (
            <Button variant="ghost" size="sm"
              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
              onClick={() => onDelete(user)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function UsersPage() {
  const qc          = useQueryClient()
  const { user: me } = useAuthStore()
  const canDelete   = me?.permissions?.includes('delete_records') ?? false

  const [search,    setSearch]    = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [confirmToggle, setConfirmToggle]   = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState<User | null>(null)
  const [resetTarget,   setResetTarget]     = useState<User | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn:  () => listUsers({ search: search || undefined, role: roleFilter || undefined }),
    staleTime: 30_000,
  })

  const toggleMutation = useMutation({
    mutationFn: (u: User) => toggleUserActive(u.id),
    onSuccess: (updated) => {
      toast.success(updated.is_active_user ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم')
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmToggle(null)
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ')
      setConfirmToggle(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (u: User) => deleteUser(u.id),
    onSuccess: () => {
      toast.success('تم حذف المستخدم')
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmDelete(null)
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ')
      setConfirmDelete(null)
    },
  })

  const roles: RoleOption[] = data?.roles ?? []

  return (
    <div className="space-y-5" dir="rtl">

      {/* Dialogs */}
      {confirmToggle && (
        <ConfirmDialog
          title={confirmToggle.is_active_user ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
          description={confirmToggle.is_active_user
            ? `هل تريد تعطيل المستخدم "${confirmToggle.username}"؟ لن يتمكن من تسجيل الدخول.`
            : `هل تريد تفعيل المستخدم "${confirmToggle.username}"؟`}
          confirmLabel={confirmToggle.is_active_user ? 'تعطيل' : 'تفعيل'}
          danger={confirmToggle.is_active_user}
          busy={toggleMutation.isPending}
          onConfirm={() => toggleMutation.mutate(confirmToggle)}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="حذف المستخدم"
          description={`هل تريد حذف المستخدم "${confirmDelete.username}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف"
          danger
          busy={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المستخدمون</h1>
            <p className="text-xs text-muted-foreground">إدارة حسابات المستخدمين والصلاحيات</p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/users/new"><Plus className="h-4 w-4" />مستخدم جديد</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-lg p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="بحث باسم المستخدم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-9 bg-white/5 border-white/10 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="flex-1 h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="">كل الأدوار</option>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}
              className="h-9 px-3 border border-white/10">
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : isError ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل قائمة المستخدمين</p>
          <Button variant="ghost" size="sm" className="mt-3 border border-white/10" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : !data?.items?.length ? (
        <div className="glass rounded-lg py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا يوجد مستخدمون</p>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">قائمة المستخدمين</h2>
            <span className="text-xs text-muted-foreground">{data.total} مستخدم</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-start font-medium">المستخدم</th>
                  <th className="px-4 py-2.5 text-start font-medium">الدور</th>
                  <th className="px-4 py-2.5 text-start font-medium">الفرع</th>
                  <th className="px-4 py-2.5 text-start font-medium">الحالة</th>
                  <th className="px-4 py-2.5 text-end font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUserId={me?.id ?? -1}
                    canDelete={canDelete}
                    onToggle={setConfirmToggle}
                    onReset={setResetTarget}
                    onDelete={setConfirmDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
