'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, RotateCcw, Save, AlertTriangle, RefreshCw, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  listRoles, updateRolePermissions, resetRolePermissions,
  ROLE_COLORS, ROLE_BORDER,
  type RoleItem, type PermissionOption,
} from '@/lib/api/roles'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── Role Card ───────────────────────────────────────────────────────────── */

function RoleCard({
  role,
  allPermissions,
  canEdit,
}: {
  role: RoleItem
  allPermissions: PermissionOption[]
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const [draft, setDraft]   = useState<Set<string>>(new Set(role.permissions))
  const [dirty, setDirty]   = useState(false)

  const chip = ROLE_COLORS[role.role] ?? 'border-slate-500/30 bg-slate-500/10 text-foreground/70'
  const border = ROLE_BORDER[role.role] ?? 'border-border/50'

  const saveMutation = useMutation({
    mutationFn: () => updateRolePermissions(role.role, Array.from(draft)),
    onSuccess: (updated) => {
      toast.success(`تم حفظ صلاحيات ${role.label}`)
      setDraft(new Set(updated.permissions))
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ أثناء الحفظ')
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => resetRolePermissions(role.role),
    onSuccess: (updated) => {
      toast.success(`تمت إعادة ضبط صلاحيات ${role.label} للقيم الافتراضية`)
      setDraft(new Set(updated.permissions))
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (e: unknown) => {
      const ae = e as { response?: { data?: { error?: string } } }
      toast.error(ae?.response?.data?.error ?? 'حدث خطأ')
    },
  })

  function toggle(key: string) {
    if (!canEdit || role.is_fixed) return
    if (key === 'view_dashboard') return  // always required
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setDirty(true)
  }

  const busy = saveMutation.isPending || resetMutation.isPending

  return (
    <div className={cn('glass rounded-xl overflow-hidden border', border)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
            chip,
          )}>
            {role.is_fixed && <Lock className="h-3 w-3" />}
            {role.label}
          </span>
          {dirty && (
            <span className="text-[11px] text-amber-400 font-medium">• تغييرات غير محفوظة</span>
          )}
        </div>

        {canEdit && !role.is_fixed && (
          <div className="flex gap-2">
            <Button
              variant="ghost" size="sm"
              className="h-7 gap-1.5 border border-border/50 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => resetMutation.mutate()}
              disabled={busy}
              title="إعادة ضبط للقيم الافتراضية"
            >
              {resetMutation.isPending
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <RotateCcw className="h-3 w-3" />}
              افتراضي
            </Button>
            <Button
              size="sm"
              className={cn(
                'h-7 gap-1.5 text-xs text-white',
                dirty ? 'bg-violet-600 hover:bg-violet-500' : 'bg-secondary/30 hover:bg-secondary/40',
              )}
              onClick={() => saveMutation.mutate()}
              disabled={busy || !dirty}
            >
              {saveMutation.isPending
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />}
              حفظ
            </Button>
          </div>
        )}

        {role.is_fixed && (
          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            غير قابل للتعديل
          </span>
        )}
      </div>

      {/* Permissions grid */}
      <div className="p-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allPermissions.map(({ key, label }) => {
          const active    = draft.has(key)
          const required  = key === 'view_dashboard'
          const editable  = canEdit && !role.is_fixed && !required

          return (
            <button
              key={key}
              type="button"
              disabled={!editable}
              onClick={() => toggle(key)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start text-xs transition-colors',
                active
                  ? 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                  : 'border-border/50 bg-secondary/10 text-muted-foreground',
                editable && 'cursor-pointer hover:border-border/60',
                !editable && 'cursor-default opacity-80',
              )}
            >
              {/* Checkbox visual */}
              <span className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                active
                  ? 'border-violet-500 bg-violet-500'
                  : 'border-border/60 bg-transparent',
              )}>
                {active && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="leading-snug">{label}</span>
              {required && <span className="ms-auto text-[10px] text-violet-400/70">دائماً</span>}
            </button>
          )
        })}
      </div>

      {/* Permission count summary */}
      <div className="border-t border-border/30 px-5 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60">
          {draft.size} من {allPermissions.length} صلاحية
        </span>
        {role.is_fixed && (
          <span className="text-[11px] text-muted-foreground/60">يملك جميع الصلاحيات دائماً</span>
        )}
      </div>
    </div>
  )
}
export default function RolesPage() {
  const [mounted, setMounted] = useState(false)
  const { user: me } = useAuthStore()
  const canManage    = mounted && (me?.permissions?.includes('manage_roles') ?? false)
  const isOwner      = mounted && me?.role === 'Owner'

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['roles'],
    queryFn:  listRoles,
    staleTime: 60_000,
  })

  const errorStatus =
    (error as any)?.response?.status ??
    (error as any)?.status ??
    (error as any)?.response?.data?.status

  const isForbiddenOrNotFound =
    isError &&
    (errorStatus === 403 || errorStatus === 404)

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <ShieldCheck className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">الأدوار والصلاحيات</h1>
            <p className="text-xs text-muted-foreground">
              {canManage
                ? 'انقر على أي صلاحية لتفعيلها أو تعطيلها لكل دور'
                : 'عرض الصلاحيات المعيّنة لكل دور'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm"
          className="gap-2 border border-border/50 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          تحديث
        </Button>
      </div>

      {/* Notice for non-Owner trying to edit Admin */}
      {canManage && !isOwner && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300 font-medium">
            يمكنك تعديل صلاحيات أدوار محاسب، مبيعات، ومشاهد فقط.
            تعديل دور المدير مقصور على مالك المعرض.
          </p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="glass rounded-xl py-16 text-center border border-border/30">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm font-semibold text-muted-foreground">
            {isForbiddenOrNotFound ? 'الصلاحيات غير متاحة في هذا الإصدار' : 'تعذر تحميل الأدوار'}
          </p>
          {!isForbiddenOrNotFound && (
            <Button variant="ghost" size="sm" className="mt-3 border border-border/50 text-xs text-muted-foreground hover:text-foreground" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {data.roles.map((role) => {
            const canEdit = canManage && (
              role.role === 'Admin' ? isOwner :
              role.role !== 'Owner'
            )
            return (
              <RoleCard
                key={role.role}
                role={role}
                allPermissions={data.all_permissions}
                canEdit={canEdit}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
