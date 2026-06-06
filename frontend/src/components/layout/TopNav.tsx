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
  customers: 'العملاء',
  edit: 'تعديل',
  employees: 'الموظفون',
  expenses: 'المصاريف',
  'exchange-rate': 'سعر الصرف',
  installments: 'الأقساط',
  inventory: 'المخزون',
  'journal-entries': 'القيود اليومية',
  new: 'جديد',
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
  'balance-sheet':    'الميزانية العمومية',
  'bank-movement':    'حركة البنك',
  'ar-aging':          'أعمار الذمم',
  'branch-comparison': 'مقارنة الفروع',
  'crm':              'إدارة علاقات العملاء',
  'pipeline':         'خط أنابيب المبيعات',
  'performance':      'أداء الموظفين',
  'cashbox-movement': 'حركة الصندوق',
  'cost-center': 'مراكز التكلفة',
  'installment-aging': 'أعمار الأقساط',
  'vehicle-profitability': 'ربحية السيارات',
}

const NEW_ACTIONS: Record<string, { label: string; href: string }> = {
  '/inventory': { label: 'سيارة جديدة', href: '/inventory/new' },
  '/sales': { label: 'بيعة جديدة', href: '/sales/new' },
  '/purchases': { label: 'شراء جديد', href: '/purchases/new' },
  '/customers': { label: 'عميل جديد', href: '/customers/new' },
  '/expenses': { label: 'مصروف جديد', href: '/expenses/new' },
  '/users': { label: 'مستخدم جديد', href: '/users/new' },
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
  const crumbs = buildCrumbs(pathname)
  const action = getNewAction(pathname)

  return (
    <header className="app-topnav sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          className="hidden h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
          aria-label="طي أو توسيع القائمة"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleMobile}
          className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <nav className="hidden min-w-0 items-center gap-1 sm:flex" aria-label="breadcrumb">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            const isFirst = index === 0

            return (
              <div key={crumb.href} className="flex min-w-0 items-center gap-1">
                {index > 0 && <ChevronLeft className="rtl-flip h-3 w-3 shrink-0 text-muted-foreground/45" />}
                {isLast ? (
                  <span className={cn('truncate text-sm font-semibold', isFirst ? 'text-muted-foreground' : 'text-foreground')}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className={cn(
                      'shrink-0 truncate text-sm transition-colors',
                      isFirst ? 'font-medium text-muted-foreground hover:text-foreground' : 'text-muted-foreground hover:text-foreground'
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

      <div className="flex shrink-0 items-center gap-1.5">
        <GlobalSearch />

        {action && (
          <Button asChild size="sm" className="hidden h-8 gap-1.5 px-3 text-xs font-medium shadow-sm shadow-primary/20 sm:flex">
            <Link href={action.href}>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              {action.label}
            </Link>
          </Button>
        )}

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <ThemeToggle />
        <NotificationCenter />
        <BranchSelector />
        <UserMenu />
      </div>
    </header>
  )
}
