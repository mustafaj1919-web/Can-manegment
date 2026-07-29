'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, Check, Loader2, AlertCircle, Info, Shield, 
  HelpCircle, RefreshCw 
} from 'lucide-react'
import { getWebsitePage, updateWebsitePage } from '@/lib/api/website'
import { cn } from '@/lib/utils'

export default function PagesCMS() {
  const qc = useQueryClient()
  const [activeKey, setActiveKey] = useState('about')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-page', activeKey],
    queryFn: () => getWebsitePage(activeKey),
    staleTime: 10_000
  })

  const updateMutation = useMutation({
    mutationFn: (p) => updateWebsitePage(activeKey, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-page', activeKey] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!data?.success) return

    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      ...data.data,
      titleEn: formData.get('titleEn'),
      titleAr: formData.get('titleAr'),
      contentEn: formData.get('contentEn'),
      contentAr: formData.get('contentAr'),
      coverImage: formData.get('coverImage') || null,
      isActive: formData.get('isActive') === 'true',
      metaTitleEn: formData.get('metaTitleEn'),
      metaTitleAr: formData.get('metaTitleAr'),
      metaDescriptionEn: formData.get('metaDescriptionEn'),
      metaDescriptionAr: formData.get('metaDescriptionAr'),
    }

    updateMutation.mutate(payload)
  }

  const pageTabs = [
    { key: 'about', label: 'صفحة من نحن (About Us)', icon: Info },
    { key: 'warranty', label: 'سياسة الضمان (Warranty)', icon: Shield },
    { key: 'after-sales', label: 'خدمات ما بعد البيع', icon: RefreshCw },
    { key: 'trade-in', label: 'شروط واستبدال السيارات', icon: HelpCircle },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <FileText className="h-7 w-7 text-amber-400" />
            إدارة الصفحات الفرعية الثابتة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">تعديل محتوى ونصوص صفحات التعريف بالمعرض وسياسات الضمان والتبديل.</p>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
        {pageTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveKey(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all",
                activeKey === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-[var(--card)] text-muted-foreground border-border hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Loader */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center gap-2 bg-[var(--card)] border border-border/40 rounded-2xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">جاري تحميل بيانات الصفحة...</span>
        </div>
      ) : isError || !data?.success ? (
        <div className="p-6 text-center space-y-4 bg-[var(--card)] border border-border/40 rounded-2xl">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <p className="text-sm text-muted-foreground">فشل تحميل الصفحة. تأكد من إعدادات الاتصال بالخادم.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">عنوان الصفحة (عربي)</span>
                <input
                  name="titleAr"
                  defaultValue={data.data.titleAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">عنوان الصفحة (English)</span>
                <input
                  name="titleEn"
                  defaultValue={data.data.titleEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">رابط صورة البانر / الخلفية</span>
                <input
                  name="coverImage"
                  placeholder="/static/uploads/website/banner.webp"
                  defaultValue={data.data.coverImage}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">حالة النشر والتفعيل</span>
                <select
                  name="isActive"
                  defaultValue={data.data.isActive?.toString() ?? 'true'}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="true">نشطة وتظهر في قوائم الموقع</option>
                  <option value="false">معطلة / مخفية مؤقتاً</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">المحتوى النصي الكامل (عربي)</span>
              <textarea
                name="contentAr"
                rows={10}
                defaultValue={data.data.contentAr}
                className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">المحتوى النصي الكامل (English)</span>
              <textarea
                name="contentEn"
                rows={10}
                defaultValue={data.data.contentEn}
                className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                required
              />
            </label>

            {/* SEO Section */}
            <div className="border-t border-border/20 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-foreground">خصائص البحث والـ SEO لهذه الصفحة</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">عنوان البحث للمتصفح (عربي)</span>
                  <input
                    name="metaTitleAr"
                    defaultValue={data.data.metaTitleAr}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">عنوان البحث للمتصفح (English)</span>
                  <input
                    name="metaTitleEn"
                    defaultValue={data.data.metaTitleEn}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">وصف البحث للمتصفح (عربي)</span>
                  <input
                    name="metaDescriptionAr"
                    defaultValue={data.data.metaDescriptionAr}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">وصف البحث للمتصفح (English)</span>
                  <input
                    name="metaDescriptionEn"
                    defaultValue={data.data.metaDescriptionEn}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between bg-[var(--card)] border border-border/40 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <Check className="h-4 w-4" />
                  تم حفظ محتوى الصفحة بنجاح!
                </span>
              )}
              {updateMutation.isPending && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  جاري الحفظ...
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              حفظ تغييرات الصفحة
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
