'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Car, CreditCard, ExternalLink, Phone, TrendingUp, Wallet } from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { getCustomerById, getCustomerStatement } from '@/lib/api/customers'

function getHealthScore(salesCount: number, purchasesCount: number) {
  const total = (salesCount ?? 0) + (purchasesCount ?? 0)
  if (total === 0) return { score: 1, label: 'جديد',  color: 'text-muted-foreground' }
  if (total === 1) return { score: 2, label: 'مبتدئ', color: 'text-sky-400' }
  if (total === 2) return { score: 3, label: 'نشط',   color: 'text-blue-400' }
  if (total === 3) return { score: 4, label: 'موثوق', color: 'text-emerald-400' }
  return              { score: 5, label: 'ذهبي',  color: 'text-amber-400' }
}

interface CustomerQuickCardProps {
  customerId: number
  customerName: string
  className?: string
}

export function CustomerQuickCard({ customerId, customerName, className }: CustomerQuickCardProps) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabled = open

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId),
    enabled,
    staleTime: 60_000,
  })

  const { data: statement } = useQuery({
    queryKey: ['customer-statement', customerId],
    queryFn: () => getCustomerStatement(customerId),
    enabled: enabled && !!customer,
    staleTime: 60_000,
  })

  function onMouseEnter() {
    timerRef.current = setTimeout(() => setOpen(true), 350)
  }
  function onMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const health = getHealthScore(customer?.sales_count ?? 0, customer?.purchases_count ?? 0)
  const summary = statement?.summary

  return (
    <span className="relative inline-block" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Link
        href={`/customers/${customerId}`}
        className={cn('text-foreground/90 hover:text-primary font-medium transition-colors underline-offset-2 hover:underline', className)}
        onClick={e => e.stopPropagation()}
      >
        {customerName}
      </Link>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-full end-0 mb-2 z-50 w-[260px] rounded-xl border border-subtle bg-bg-elevated/95 backdrop-blur-md shadow-2xl p-4"
            dir="rtl"
          >
            {!customer ? (
              <div className="space-y-2">
                <div className="h-3 bg-secondary/60 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-secondary/60 rounded animate-pulse w-1/2" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-secondary/60 rounded-lg animate-pulse" />)}
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2">
                    {/* Avatar or photo */}
                    {customer.photo_url ? (
                      <img
                        src={customer.photo_url}
                        alt={customer.name}
                        className="h-10 w-10 rounded-full object-cover border border-border/40 shrink-0"
                      />
                    ) : (
                      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-base font-black shrink-0 border', health.color.replace('text-', 'bg-') + '/20', 'border-current/20', health.color)}>
                        {(customer.name ?? '?')[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-black text-foreground">{customer.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn('text-[10px] font-bold', health.color)}>{health.label}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i < health.score ? health.color.replace('text-', 'bg-') : 'bg-muted/40')} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href={`/customers/${customerId}`} className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <Phone className="h-3 w-3" />{customer.phone}
                  </a>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: TrendingUp,   label: 'إجمالي الشراء', value: formatMoney(summary?.total_sales_amount ?? 0, 'IQD'), color: 'text-emerald-400' },
                    { icon: Wallet,       label: 'المدفوع',        value: formatMoney(summary?.total_paid_amount  ?? 0, 'IQD'), color: 'text-sky-400' },
                    { icon: CreditCard,   label: 'المتبقي',        value: formatMoney(summary?.total_remaining   ?? 0, 'IQD'), color: 'text-amber-400' },
                    { icon: AlertTriangle,label: 'متأخرات',        value: formatMoney(summary?.total_overdue     ?? 0, 'IQD'), color: summary?.total_overdue ? 'text-rose-400' : 'text-muted-foreground' },
                  ].map((s, i) => {
                    const Icon = s.icon
                    return (
                      <div key={i} className="rounded-lg border border-border/30 bg-bg-surface p-2.5">
                        <div className={cn('flex items-center gap-1 mb-1', s.color)}><Icon className="h-3 w-3" /><span className="text-[9px] font-bold">{s.label}</span></div>
                        <p className="text-[11px] font-black tabular-nums text-foreground">{s.value}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Quick actions */}
                <div className="flex gap-1.5 mt-3">
                  <Link href={`/customers/${customerId}`} className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    الملف الكامل
                  </Link>
                  <Link href={`/sales/new?customer_id=${customerId}`} className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                    <Car className="h-3 w-3 inline ml-0.5" />بيع جديد
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
