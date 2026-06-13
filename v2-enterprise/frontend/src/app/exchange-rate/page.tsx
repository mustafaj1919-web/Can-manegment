'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, RefreshCw, Pencil, Globe, Clock,
  CheckCircle2, AlertCircle, Loader2, History,
} from 'lucide-react'
import { cn, formatNumber, formatRelativeDate } from '@/lib/utils'
import {
  getExchangeRate, getExchangeRateHistory, setExchangeRate,
} from '@/lib/api/exchange-rate'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ExchangeRatePage() {
  const qc = useQueryClient()
  const [manualRate, setManualRate] = useState('')
  const [mode, setMode] = useState<'manual' | 'online'>('manual')

  /* ── Current rate ── */
  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ['exchange-rate-current'],
    queryFn: getExchangeRate,
    staleTime: 60_000,
  })

  /* ── History ── */
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['exchange-rate-history'],
    queryFn: getExchangeRateHistory,
    staleTime: 60_000,
  })

  /* ── Mutation ── */
  const mutation = useMutation({
    mutationFn: () =>
      mode === 'online'
        ? setExchangeRate({ action: 'online' })
        : setExchangeRate({ action: 'manual', rate: parseFloat(manualRate) }),
    onSuccess: (res) => {
      toast.success(`تم تحديث سعر الصرف: 1 USD = ${formatNumber(res.rate)} IQD`)
      qc.invalidateQueries({ queryKey: ['exchange-rate-current'] })
      qc.invalidateQueries({ queryKey: ['exchange-rate-history'] })
      qc.invalidateQueries({ queryKey: ['exchange-rate'] })
      setManualRate('')
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { error?: string } } }
      toast.error(axErr?.response?.data?.error ?? 'تعذّر تحديث سعر الصرف')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'manual' && (!manualRate || parseFloat(manualRate) <= 0)) {
      toast.error('أدخل سعر صرف صحيح أكبر من صفر')
      return
    }
    mutation.mutate()
  }

  const rate = current?.rate ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <TrendingUp className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">سعر الصرف</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" />يتحدث يومياً
            </span>
          </div>
          <p className="text-xs text-muted-foreground">دولار أمريكي / دينار عراقي</p>
        </div>
      </div>

      {/* Current Rate Card */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-5">
          {currentLoading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : rate > 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <p className="text-[11px] text-amber-400/70 uppercase tracking-widest mb-2">
                السعر الحالي
              </p>
              <p className="text-5xl font-black money text-amber-400 leading-none">
                {formatNumber(rate)}
              </p>
              <p className="text-base text-amber-400/70 mt-1">دينار عراقي / دولار</p>
              {current?.updated_at && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground/60">
                  <Clock className="h-3 w-3" />
                  <span>آخر تحديث: {formatRelativeDate(current.updated_at)}</span>
                  {current.source === 'online' && (
                    <span className="flex items-center gap-0.5 text-emerald-400/60">
                      <Globe className="h-3 w-3" />إلكتروني
                    </span>
                  )}
                  {current.updated_by && (
                    <span>بواسطة {current.updated_by}</span>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-400/40 mb-2" />
              <p className="text-sm text-muted-foreground">لم يتم تحديد سعر الصرف بعد</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                أدخل السعر الحالي أدناه لتفعيل التحويل التلقائي في جميع أنحاء النظام
              </p>
            </div>
          )}
        </div>

        {/* Quick converter (only shown when rate exists) */}
        {rate > 0 && (
          <div className="border-t border-border/50 px-6 py-4">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-3">محوّل سريع</p>
            <div className="grid grid-cols-2 gap-3">
              {[100, 500, 1000, 5000].map(usd => (
                <div key={usd} className="flex items-center justify-between rounded-lg bg-secondary/20 border border-border/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">${usd}</span>
                  <span className="text-xs font-semibold money text-amber-400">
                    {formatNumber(Math.round(usd * rate))} د.ع
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Update form */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50">
          <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Pencil className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <p className="text-sm font-semibold">تحديث سعر الصرف</p>
        </div>

        <div className="p-5">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-secondary/20 p-1 mb-5 gap-1">
            {([
              { key: 'manual', label: 'إدخال يدوي', icon: Pencil },
              { key: 'online', label: 'تحديث إلكتروني', icon: Globe },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
                  mode === key
                    ? 'bg-secondary/40 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === 'manual' ? (
              <motion.form
                key="manual"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    سعر الصرف (دينار عراقي لكل دولار أمريكي)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="مثال: 1510"
                    value={manualRate}
                    onChange={e => setManualRate(e.target.value)}
                    className="bg-secondary/30 border-border/50 money text-lg h-12 text-center"
                  />
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5 text-center">
                    1 USD = <span className="text-amber-400 money">{manualRate ? formatNumber(parseFloat(manualRate)) : '...'}</span> IQD
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !manualRate}
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-500 text-white h-10"
                >
                  {mutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</>
                    : <><CheckCircle2 className="h-4 w-4" />حفظ السعر</>
                  }
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="online"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-4 py-3 text-center">
                  <Globe className="h-5 w-5 mx-auto text-emerald-400 mb-1.5" />
                  <p className="text-xs text-emerald-400">
                    سيتم جلب السعر تلقائياً من open.er-api.com
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    يتطلب اتصالاً بالإنترنت
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-10"
                >
                  {mutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الجلب...</>
                    : <><RefreshCw className="h-4 w-4" />جلب السعر الآن</>
                  }
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/50">
          <div className="h-7 w-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">سجل التحديثات</p>
        </div>

        {historyLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد سجل تحديثات</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {history.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  {r.source === 'online'
                    ? <Globe className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
                    : <Pencil className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-bold money text-foreground">
                      {formatNumber(r.rate)} <span className="text-xs font-normal text-muted-foreground">د.ع/USD</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {r.updated_by === 'نظام'
                        ? <span className="text-emerald-400/70">تحديث تلقائي · </span>
                        : r.updated_by ? `${r.updated_by} · ` : ''
                      }
                      {formatRelativeDate(r.updated_at)}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  i === 0 ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground/50'
                )}>
                  {i === 0 ? 'الحالي' : 'سابق'}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
