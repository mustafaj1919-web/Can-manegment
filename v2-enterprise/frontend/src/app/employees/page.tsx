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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-xl border border-border/40 bg-[var(--card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {isEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h2>
          <button type="button" onClick={onClose} title="إغلاق" aria-label="إغلاق" className="text-muted-foreground hover:text-foreground/70 transition-colors">
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
              <label htmlFor="emp-active" className="text-xs text-foreground/70 cursor-pointer select-none">
                موظف نشط (يظهر في قائمة ممثلي البائع)
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border/50 px-5 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={mutation.isPending || !form.full_name.trim() || !form.phone.trim()}
            onClick={() => mutation.mutate()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(239,27,45,0.2)]"
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

import { FeatureUnavailable } from '@/components/ui/FeatureUnavailable'

/* ─── Confirm Delete ─────────────────────────────────────────────────────── */

function ConfirmDelete({
  emp, onConfirm, onCancel, busy,
}: {
  emp: Employee; onConfirm: () => void; onCancel: () => void; busy: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-sm rounded-xl border border-border/40 bg-[var(--card)] p-6 shadow-2xl space-y-4">
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
  const [search,      setSearch]      = useState('')
  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<Employee | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Employee | undefined>()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees({ per_page: 200 }),
  })

  const allEmployees: Employee[] = data?.items ?? []
  const employees = allEmployees.filter((e: Employee) =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      toast.success('تم حذف الموظف')
      setDeleteTarget(undefined)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (err) => toast.error(extractApiError(err)),
  })

  function openAdd() { setEditTarget(undefined); setDialogOpen(true) }
  function openEdit(emp: Employee) { setEditTarget(emp); setDialogOpen(true) }
  function closeDialog() { setDialogOpen(false); setEditTarget(undefined) }
  function onSaved() { closeDialog(); queryClient.invalidateQueries({ queryKey: ['employees'] }) }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">الموظفون</h1>
              <p className="text-xs text-muted-foreground">ممثلو البائع في عقود البيع</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} title="تحديث" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              موظف جديد
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="ps-9 bg-secondary/30 border-border/60"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {search ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفون. اضغط "موظف جديد" للإضافة.'}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {employees.map((emp) => (
              <div key={emp.id} className="rounded-xl border border-border/60 bg-card p-4 flex items-start gap-3 hover:border-primary/20 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                  {emp.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{emp.full_name}</p>
                    <Badge variant={emp.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {emp.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  {emp.title && <p className="text-xs text-muted-foreground mt-0.5"><Briefcase className="h-3 w-3 inline ml-1" />{emp.title}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span><PhoneCall className="h-3 w-3 inline ml-1" />{emp.phone}</span>
                    {emp.id_number && <span><CreditCard className="h-3 w-3 inline ml-1" />{emp.id_number}</span>}
                    {emp.address && <span><MapPin className="h-3 w-3 inline ml-1" />{emp.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors" title="تعديل">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(emp)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <EmployeeDialog initial={editTarget} onClose={closeDialog} onSaved={onSaved} />
      )}
      {deleteTarget && (
        <ConfirmDelete
          emp={deleteTarget}
          onConfirm={() => deleteMutation.mutate(String(deleteTarget.id))}
          onCancel={() => setDeleteTarget(undefined)}
          busy={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
