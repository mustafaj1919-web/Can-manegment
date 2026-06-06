'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Car,
  TrendingUp,
  Users,
  ShoppingBag,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIONS = [
  { href: '/inventory/new', label: 'سيارة جديدة', icon: Car, color: 'text-violet-400', bg: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20' },
  { href: '/sales/new', label: 'فاتورة بيع', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20' },
  { href: '/customers/new', label: 'عميل جديد', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20' },
  { href: '/purchases/new', label: 'فاتورة شراء', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20' },
  { href: '/installments', label: 'الأقساط', icon: CalendarDays, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20' },
]

export function QuickActionsWidget() {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-foreground">إجراءات سريعة</p>
        <p className="text-xs text-muted-foreground mt-0.5">وصول مباشر للعمليات الرئيسية</p>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-4 gap-2">
        {ACTIONS.map(({ href, label, icon: Icon, color, bg }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={href}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl p-3 border transition-all duration-150 group',
                bg
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', color)} />
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
