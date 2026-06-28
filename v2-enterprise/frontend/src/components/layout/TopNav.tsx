'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Menu } from 'lucide-react'
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
    
    const label = PATH_MAP[seg] || subNameMap[seg] || seg
    if (isNaN(Number(label))) {
      crumbs.push({ label, href: isLast ? '' : currentPath })
    }
  })
  
  return crumbs
}

export function TopNav({ collapsed, onToggleSidebar, onToggleMobile }: {
  collapsed: boolean
  onToggleSidebar: () => void
  onToggleMobile: () => void
}) {
  const pathname = usePathname()
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
        {/* Toggle Sidebar Button for Desktop */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Live Datetime & Active Branch Info */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-secondary/40 border border-border/40 px-3 py-1 text-[11px] font-medium text-muted-foreground shrink-0 select-none">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-65 animate-ping [animation-duration:2.5s]" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-numeric">{timeStr}</span>
          {activeBranch && (
            <>
              <span className="text-border/60">·</span>
              <span className="truncate">{activeBranch.name}</span>
            </>
          )}
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

      {/* ── Center: Centered Global search (Ctrl+K) ── */}
      <div className="flex-1 max-w-[280px] sm:max-w-xs mx-auto">
        <GlobalSearch />
      </div>

      {/* ── Left: Utilities ── */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationCenter />
        <BranchSelector />
        <UserMenu />
      </div>
    </header>
  )
}
