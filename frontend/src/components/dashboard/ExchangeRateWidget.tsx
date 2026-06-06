'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, RefreshCw, ArrowLeftRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatNumber, formatRelativeDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getExchangeRate } from '@/lib/api/exchange-rate'
import { DashboardWidget } from './DashboardWidget'

export function ExchangeRateWidget() {
  const [amount, setAmount]       = useState('')
  const [dir, setDir]             = useState<'usd-to-iqd'|'iqd-to-usd'>('usd-to-iqd')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['exchange-rate'], queryFn: getExchangeRate, staleTime: 5*60_000, retry: 0,
  })

  const rate      = data?.rate ?? 0
  const numAmt    = parseFloat(amount) || 0
  const converted = dir === 'usd-to-iqd' ? numAmt * rate : rate > 0 ? numAmt / rate : 0

  const refreshBtn = (
    <button onClick={() => refetch()} className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      style={{ background:'var(--s3)', border:'1px solid var(--border-inner)' }}>
      <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
    </button>
  )

  return (
    <DashboardWidget title="سعر الصرف" subtitle="دولار / دينار عراقي" icon={TrendingUp} iconColor="text-amber-400" action={refreshBtn}>
      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : rate > 0 ? (
        <div className="space-y-3">
          {/* Rate display */}
          <motion.div initial={{ opacity:0, scale:.97 }} animate={{ opacity:1, scale:1 }}
            className="rounded-lg p-3 text-center" style={{ background:'var(--s2)', border:'1px solid rgba(212,164,76,0.18)' }}>
            <p className="text-[10px] text-amber-400/50 uppercase tracking-wider mb-1">1 دولار أمريكي =</p>
            <p className="text-2xl font-black money text-amber-400">
              {formatNumber(rate)}<span className="text-sm font-medium text-amber-400/50 ms-1.5">د.ع</span>
            </p>
            {data?.updated_at && (
              <p className="text-[10px] text-muted-foreground/35 mt-1">
                {formatRelativeDate(data.updated_at)}{data.source === 'manual' ? ' · يدوي' : ''}
              </p>
            )}
          </motion.div>

          {/* Converter */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">محوّل سريع</p>
            <div className="flex items-center gap-1.5">
              <Input type="number" placeholder="المبلغ" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-8 text-xs flex-1" style={{ background:'var(--s2)', border:'1px solid var(--border-inner)' }} />
              <button onClick={() => setDir(d => d==='usd-to-iqd'?'iqd-to-usd':'usd-to-iqd')}
                className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                style={{ background:'var(--s2)', border:'1px solid var(--border-inner)' }}>
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40 px-0.5">
              <span>{dir==='usd-to-iqd'?'دولار':'دينار'}</span>
              <span>→</span>
              <span>{dir==='usd-to-iqd'?'دينار':'دولار'}</span>
            </div>
            {numAmt > 0 && (
              <motion.div initial={{ opacity:0, y:3 }} animate={{ opacity:1, y:0 }}
                className="rounded-lg py-2 px-3 text-center" style={{ background:'var(--s2)', border:'1px solid var(--border-inner)' }}>
                <span className="text-base font-bold money text-cyan-400">{formatNumber(Math.round(converted))}</span>
                <span className="text-xs text-cyan-400/50 ms-1.5">{dir==='usd-to-iqd'?'د.ع':'$'}</span>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-lg" style={{ background:'var(--s2)', border:'1px dashed var(--border-card)' }}>
          <p className="text-xs font-medium text-muted-foreground/60">سعر الصرف غير محدد</p>
          <a href="/exchange-rate" className="text-[11px] text-amber-400 hover:underline">تحديث السعر ←</a>
        </div>
      )}
    </DashboardWidget>
  )
}
