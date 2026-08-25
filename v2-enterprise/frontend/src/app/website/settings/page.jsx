'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Info, Share2, Globe, Check, Loader2, AlertCircle } from 'lucide-react'
import { getWebsiteSettings, updateWebsiteSettings } from '@/lib/api/website'
import { cn } from '@/lib/utils'

export default function SettingsCMS() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-settings'],
    queryFn: getWebsiteSettings
  })

  const updateMutation = useMutation({
    mutationFn: updateWebsiteSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-settings'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">جاري تحميل الإعدادات...</span>
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-muted-foreground">فشل تحميل إعدادات الموقع. تأكد من صلاحيات المستخدم.</p>
      </div>
    )
  }

  const settings = data.data

  const handleSubmit = (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const updated = {
      ...settings,
      companyNameEn: formData.get('companyNameEn'),
      companyNameAr: formData.get('companyNameAr'),
      contactPhone: formData.get('contactPhone'),
      whatsAppNumber: formData.get('whatsAppNumber'),
      email: formData.get('email'),
      addressEn: formData.get('addressEn'),
      addressAr: formData.get('addressAr'),
      workingHoursEn: formData.get('workingHoursEn'),
      workingHoursAr: formData.get('workingHoursAr'),
      facebookUrl: formData.get('facebookUrl'),
      instagramUrl: formData.get('instagramUrl'),
      twitterUrl: formData.get('twitterUrl'),
      youtubeUrl: formData.get('youtubeUrl'),
      defaultMetaTitleEn: formData.get('defaultMetaTitleEn'),
      defaultMetaTitleAr: formData.get('defaultMetaTitleAr'),
      defaultMetaDescriptionEn: formData.get('defaultMetaDescriptionEn'),
      defaultMetaDescriptionAr: formData.get('defaultMetaDescriptionAr'),
    }

    updateMutation.mutate(updated)
  }

  const tabs = [
    { id: 'general', label: 'معلومات عامة', icon: Info },
    { id: 'contact', label: 'العناوين والاتصال', icon: Settings },
    { id: 'socials', label: 'مواقع التواصل', icon: Share2 },
    { id: 'seo', label: 'السيو والبحث (SEO)', icon: Globe },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <Settings className="h-7 w-7 text-indigo-400" />
            إعدادات الموقع العامة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">تعديل معلومات وتفاصيل الاتصال وبيانات محركات البحث الخاصة بالموقع.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border/40 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Contents */}
        <div className="bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-sm">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">اسم الشركة (English)</span>
                <input
                  name="companyNameEn"
                  defaultValue={settings.companyNameEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">اسم الشركة (عربي)</span>
                <input
                  name="companyNameAr"
                  defaultValue={settings.companyNameAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  required
                />
              </label>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">رقم الهاتف للاتصال</span>
                <input
                  name="contactPhone"
                  defaultValue={settings.contactPhone}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">رقم الواتساب (بالرمز الدولي)</span>
                <input
                  name="whatsAppNumber"
                  defaultValue={settings.whatsAppNumber}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">البريد الإلكتروني للشركة</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={settings.email}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">ساعات العمل (عربي)</span>
                <input
                  name="workingHoursAr"
                  defaultValue={settings.workingHoursAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">العنوان (عربي)</span>
                <input
                  name="addressAr"
                  defaultValue={settings.addressAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">العنوان (English)</span>
                <input
                  name="addressEn"
                  defaultValue={settings.addressEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>
          )}

          {activeTab === 'socials' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">رابط فيسبوك</span>
                <input
                  name="facebookUrl"
                  defaultValue={settings.facebookUrl}
                  placeholder="https://facebook.com/page"
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">رابط إنستغرام</span>
                <input
                  name="instagramUrl"
                  defaultValue={settings.instagramUrl}
                  placeholder="https://instagram.com/profile"
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">رابط X (تويتر سابقاً)</span>
                <input
                  name="twitterUrl"
                  defaultValue={settings.twitterUrl}
                  placeholder="https://twitter.com/profile"
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">رابط يوتيوب</span>
                <input
                  name="youtubeUrl"
                  defaultValue={settings.youtubeUrl}
                  placeholder="https://youtube.com/channel"
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="grid grid-cols-1 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">عنوان البحث الافتراضي (عربي) - Default Meta Title</span>
                <input
                  name="defaultMetaTitleAr"
                  defaultValue={settings.defaultMetaTitleAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">عنوان البحث الافتراضي (English)</span>
                <input
                  name="defaultMetaTitleEn"
                  defaultValue={settings.defaultMetaTitleEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">وصف البحث الافتراضي (عربي) - Meta Description</span>
                <textarea
                  name="defaultMetaDescriptionAr"
                  rows={3}
                  defaultValue={settings.defaultMetaDescriptionAr}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">وصف البحث الافتراضي (English)</span>
                <textarea
                  name="defaultMetaDescriptionEn"
                  rows={3}
                  defaultValue={settings.defaultMetaDescriptionEn}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
                />
              </label>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between bg-[var(--card)] border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <Check className="h-4 w-4" />
                تم حفظ التغييرات بنجاح!
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
            حفظ الإعدادات
          </button>
        </div>
      </form>
    </div>
  )
}
