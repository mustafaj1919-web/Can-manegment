'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, Check, Eye, EyeOff, Plus, Trash2, Loader2, Save } from 'lucide-react'

export default function HomepageCMS() {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Local storage backed state for homepage customization
  const [heroTitleAr, setHeroTitleAr] = useState('نقودك نحو التميز.')
  const [heroTitleEn, setHeroTitleEn] = useState('DRIVEN BY DISTINCTION.')
  const [heroDescAr, setHeroDescAr] = useState('تصفح مجموعة الأصدقاء الكاملة من السيارات الفاخرة والمميزة.')
  const [heroDescEn, setHeroDescEn] = useState("Browse Al-Asdiqaa's full inventory of premium and luxury vehicles.")
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=2400&auto=format&fit=crop')

  const [sections, setSections] = useState([
    { id: 'hero', name: 'البانر الترحيبي (Hero)', visible: true },
    { id: 'featured', name: 'السيارات المميزة (Featured)', visible: true },
    { id: 'services', name: 'الخدمات (Services)', visible: true },
    { id: 'news', name: 'آخر الأخبار (News)', visible: true },
    { id: 'testimonials', name: 'آراء العملاء (Testimonials)', visible: true },
  ])

  const [stats, setStats] = useState([
    { labelAr: 'سيارة مباعة', labelEn: 'Cars Sold', value: '1,200+' },
    { labelAr: 'زبون سعيد', labelEn: 'Happy Clients', value: '950+' },
    { labelAr: 'سنوات الخدمة', labelEn: 'Years Active', value: '15+' },
  ])

  useEffect(() => {
    // Load config from localStorage if available
    const savedHeroTitleAr = localStorage.getItem('homepage_hero_title_ar')
    const savedHeroTitleEn = localStorage.getItem('homepage_hero_title_en')
    const savedHeroDescAr = localStorage.getItem('homepage_hero_desc_ar')
    const savedHeroDescEn = localStorage.getItem('homepage_hero_desc_en')
    const savedHeroImage = localStorage.getItem('homepage_hero_image')
    const savedSections = localStorage.getItem('homepage_sections')
    const savedStats = localStorage.getItem('homepage_stats')

    if (savedHeroTitleAr) setHeroTitleAr(savedHeroTitleAr)
    if (savedHeroTitleEn) setHeroTitleEn(savedHeroTitleEn)
    if (savedHeroDescAr) setHeroDescAr(savedHeroDescAr)
    if (savedHeroDescEn) setHeroDescEn(savedHeroDescEn)
    if (savedHeroImage) setHeroImage(savedHeroImage)
    if (savedSections) setSections(JSON.parse(savedSections))
    if (savedStats) setStats(JSON.parse(savedStats))
  }, [])

  const handleSave = () => {
    setIsPending(true)
    setTimeout(() => {
      localStorage.setItem('homepage_hero_title_ar', heroTitleAr)
      localStorage.setItem('homepage_hero_title_en', heroTitleEn)
      localStorage.setItem('homepage_hero_desc_ar', heroDescAr)
      localStorage.setItem('homepage_hero_desc_en', heroDescEn)
      localStorage.setItem('homepage_hero_image', heroImage)
      localStorage.setItem('homepage_sections', JSON.stringify(sections))
      localStorage.setItem('homepage_stats', JSON.stringify(stats))
      
      setIsPending(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 800)
  }

  const toggleSection = (id) => {
    setSections(sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s))
  }

  const handleAddStat = () => {
    setStats([...stats, { labelAr: 'إحصائية جديدة', labelEn: 'New Stat', value: '100+' }])
  }

  const handleRemoveStat = (index) => {
    setStats(stats.filter((_, i) => i !== index))
  }

  const handleStatChange = (index, field, val) => {
    const updated = [...stats]
    updated[index] = { ...updated[index], [field]: val }
    setStats(updated)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <LayoutGrid className="h-7 w-7 text-emerald-400" />
            إدارة وتصميم الصفحة الرئيسية
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">تعديل البانر الترحيبي، ترتيب الأقسام، الإحصائيات، ونصوص الواجهة.</p>
        </div>
      </div>

      {/* Sections Config */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Banner Section */}
        <div className="bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground font-family-cairo border-b border-border/20 pb-3">البانر الترحيبي (Hero Banner)</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground font-family-cairo">العنوان الرئيسي (عربي)</span>
            <input
              value={heroTitleAr}
              onChange={(e) => setHeroTitleAr(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground font-family-cairo">العنوان الرئيسي (English)</span>
            <input
              value={heroTitleEn}
              onChange={(e) => setHeroTitleEn(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground font-family-cairo">الوصف الفرعي (عربي)</span>
            <textarea
              value={heroDescAr}
              onChange={(e) => setHeroDescAr(e.target.value)}
              rows={3}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground font-family-cairo">الوصف الفرعي (English)</span>
            <textarea
              value={heroDescEn}
              onChange={(e) => setHeroDescEn(e.target.value)}
              rows={3}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary resize-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground font-family-cairo">رابط الصورة الترحيبية</span>
            <input
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>

        {/* Visibility Config */}
        <div className="bg-[var(--card)] border border-border/40 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-foreground font-family-cairo border-b border-border/20 pb-3">إظهار وإخفاء الأقسام (Section Visibility)</h2>
            <div className="mt-4 space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="flex items-center justify-between p-3 bg-secondary/15 rounded-xl border border-border/10">
                  <span className="text-xs font-bold text-foreground">{section.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      section.visible 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-muted/10 border-border text-muted-foreground'
                    }`}
                  >
                    {section.visible ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Config */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <h2 className="text-sm font-bold text-foreground font-family-cairo">إحصائيات النجاح</h2>
              <button 
                type="button" 
                onClick={handleAddStat}
                className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-secondary/5 p-2 rounded-lg border border-border/20">
                  <input
                    value={stat.value}
                    onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                    placeholder="القيمة"
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                  <input
                    value={stat.labelAr}
                    onChange={(e) => handleStatChange(idx, 'labelAr', e.target.value)}
                    placeholder="التسمية (عربي)"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                  <input
                    value={stat.labelEn}
                    onChange={(e) => handleStatChange(idx, 'labelEn', e.target.value)}
                    placeholder="Label (En)"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveStat(idx)}
                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-[var(--card)] border border-border/40 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <Check className="h-4 w-4" />
              تم حفظ إعدادات الصفحة الرئيسية!
            </span>
          )}
          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              جاري الحفظ...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>حفظ التعديلات</span>
        </button>
      </div>
    </div>
  )
}
