'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Star, Loader2, AlertCircle, MessageSquare
} from 'lucide-react'
import { 
  getWebsiteTestimonials, createWebsiteTestimonial, 
  updateWebsiteTestimonial, deleteWebsiteTestimonial 
} from '@/lib/api/website'

export default function TestimonialsCMS() {
  const qc = useQueryClient()
  const [editingItem, setEditingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-testimonials'],
    queryFn: getWebsiteTestimonials
  })

  const createMutation = useMutation({
    mutationFn: createWebsiteTestimonial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-testimonials'] })
      closeForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (t) => updateWebsiteTestimonial(t.id, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-testimonials'] })
      closeForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteTestimonial,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-testimonials'] })
  })

  const closeForm = () => {
    setEditingItem(null)
    setIsFormOpen(false)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm('هل أنت متأكد من حذف تقييم هذا العميل؟')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      customerName: formData.get('customerName'),
      customerRoleEn: formData.get('customerRoleEn'),
      customerRoleAr: formData.get('customerRoleAr'),
      reviewEn: formData.get('reviewEn'),
      reviewAr: formData.get('reviewAr'),
      rating: Number(formData.get('rating')),
      customerImage: formData.get('customerImage') || null,
      displayOrder: Number(formData.get('displayOrder')),
      isActive: formData.get('isActive') === 'true',
    }

    if (editingItem) {
      updateMutation.mutate({ ...payload, id: editingItem.id })
    } else {
      createMutation.mutate(payload)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">جاري تحميل الآراء...</span>
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-muted-foreground">فشل تحميل قائمة الآراء. تأكد من صلاحيات المستخدم.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <MessageSquare className="h-7 w-7 text-yellow-400" />
            إدارة آراء وتقييمات العملاء
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">إدارة المراجعات وشهادات الزبائن المعروضة على الصفحة الرئيسية للموقع العام.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-transform hover:scale-105 active:scale-95 self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          إضافة تقييم عميل
        </button>
      </div>

      {/* Testimonials List */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.data.map((item) => (
          <div key={item.id} className="bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-1 text-yellow-400">
                  {Array.from({ length: item.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  item.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/10 text-muted-foreground'
                }`}>
                  {item.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {item.isActive ? 'نشط' : 'معطل'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-4">" {item.reviewAr} "</p>
              <div>
                <h4 className="font-bold text-sm text-foreground">{item.customerName}</h4>
                <p className="text-[10px] text-muted-foreground">{item.customerRoleAr} / {item.customerRoleEn}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-6">
              <button
                onClick={() => handleEdit(item)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="تعديل"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-400 transition-colors"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border/40 bg-[var(--card)] p-6 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-foreground font-family-cairo">
              {editingItem ? 'تعديل التقييم' : 'إضافة تقييم جديد'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">اسم العميل</span>
                  <input
                    name="customerName"
                    defaultValue={editingItem?.customerName}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">رابط صورة العميل (اختياري)</span>
                  <input
                    name="customerImage"
                    defaultValue={editingItem?.customerImage}
                    placeholder="https://example.com/avatar.jpg"
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">وظيفة/موقع العميل (عربي)</span>
                  <input
                    name="customerRoleAr"
                    defaultValue={editingItem?.customerRoleAr}
                    placeholder="رائد أعمال - بغداد"
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">وظيفة/موقع العميل (English)</span>
                  <input
                    name="customerRoleEn"
                    defaultValue={editingItem?.customerRoleEn}
                    placeholder="Entrepreneur - Baghdad"
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">الرأي والتقييم (عربي)</span>
                <textarea
                  name="reviewAr"
                  rows={3}
                  defaultValue={editingItem?.reviewAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">الرأي والتقييم (English)</span>
                <textarea
                  name="reviewEn"
                  rows={3}
                  defaultValue={editingItem?.reviewEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                  required
                />
              </label>

              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">التقييم (النجوم)</span>
                  <select
                    name="rating"
                    defaultValue={editingItem?.rating ?? 5}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="5">5 نجوم</option>
                    <option value="4">4 نجوم</option>
                    <option value="3">3 نجوم</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">ترتيب العرض</span>
                  <input
                    name="displayOrder"
                    type="number"
                    defaultValue={editingItem?.displayOrder ?? 0}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">حالة النشر</span>
                  <select
                    name="isActive"
                    defaultValue={editingItem?.isActive?.toString() ?? 'true'}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="true">نشط (يظهر في الموقع)</option>
                    <option value="false">معطل (مخفي)</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-secondary transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
