'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion, LayoutGroup } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Car, TrendingUp, CalendarDays, Menu, Settings,
  X, Plus, Calculator, FileText, ShoppingBag, Users, Wallet, ReceiptText
} from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { getCurrentUser } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useUiStore } from '@/lib/stores/ui-store'
import { getNotifications } from '@/lib/api/dashboard'
import { cn } from '@/lib/utils'
import { useInstallmentAlerts } from '@/hooks/useInstallmentAlerts'

// Dynamic FAB action configurations
const FAB_ACTIONS: Record<string, { label: string; href: string; icon: React.ElementType }> = {
  '/': { label: 'بيع جديد', href: '/cashier/new-sale', icon: TrendingUp },
  '/cashier': { label: 'بيع جديد', href: '/cashier/new-sale', icon: TrendingUp },
  '/inventory': { label: 'إضافة سيارة', href: '/inventory/new', icon: Plus },
  '/sales': { label: 'تسجيل بيع', href: '/sales/new', icon: Plus },
  '/purchases': { label: 'تسجيل شراء', href: '/purchases/new', icon: Plus },
  '/customers': { label: 'عميل جديد', href: '/customers/new', icon: Plus },
  '/installments': { label: 'سداد قسط', href: '/cashier/installment-payment', icon: CalendarDays },
  '/expenses': { label: 'مصروف جديد', href: '/expenses/new', icon: Plus },
}

