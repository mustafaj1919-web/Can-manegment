'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Globe, Settings, LayoutGrid, FileText, 
  HelpCircle, MessageSquare, Image, Star, Eye, ExternalLink
} from 'lucide-react'
import { getWebsiteSettings, getWebsiteServices, getWebsiteTestimonials, getWebsiteArticles, getWebsiteMedia } from '@/lib/api/website'

const CARD_VARIANTS = {
  hover: { scale: 1.025, translateY: -4, transition: { duration: 0.2, ease: 'easeOut' } }
}

export default function WebsiteDashboard() {
  const { data: settings } = useQuery({ queryKey: ['website-settings'], queryFn: getWebsiteSettings })
  const { data: services } = useQuery({ queryKey: ['website-services'], queryFn: getWebsiteServices })
  const { data: testimonials } = useQuery({ queryKey: ['website-testimonials'], queryFn: getWebsiteTestimonials })
  const { data: articles } = useQuery({ queryKey: ['website-articles'], queryFn: () => getWebsiteArticles(undefined, undefined, 1, 1) })
  const { data: media } = useQuery({ queryKey: ['website-media'], queryFn: () => getWebsiteMedia(undefined, 1, 1) })

  const quickLinks = [
    { href: '/website/settings', label: 'إعدادات الموقع', desc: 'معلومات الشركة، أرقام التواصل، والروابط', icon: Settings, color: 'text-indigo-400 bg-indigo-500/10' },
    { href: '/website/homepage', label: 'الصفحة الرئيسية', desc: 'تعديل نصوص الترحيب، البانر، وإدارة الأقسام', icon: LayoutGrid, color: 'text-emerald-400 bg-emerald-500/10' },
    { href: '/website/pages', label: 'الصفحات الفرعية', desc: 'من نحن، الضمان، خدمات ما بعد البيع، والبديل', icon: FileText, color: 'text-amber-400 bg-amber-500/10' },
    { href: '/website/news', label: 'الأخبار والمقالات', desc: 'إدارة المدونة، عروض المعرض، والمنشورات', icon: FileText, color: 'text-sky-400 bg-sky-500/10' },
    { href: '/website/services', label: 'خدمات المعرض', desc: 'تحديث قائمة الخدمات والضمانات المعروضة للزبائن', icon: HelpCircle, color: 'text-rose-400 bg-rose-500/10' },
    { href: '/website/testimonials', label: 'آراء العملاء', desc: 'إدارة التقييمات، تجارب الزبائن، والشركاء', icon: Star, color: 'text-yellow-400 bg-yellow-500/10' },
    { href: '/website/media', label: 'مكتبة الوسائط', desc: 'رفع وإدارة الصور والشعارات المستخدمة في الموقع', icon: Image, color: 'text-violet-400 bg-violet-500/10' },
  ]

  return (
    <div className="space-y-8 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <Globe className="h-7 w-7 text-primary animate-pulse" />
            إدارة الموقع الإلكتروني (CMS)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">تحكم بمحتوى وصور موقع الأصدقاء العام وتتبع منشوراتك وسجلات التواصل.</p>
        </div>
        <a 
          href="http://localhost:3004" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-transform hover:scale-105 active:scale-95"
        >
          <span>زيارة الموقع العام</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard 
          title="المقالات المنشورة" 
          value={articles?.data?.total ?? 0} 
          icon={FileText} 
          color="border-sky-500/20 text-sky-400" 
        />
        <StatsCard 
          title="الخدمات المعروضة" 
          value={services?.data?.length ?? 0} 
          icon={HelpCircle} 
          color="border-rose-500/20 text-rose-400" 
        />
        <StatsCard 
          title="آراء ومراجعات الزبائن" 
          value={testimonials?.data?.length ?? 0} 
          icon={Star} 
          color="border-yellow-500/20 text-yellow-400" 
        />
        <StatsCard 
          title="ملفات الوسائط" 
          value={media?.data?.total ?? 0} 
          icon={Image} 
          color="border-violet-500/20 text-violet-400" 
        />
      </div>

      {/* Main CMS Management Sections */}
      <div>
        <h2 className="text-lg font-bold text-foreground font-family-cairo mb-6">أقسام لوحة التحكم بالموقع</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <motion.div 
                key={link.href}
                variants={CARD_VARIANTS}
                whileHover="hover"
                className="group relative rounded-2xl border border-border/40 bg-[var(--card)] p-5 shadow-sm overflow-hidden hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${link.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{link.label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{link.desc}</p>
                  </div>
                </div>
                <Link href={link.href} className="absolute inset-0" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color }) {
  return (
    <div className={`rounded-2xl border bg-[var(--card)] p-5 shadow-sm flex items-center justify-between ${color}`}>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground block">{title}</span>
        <span className="text-3xl font-black text-foreground block">{value}</span>
      </div>
      <Icon className="h-10 w-10 opacity-30 shrink-0" />
    </div>
  )
}
