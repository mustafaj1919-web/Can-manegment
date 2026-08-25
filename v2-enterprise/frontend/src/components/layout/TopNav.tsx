'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BranchSelector } from './BranchSelector'
import { GlobalSearch } from './GlobalSearch'
import { NotificationCenter } from './NotificationCenter'
import { UserMenu } from './UserMenu'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { useBranchStore } from '@/lib/stores/branch-store'
import { getCars } from '@/lib/api/inventory'
import { getSales } from '@/lib/api/sales'
import { getInstallments } from '@/lib/api/installments'

/* ─── Path translation mapping ─── */
const PATH_MAP: Record<string, string> = {
  '': 'لوحة التحكم',
  'inventory': 'المخزون والسيارات',
  'sales': 'المبيعات',
  'purchases': 'المشتريات',
  'customers': 'العملاء والشركاء',
  'installments': 'إدارة الأقساط',
  'cashbox': 'حساب الصندوق',
  'vouchers': 'السندات والوصولات',
  'expenses': 'المصاريف التشغيلية',
  'exchange-rate': 'سعر الصرف اليومي',
  'accounting': 'المحاسبة المالية',
  'chart-of-accounts': 'دليل الحسابات',
  'journal-entries': 'القيود اليومية',
  'trial-balance': 'ميزان المراجعة',
  'reports': 'مركز التقارير والتحليلات',
  'notifications': 'الإشعارات والتنبيهات',
  'users': 'إدارة المستخدمين',
  'roles': 'الأدوار والصلاحيات',
  'system-health': 'صحة النظام',
  'backup': 'النسخ الاحتياطي',
  'cashier': 'صندوق الكاشير (POS)',
  'crm': 'إدارة علاقات العملاء CRM',
  'pipeline': 'خط أنابيب المبيعات',
  'employees': 'إدارة الموظفين',
  'settings': 'الإعدادات العامة',
  'website': 'إدارة الموقع',
  'homepage': 'الصفحة الرئيسية',
  'pages': 'الصفحات الفرعية',
  'news': 'الأخبار والمقالات',
  'services': 'الخدمات',
  'testimonials': 'آراء العملاء',
  'media': 'مكتبة الوسائط',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'الرئيسية', href: '/' }]
  
  const crumbs = [{ label: 'الرئيسية', href: '/' }]
  let currentPath = ''
  
  segments.forEach((seg, i) => {
    currentPath += `/${seg}`
    const isLast = i === segments.length - 1
    
    const subNameMap: Record<string, string> = {
      'new-sale': 'نقطة بيع جديدة',
      'receipts': 'سندات اليوم',
      'daily-close': 'إقفال الصندوق',
      'installment-payment': 'سداد قسط',
      'performance': 'أداء الموظفين',
      'new': 'إضافة جديد',
      'close': 'إقفال الصندوق',
    }
    
    let label = PATH_MAP[seg] || subNameMap[seg] || seg
    
    // Check if it's a GUID or a numeric database ID
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
    const isNumericId = !isNaN(Number(seg))
    
    if (isGuid || isNumericId) {
      const parentSeg = segments[i - 1]
      if (parentSeg === 'inventory') {
        label = 'تفاصيل السيارة'
      } else if (parentSeg === 'sales') {
        label = 'تفاصيل البيع'
      } else if (parentSeg === 'purchases') {
        label = 'تفاصيل الشراء'
      } else if (parentSeg === 'customers') {
        label = 'تفاصيل العميل'
      } else if (parentSeg === 'installments') {
        label = 'تفاصيل القسط'
      } else if (parentSeg === 'vouchers') {
        label = 'تفاصيل السند'
      } else if (parentSeg === 'users') {
        label = 'ملف المستخدم'
      } else if (parentSeg === 'showroom') {
        label = 'معرض السيارة'
      } else {
        label = 'تفاصيل'
      }
    }
    
    crumbs.push({ label, href: isLast ? '' : currentPath })
  })
  
  return crumbs
}

