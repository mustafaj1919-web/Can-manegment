'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Car,
  TrendingUp,
  ShoppingBag,
  CalendarDays,
  Calculator,
  ReceiptText,
  Wallet,
  UserCog,
  ShieldCheck,
  LogOut,
  DatabaseBackup,
  FileText,
  Scale,
  ChevronLeft,
  ChevronUp,
  Building2,
  ShieldAlert,
  Activity,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { logoutUser } from '@/lib/api/auth'
import { getNotifications } from '@/lib/api/dashboard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
  alert?: boolean
  soon?: boolean
}

type AccentColor = 'red' | 'amber' | 'emerald' | 'violet'

interface NavSection {
  label: string
  accent: AccentColor
  items: NavItem[]
}

const ACCENT_INDICATOR: Record<AccentColor, string> = {
  red:     'bg-[#e63946]',
  amber:   'bg-[#f59e0b]',
  emerald: 'bg-[#10b981]',
  violet:  'bg-[#8b5cf6]',
}

const ACCENT_ICON_ACTIVE: Record<AccentColor, string> = {
  red:     'text-[#e63946] drop-shadow-[0_0_4px_#e6394660]',
  amber:   'text-[#f59e0b] drop-shadow-[0_0_4px_#f59e0b60]',
  emerald: 'text-[#10b981] drop-shadow-[0_0_4px_#10b98160]',
  violet:  'text-[#8b5cf6] drop-shadow-[0_0_4px_#8b5cf660]',
}

const MANAGEMENT_ROLES = ['Owner', 'Admin']
const FINANCE_ROLES = ['Owner', 'Admin', 'Accountant']
const SALES_ROLES = ['Owner', 'Admin', 'Accountant', 'Sales']

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'مساحة العمل',
    accent: 'red',
    items: [
      { href: '/', label: 'لوحة الإدارة', icon: LayoutDashboard },
      { href: '/cashier', label: 'مركز الكاشير', icon: Wallet, roles: SALES_ROLES },
    ],
  },
  {
    label: 'إدارة المعرض',
    accent: 'amber',
    items: [
      { href: '/inventory', label: 'مخزون السيارات', icon: Car },
      { href: '/sales', label: 'المبيعات', icon: TrendingUp, roles: SALES_ROLES },
      { href: '/purchases', label: 'المشتريات', icon: ShoppingBag, roles: FINANCE_ROLES },
      { href: '/customers', label: 'العملاء', icon: Users, roles: SALES_ROLES },
      { href: '/installments', label: 'الأقساط والتحصيل', icon: CalendarDays, roles: FINANCE_ROLES, alert: true },
      { href: '/risk', label: 'مراقبة المخاطر', icon: ShieldAlert, roles: FINANCE_ROLES },
    ],
  },
  {
    label: 'المالية والمحاسبة',
    accent: 'emerald',
    items: [
      { href: '/cashbox', label: 'الصندوق والحركة', icon: Wallet, roles: FINANCE_ROLES },
      { href: '/vouchers', label: 'السندات', icon: ReceiptText, roles: FINANCE_ROLES },
      { href: '/accounting', label: 'المحاسبة', icon: Calculator, roles: FINANCE_ROLES },
      { href: '/trial-balance', label: 'ميزان المراجعة', icon: Scale, roles: FINANCE_ROLES },
      { href: '/reports', label: 'التقارير', icon: FileText, roles: FINANCE_ROLES },
    ],
  },
  {
    label: 'إدارة النظام',
    accent: 'violet',
    items: [
      { href: '/users', label: 'المستخدمون', icon: UserCog, roles: MANAGEMENT_ROLES },
      { href: '/roles', label: 'الأدوار والصلاحيات', icon: ShieldCheck, roles: MANAGEMENT_ROLES },
      { href: '/audit', label: 'سجل التدقيق', icon: Activity, roles: MANAGEMENT_ROLES },
      { href: '/backup', label: 'النسخ الاحتياطي', icon: DatabaseBackup, roles: MANAGEMENT_ROLES },
    ],
  },
]

function isItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const activeBranch = useBranchStore((state) => state.activeBranch)

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  const alertCount =
    (notifications?.overdue?.length ?? 0) +
    (notifications?.due_today?.length ?? 0)

  const visibleSections = useMemo(() => {
    const role = user?.role ?? 'Viewer'
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
    })).filter((section) => section.items.length > 0)
  }, [user?.role])

  async function handleLogout() {
    await logoutUser()
    clearAuth()
    router.push('/login')
  }

  return (
    <aside className="showroom-sidebar relative hidden h-[calc(100vh-2rem)] my-4 ms-4 w-[260px] shrink-0 flex-col rounded-2xl border border-border bg-[var(--sidebar-bg)] shadow-2xl lg:flex">
      {/* Top ambient glow */}
      <div className="sidebar-top-glow rounded-t-2xl" />

      {/* Brand Header */}
      <div className="relative z-10 flex h-[72px] items-center gap-3 border-b border-border-subtle px-5">
        <Link
          href="/"
          className="sidebar-brand-ring h-10 w-10 animate-pulse-border-red"
        >
          <img src="/logo.png" alt="شركة الأصدقاء لتجارة السيارات" className="h-7 w-7 object-contain" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">شركة الأصدقاء</p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">
            لتجارة السيارات
          </p>
        </div>
      </div>

      {/* Navigation - Centered Vertically */}
      <nav className="sidebar-scroll relative z-10 flex-1 overflow-y-auto px-3 py-5 flex flex-col justify-center">
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <section key={section.label}>
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(pathname, item.href)

                  if (item.soon) {
                    return (
                      <div
                        key={item.href}
                        className="group relative flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold cursor-not-allowed opacity-40 select-none"
                        title="قيد التطوير"
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-40" />
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-muted/40 text-muted-foreground border border-border/30">
                          قريباً
                        </span>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-all duration-150',
                        active
                          ? 'bg-primary/[0.08] text-foreground font-bold'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {active && (
                        <span
                          className={cn(
                            'absolute inset-y-2 start-0 w-[2.5px] rounded-full',
                            ACCENT_INDICATOR[section.accent]
                          )}
                        />
                      )}

                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-all duration-150',
                          active
                            ? ACCENT_ICON_ACTIVE[section.accent]
                            : 'opacity-40 group-hover:opacity-75'
                        )}
                      />

                      <span className="min-w-0 flex-1 truncate">{item.label}</span>

                      {item.alert && alertCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500/10 px-1.5 text-[10px] font-black text-rose-500 border border-rose-500/20">
                          {alertCount}
                        </span>
                      ) : (
                        <ChevronLeft className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-30" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      {/* User Footer with professional Popover Dropdown */}
      <div className="relative z-10 border-t border-border-subtle p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 px-3 py-2.5 transition-all duration-200 text-right focus:outline-none cursor-pointer"
              )}
            >
              {/* User Avatar */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#f4a522] p-[1.5px] shadow-sm">
                <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[var(--sidebar-bg)] text-[10px] font-black text-foreground">
                  {(user?.username ?? 'AD').slice(0, 2).toUpperCase()}
                </div>
              </div>

              {/* User Details */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{user?.username ?? 'admin'}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground font-medium">
                  <Building2 className="h-3 w-3 shrink-0 opacity-60 text-primary" />
                  {activeBranch?.name ?? 'الفرع الرئيسي'}
                </p>
              </div>

              {/* Indicator icon */}
              <ChevronUp className="h-4 w-4 text-muted-foreground/60 transition-transform duration-200" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="center"
            side="top"
            sideOffset={8}
            className="w-[236px] rounded-xl p-1.5 backdrop-blur-md"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--glass-border-strong)',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header info */}
            <div className="px-3 py-2 select-none text-right">
              <p className="text-xs font-bold text-foreground">{user?.username ?? 'admin'}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary uppercase border border-primary/20">
                  {user?.role ?? 'Viewer'}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {activeBranch?.name ?? 'الفرع الرئيسي'}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-secondary/40 mx-2 my-1" />

            {/* Menu Items */}
            <DropdownMenuItem asChild>
              <Link
                href="/users"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <UserCog className="h-4 w-4 opacity-70 text-primary" />
                <span>ملفي الشخصي والإعدادات</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/audit"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
              >
                <Activity className="h-4 w-4 opacity-70 text-amber-500" />
                <span>سجل نشاطاتي (Audit Log)</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-secondary/40 mx-2 my-1" />

            {/* Logout button */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 cursor-pointer text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors focus:bg-rose-500/10 focus:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
