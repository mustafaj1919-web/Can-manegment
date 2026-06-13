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
  currentUserId: number
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

import { FeatureUnavailable } from '@/components/ui/FeatureUnavailable'

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function UsersPage() {
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
            <p className="text-xs text-muted-foreground">إدارة حسابات المستخدمين والصلاحيات</p>
          </div>
        </div>
        <Button disabled size="sm" className="gap-2 bg-primary/50 hover:bg-primary/90 text-primary-foreground/50 cursor-not-allowed">
          <Plus className="h-4 w-4" />مستخدم جديد
        </Button>
      </div>

      {/* Feature Unavailable State */}
      <FeatureUnavailable 
        title="إدارة المستخدمين غير متاحة"
        description="ميزة إدارة وإضافة المستخدمين وتعديلهم غير مدعومة في هذا الإصدار لعدم توفر نقاط النهاية الخاصة بها في خادم الخلفية."
      />
    </div>
  )
}