const NAV_MENU = [
  {
    label: 'المخزون والسيارات',
    subLinks: [
      { label: 'عرض المخزون', href: '/inventory' },
      { label: 'إضافة سيارة جديدة', href: '/inventory/new' },
    ]
  },
  {
    label: 'العمليات والمبيعات',
    subLinks: [
      { label: 'الكاشير والمبيعات (POS)', href: '/cashier' },
      { label: 'سجل المبيعات والعملاء', href: '/sales' },
      { label: 'سجل فواتير المشتريات', href: '/purchases' },
      { label: 'إدارة الأقساط وجدولتها', href: '/installments' },
      { label: 'إدارة العملاء والزبائن', href: '/customers' },
      { label: 'إدارة الموردين والجهات', href: '/suppliers' },
    ]
  },
  {
    label: 'المالية والـ CRM',
    subLinks: [
      { label: 'السندات والوصولات المالية', href: '/vouchers' },
      { label: 'المصاريف التشغيلية', href: '/expenses' },
      { label: 'حساب وإقفال الصندوق', href: '/cashbox' },
      { label: 'سجل تفاعلات CRM', href: '/crm' },
    ]
  },
  {
    label: 'المحاسبة والتقارير',
    subLinks: [
      { label: 'دليل الحسابات وشجرة الحسابات', href: '/chart-of-accounts' },
      { label: 'دفتر الأستاذ العام', href: '/general-ledger' },
      { label: 'القيود والعمليات اليومية', href: '/journal-entries' },
      { label: 'ميزان المراجعة المحاسبي', href: '/trial-balance' },
      { label: 'مركز التقارير والتحليلات', href: '/reports' },
    ]
  },
  {
    label: 'إدارة الموقع',
    subLinks: [
      { label: 'لوحة التحكم', href: '/website' },
      { label: 'إعدادات الموقع العامة', href: '/website/settings' },
      { label: 'الصفحة الرئيسية', href: '/website/homepage' },
      { label: 'الصفحات الفرعية', href: '/website/pages' },
      { label: 'الأخبار والمقالات', href: '/website/news' },
      { label: 'الخدمات', href: '/website/services' },
      { label: 'آراء العملاء', href: '/website/testimonials' },
      { label: 'مكتبة الوسائط', href: '/website/media' },
    ]
  },
  {
    label: 'إدارة النظام',
    subLinks: [
      { label: 'إدارة الموظفين والرواتب', href: '/employees' },
      { label: 'المستخدمين والصلاحيات', href: '/users' },
      { label: 'النسخ الاحتياطي للنظام', href: '/backup' },
      { label: 'الإعدادات العامة للمعرض', href: '/settings' },
    ]
  }
]

export function TopNav() {
  const pathname = usePathname()
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const activeBranch = useBranchStore((s) => s.activeBranch)
  const crumbs = useMemo(() => getBreadcrumbs(pathname), [pathname])

  const [timeStr, setTimeStr] = useState('')

  // Keep live time updated every minute
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Live Counts for Breadcrumbs
  const { data: invData } = useQuery({
    queryKey: ['inv-crumbs-count'],
    queryFn: () => getCars({ per_page: 1 }),
    staleTime: 30_000,
  })
  
  const { data: salesData } = useQuery({
    queryKey: ['sales-crumbs-count'],
    queryFn: () => getSales({ per_page: 1 }),
    staleTime: 30_000,
  })

  const { data: instData } = useQuery({
    queryKey: ['inst-crumbs-count'],
    queryFn: () => getInstallments({ per_page: 1, filter: 'all' }),
    staleTime: 30_000,
  })

  // Dynamic live count replacements
  const getLiveLabel = (label: string) => {
    if (label === 'المخزون والسيارات') {
      const total = invData?.total ?? 0
      return `المخزون (${total})`
    }
    if (label === 'المبيعات') {
      const total = salesData?.total ?? 0
      return `المبيعات (${total})`
    }
    if (label === 'إدارة الأقساط') {
      const total = instData?.total ?? 0
      return `الأقساط (${total})`
    }
    return label
  }

  return (
    <header className="app-topnav sticky top-0 z-40 flex h-[56px] shrink-0 items-center justify-between px-4 sm:px-6 border-b border-border-subtle bg-background/90 backdrop-blur-md select-none">
      
      {/* ── Right: Live Time, Active Branch & Contextual Breadcrumbs ── */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Live Datetime & Active Branch Info */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-secondary/40 border border-border/40 px-3 py-1 text-[11px] font-medium text-muted-foreground shrink-0 select-none">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-65 animate-ping [animation-duration:2.5s]" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-numeric">{timeStr}</span>
          {/* {activeBranch && (
            <>
              <span className="text-border/60">·</span>
              <span className="truncate">{activeBranch.name}</span>
            </>
          )} */}
        </div>

        <div className="hidden md:block h-3.5 w-px bg-border-subtle shrink-0" />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground truncate font-family-cairo">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1
            const displayedLabel = getLiveLabel(crumb.label)

            return (
              <div key={idx} className="flex items-center gap-1 min-w-0">
                {idx > 0 && <ChevronLeft className="h-3.5 w-3.5 opacity-30 shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground font-semibold transition-colors truncate"
                  >
                    {displayedLabel}
                  </Link>
                ) : (
                  <span className={cn('truncate font-bold', isLast ? 'text-foreground font-black' : 'text-muted-foreground/60')}>
                    {displayedLabel}
                  </span>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── Center: Top-Center Dropdown Capsule Nav Menu ── */}
      <div className="hidden lg:flex items-center gap-1 bg-secondary/20 border border-border/40 rounded-full px-3 py-1 relative">
        {NAV_MENU.map((item, idx) => (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => setActiveDropdown(idx)}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full hover:bg-secondary/40">
              <span>{item.label}</span>
              <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-200" />
            </button>
            <AnimatePresence>
              {activeDropdown === idx && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute top-9 start-0 z-50 w-56 rounded-2xl border border-border/50 bg-popover/95 p-1 shadow-2xl backdrop-blur-md"
                >
                  {item.subLinks.map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      <span>{sub.label}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* ── Left: Utilities ── */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="hidden lg:block w-44">
          <GlobalSearch />
        </div>
        <ThemeToggle />
        <NotificationCenter />
        {/* <BranchSelector /> */}
        <UserMenu />
      </div>
    </header>
  )
}
