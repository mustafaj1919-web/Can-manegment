'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Edit2, Trash2, Globe, Search, Loader2, AlertCircle, 
  FileText, CheckCircle2, AlertTriangle, Eye, Calendar 
} from 'lucide-react'
import { 
  getWebsiteArticles, createWebsiteArticle, 
  updateWebsiteArticle, deleteWebsiteArticle, publishWebsiteArticle 
} from '@/lib/api/website'

export default function NewsCMS() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingItem, setEditingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-articles', search, statusFilter, page],
    queryFn: () => getWebsiteArticles(search, statusFilter, page, 10),
    staleTime: 10_000
  })

  const createMutation = useMutation({
    mutationFn: createWebsiteArticle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-articles'] })
      closeForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (a) => updateWebsiteArticle(a.id, a),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-articles'] })
      closeForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteArticle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-articles'] })
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, status }) => publishWebsiteArticle(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-articles'] })
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
    if (confirm('هل أنت متأكد من حذف هذا المقال؟')) {
      deleteMutation.mutate(id)
    }
  }

  const handleChangeStatus = (id, newStatus) => {
    publishMutation.mutate({ id, status: newStatus })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      titleEn: formData.get('titleEn'),
      titleAr: formData.get('titleAr'),
      summaryEn: formData.get('summaryEn'),
      summaryAr: formData.get('summaryAr'),
      contentEn: formData.get('contentEn'),
      contentAr: formData.get('contentAr'),
      coverImage: formData.get('coverImage') || null,
      category: formData.get('category'),
      slug: formData.get('slug'),
      isFeatured: formData.get('isFeatured') === 'true',
      status: formData.get('status'),
      metaTitleEn: formData.get('metaTitleEn') || '',
      metaTitleAr: formData.get('metaTitleAr') || '',
      metaDescriptionEn: formData.get('metaDescriptionEn') || '',
      metaDescriptionAr: formData.get('metaDescriptionAr') || '',
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
        <span className="text-sm text-muted-foreground">جاري تحميل الأخبار والمقالات...</span>
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-muted-foreground">فشل تحميل الأخبار. تأكد من صلاحيات المستخدم.</p>
      </div>
    )
  }

  const articles = data.data.items
  const total = data.data.total

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <FileText className="h-7 w-7 text-sky-400" />
            الأخبار والمقالات وعروض المعرض
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">كتابة وتحرير منشورات المدونة، إعلانات المعرض، وتفاصيل الطرازات الجديدة.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-transform hover:scale-105 active:scale-95 self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          كتابة مقال جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute start-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="البحث في العناوين..."
            className="w-full rounded-lg border border-border bg-[var(--card)] ps-10 pe-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-[var(--card)] px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
        >
          <option value="">كل الحالات</option>
          <option value="Draft">مسودة</option>
          <option value="Published">منشور</option>
          <option value="Archived">مؤرشف</option>
        </select>
      </div>

      {/* Articles Table/List */}
      <div className="bg-[var(--card)] border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-start text-sm">
          <thead className="bg-secondary/15 text-muted-foreground text-xs uppercase font-bold border-b border-border/20">
            <tr>
              <th className="px-6 py-4 text-start font-semibold">المقال</th>
              <th className="px-6 py-4 text-start font-semibold">التصنيف</th>
              <th className="px-6 py-4 text-start font-semibold">الحالة</th>
              <th className="px-6 py-4 text-start font-semibold">تاريخ النشر</th>
              <th className="px-6 py-4 text-end font-semibold">الخيارات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {articles.map((item) => (
              <tr key={item.id} className="hover:bg-secondary/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {item.coverImage && (
                      <img src={item.coverImage} className="w-12 h-10 object-cover rounded-md border border-border/20" />
                    )}
                    <div>
                      <h4 className="font-bold text-foreground">{item.titleAr}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono">/{item.slug}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{item.category}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'Published' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : item.status === 'Archived' 
                      ? 'bg-amber-500/10 text-amber-400' 
                      : 'bg-muted/10 text-muted-foreground'
                  }`}>
                    {item.status === 'Published' ? 'منشور' : item.status === 'Archived' ? 'مؤرشف' : 'مسودة'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">
                  {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('ar-IQ') : '---'}
                </td>
                <td className="px-6 py-4 text-end">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </button>
                    {item.status !== 'Published' ? (
                      <button
                        onClick={() => handleChangeStatus(item.id, 'Published')}
                        className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                        title="نشر الآن"
                      >
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChangeStatus(item.id, 'Archived')}
                        className="p-1.5 rounded-md hover:bg-amber-500/10 text-amber-400 transition-colors"
                        title="أرشفة"
                      >
                        <AlertTriangle className="h-4.5 w-4.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Write/Edit Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-2xl space-y-6 my-8">
            <h2 className="text-lg font-bold text-foreground font-family-cairo">
              {editingItem ? 'تعديل المقال' : 'كتابة مقال جديد'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">عنوان المقال (عربي)</span>
                  <input
                    name="titleAr"
                    defaultValue={editingItem?.titleAr}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">عنوان المقال (English)</span>
                  <input
                    name="titleEn"
                    defaultValue={editingItem?.titleEn}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">الرابط الفريد (Slug)</span>
                  <input
                    name="slug"
                    placeholder="new-byd-song-2026"
                    defaultValue={editingItem?.slug}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">التصنيف</span>
                  <input
                    name="category"
                    placeholder="عروض المعرض، نصائح، طرازات"
                    defaultValue={editingItem?.category}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">رابط صورة الغلاف</span>
                  <input
                    name="coverImage"
                    placeholder="/static/uploads/website/imagename.webp"
                    defaultValue={editingItem?.coverImage}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">ملخص المقال (عربي)</span>
                  <textarea
                    name="summaryAr"
                    rows={2}
                    defaultValue={editingItem?.summaryAr}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">ملخص المقال (English)</span>
                  <textarea
                    name="summaryEn"
                    rows={2}
                    defaultValue={editingItem?.summaryEn}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">محتوى المقال الكامل (عربي)</span>
                  <textarea
                    name="contentAr"
                    rows={6}
                    defaultValue={editingItem?.contentAr}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary font-sans"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">محتوى المقال الكامل (English)</span>
                  <textarea
                    name="contentEn"
                    rows={6}
                    defaultValue={editingItem?.contentEn}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary font-sans"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-border/20 pt-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">حالة المنشور</span>
                  <select
                    name="status"
                    defaultValue={editingItem?.status ?? 'Draft'}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Draft">مسودة (Draft)</option>
                    <option value="Published">منشور عام (Published)</option>
                    <option value="Archived">مؤرشف (Archived)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">مقال مميز (Featured)</span>
                  <select
                    name="isFeatured"
                    defaultValue={editingItem?.isFeatured?.toString() ?? 'false'}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="false">لا</option>
                    <option value="true">نعم (يظهر أعلى المدونة)</option>
                  </select>
                </label>
              </div>

              {/* SEO Sub-section */}
              <div className="border-t border-border/20 pt-4 space-y-4">
                <h3 className="text-xs font-bold text-foreground">بيانات السيو والبحث (SEO Fields)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">عنوان الصفحة للبحث (عربي)</span>
                    <input
                      name="metaTitleAr"
                      defaultValue={editingItem?.metaTitleAr}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">عنوان الصفحة للبحث (English)</span>
                    <input
                      name="metaTitleEn"
                      defaultValue={editingItem?.metaTitleEn}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">وصف الصفحة للبحث (عربي)</span>
                    <input
                      name="metaDescriptionAr"
                      defaultValue={editingItem?.metaDescriptionAr}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">وصف الصفحة للبحث (English)</span>
                    <input
                      name="metaDescriptionEn"
                      defaultValue={editingItem?.metaDescriptionEn}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                    />
                  </label>
                </div>
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
                  حفظ المقال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