// Extra pages for "أكثر" mobile drawer
const EXTRA_MOBILE_LINKS = [
  { href: '/purchases', label: 'المشتريات', icon: ShoppingBag },
  { href: '/customers', label: 'العملاء', icon: Users },
  { href: '/cashbox', label: 'الصندوق', icon: Wallet },
  { href: '/vouchers', label: 'السندات', icon: ReceiptText },
  { href: '/expenses', label: 'المصاريف', icon: ReceiptText },
  { href: '/accounting', label: 'المحاسبة', icon: Calculator },
  { href: '/reports', label: 'التقارير', icon: FileText },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/showroom')
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore()
  const { setBranches, setActiveBranch } = useBranchStore()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)

  // Query notifications for alerts badge count
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
    enabled: isAuthenticated && !isPublicRoute,
  })
  const alertCount = (notifData?.overdue?.length ?? 0) + (notifData?.due_today?.length ?? 0)

  // Real-time installment alerts
  useInstallmentAlerts()

  // Verify Flask session on mount
  useEffect(() => {
    if (isPublicRoute) return
    setLoading(true)
    getCurrentUser()
      .then(({ user, branches, active_branch }) => {
        setAuth(user)
        setBranches(branches)
        if (active_branch) setActiveBranch(active_branch)
      })
      .catch(() => {
        clearAuth()
        router.push('/login')
      })
  }, [isPublicRoute]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side redirect when not authenticated
  useEffect(() => {
    if (!isPublicRoute && !isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, isPublicRoute, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Record pages visited to localStorage (for Hover Mega-Panel)
  useEffect(() => {
    if (isPublicRoute || !isAuthenticated) return

    // Find the group index matching current pathname
    const routesPrefixes = [
      '/',
      '/cashier',
      '/inventory',
      '/sales',
      '/customers',
      '/cashbox',
      '/accounting',
      '/reports',
      '/users'
    ]
    
    let label = ''
    let groupIdx = -1

    if (pathname === '/') {
      label = 'لوحة التحكم'
      groupIdx = 0
    } else {
      const matchIdx = routesPrefixes.findIndex((p) => p !== '/' && pathname.startsWith(p))
      if (matchIdx !== -1) {
        groupIdx = matchIdx
        // Basic labels mapping
        const labels: Record<string, string> = {
          '/cashier': 'صندوق الكاشير',
          '/inventory': 'المخزون والسيارات',
          '/sales': 'المبيعات والعمليات',
          '/customers': 'العملاء والشركاء',
          '/cashbox': 'الحركة المالية والصندوق',
          '/accounting': 'الحسابات المالية',
          '/reports': 'التقارير الإحصائية',
          '/users': 'إدارة النظام'
        }
        label = labels[routesPrefixes[matchIdx]] || 'صفحة فرعية'
      }
    }

    if (label && groupIdx !== -1) {
      try {
        const raw = localStorage.getItem('recent_pages')
        let list = raw ? JSON.parse(raw) : []
        list = list.filter((x: any) => x.href !== pathname)
        list.unshift({ label, href: pathname, groupIdx })
        list = list.slice(0, 10)
        localStorage.setItem('recent_pages', JSON.stringify(list))
      } catch {
        // Ignore malformed local history and rebuild it on the next valid visit.
      }
    }
  }, [pathname, isAuthenticated, isPublicRoute])

  // Login page: render without shell
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Loading or not authenticated
  if (isLoading || !isAuthenticated) {
    return null
  }

  // Get dynamic FAB action config
  const currentRootPath = '/' + pathname.split('/')[1]
  const fabAction = FAB_ACTIONS[pathname] || FAB_ACTIONS[currentRootPath] || null

  return (
    <div className="app-shell-root relative min-h-screen bg-background flex flex-row" dir="rtl">
      {/* Desktop Sidebar (Fixed 52px Icon Rail) */}
      <Sidebar />

      {/* Main content + Topbar */}
      <div className="flex flex-col flex-1 min-h-screen min-w-0 transition-all duration-200">
        <TopNav
          collapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onToggleMobile={() => {}}
        />
        
        <main className="flex-1 pb-24 lg:pb-12">
          <div className="page-container">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.995 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 1.002 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.22,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ─── 3. DYNAMIC FLOATING ACTION BUTTON (FAB) ─── */}
      <AnimatePresence>
        {fabAction && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="fixed z-40 bottom-20 start-6 lg:bottom-6 lg:start-6"
          >
            <Link
              href={fabAction.href}
              className="flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <fabAction.icon className="h-4.5 w-4.5 shrink-0" />
              <span>{fabAction.label}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 4. BOTTOM TAB BAR (Mobile only, <= 768px) ─── */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-background/90 backdrop-blur-md border-t border-border-subtle z-40 flex items-center justify-around px-2 lg:hidden">
        <LayoutGroup id="mobile-tabs">
          {/* Tab 1: Dashboard */}
          <Link
            href="/"
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 text-[10px] w-12 transition-colors',
              pathname === '/' ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            {pathname === '/' && (
              <motion.span
                layoutId="mobile-tab-pip"
                className="absolute top-0 inset-x-1 h-[2px] rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <LayoutDashboard className="h-5 w-5" />
            <span>الرئيسية</span>
          </Link>

          {/* Tab 2: Inventory */}
          <Link
            href="/inventory"
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 text-[10px] w-12 transition-colors',
              pathname.startsWith('/inventory') ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            {pathname.startsWith('/inventory') && (
              <motion.span
                layoutId="mobile-tab-pip"
                className="absolute top-0 inset-x-1 h-[2px] rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Car className="h-5 w-5" />
            <span>المخزون</span>
          </Link>

          {/* Tab 3: Sales */}
          <Link
            href="/sales"
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 text-[10px] w-12 transition-colors',
              pathname.startsWith('/sales') ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            {pathname.startsWith('/sales') && (
              <motion.span
                layoutId="mobile-tab-pip"
                className="absolute top-0 inset-x-1 h-[2px] rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <TrendingUp className="h-5 w-5" />
            <span>المبيعات</span>
          </Link>

          {/* Tab 4: Installments */}
          <Link
            href="/installments"
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 text-[10px] w-12 transition-colors',
              pathname.startsWith('/installments') ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            {pathname.startsWith('/installments') && (
              <motion.span
                layoutId="mobile-tab-pip"
                className="absolute top-0 inset-x-1 h-[2px] rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <CalendarDays className="h-5 w-5" />
            <span>الأقساط</span>
            {alertCount > 0 && (
              <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white leading-none">
                {alertCount}
              </span>
            )}
          </Link>

          {/* Tab 5: More */}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 text-[10px] w-12 transition-colors',
              mobileMoreOpen ? 'text-primary font-bold' : 'text-muted-foreground'
            )}
          >
            <Menu className="h-5 w-5" />
            <span>أكثر</span>
          </button>
        </LayoutGroup>
      </nav>

      {/* ─── 5. MOBILE "MORE" SHEET DRAWER ─── */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMoreOpen(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 inset-x-0 bg-card border-t border-border-subtle rounded-t-2xl z-50 p-6 space-y-6 lg:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground font-family-cairo">أقسام النظام الإضافية</span>
                <button
                  onClick={() => setMobileMoreOpen(false)}
                  className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Grid links */}
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {EXTRA_MOBILE_LINKS.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname.startsWith(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMoreOpen(false)}
                      className="flex flex-col items-center text-center gap-2 p-1.5 rounded-lg active:bg-secondary/40 transition-colors"
                    >
                      <div className={cn(
                        'h-9 w-9 rounded-lg border flex items-center justify-center transition-all',
                        isActive 
                          ? 'border-primary/20 bg-primary/10 text-primary' 
                          : 'border-border bg-secondary/20 text-muted-foreground'
                      )}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-[10px] text-foreground font-semibold truncate w-full">{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
