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
      <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card p-6 shadow-2xl space-y-4">
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
      <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          إعادة تعيين كلمة مرور: <span className="text-primary">{user.username}</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">كلمة المرور الجديدة</label>
            <Input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="6 أحرف على الأقل" className="bg-secondary/30 border-border/50 h-9 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">تأكيد كلمة المرور</label>
            <Input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              placeholder="أعد كتابة كلمة المرور" className="bg-secondary/30 border-border/50 h-9 text-sm" />
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
  currentUserId: number | string
  canDelete: boolean
  onToggle: (u: User) => void
  onReset: (u: User) => void
  onDelete: (u: User) => void
}) {
  const isSelf = user.id === currentUserId
  const roleColor = ROLE_COLORS[user.role] ?? 'border-slate-500/30 bg-slate-500/10 text-foreground/70'

  return (
    <tr className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0',
            user.is_active_user ? roleColor : 'border-slate-700 bg-slate-800 text-muted-foreground'
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
          <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-muted-foreground">
            <Link href={`/users/${user.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-muted-foreground"
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
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const currentUserId = me?.id ?? ''
  const isOwner = me?.role === 'Owner'

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  // Dialog targets
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['users', { page, search, role }],
    queryFn: () => listUsers({ page, per_page: 20, search, role }),
  })

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: (u: User) => toggleUserActive(u.id),
    onSuccess: () => {
      toast.success('تمت تعديل حالة نشاط المستخدم بنجاح')
      qc.invalidateQueries({ queryKey: ['users'] })
      setToggleTarget(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'حدث خطأ أثناء تبديل الحالة')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (u: User) => deleteUser(u.id),
    onSuccess: () => {
      toast.success('تم حذف المستخدم بنجاح')
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'حدث خطأ أثناء حذف المستخدم')
    }
  })

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">المستخدمون</h1>
            <p className="text-xs text-muted-foreground">إدارة حسابات المستخدمين وصلاحيات الوصول للنظام</p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/users/new">
            <Plus className="h-4 w-4" />مستخدم جديد
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-secondary/10 p-3 rounded-lg border border-border/30">
        <div className="flex flex-1 min-w-[200px] gap-2 items-center">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="البحث باسم المستخدم..."
            className="h-8 max-w-xs text-xs bg-secondary/20 border-border/40"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">تصفية حسب الدور:</span>
          <select
            value={role}
            onChange={e => { setRole(e.target.value); setPage(1) }}
            aria-label="تصفية حسب الدور"
            className="h-8 text-xs rounded-md border border-border/40 bg-secondary/20 px-2 text-foreground focus:outline-none"
          >
            <option value="">كل الأدوار</option>
            {data?.roles?.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            )) ?? (
              <>
                <option value="Owner">مالك المعرض</option>
                <option value="Admin">مدير النظام</option>
                <option value="Accountant">محاسب</option>
                <option value="Sales">موظف مبيعات</option>
                <option value="Viewer">مشاهد</option>
              </>
            )}
          </select>
          <Button variant="ghost" size="sm" className="h-8 text-xs border border-border/40 gap-1 text-muted-foreground hover:text-foreground" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="glass rounded-xl py-16 text-center border border-border/30">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm font-semibold text-muted-foreground">تعذر تحميل بيانات المستخدمين</p>
          <Button variant="ghost" size="sm" className="mt-3 border border-border/50 text-xs text-muted-foreground hover:text-foreground" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="glass rounded-xl py-16 text-center border border-border/30">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">لا يوجد مستخدمون يطابقون معايير البحث</p>
        </div>
      ) : (
        <div className="glass rounded-xl border border-border/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  <th className="px-4 py-3">اسم المستخدم</th>
                  <th className="px-4 py-3">الدور الوظيفي</th>
                  <th className="px-4 py-3">الفرع</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-left">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.items.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUserId={currentUserId}
                    canDelete={isOwner}
                    onToggle={setToggleTarget}
                    onReset={setResetTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.is_active_user ? 'تعطيل حساب مستخدم' : 'تفعيل حساب مستخدم'}
          description={`هل أنت متأكد من أنك تريد ${toggleTarget.is_active_user ? 'تعطيل' : 'تفعيل'} حساب المستخدم "${toggleTarget.username}"؟`}
          confirmLabel={toggleTarget.is_active_user ? 'تعطيل الحساب' : 'تفعيل الحساب'}
          danger={toggleTarget.is_active_user}
          busy={toggleMutation.isPending}
          onConfirm={() => toggleMutation.mutate(toggleTarget)}
          onCancel={() => setToggleTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="حذف حساب مستخدم"
          description={`هل أنت متأكد نهائياً من حذف حساب المستخدم "${deleteTarget.username}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف المستخدم"
          danger
          busy={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
