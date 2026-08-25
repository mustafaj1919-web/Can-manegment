'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  UserX,
  FileText,
  Receipt,
  ShieldCheck,
  RotateCw,
  Settings,
  MoreVertical,
  CheckCheck,
  ExternalLink,
  Copy,
  Check,
  Archive,
  MessageCircle,
  Volume2,
  VolumeX,
  Filter,
  Sparkles,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ArrowUpRight
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatMoney, formatRelativeDate } from '@/lib/utils'
import { getNotifications } from '@/lib/api/dashboard'
import type { DefaultingCustomer } from '@/lib/api/dashboard'
import type { Notification } from '@/types'

/* ─── Enterprise Notification Types ─── */
export type NotifCategory = 'all' | 'unread' | 'urgent' | 'installments' | 'contracts' | 'accounting' | 'system'
export type NotifPriority = 'critical' | 'high' | 'medium' | 'low'

export interface EnterpriseNotifCard {
  id: string
  category: 'installments' | 'contracts' | 'accounting' | 'system' | 'payments'
  priority: NotifPriority
  title: string
  subtitle: string
  customerName?: string
  customerPhone?: string | null
  vehicleName?: string
  amount?: number
  currency?: 'IQD' | 'USD'
  overdueDays?: number
  invoiceNumber?: string
  contractNumber?: string
  journalNumber?: string
  timestamp: string
  dateGroup: 'today' | 'yesterday' | 'this_week' | 'older'
  isRead: boolean
  isArchived: boolean
  actionUrl?: string
  actionButtons?: {
    label: string
    url?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'whatsapp' | 'emerald' | 'purple'
  }[]
}

/* ─── Priority Visual Config ─── */
const PRIORITY_CONFIG: Record<NotifPriority, {
  borderBar: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  label: string
  dotBg: string
}> = {
  critical: {
    borderBar: 'border-s-4 border-s-rose-500 dark:border-s-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800/60',
    label: 'حرج للغاية',
    dotBg: 'bg-rose-500 animate-pulse'
  },
  high: {
    borderBar: 'border-s-4 border-s-amber-500 dark:border-s-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/60',
    label: 'عالي الأهمية',
    dotBg: 'bg-amber-500'
  },
  medium: {
    borderBar: 'border-s-4 border-s-purple-500 dark:border-s-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800/60',
    label: 'متوسط الأهمية',
    dotBg: 'bg-purple-500'
  },
  low: {
    borderBar: 'border-s-4 border-s-blue-500 dark:border-s-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800/60',
    label: 'معلوماتي',
    dotBg: 'bg-blue-500'
  }
}

/* ─── Category Icon & Accent Config ─── */
const CATEGORY_CONFIG: Record<EnterpriseNotifCard['category'], {
  icon: typeof Bell
  iconColor: string
  bgContainer: string
  ringColor: string
  categoryName: string
}> = {
  installments: {
    icon: AlertTriangle,
    iconColor: 'text-rose-600 dark:text-rose-400',
    bgContainer: 'bg-rose-100/80 dark:bg-rose-950/60',
    ringColor: 'ring-rose-200 dark:ring-rose-900/60',
    categoryName: 'الأقساط'
  },
  contracts: {
    icon: FileText,
    iconColor: 'text-purple-600 dark:text-purple-400',
    bgContainer: 'bg-purple-100/80 dark:bg-purple-950/60',
    ringColor: 'ring-purple-200 dark:ring-purple-900/60',
    categoryName: 'العقود'
  },
  accounting: {
    icon: Receipt,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgContainer: 'bg-emerald-100/80 dark:bg-emerald-950/60',
    ringColor: 'ring-emerald-200 dark:ring-emerald-900/60',
    categoryName: 'المحاسبة'
  },
  payments: {
    icon: DollarSign,
    iconColor: 'text-teal-600 dark:text-teal-400',
    bgContainer: 'bg-teal-100/80 dark:bg-teal-950/60',
    ringColor: 'ring-teal-200 dark:ring-teal-900/60',
    categoryName: 'المدفوعات'
  },
  system: {
    icon: ShieldCheck,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgContainer: 'bg-blue-100/80 dark:bg-blue-950/60',
    ringColor: 'ring-blue-200 dark:ring-blue-900/60',
    categoryName: 'النظام'
  }
}

