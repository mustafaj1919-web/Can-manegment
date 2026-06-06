'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BarChart3, Car, Plus, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getDashboardStats, getNotifications } from '@/lib/api/dashboard'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'مرحباً'
  if (hour < 12) return 'صباح الخير'
  if (hour < 17) return 'مساء الخير'
  return 'مساء النور'
}

function getShortDate() {
  return new Intl.DateTimeFormat('ar-IQ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date())
}

const QUICK_ACTIONS = [
  { label: 'بيعة', href: '/sales/new', icon: TrendingUp, cls: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400' },
  { label: 'سيارة', href: '/inventory/new', icon: Car, cls: 'bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary' },
  { label: 'عميل', href: '/customers/new', icon: Users, cls: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500' },
  { label: 'تقارير', href: '/reports', icon: BarChart3, cls: 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground' },
] as const

export function HeroBanner() {
  const greeting = useMemo(getGreeting, [])
  const shortDate = useMemo(getShortDate, [])
  const branch = useBranchStore((state) => state.activeBranch)
  const user = useAuthStore((state) => state.user)

  useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 60_000, retry: 1 })
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, staleTime: 60_000, retry: 1 })

  const urgentCount = (notifications?.overdue?.length ?? 0) + (notifications?.due_today?.length ?? 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="app-card mb-4 overflow-hidden rounded-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground">
                {greeting}
                {user?.username ? <span className="font-normal text-muted-foreground">، {user.username}</span> : null}
              </p>
              {urgentCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {urgentCount}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {shortDate}
              {branch ? <span className="ms-2 opacity-70">· {branch.name}</span> : null}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground/70 sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" style={{ animationDuration: '2.5s' }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            مباشر
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, cls }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              size="sm"
              className={cn('hidden h-7 gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium sm:flex', cls)}
            >
              <Link href={href}>
                <Icon className="h-3 w-3 shrink-0" />
                {label}
              </Link>
            </Button>
          ))}
          <Button asChild size="sm" className="h-7 gap-1 px-2.5 text-[11px] sm:hidden">
            <Link href="/sales/new">
              <Plus className="h-3 w-3" />
              جديد
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
