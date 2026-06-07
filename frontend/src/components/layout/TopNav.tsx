'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Menu, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BranchSelector } from './BranchSelector'
import { GlobalSearch } from './GlobalSearch'
import { NotificationCenter } from './NotificationCenter'
import { UserMenu } from './UserMenu'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const SEGMENT_LABELS: Record<string, string> = {
  '': 'لوحة التحكم',
  accounting: 'المحاسبة',
  backup: 'النسخ الاحتياطي',
  cashbox: 'الصندوق',
  'chart-of-accounts': 'دليل الحسابات',
  close: 'إقفال الصندوق',
  contract: 'عقد',
  contracts: 'العقود',
  crm: 'إدارة علاقات العملاء',
  customers: 'العملاء',
  edit: 'تعديل',
  employees: 'الموظفون',
  expenses: 'المصاريف',
  'exchange-rate': 'سعر الصرف',
  installments: 'الأقساط',
  inventory: 'المخزون',
  'journal-entries': 'القيود اليومية',
  new: 'جديد',
  performance: 'أداء الموظفين',
  pipeline: 'خط أنابيب المبيعات',
  purchases: 'المشتريات',
  receipt: 'وصل',
  reports: 'التقارير',
  roles: 'الأدوار',
  sales: 'المبيعات',
  schedule: 'جدول الأقساط',
  specification: 'المواصفات',
  statement: 'كشف الحساب',
  'system-health': 'فحص النظام',
  'trial-balance': 'ميزان المراجعة',
  users: 'المستخدمون',
  vouchers: 'السندات المالية',
  'accounting-rules': 'سلامة المحاسبة',
  'balance-sheet': 'الميزانية العمومية',
  'bank-movement': 'حركة البنك',
  'ar-aging': 'أعمار الذمم',
  'branch-comparison': 'مقارنة الفروع',
  'cashbox-movement': 'حركة الصندوق',
  'cost-center': 'مراكز التكلفة',
  'installment-aging': 'أعمار الأقساط',
  'vehicle-profitability': 'ربحية السيارات',
  'monthly-profit': 'الأرباح الشهرية',
}

const NEW_ACTIONS: Record<string, { label: string; href: string }> = {
  '/inventory': { label: 'سيارة جديدة', href: '/inventory/new' },
  '/sales':     { label: 'بيعة جديدة',  href: '/sales/new' },
  '/purchases': { label: 'شراء جديد',   href: '/purchases/new' },
  '/customers': { label: 'عميل جديد',   href: '/customers/new' },
  '/expenses':  { label: 'مصروف جديد', href: '/expenses/new' },
  '/users':     { label: 'مستخدم جديد', href: '/users/new' },
}

function labelForSegment(segment: string) {
  if (/^\d+$/.test(segment)) return `#${segment}`
  return SEGMENT_LABELS[segment] ?? segment
}

function buildCrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'لوحة التحكم', href: '/' }]

  const crumbs = [{ label: 'الرئيسية', href: '/' }]
  let href = ''
  for (const segment of segments) {
    href += `/${segment}`
    crumbs.push({ label: labelForSegment(segment), href })
  }
  return crumbs
}

function getNewAction(pathname: string) {
  return NEW_ACTIONS[`/${pathname.split('/')[1]}`] ?? null
}

interface TopNavProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onToggleMobile: () => void
}

export function TopNav({ onToggleSidebar, onToggleMobile }: TopNavProps) {
  const pathname = usePathname()
  const crumbs   = buildCrumbs(pathname)
  const action   = getNewAction(pathname)

  return (
    <header className="app-topnav sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-4">

      {/* ── Left zone: menu toggle + breadcrumb ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Desktop sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="طي أو توسيع القائمة"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary/70 hover:text-foreground lg:flex"
        >
          <Menu className="h-4 w-4" />
        </button>
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label="فتح القائمة"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary/70 hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Breadcrumb */}
        <nav className="hidden min-w-0 items-center gap-0.5 sm:flex" aria-label="breadcrumb">
          {crumbs.map((crumb, index) => {
            const isLast  = index === crumbs.length - 1
            const isFirst = index === 0

            return (
              <div key={crumb.href} className="flex min-w-0 items-center gap-0.5">
                {index > 0 && (
                  <ChevronLeft className="rtl-flip h-2.5 w-2.5 shrink-0 text-muted-foreground/28" />
                )}
                {isLast ? (
                  <span className={cn(
                    'truncate font-semibold',
                    isFirst
                      ? 'text-[11px] text-muted-foreground'
                      : 'text-[13px] text-foreground',
                  )}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className={cn(
                      'shrink-0 truncate transition-colors',
                      isFirst
                        ? 'text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground'
                        : 'text-[11px] text-muted-foreground/50 hover:text-muted-foreground',
                    )}
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* ── Right zone: actions + utilities ── */}
      <div className="flex shrink-0 items-center gap-1">
        <GlobalSearch />

        {action && (
          <Button
            asChild
            size="sm"
            className="hidden h-8 gap-1.5 px-3.5 text-xs font-semibold shadow-sm shadow-primary/20 sm:flex"
          >
            <Link href={action.href}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              {action.label}
            </Link>
          </Button>
        )}

        <div className="mx-1 hidden h-4 w-px bg-border/50 sm:block" />

        <ThemeToggle />
        <NotificationCenter />
        <BranchSelector />
        <UserMenu />
      </div>
    </header>
  )
}