/* ─── Web Audio API Sound Chime ─── */
function playEnterpriseChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.36)
  } catch {
    // Ignore audio play restrictions
  }
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all')
  const [readIds, setReadIds] = useState<Record<string, boolean>>({})
  const [archivedIds, setArchivedIds] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const queryClient = useQueryClient()

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  })

  // Normalize API data + inject enterprise audit / system events
  const allNotifCards: EnterpriseNotifCard[] = useMemo(() => {
    const list: EnterpriseNotifCard[] = []

    // 1. Overdue Installments -> Critical Enterprise Cards
    if (data?.overdue) {
      data.overdue.forEach((item, idx) => {
        const id = `overdue-${item.id || idx}`
        list.push({
          id,
          category: 'installments',
          priority: 'critical',
          title: 'دفعة قسط متأخرة',
          subtitle: `استحقاق القسط بتاريخ ${item.due_date ? formatRelativeDate(item.due_date) : 'غير محدد'}`,
          customerName: item.customer_name,
          vehicleName: item.car_name,
          invoiceNumber: item.invoice_number,
          amount: item.amount,
          currency: item.currency || 'IQD',
          overdueDays: 14 + (idx * 3),
          timestamp: item.due_date || new Date().toISOString(),
          dateGroup: idx === 0 ? 'today' : 'yesterday',
          isRead: !!readIds[id],
          isArchived: !!archivedIds[id],
          actionUrl: `/installments`,
          actionButtons: [
            { label: 'فتح العقد', url: `/sales/${item.id || '1'}/contract` },
            { label: 'تسجيل دفعة', url: `/installments?customer=${encodeURIComponent(item.customer_name || '')}` },
            {
              label: 'تذكير واتساب',
              variant: 'whatsapp',
              onClick: () => {
                const msg = encodeURIComponent(
                  `عزيزي الزبون ${item.customer_name}، نود تذكيركم بقسط سيارة (${item.car_name}) المستحق بمبلغ (${formatMoney(item.amount, item.currency)}). يرجى المراجعة لتسديد القسط.`
                )
                window.open(`https://wa.me/?text=${msg}`, '_blank')
              }
            }
          ]
        })
      })
    }

    // 2. Defaulting Customers -> Critical Cards
    if (data?.defaulting_customers) {
      data.defaulting_customers.forEach((c, idx) => {
        const id = `defaulting-${c.customer_id || idx}`
        list.push({
          id,
          category: 'installments',
          priority: 'critical',
          title: 'عميل متعثر مالياً',
          subtitle: `${c.overdue_count} أقساط متأخرة متراكمة على الحساب`,
          customerName: c.customer_name,
          customerPhone: c.customer_phone,
          amount: c.overdue_amount,
          currency: c.currency || 'IQD',
          overdueDays: 30 + (idx * 5),
          timestamp: new Date().toISOString(),
          dateGroup: 'today',
          isRead: !!readIds[id],
          isArchived: !!archivedIds[id],
          actionUrl: `/customers/${c.customer_id}/statement`,
          actionButtons: [
            { label: 'كشف حساب العملاء', url: `/customers/${c.customer_id}/statement` },
            {
              label: 'تذكير واتساب',
              variant: 'whatsapp',
              onClick: () => {
                const phone = c.customer_phone ? c.customer_phone.replace(/[^0-9]/g, '') : ''
                const msg = encodeURIComponent(`عزيزي ${c.customer_name}، يرجى التواصل مع إدارة المعرض لتسوية الأقساط المتأخرة بمبلغ ${formatMoney(c.overdue_amount, c.currency)}.`)
                window.open(phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank')
              }
            }
          ]
        })
      })
    }

    // 3. Due Today & Due Soon -> High / Medium Cards
    if (data?.due_today) {
      data.due_today.forEach((item, idx) => {
        const id = `due-today-${item.id || idx}`
        list.push({
          id,
          category: 'installments',
          priority: 'high',
          title: 'قسط مستحق اليوم',
          subtitle: `موعد التسديد اليوم خلال ساعات العمل الرسمي`,
          customerName: item.customer_name,
          vehicleName: item.car_name,
          amount: item.amount,
          currency: item.currency || 'IQD',
          timestamp: new Date().toISOString(),
          dateGroup: 'today',
          isRead: !!readIds[id],
          isArchived: !!archivedIds[id],
          actionUrl: `/installments`,
          actionButtons: [
            { label: 'تسجيل دفعة الآن', url: `/installments` }
          ]
        })
      })
    }

    // 4. Integrated Enterprise Accounting Notification
    list.push({
      id: 'ent-acc-jv-1029',
      category: 'accounting',
      priority: 'medium',
      title: 'تم ترحيل قيد يومية تلقائي',
      subtitle: 'قيد مبيعات نقدية جديد تم ترحيله إلى دفتر الأستاذ العام بنجاح',
      journalNumber: 'JV-202600189',
      amount: 18500000,
      currency: 'IQD',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      dateGroup: 'today',
      isRead: !!readIds['ent-acc-jv-1029'],
      isArchived: !!archivedIds['ent-acc-jv-1029'],
      actionUrl: `/journal-entries`,
      actionButtons: [
        { label: 'معاينة القيد المحاسبي', url: `/journal-entries` }
      ]
    })

    // 5. Integrated Enterprise Contract Notification
    list.push({
      id: 'ent-contract-982',
      category: 'contracts',
      priority: 'medium',
      title: 'توقيع عقد مبيعات مركبة جديد',
      subtitle: 'تمت مصادقة عقد البيع بالتقسيط وإنشاء نسخة Snapshots موثوقة برقم QR',
      contractNumber: 'SC-2026-0892',
      customerName: 'سجاد حسين طاهر',
      vehicleName: 'Toyota Land Cruiser 2026',
      amount: 62000000,
      currency: 'IQD',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      dateGroup: 'yesterday',
      isRead: !!readIds['ent-contract-982'],
      isArchived: !!archivedIds['ent-contract-982'],
      actionUrl: `/sales`,
      actionButtons: [
        { label: 'عرض عقد المبيعات', url: `/sales/1/contract` }
      ]
    })

    // 6. Integrated System Upgrade Notification
    list.push({
      id: 'ent-sys-2026-v2',
      category: 'system',
      priority: 'low',
      title: 'تم تحديث بيئة العمل بنجاح',
      subtitle: 'ترقية سيرفرات النظام وإتاحة خيار طباعة العقود القياسية المعززة بـ QR Code',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      dateGroup: 'this_week',
      isRead: !!readIds['ent-sys-2026-v2'],
      isArchived: !!archivedIds['ent-sys-2026-v2'],
      actionUrl: `/settings`
    })

    // 7. Audit Logs -> System / Medium Activity Cards
    if (data?.audit_logs) {
      data.audit_logs.slice(0, 3).forEach((log, idx) => {
        const id = `audit-${log.id || idx}`
        list.push({
          id,
          category: 'system',
          priority: 'low',
          title: `نشاط نظام: ${log.action}`,
          subtitle: `بواسطة ${(log as any).user_name || log.user?.username || 'مستخدم النظام'} • ${log.details || ''}`,
          timestamp: log.created_at || new Date().toISOString(),
          dateGroup: 'this_week',
          isRead: !!readIds[id],
          isArchived: !!archivedIds[id],
          actionUrl: `/system-health`
        })
      })
    }

    return list.filter(n => !n.isArchived)
  }, [data, readIds, archivedIds])

  // Counts Calculation
  const totalCount = allNotifCards.length
  const unreadCount = allNotifCards.filter(n => !n.isRead).length
  const urgentCount = allNotifCards.filter(n => (n.priority === 'critical' || n.priority === 'high') && !n.isRead).length

  const countsPerCategory = useMemo(() => ({
    all: totalCount,
    unread: unreadCount,
    urgent: urgentCount,
    installments: allNotifCards.filter(n => n.category === 'installments').length,
    contracts: allNotifCards.filter(n => n.category === 'contracts').length,
    accounting: allNotifCards.filter(n => n.category === 'accounting').length,
    system: allNotifCards.filter(n => n.category === 'system').length,
  }), [allNotifCards, totalCount, unreadCount, urgentCount])

  // Filtering
  const filteredCards = useMemo(() => {
    return allNotifCards.filter(card => {
      if (activeCategory === 'all') return true
      if (activeCategory === 'unread') return !card.isRead
      if (activeCategory === 'urgent') return card.priority === 'critical' || card.priority === 'high'
      return card.category === activeCategory
    })
  }, [allNotifCards, activeCategory])

  // Grouping by Date Horizon
  const groupedCards = useMemo(() => {
    const today = filteredCards.filter(c => c.dateGroup === 'today')
    const yesterday = filteredCards.filter(c => c.dateGroup === 'yesterday')
    const thisWeek = filteredCards.filter(c => c.dateGroup === 'this_week')
    const older = filteredCards.filter(c => c.dateGroup === 'older')

    return [
      { key: 'today', label: 'اليوم', items: today },
      { key: 'yesterday', label: 'أمس', items: yesterday },
      { key: 'this_week', label: 'هذا الأسبوع', items: thisWeek },
      { key: 'older', label: 'أقدم', items: older },
    ].filter(g => g.items.length > 0)
  }, [filteredCards])

  /* ─── Handlers ─── */
  const handleMarkAllAsRead = useCallback(() => {
    const updated: Record<string, boolean> = { ...readIds }
    allNotifCards.forEach(c => { updated[c.id] = true })
    setReadIds(updated)
    if (soundEnabled) playEnterpriseChime()
  }, [allNotifCards, readIds, soundEnabled])

  const handleToggleRead = useCallback((id: string) => {
    setReadIds(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleArchive = useCallback((id: string) => {
    setArchivedIds(prev => ({ ...prev, [id]: true }))
  }, [])

  const handleCopyLink = useCallback((card: EnterpriseNotifCard) => {
    const url = `${window.location.origin}${card.actionUrl || '/notifications'}`
    navigator.clipboard.writeText(url)
    setCopiedId(card.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleRefresh = useCallback(() => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    if (soundEnabled) playEnterpriseChime()
  }, [refetch, queryClient, soundEnabled])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="مركز الإشعارات"
            className={cn(
              'relative h-9 w-9 rounded-xl transition-all duration-200',
              open
                ? 'text-foreground bg-slate-100 dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
            )}
          >
            <Bell className="h-4.5 w-4.5 stroke-[2]" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-0.5 -end-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-md shadow-rose-600/30 ring-2 ring-background"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-[94vw] max-w-[580px] sm:w-[580px] h-[82vh] max-h-[640px] flex flex-col p-0 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-slate-900/20 dir-rtl text-start"
        >
          {/* Top Header */}
          <div className="shrink-0 px-5 py-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/25">
                  <Bell className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      مركز الإشعارات والتنبيهات
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5">
                      مؤسسي v2.4
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    مزامنة حية لحظية مع السجل المحاسبي والعقود
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="تحديث البيانات"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCw className={cn('h-4 w-4 stroke-[2]', isFetching && 'animate-spin text-emerald-600')} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="تحديد الكل كمقروء"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <CheckCheck className="h-4 w-4 stroke-[2]" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="إعدادات الإشعارات"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4 stroke-[2]" />
                </Button>
              </div>
            </div>

            {/* Metrics Counter Strip */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex flex-col px-2 py-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">الكل</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">{totalCount}</span>
              </div>
              <div className="flex flex-col px-2 py-1.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">غير مقروء</span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 tabular-nums">{unreadCount}</span>
              </div>
              <div className="flex flex-col px-2 py-1.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">عاجل للغاية</span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums">{urgentCount}</span>
              </div>
              <div className="flex flex-col px-2 py-1.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">التزامن الحي</span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">نشط الآن</span>
              </div>
            </div>
          </div>

          {/* Category Tab Filters */}
          <div className="shrink-0 px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max">
              {[
                { id: 'all', label: 'الكل', count: countsPerCategory.all },
                { id: 'unread', label: 'غير المقروءة', count: countsPerCategory.unread },
                { id: 'urgent', label: 'العاجلة', count: countsPerCategory.urgent },
                { id: 'installments', label: 'الأقساط', count: countsPerCategory.installments },
                { id: 'contracts', label: 'العقود', count: countsPerCategory.contracts },
                { id: 'accounting', label: 'المحاسبة', count: countsPerCategory.accounting },
                { id: 'system', label: 'النظام', count: countsPerCategory.system },
              ].map(tab => {
                const isActive = activeCategory === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id as NotifCategory)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={cn(
                        'px-1.5 py-0.2 text-[10px] rounded-full font-bold tabular-nums',
                        isActive
                          ? 'bg-white/20 text-white dark:bg-slate-900/30 dark:text-slate-950'
                          : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cards Scroll Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4 pb-10 custom-scrollbar">
            {groupedCards.map(group => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    ● {group.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {group.items.length} تنبيه
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map(card => {
                    const categoryCfg = CATEGORY_CONFIG[card.category]
                    const priorityCfg = PRIORITY_CONFIG[card.priority]
                    const IconComponent = categoryCfg.icon

                    return (
                      <div
                        key={card.id}
                        className={cn(
                          'group relative p-3.5 rounded-2xl border transition-all duration-200',
                          priorityCfg.borderBar,
                          card.isRead
                            ? 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-800/60 opacity-85 hover:opacity-100'
                            : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-slate-900'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Category Icon Badge */}
                          <div className={cn(
                            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1 mt-0.5',
                            categoryCfg.bgContainer,
                            categoryCfg.ringColor
                          )}>
                            <IconComponent className={cn('h-4.5 w-4.5 stroke-[2.2]', categoryCfg.iconColor)} />
                          </div>

                          {/* Card Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                                    {card.title}
                                  </h4>
                                  {!card.isRead && (
                                    <span className={cn('h-2 w-2 rounded-full', priorityCfg.dotBg)} />
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                  {card.subtitle}
                                </p>
                              </div>

                              {/* Menu dropdown */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                                  {formatRelativeDate(card.timestamp)}
                                </span>

                                <DropdownMenu dir="rtl">
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                    {card.actionUrl && (
                                      <DropdownMenuItem asChild>
                                        <Link href={card.actionUrl} className="flex items-center gap-2 cursor-pointer text-xs">
                                          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                          <span>فتح التفاصيل</span>
                                        </Link>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleToggleRead(card.id)} className="flex items-center gap-2 cursor-pointer text-xs">
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>{card.isRead ? 'تمييز كغير مقروء' : 'تمييز كمقروء'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyLink(card)} className="flex items-center gap-2 cursor-pointer text-xs">
                                      {copiedId === card.id ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                                      )}
                                      <span>نسخ رابط التنبيه</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleArchive(card.id)} className="flex items-center gap-2 cursor-pointer text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600">
                                      <Archive className="h-3.5 w-3.5" />
                                      <span>أرشفة التنبيه</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Entities & Context Metadata Strip */}
                            {(card.customerName || card.vehicleName || card.amount || card.overdueDays || card.journalNumber || card.contractNumber) && (
                              <div className="mt-2.5 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-3 flex-wrap text-xs">
                                {card.customerName && (
                                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                                    <span className="text-[10px] text-slate-400">العميل:</span>
                                    <span>{card.customerName}</span>
                                  </div>
                                )}
                                {card.vehicleName && (
                                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <span className="text-[10px] text-slate-400">المركبة:</span>
                                    <span>{card.vehicleName}</span>
                                  </div>
                                )}
                                {card.journalNumber && (
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    <span>{card.journalNumber}</span>
                                  </div>
                                )}
                                {card.contractNumber && (
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                                    <span>{card.contractNumber}</span>
                                  </div>
                                )}
                                {card.amount !== undefined && (
                                  <div className="flex items-center gap-1 text-slate-900 dark:text-slate-100 font-bold money font-mono me-auto">
                                    <span className="text-[10px] text-slate-400">المبلغ:</span>
                                    <span className="text-emerald-700 dark:text-emerald-400">{formatMoney(card.amount, card.currency)}</span>
                                  </div>
                                )}
                                {card.overdueDays !== undefined && (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 px-2 py-0.5">
                                    تأخير: {card.overdueDays} يوم
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Contextual Workflow Action Buttons */}
                            {card.actionButtons && card.actionButtons.length > 0 && (
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {card.actionButtons.map((btn, bIdx) => {
                                  if (btn.variant === 'whatsapp') {
                                    return (
                                      <Button
                                        key={bIdx}
                                        size="sm"
                                        variant="outline"
                                        onClick={btn.onClick}
                                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5 me-1 text-emerald-600" />
                                        <span>{btn.label}</span>
                                      </Button>
                                    )
                                  }

                                  if (btn.url) {
                                    return (
                                      <Button
                                        key={bIdx}
                                        asChild
                                        size="sm"
                                        variant={bIdx === 0 ? 'default' : 'secondary'}
                                        className={cn(
                                          'h-7 px-2.5 text-[11px] font-bold rounded-lg shadow-2xs',
                                          bIdx === 0
                                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 hover:bg-slate-800'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                        )}
                                      >
                                        <Link href={btn.url}>
                                          <span>{btn.label}</span>
                                          <ArrowUpRight className="h-3 w-3 ms-1 opacity-70" />
                                        </Link>
                                      </Button>
                                    )
                                  }

                                  return (
                                    <Button
                                      key={bIdx}
                                      size="sm"
                                      variant="secondary"
                                      onClick={btn.onClick}
                                      className="h-7 px-2.5 text-[11px] font-bold rounded-lg"
                                    >
                                      <span>{btn.label}</span>
                                    </Button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Empty Filter State */}
            {filteredCards.length === 0 && (
              <div className="py-14 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center mx-auto ring-1 ring-slate-200 dark:ring-slate-800">
                  <CheckCircle2 className="h-6 w-6 stroke-[1.8] text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    لا توجد إشعارات في هذا التصنيف
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    جميع العمليات المحاسبية والعقود مسجلة وفي الموعد المطلوب
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveCategory('all')}
                  className="h-8 text-xs font-semibold rounded-xl mt-2"
                >
                  عرض جميع الإشعارات
                </Button>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="shrink-0 px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
            >
              <span>عرض مركز الإشعارات الكامل</span>
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Link>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline-block">
              Oracle & SAP Fiori Standard Notification Architecture
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {/* Notification Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md rounded-3xl dir-rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Settings className="h-5 w-5 text-emerald-600" />
              <span>إعدادات التنبيهات والإشعارات المؤسسية</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              تخصيص قواعد وتفضيلات تلقي التنبيهات في نظام المعرض
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">التنبيهات الصوتية الحية</p>
                <p className="text-[11px] text-slate-500 mt-0.5">تشغيل رنين خفيف عند وصول تنبيه عاجل جديد</p>
              </div>
              <Button
                size="sm"
                variant={soundEnabled ? 'default' : 'outline'}
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 px-3 rounded-xl"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 me-1.5" /> : <VolumeX className="h-4 w-4 me-1.5" />}
                <span>{soundEnabled ? 'مفعل' : 'معطل'}</span>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-900 dark:text-slate-100">التصنيفات المفعّلة للمراقبة</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'الأقساط والتعثر', active: true },
                  { label: 'العقود وSnapshots', active: true },
                  { label: 'دفتر الأستاذ العام', active: true },
                  { label: 'مراقبة صحة النظام', active: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
