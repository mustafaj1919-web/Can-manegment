'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getNotifications } from '@/lib/api/dashboard'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Notification } from '@/types'

const POLL_INTERVAL = 5 * 60 * 1000 // 5 min
const SEEN_KEY = 'seen_installment_alerts'

function getSeenIds(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')) }
  catch { return new Set() }
}

function markSeen(ids: number[]) {
  try {
    const prev = getSeenIds()
    ids.forEach(id => prev.add(id))
    // Keep only last 500 to avoid bloat
    const arr = [...prev].slice(-500)
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr))
  } catch { /* quota */ }
}

export function useInstallmentAlerts() {
  const qc = useQueryClient()
  const shownRef = useRef<Set<number>>(new Set())
  const token = useAuthStore(state => state.token)

  const { data } = useQuery({
    queryKey: ['notifications-poll'],
    queryFn: getNotifications,
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL,
    retry: false,
    enabled: !!token,
  })

  useEffect(() => {
    if (!data) return

    const seen = getSeenIds()
    const toShow: Notification[] = []

    const due_today = data.due_today ?? []
    const overdue   = data.overdue   ?? []

    for (const n of [...due_today, ...overdue]) {
      if (!n.id || seen.has(n.id) || shownRef.current.has(n.id)) continue
      toShow.push(n)
    }

    if (toShow.length === 0) return

    const newIds = toShow.map(n => n.id!)
    markSeen(newIds)
    newIds.forEach(id => shownRef.current.add(id))

    // Group: overdue vs today
    const overdueItems  = toShow.filter(n => overdue.some(o => o.id === n.id))
    const todayItems    = toShow.filter(n => due_today.some(o => o.id === n.id))

    if (overdueItems.length > 0) {
      toast.error(`${overdueItems.length} قسط متأخر يحتاج متابعة فورية`, {
        description: overdueItems.slice(0, 2).map(n => `${n.customer_name ?? '—'} · ${n.car_name ?? ''}`).join('\n'),
        duration: 8000,
        action: { label: 'عرض الأقساط', onClick: () => { window.location.href = '/installments' } },
      })
    }

    if (todayItems.length > 0) {
      toast.warning(`${todayItems.length} قسط مستحق اليوم`, {
        description: todayItems.slice(0, 2).map(n => `${n.customer_name ?? '—'} · ${n.car_name ?? ''}`).join('\n'),
        duration: 6000,
        action: { label: 'تحصيل الأن', onClick: () => { window.location.href = '/cashier/installment-payment' } },
      })
    }

    // Refresh related queries after showing alerts
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [data, qc])
}
