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
  { href: '/inventory/new', label: 'سيارة جديدة', icon: Car, color: 'text-violet-400', bg: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 glow-violet' },
  { href: '/sales/new', label: 'فاتورة بيع', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 glow-amber' },
  { href: '/customers/new', label: 'عميل جديد', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 glow-cyan' },
  { href: '/purchases/new', label: 'فاتورة شراء', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 glow-blue' },
  { href: '/installments', label: 'الأقساط', icon: CalendarDays, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 glow-emerald' },
]

export function QuickActionsWidget() {
  return (
    <div className="glass rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 backdrop-blur-sm bg-background/5">
        <p className="text-sm font-semibold text-foreground">إجراءات سريعة</p>
        <p className="text-xs text-muted-foreground mt-0.5">وصول مباشر للعمليات الرئيسية</p>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {ACTIONS.map(({ href, label, icon: Icon, color, bg }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 25,
              delay: i * 0.03 
            }}
            className="h-full"
          >
            <Link
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2.5 rounded-xl p-4 border transition-all duration-200 group overflow-hidden h-full backdrop-blur-md',
                bg
              )}
            >
              {/* Animated hover gradient glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white/5 to-transparent" />
              
              <Icon className={cn('h-6.5 w-6.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', color)} />
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
