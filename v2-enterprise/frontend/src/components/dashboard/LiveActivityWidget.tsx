'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Car, UserPlus, Wallet, AlertCircle, Bookmark, Loader2 } from 'lucide-react'
import { DashboardWidget } from './DashboardWidget'
import { getNotifications } from '@/lib/api/dashboard'
import type { AuditLog } from '@/types'

interface ActivityItem {
  id: string
  type: 'sale' | 'customer' | 'payment' | 'reserve' | 'alert'
  title: string
  description: string
  time: string
}

export function LiveActivityWidget() {
  // Query actual system audit logs from Notifications endpoint
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications-activities'],
    queryFn: () => getNotifications(),
    refetchInterval: 15_000, // Refresh every 15 seconds to simulate live updates
  })

  const auditLogs = data?.audit_logs ?? []

  // Map real database AuditLogs to visual ActivityItems
  const activities: ActivityItem[] = auditLogs.map((log) => {
    let type: ActivityItem['type'] = 'alert'
    let title = 'عملية في النظام'
    let description = log.details || 'تم تعديل السجلات العامة'

    const entity = log.entity_type || ''
    const act = log.action || ''

    if (entity === 'SalesContracts') {
      type = 'sale'
      title = act === 'INSERT' ? 'تسجيل عقد بيع جديد' : 'تحديث عقد بيع'
    } else if (entity === 'Customers') {
      type = 'customer'
      title = act === 'INSERT' ? 'تسجيل عميل جديد' : 'تعديل بيانات عميل'
    } else if (entity === 'Payments') {
      type = 'payment'
      title = 'تحصيل قسط مالي'
    } else if (entity === 'Vehicles') {
      type = 'reserve'
      title = act === 'INSERT' ? 'إدخال سيارة للمخزن' : 'تعديل حالة سيارة'
    } else if (entity === 'VehicleCosts') {
      type = 'payment'
      title = 'تسجيل مصروف إضافي'
    } else if (entity === 'AI_Assistant') {
      type = 'alert'
      title = 'استعلام بمساعد المبيعات (AI)'
    }

    // Translate/Format details JSON if possible
    if (log.details) {
      description = log.details
        .replace('Old: ', 'القيم السابقة: ')
        .replace(' | New: ', ' -> القيم الجديدة: ')
        .replace('Old: null | New: ', 'إضافة قيم جديدة: ')
    }

    // Relative human-friendly timestamp
    const logDate = new Date(log.created_at)
    const diffMs = Date.now() - logDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    let timeStr = 'الآن'
    
    if (diffMins > 0) {
      if (diffMins < 60) {
        timeStr = `منذ ${diffMins} دقيقة`
      } else {
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) {
          timeStr = `منذ ${diffHours} ساعة`
        } else {
          timeStr = logDate.toLocaleDateString('ar-IQ')
        }
      }
    }

    return {
      id: log.id.toString(),
      type,
      title,
      description,
      time: timeStr
    }
  })

  const getActivityStyle = (type: ActivityItem['type']) => {
    switch (type) {
      case 'sale':
        return { icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50' }
      case 'customer':
        return { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' }
      case 'payment':
        return { icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' }
      case 'reserve':
        return { icon: Bookmark, color: 'text-sky-600', bg: 'bg-sky-50' }
      default:
        return { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-100' }
    }
  }

  const liveBadge = (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
      بث مباشر
    </div>
  )

  return (
    <DashboardWidget
      title="سجل العمليات المباشر"
      subtitle="متابعة فورية للحركة الجارية في المعرض"
      icon={Activity}
      iconColor="text-emerald-600"
      action={liveBadge}
      noPadding
    >
      <div className="flex flex-col h-full justify-between">
        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto" dir="rtl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <p className="text-xs text-slate-400 font-family-cairo">جاري جلب السجلات الفعالة...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
              <AlertCircle className="h-6 w-6 text-rose-500" />
              <p className="text-xs text-slate-500 font-family-cairo">عذراً، فشل تحميل سجل العمليات الفعلي.</p>
              <button
                onClick={() => refetch()}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : activities.length > 0 ? (
            <AnimatePresence initial={false}>
              {activities.map((act) => {
                const style = getActivityStyle(act.type)
                const Icon = style.icon
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4 p-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${style.bg} ${style.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {act.title}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap font-numeric">
                          {act.time}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-normal truncate" title={act.description}>
                        {act.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
              <AlertCircle className="h-8 w-8 text-slate-300 stroke-[1.2]" />
              <p className="text-xs text-slate-400 font-family-cairo">لا توجد عمليات مسجلة بالفرع حالياً.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardWidget>
  )
}
