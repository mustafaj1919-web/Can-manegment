'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Plus, LayoutDashboard, Car, TrendingUp, ShoppingBag, Users, CalendarDays, Wallet, ReceiptText, Calculator, ListTree, BookOpen, Scale, FileText, UserCog, ShieldCheck, ServerCog, DatabaseBackup } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BranchSelector } from './BranchSelector'
import { GlobalSearch } from './GlobalSearch'
import { NotificationCenter } from './NotificationCenter'
import { UserMenu } from './UserMenu'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const NEW_ACTIONS: Record<string, { label: string; href: string }> = {
  '/inventory': { label: 'سيارة جديدة', href: '/inventory/new' },
  '/sales':     { label: 'بيعة جديدة',  href: '/sales/new' },
  '/purchases': { label: 'شراء جديد',   href: '/purchases/new' },
  '/customers': { label: 'عميل جديد',   href: '/customers/new' },
  '/expenses':  { label: 'مصروف جديد', href: '/expenses/new' },
  '/users':     { label: 'مستخدم جديد', href: '/users/new' },
}

function getNewAction(pathname: string) {
  return NEW_ACTIONS[`/${pathname.split('/')[1]}`] ?? null
}

interface TopNavProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onToggleMobile: () => void
}

export function TopNav({ onToggleMobile }: TopNavProps) {
  const pathname = usePathname()
  const action   = getNewAction(pathname)

  return (
    <header className="app-topnav sticky top-0 z-40 flex h-[64px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-background/80 backdrop-blur-md px-6 shadow-sm">
      
      {/* ── Left zone: Logo + Navigation Links ── */}
      <div className="flex items-center gap-8 min-w-0">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
            <img src="/logo.png" alt="شركة الأصدقاء" className="h-7 w-7 object-contain" />
          </div>
          <div className="leading-none hidden sm:block">
            <p className="text-sm font-black text-white font-family-cairo leading-none tracking-tight">الأصدقاء</p>
            <p className="text-[9px] text-neutral-500 tracking-widest leading-none mt-1 uppercase">للسيارات</p>
          </div>
        </Link>

        {/* Desktop premium horizontal links */}
        <nav className="hidden xl:flex items-center gap-1.5 text-[13px] font-semibold text-neutral-300">
          <Link
            href="/"
            className={cn(
              'px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03]',
              pathname === '/' && 'text-red-500 bg-red-500/5 border border-red-500/10 font-bold'
            )}
          >
            الرئيسية
          </Link>
          <Link
            href="/inventory"
            className={cn(
              'px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03]',
              pathname.startsWith('/inventory') && 'text-red-500 bg-red-500/5 border border-red-500/10 font-bold'
            )}
          >
            السيارات
          </Link>
          <Link
            href="/sales"
            className={cn(
              'px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03]',
              pathname.startsWith('/sales') && 'text-red-500 bg-red-500/5 border border-red-500/10 font-bold'
            )}
          >
            المبيعات
          </Link>
          <Link
            href="/purchases"
            className={cn(
              'px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03]',
              pathname.startsWith('/purchases') && 'text-red-500 bg-red-500/5 border border-red-500/10 font-bold'
            )}
          >
            المشتريات
          </Link>
          <Link
            href="/installments"
            className={cn(
              'px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03]',
              pathname.startsWith('/installments') && 'text-red-500 bg-red-500/5 border border-red-500/10 font-bold'
            )}
          >
            الأقساط
          </Link>
          <Link
            href="/customers"
            className={cn(
              'px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03]',
              pathname.startsWith('/customers') && 'text-red-500 bg-red-500/5 border border-red-500/10 font-bold'
            )}
          >
            العملاء
          </Link>

          {/* المالية Dropdown */}
          <div className="relative group">
            <button className="px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03] flex items-center gap-1.5 cursor-pointer">
              المالية
              <ChevronDown className="h-3.5 w-3.5 text-neutral-500 group-hover:text-white transition-colors" />
            </button>
            <div className="absolute top-full start-0 mt-1 hidden group-hover:block bg-[#0e0e0e] border border-white/[0.08] rounded-2xl shadow-2xl p-2 min-w-[210px] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <Link href="/cashbox" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <Wallet className="h-4 w-4 text-neutral-400" /> الصندوق
              </Link>
              <Link href="/vouchers" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <ReceiptText className="h-4 w-4 text-neutral-400" /> السندات
              </Link>
              <Link href="/cashbox/close" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <BookOpen className="h-4 w-4 text-neutral-400" /> إقفال الصندوق
              </Link>
              <Link href="/expenses" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <ReceiptText className="h-4 w-4 text-neutral-400" /> المصاريف
              </Link>
              <Link href="/exchange-rate" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <TrendingUp className="h-4 w-4 text-neutral-400" /> سعر الصرف
              </Link>
            </div>
          </div>

          {/* المحاسبة Dropdown */}
          <div className="relative group">
            <button className="px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03] flex items-center gap-1.5 cursor-pointer">
              المحاسبة
              <ChevronDown className="h-3.5 w-3.5 text-neutral-500 group-hover:text-white transition-colors" />
            </button>
            <div className="absolute top-full start-0 mt-1 hidden group-hover:block bg-[#0e0e0e] border border-white/[0.08] rounded-2xl shadow-2xl p-2 min-w-[210px] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <Link href="/accounting" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <Calculator className="h-4 w-4 text-neutral-400" /> المحاسبة المالية
              </Link>
              <Link href="/chart-of-accounts" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <ListTree className="h-4 w-4 text-neutral-400" /> دليل الحسابات
              </Link>
              <Link href="/journal-entries" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <BookOpen className="h-4 w-4 text-neutral-400" /> القيود اليومية
              </Link>
              <Link href="/trial-balance" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <Scale className="h-4 w-4 text-neutral-400" /> ميزان المراجعة
              </Link>
            </div>
          </div>

          {/* التقارير والنظام Dropdown */}
          <div className="relative group">
            <button className="px-3.5 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.03] flex items-center gap-1.5 cursor-pointer">
              النظام والتقارير
              <ChevronDown className="h-3.5 w-3.5 text-neutral-500 group-hover:text-white transition-colors" />
            </button>
            <div className="absolute top-full start-0 mt-1 hidden group-hover:block bg-[#0e0e0e] border border-white/[0.08] rounded-2xl shadow-2xl p-2 min-w-[220px] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <Link href="/reports" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors font-bold text-red-400">
                <FileText className="h-4 w-4" /> مركز التقارير
              </Link>
              <div className="h-px bg-white/[0.05] my-1" />
              <Link href="/users" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <UserCog className="h-4 w-4 text-neutral-400" /> المستخدمين
              </Link>
              <Link href="/roles" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <ShieldCheck className="h-4 w-4 text-neutral-400" /> الصلاحيات
              </Link>
              <Link href="/system-health" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <ServerCog className="h-4 w-4 text-neutral-400" /> صحة النظام
              </Link>
              <Link href="/backup" className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] hover:text-white rounded-xl text-xs transition-colors">
                <DatabaseBackup className="h-4 w-4 text-neutral-400" /> النسخ الاحتياطي
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* ── Right zone: actions + utilities ── */}
      <div className="flex shrink-0 items-center gap-1.5">
        <GlobalSearch />

        {action && (
          <Button
            asChild
            size="sm"
            className="hidden h-9 gap-1.5 px-4 text-xs font-semibold shadow-sm transition-all duration-150 hover:-translate-y-0.5 sm:flex"
          >
            <Link href={action.href}>
              <Plus className="h-4 w-4 shrink-0" />
              {action.label}
            </Link>
          </Button>
        )}

        <div className="mx-1.5 hidden h-4 w-px bg-border/50 sm:block" />

        <ThemeToggle />
        <NotificationCenter />
        <BranchSelector />
        <UserMenu />

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label="فتح القائمة الجانبية"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white xl:hidden border border-white/[0.05]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
