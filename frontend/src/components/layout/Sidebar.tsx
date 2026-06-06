'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Car, TrendingUp, ShoppingBag, Users, CalendarDays,
  Building2, DatabaseBackup, FileText, Calculator, ReceiptText, Wallet,
  UserCog, ShieldCheck, PanelLeftClose, PanelLeftOpen, LogOut, Contact,
  ServerCog, ListTree, BookOpen, Scale, BarChart3, MessageSquare, Trophy,
  Kanban, Clock3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'
import { logoutUser } from '@/lib/api/auth'
import { getNotifications } from '@/lib/api/dashboard'

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface SidebarProps { collapsed: boolean; mobileOpen: boolean; onCollapse: () => void; onCloseMobile: () => void }
interface NavItem      { href: string; label: string; icon: React.ElementType; badgeKey?: 'alerts' }
interface NavGroup     { label: string; items: NavItem[] }

const ROLE_LABELS: Record<string, string> = {
  Owner: 'مالك المعرض', Admin: 'مدير النظام', Accountant: 'محاسب', Sales: 'موظف مبيعات',
}

const NAV_GROUPS: NavGroup[] = [
  { label: 'الرئيسية', items: [
    { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  ]},
  { label: 'العمليات', items: [
    { href: '/sales',        label: 'المبيعات',  icon: TrendingUp },
    { href: '/purchases',    label: 'المشتريات', icon: ShoppingBag },
    { href: '/installments', label: 'الأقساط',   icon: CalendarDays, badgeKey: 'alerts' },
  ]},
  { label: 'المخزون', items: [
    { href: '/inventory', label: 'السيارات', icon: Car },
  ]},
  { label: 'العملاء والمبيعات', items: [
    { href: '/customers',             label: 'العملاء',          icon: Users },
    { href: '/crm',                   label: 'CRM — التفاعلات',  icon: MessageSquare },
    { href: '/pipeline',              label: 'خط أنابيب المبيعات', icon: Kanban },
    { href: '/employees',             label: 'الموظفون',          icon: Contact },
    { href: '/employees/performance', label: 'أداء الموظفين',    icon: Trophy },
  ]},
  { label: 'المالية', items: [
    { href: '/cashbox',       label: 'الصندوق',      icon: Wallet },
    { href: '/vouchers',      label: 'السندات',       icon: ReceiptText },
    { href: '/cashbox/close', label: 'إقفال الصندوق', icon: BookOpen },
    { href: '/expenses',      label: 'المصاريف',     icon: ReceiptText },
    { href: '/exchange-rate', label: 'سعر الصرف',    icon: TrendingUp },
  ]},
  { label: 'المحاسبة', items: [
    { href: '/accounting',           label: 'المحاسبة',            icon: Calculator },
    { href: '/chart-of-accounts',    label: 'دليل الحسابات',       icon: ListTree },
    { href: '/journal-entries',      label: 'القيود اليومية',       icon: BookOpen },
    { href: '/trial-balance',        label: 'ميزان المراجعة',      icon: Scale },
  ]},
  { label: 'التقارير', items: [
    { href: '/reports',                          label: 'التقارير',              icon: FileText },
    { href: '/reports/balance-sheet',            label: 'الميزانية العمومية',    icon: Scale },
    { href: '/reports/vehicle-profitability',    label: 'ربحية السيارات',        icon: TrendingUp },
    { href: '/reports/ar-aging',                 label: 'أعمار الذمم',           icon: Clock3 },
    { href: '/reports/branch-comparison',        label: 'مقارنة الفروع',         icon: Building2 },
    { href: '/reports/cost-center',              label: 'مراكز التكلفة',         icon: Building2 },
    { href: '/reports/cashbox-movement',         label: 'حركة الصندوق',          icon: Wallet },
    { href: '/reports/bank-movement',            label: 'حركة البنك',            icon: BarChart3 },
    { href: '/reports/accounting-rules',         label: 'سلامة المحاسبة',        icon: ShieldCheck },
  ]},
  { label: 'النظام', items: [
    { href: '/users',         label: 'المستخدمون',           icon: UserCog },
    { href: '/roles',         label: 'الأدوار',              icon: ShieldCheck },
    { href: '/system-health', label: 'فحص النظام',           icon: ServerCog },
    { href: '/backup',        label: 'النسخ الاحتياطي والاستعادة', icon: DatabaseBackup },
  ]},
]

/* ─── Nav Item ───────────────────────────────────────────────────────────── */
function NavItem({ item, collapsed, active, alertCount }: {
  item: NavItem; collapsed: boolean; active: boolean; alertCount: number
}) {
  const Icon = item.icon
  const hasBadge = item.badgeKey === 'alerts' && alertCount > 0

  const inner = (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 select-none',
        active
          ? 'nav-active border-e-2 border-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className={cn(
        'shrink-0 transition-colors',
        active ? 'text-primary drop-shadow-[0_0_8px_rgba(204,33,24,0.7)]' : 'text-muted-foreground group-hover:text-foreground',
        collapsed ? 'h-[18px] w-[18px]' : 'h-[17px] w-[17px]'
      )} />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span initial={{ opacity:0, width:0 }} animate={{ opacity:1, width:'auto' }} exit={{ opacity:0, width:0 }} transition={{ duration:0.16 }} className="overflow-hidden whitespace-nowrap flex-1">
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {hasBadge && !collapsed && (
          <motion.span initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }} className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shrink-0">
            {alertCount > 9 ? '9+' : alertCount}
          </motion.span>
        )}
      </AnimatePresence>
      {hasBadge && collapsed && <span className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-[#09090f]" />}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="font-medium text-xs">
          {item.label}{hasBadge && <span className="ms-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">{alertCount}</span>}
        </TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

/* ─── Sidebar Inner ──────────────────────────────────────────────────────── */
function SidebarInner({ collapsed, pathname, onCollapse, activeBranchName, alertCount }: {
  collapsed: boolean; pathname: string; onCollapse: () => void; activeBranchName?: string; alertCount: number
}) {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const displayName = user?.username ?? '—'
  const roleLabel   = ROLE_LABELS[user?.role ?? ''] ?? (user?.role ?? '')
  const initials    = displayName.slice(0, 2).toUpperCase()

  async function handleLogout() { await logoutUser(); clearAuth(); router.push('/login') }

  return (
    <div className="flex flex-col h-full">
      {/* Top brand-red accent bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent z-10" />

      {/* Logo */}
      <div className={cn('flex items-center gap-3 h-[60px] shrink-0', 'border-b border-border', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className="flex-shrink-0 h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center shadow-md">
          <img src="/logo.png" alt="شركة الأصدقاء" className="h-9 w-9 object-contain" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ opacity:0, width:0 }} animate={{ opacity:1, width:'auto' }} exit={{ opacity:0, width:0 }} transition={{ duration:0.16 }} className="overflow-hidden">
              <p className="text-sm font-bold text-foreground whitespace-nowrap leading-tight tracking-tight">الأصدقاء</p>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap leading-tight mt-0.5 tracking-wide">لتجارة السيارات</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active branch */}
      <AnimatePresence initial={false}>
        {!collapsed && activeBranchName && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-primary/[0.07]">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" style={{ animationDuration:'2s' }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <Building2 className="h-3 w-3 text-primary/60 shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{activeBranchName}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 sidebar-scroll">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-1')}>
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="px-3 pt-4 pb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/55 select-none">{group.label}</p>
                </motion.div>
              ) : (gi > 0 && <div className="my-3 mx-3 h-px bg-white/[0.05]" />)}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed}
                  active={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
                  alertCount={alertCount}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User profile footer */}
      <div className="shrink-0 border-t border-border">
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="p-3 space-y-1">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-secondary border border-border">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-red-800/80 text-white text-[11px] font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{roleLabel}</p>
                </div>
                <button onClick={handleLogout} title="تسجيل الخروج" className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
              <button onClick={onCollapse} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors">
                <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">طي القائمة</span>
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="p-2 flex flex-col items-center gap-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-red-800/80 text-white text-[10px] font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button onClick={onCollapse} title="توسيع القائمة" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
export function Sidebar({ collapsed, mobileOpen, onCollapse, onCloseMobile }: SidebarProps) {
  const pathname     = usePathname()
  const activeBranch = useBranchStore((s) => s.activeBranch)
  const { data: notifData } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, staleTime: 60_000, refetchInterval: 120_000, retry: 1 })
  const alertCount = (notifData?.overdue?.length ?? 0) + (notifData?.due_today?.length ?? 0)

  const sharedStyle: React.CSSProperties = {
    background: 'var(--sidebar-bg)',
    borderInlineEnd: '1px solid hsl(var(--border))',
  }
  const sharedClasses = 'overflow-hidden z-50'

  return (
    <TooltipProvider>
      <motion.aside animate={{ width: collapsed ? 56 : 240 }} transition={{ type:'spring', stiffness:300, damping:32 }}
        className={cn(sharedClasses, 'fixed inset-y-0 start-0 hidden lg:flex flex-col')} style={{ ...sharedStyle, minWidth: 0 }}>
        <SidebarInner collapsed={collapsed} pathname={pathname} onCollapse={onCollapse} activeBranchName={activeBranch?.name} alertCount={alertCount} />
      </motion.aside>
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside key="mobile-sidebar" initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', stiffness:320, damping:32 }}
            className={cn(sharedClasses, 'fixed inset-y-0 start-0 w-[240px] flex flex-col lg:hidden')} style={sharedStyle}>
            <SidebarInner collapsed={false} pathname={pathname} onCollapse={onCloseMobile} activeBranchName={activeBranch?.name} alertCount={alertCount} />
          </motion.aside>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}

