'use client'

import { useState } from 'react'
import { Bell, AlertTriangle, Clock, CheckCircle2, Activity, UserX } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn, formatMoney, formatRelativeDate } from '@/lib/utils'
import { getNotifications } from '@/lib/api/dashboard'
import type { DefaultingCustomer } from '@/lib/api/dashboard'
import type { Notification } from '@/types'

const LEVEL_MAP = {
  overdue:   { icon: AlertTriangle, color: 'text-rose-400',  bg: 'bg-rose-500/10',  ring: 'ring-rose-500/20',  label: 'متأخر',   dot: 'bg-rose-500' },
  due_today: { icon: Clock,         color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20', label: 'اليوم',   dot: 'bg-amber-400' },
  due_soon:  { icon: CheckCircle2,  color: 'text-teal-400',  bg: 'bg-teal-500/10',  ring: 'ring-teal-500/20',  label: 'قريباً',  dot: 'bg-teal-400' },
} as const

function NotifItem({ item, level }: { item: Notification; level: keyof typeof LEVEL_MAP }) {
  const { icon: Icon, color, bg, label } = LEVEL_MAP[level]
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.04] rounded-xl transition-colors">
      <div className={cn('mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ring-1', bg, LEVEL_MAP[level].ring)}>
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{item.customer_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.car_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-semibold', color)}>{label}</span>
          <span className="text-[10px] text-muted-foreground/70 money">{formatMoney(item.amount, item.currency)}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">{formatRelativeDate(item.due_date)}</span>
    </div>
  )
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey:        ['notifications'],
    queryFn:         getNotifications,
    staleTime:       60_000,
    refetchInterval: 120_000,
    retry: 1,
    meta: { onError: (err: unknown) => console.error('[NotificationCenter]', err) },
  })

  const defaultingCount = (data as any)?.defaulting_customers?.length ?? 0

  const totalCount =
    (data?.overdue?.length    ?? 0) +
    (data?.due_today?.length  ?? 0) +
    (data?.due_soon?.length   ?? 0) +
    defaultingCount

  const urgentCount = (data?.overdue?.length ?? 0) + (data?.due_today?.length ?? 0) + defaultingCount

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'relative h-8 w-8 rounded-lg transition-colors',
            open
              ? 'text-white bg-white/[0.09]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.07]'
          )}
        >
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {urgentCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-[#07080f]"
              >
                {urgentCount > 9 ? '9+' : urgentCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[348px] p-0 overflow-hidden rounded-2xl"
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--glass-border-strong)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <p className="text-sm font-semibold text-foreground">الإشعارات</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalCount > 0 ? `${totalCount} إشعار نشط` : 'لا توجد إشعارات جديدة'}
            </p>
          </div>
          {urgentCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold px-2 ring-1 ring-rose-500/20">
              {urgentCount} عاجل
            </span>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          <div className="p-2 space-y-0.5">
            {data?.overdue && data.overdue.length > 0 && (
              <div>
                <p className="px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-rose-400/70 font-bold">
                  ● متأخرة
                </p>
                {data.overdue.map((n) => <NotifItem key={n.id} item={n} level="overdue" />)}
              </div>
            )}
            {data?.due_today && data.due_today.length > 0 && (
              <div>
                <p className="px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-amber-400/70 font-bold">
                  ● مستحقة اليوم
                </p>
                {data.due_today.map((n) => <NotifItem key={n.id} item={n} level="due_today" />)}
              </div>
            )}
            {data?.due_soon && data.due_soon.length > 0 && (
              <div>
                <p className="px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-teal-400/70 font-bold">
                  ● مستحقة قريباً
                </p>
                {data.due_soon.map((n) => <NotifItem key={n.id} item={n} level="due_soon" />)}
              </div>
            )}
            {/* Defaulting customers */}
            {defaultingCount > 0 && (
              <div>
                <p className="px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-rose-400/70 font-bold">
                  ● عملاء متعثرون
                </p>
                {((data as any)?.defaulting_customers as DefaultingCustomer[])?.map(c => (
                  <div key={c.customer_id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.04] rounded-xl transition-colors">
                    <div className="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ring-1 bg-rose-500/10 ring-rose-500/20">
                      <UserX className="h-3.5 w-3.5 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{c.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.customer_phone ?? '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-rose-400">{c.overdue_count} قسط متأخر</span>
                        <span className="text-[10px] text-muted-foreground/70 money">{formatMoney(c.overdue_amount, c.currency)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalCount === 0 && (
              <div className="py-12 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400/35 mb-3" />
                <p className="text-sm font-medium text-foreground/60">لا توجد إشعارات معلقة</p>
                <p className="text-xs text-muted-foreground mt-1">جميع الأقساط في الموعد</p>
              </div>
            )}
          </div>

          {/* Audit log */}
          {data?.audit_logs && data.audit_logs.length > 0 && (
            <div style={{ borderTop: '1px solid var(--glass-border)' }} className="p-2">
              <p className="px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 font-bold">
                آخر النشاطات
              </p>
              {data.audit_logs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-white/[0.03] rounded-xl">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground/75 truncate">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground/50">{formatRelativeDate(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
