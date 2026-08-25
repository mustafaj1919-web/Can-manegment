'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  HelpCircle, Loader2, AlertCircle, Sparkles, Shield, RefreshCw 
} from 'lucide-react'
import { 
  getWebsiteServices, createWebsiteService, 
  updateWebsiteService, deleteWebsiteService 
} from '@/lib/api/website'

export default function ServicesCMS() {
  const qc = useQueryClient()
  const [editingService, setEditingService] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-services'],
    queryFn: getWebsiteServices
  })

  const createMutation = useMutation({
    mutationFn: createWebsiteService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-services'] })
      closeForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (s) => updateWebsiteService(s.id, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-services'] })
      closeForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteService,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-services'] })
  })

  const closeForm = () => {
    setEditingService(null)
    setIsFormOpen(false)
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setIsFormOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const serviceData = {
      titleEn: formData.get('titleEn'),
      titleAr: formData.get('titleAr'),
      descriptionEn: formData.get('descriptionEn'),
      descriptionAr: formData.get('descriptionAr'),
      icon: formData.get('icon'),
      displayOrder: Number(formData.get('displayOrder')),
      isActive: formData.get('isActive') === 'true',
    }

    if (editingService) {
      updateMutation.mutate({ ...serviceData, id: editingService.id })
    } else {
      createMutation.mutate(serviceData)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">جاري تحميل الخدمات...</span>
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-muted-foreground">فشل تحميل قائمة الخدمات. تأكد من صلاحيات المستخدم.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <HelpCircle className="h-7 w-7 text-rose-400" />
            إدارة خدمات المعرض
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">إدارة خدمات ما بعد البيع، الضمانات، وتسهيلات الشراء المعروضة للزبائن.</p>
        </div>
        <button
          onClick={() => { setEditingService(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-transform hover:scale-105 active:scale-95 self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          إضافة خدمة جديدة
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.data.map((s) => (
          <div key={s.id} className="bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  {s.icon === 'shield' ? <Shield className="h-6 w-6" /> : s.icon === 'sparkles' ? <Sparkles className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/10 text-muted-foreground'
                }`}>
                  {s.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {s.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground flex justify-between">
                  <span>{s.titleAr}</span>
                  <span className="text-xs text-muted-foreground font-normal self-end">{s.titleEn}</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.descriptionAr}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/20 pt-4 mt-6">
              <button
                onClick={() => handleEdit(s)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="تعديل"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-400 transition-colors"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border/40 bg-[var(--card)] p-6 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold text-foreground font-family-cairo">
              {editingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">العنوان (عربي)</span>
                  <input
                    name="titleAr"
                    defaultValue={editingService?.titleAr}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">العنوان (English)</span>
                  <input
                    name="titleEn"
                    defaultValue={editingService?.titleEn}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">الوصف (عربي)</span>
                <textarea
                  name="descriptionAr"
                  rows={3}
                  defaultValue={editingService?.descriptionAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">الوصف (English)</span>
                <textarea
                  name="descriptionEn"
                  rows={3}
                  defaultValue={editingService?.descriptionEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                  required
                />
              </label>

              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">أيقونة الخدمة</span>
                  <select
                    name="icon"
                    defaultValue={editingService?.icon ?? 'cog'}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="cog">ترس / إعدادات</option>
                    <option value="shield">درع / أمان</option>
                    <option value="sparkles">نجوم / جودة</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">ترتيب العرض</span>
                  <input
                    name="displayOrder"
                    type="number"
                    defaultValue={editingService?.displayOrder ?? 0}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">حالة التفعيل</span>
                  <select
                    name="isActive"
                    defaultValue={editingService?.isActive?.toString() ?? 'true'}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="true">نشط</option>
                    <option value="false">معطل</option>
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
