'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Truck, Plus, Search, RefreshCw, Pencil, Trash2,
  AlertTriangle, X, Check, Phone, MapPin, StickyNote,
  DollarSign, ShoppingBag, CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatMoney } from '@/lib/utils'
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier, paySupplier,
  type Supplier,
} from '@/lib/api/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { extractApiError } from '@/lib/api/client'

type Modal =
  | { kind: 'add' }
  | { kind: 'edit'; supplier: Supplier }
  | { kind: 'delete'; supplier: Supplier }
  | { kind: 'pay'; supplier: Supplier }
  | null

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'نقداً' },
  { value: 'Bank', label: 'حوالة مصرفية' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<Modal>(null)

  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', accountCode: '111001' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const PER_PAGE = 25

  const { data, isLoading, isError } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => getSuppliers({ page, per_page: PER_PAGE, search: search || undefined }),
    placeholderData: (prev) => prev,
  })

  const suppliers: Supplier[] = data?.data ?? []
  const total = data?.total ?? 0

  const createMut = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم إضافة المورد بنجاح'); setModal(null) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateSupplier(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم تحديث بيانات المورد'); setModal(null) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم تعطيل المورد'); setModal(null) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const payMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => paySupplier(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('تم صرف الدفعة للمورد بنجاح'); setModal(null) },
    onError: (e) => toast.error(extractApiError(e)),
  })

  function openAdd() {
    setForm({ name: '', phone: '', address: '', notes: '' })
    setErrors({})
    setModal({ kind: 'add' })
  }

  function openEdit(s: Supplier) {
    setForm({ name: s.name, phone: s.phone, address: s.address ?? '', notes: s.notes ?? '' })
    setErrors({})
    setModal({ kind: 'edit', supplier: s })
  }

  function openPay(s: Supplier) {
    setPayForm({ amount: '', method: 'Cash', accountCode: '111001' })
    setErrors({})
    setModal({ kind: 'pay', supplier: s })
  }

  function validateForm() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'اسم المورد مطلوب'
    if (!form.phone.trim()) e.phone = 'رقم الهاتف مطلوب'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submitForm() {
    if (!validateForm()) return
    if (modal?.kind === 'add') {
      createMut.mutate({ name: form.name.trim(), phone: form.phone.trim(), address: form.address || undefined, notes: form.notes || undefined })
    } else if (modal?.kind === 'edit') {
      updateMut.mutate({ id: modal.supplier.id, payload: { name: form.name, phone: form.phone, address: form.address || null, notes: form.notes || null } })
    }
  }

  function submitPay() {
    const e: Record<string, string> = {}
    const amt = parseFloat(payForm.amount)
    if (!payForm.amount || isNaN(amt) || amt <= 0) e.amount = 'أدخل مبلغاً صحيحاً'
    setErrors(e)
    if (Object.keys(e).length > 0 || modal?.kind !== 'pay') return
    payMut.mutate({ id: modal.supplier.id, payload: { amount: amt, paymentMethod: payForm.method, creditAccountCode: payForm.accountCode } })
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Truck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">الموردون</h1>
            <p className="text-xs text-muted-foreground">{total} مورد مسجل</p>
          </div>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> مورد جديد
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الكود أو الهاتف..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pr-9 text-right"
          dir="rtl"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {['الاسم', 'الكود', 'الهاتف', 'العنوان', 'الحساب', 'الحالة', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-400" />
                    فشل تحميل البيانات
                  </td>
                </tr>
              )}
              {!isLoading && !isError && suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Truck className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    لا يوجد موردون مسجلون
                  </td>
                </tr>
              )}
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.address ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">{s.account_code}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {s.is_active ? 'نشط' : 'معطل'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-300" onClick={() => openPay(s)} title="صرف دفعة">
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} title="تعديل">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-300" onClick={() => setModal({ kind: 'delete', supplier: s })} title="تعطيل">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(modal?.kind === 'add' || modal?.kind === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" dir="rtl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{modal.kind === 'add' ? 'إضافة مورد جديد' : 'تعديل المورد'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setModal(null)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">اسم المورد *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: شركة المستقبل للسيارات" className={cn(errors.name && 'border-rose-500')} />
                <FieldError msg={errors.name} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">رقم الهاتف *</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07xx xxx xxxx" className={cn(errors.phone && 'border-rose-500')} />
                <FieldError msg={errors.phone} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">العنوان</label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="اختياري" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">ملاحظات</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="اختياري" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={submitForm} disabled={createMut.isPending || updateMut.isPending} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                {modal.kind === 'add' ? 'إضافة' : 'حفظ التعديلات'}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {modal?.kind === 'pay' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl" dir="rtl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">صرف دفعة للمورد</h2>
              <Button variant="ghost" size="icon" onClick={() => setModal(null)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{modal.supplier.name}</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">المبلغ (IQD) *</label>
                <Input
                  type="number"
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className={cn(errors.amount && 'border-rose-500')}
                />
                <FieldError msg={errors.amount} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">طريقة الدفع</label>
                <select
                  value={payForm.method}
                  onChange={e => {
                    const m = e.target.value
                    setPayForm(f => ({ ...f, method: m, accountCode: m === 'Cash' ? '111001' : '112001' }))
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={submitPay} disabled={payMut.isPending} className="flex-1 gap-2">
                <DollarSign className="h-4 w-4" /> صرف
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modal?.kind === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl" dir="rtl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
            </div>
            <h2 className="mb-2 text-lg font-bold">تعطيل المورد</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              هل تريد تعطيل <span className="font-semibold text-foreground">{modal.supplier.name}</span>؟
              لا يمكن تعطيل المورد إذا كانت هناك فواتير شراء مرتبطة به.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => deleteMut.mutate(modal.supplier.id)}
                disabled={deleteMut.isPending}
                className="flex-1"
              >
                تعطيل
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
