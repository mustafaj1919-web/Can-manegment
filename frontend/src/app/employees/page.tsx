'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Search, RefreshCw, Pencil, Trash2,
  AlertTriangle, X, Check, PhoneCall, CreditCard, MapPin, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  type Employee, type EmployeePayload,
} from '@/lib/api/employees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { extractApiError } from '@/lib/api/client'

/* ─── Employee Form Dialog ───────────────────────────────────────────────── */

function EmployeeDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Employee
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial

  const [form, setForm] = useState<EmployeePayload>({
    full_name: initial?.full_name ?? '',
    phone:     initial?.phone     ?? '',
    id_number: initial?.id_number ?? '',
    address:   initial?.address   ?? '',
    title:     initial?.title     ?? '',
    is_active: initial?.is_active ?? true,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      isEdit ? updateEmployee(initial!.id, form) : createEmployee(form),
    onSuccess: () => {
      toast.success(isEdit ? 'تم تحديث بيانات الموظف' : 'تم إضافة الموظف بنجاح')
      onSaved()
    },
    onError: (err) => setError(extractApiError(err)),
  })

  function set(field: keyof EmployeePayload, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" dir="rtl">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a1628] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {isEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h2>
          <button type="button" onClick={onClose} title="إغلاق" aria-label="إغلاق" className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="emp-label">الاسم الكامل *</label>
              <Input
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="الاسم الكامل"
                className="emp-input"
              />
            </div>
            <div>
              <label className="emp-label">رقم الهاتف *</label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="07XXXXXXXXX"
                dir="ltr"
                className="emp-input"
              />
            </div>
            <div>
              <label className="emp-label">رقم الهوية</label>
              <Input
                value={form.id_number ?? ''}
                onChange={(e) => set('id_number', e.target.value)}
                placeholder="رقم الهوية"
                className="emp-input"
              />
            </div>
            <div>
              <label className="emp-label">المسمى الوظيفي</label>
              <Input
                value={form.title ?? ''}
                onChange={(e) => set('title', e.target.value)}
                placeholder="موظف مبيعات"
                className="emp-input"
              />
            </div>
            <div className="col-span-2">
              <label className="emp-label">العنوان</label>
              <Input
                value={form.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
                placeholder="المدينة — المنطقة"
                className="emp-input"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="emp-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-500"
              />
              <label htmlFor="emp-active" className="text-xs text-slate-300 cursor-pointer select-none">
                موظف نشط (يظهر في قائمة ممثلي البائع)
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={mutation.isPending || !form.full_name.trim() || !form.phone.trim()}
            onClick={() => mutation.mutate()}
            className="bg-[#1e3a5f] hover:bg-[#2d5490] text-white border border-[#2d5490]"
          >
            {mutation.isPending
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Check className="h-3.5 w-3.5" />
            }
            {isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Confirm Delete ─────────────────────────────────────────────────────── */

function ConfirmDelete({
  emp, onConfirm, onCancel, busy,
}: {
  emp: Employee; onConfirm: () => void; onCancel: () => void; busy: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" dir="rtl">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a1628] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <h2 className="text-sm font-semibold text-foreground">حذف الموظف</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          هل تريد حذف <b className="text-white">{emp.full_name}</b>؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>إلغاء</Button>
          <Button
            size="sm" disabled={busy}
            className="bg-rose-600 hover:bg-rose-500 text-white"
            onClick={onConfirm}
          >
            {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'حذف'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<'add' | Employee | null>(null)
  const [delTarget, setDelTarget] = useState<Employee | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['employees', search],
    queryFn:  () => getEmployees({ search, per_page: 100 }),
    staleTime: 30_000,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => {
      toast.success('تم حذف الموظف بنجاح')
      setDelTarget(null)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (err) => {
      toast.error(extractApiError(err))
      setDelTarget(null)
    },
  })

  const employees = data?.items ?? []

  return (
    <div className="min-h-screen bg-[#07111f] text-foreground" dir="rtl">
      {/* dialogs */}
      {dialog === 'add' && (
        <EmployeeDialog
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); queryClient.invalidateQueries({ queryKey: ['employees'] }) }}
        />
      )}
      {dialog && dialog !== 'add' && (
        <EmployeeDialog
          initial={dialog as Employee}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); queryClient.invalidateQueries({ queryKey: ['employees'] }) }}
        />
      )}
      {delTarget && (
        <ConfirmDelete
          emp={delTarget}
          busy={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate(delTarget.id)}
          onCancel={() => setDelTarget(null)}
        />
      )}

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e3a5f]/60 border border-[#2d5490]/40">
              <Users className="h-4.5 w-4.5 text-[#5b9bd5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">الموظفون</h1>
              <p className="text-xs text-muted-foreground">ممثلو البائع في عقود البيع</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
              title="تحديث"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Button
              size="sm"
              onClick={() => setDialog('add')}
              className="bg-[#1e3a5f] hover:bg-[#2d5490] text-white border border-[#2d5490] gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              موظف جديد
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف..."
            className="pr-9 text-sm bg-white/[0.03] border-white/[0.08]"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-sm text-rose-400">
            تعذّر تحميل البيانات.{' '}
            <button type="button" className="underline" onClick={() => refetch()}>إعادة المحاولة</button>
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm text-muted-foreground">لا يوجد موظفون{search ? ' يطابقون البحث' : ' بعد'}</p>
            {!search && (
              <Button size="sm" onClick={() => setDialog('add')} className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> إضافة أول موظف
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.03]">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">الاسم</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> الهاتف</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> المسمى</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> الهوية</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      'border-b border-white/[0.05] transition-colors',
                      'hover:bg-white/[0.025]'
                    )}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white text-sm">{emp.full_name}</div>
                      {emp.address && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {emp.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 font-mono" dir="ltr">{emp.phone}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{emp.title ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{emp.id_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full border',
                          emp.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        )}
                      >
                        {emp.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setDialog(emp)}
                          title="تعديل"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDelTarget(emp)}
                          title="حذف"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        .emp-label {
          display: block; font-size: 11px; color: #94a3b8;
          font-weight: 600; margin-bottom: 4px;
        }
        .emp-input { font-size: 13px; }
      `}</style>
    </div>
  )
}
