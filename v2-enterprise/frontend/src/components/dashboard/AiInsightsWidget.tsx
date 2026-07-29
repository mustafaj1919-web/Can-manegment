'use client'

import { useState } from 'react'
import { Sparkles, ArrowLeft, Lightbulb, Zap, Send, ShieldAlert, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { DashboardWidget } from './DashboardWidget'
import { Button } from '@/components/ui/button'

interface InsightItem {
  id: string
  text: string
  type: 'alert' | 'tip' | 'success'
}

export function AiInsightsWidget() {
  const [query, setQuery] = useState('')
  const [insights] = useState<InsightItem[]>([
    {
      id: '1',
      text: 'إقبال متزايد على سيارات الدفع الرباعي (SUV) هذا الأسبوع. يُنصح بزيادة المخزون منها.',
      type: 'tip',
    },
    {
      id: '2',
      text: 'تنبيه ذكي: خطة التقسيط للعميل "محمد علي" قد تتأخر. يرجى المتابعة الاستباقية.',
      type: 'alert',
    },
    {
      id: '3',
      text: 'تحليلات الأرباح: تحسن هامش الربح الإجمالي بنسبة 4.2% مقارنة بالشهر الماضي.',
      type: 'success',
    },
    {
      id: '4',
      text: 'المخزون الراكد: سيارة مرسيدس C200 معروضة منذ 45 يوماً. يُقترح تقديم عرض خصم.',
      type: 'tip',
    },
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    // Trigger global CustomEvents to open chat panel and pre-fill the query
    window.dispatchEvent(new CustomEvent('open-ai-chat'))
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trigger-ai-chat', { detail: { query } }))
    }, 200)

    setQuery('')
  }

  const handleInsightClick = (text: string) => {
    window.dispatchEvent(new CustomEvent('open-ai-chat'))
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trigger-ai-chat', { detail: { query: `بخصوص التنبيه: ${text}` } }))
    }, 200)
  }

  const aiStatus = (
    <div className="flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-500">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
      الأصدقاء AI نشط
    </div>
  )

  return (
    <DashboardWidget
      title="رؤى وتنبؤات الذكاء الاصطناعي"
      subtitle="توقعات حية وتحليل ذكي للبيانات"
      icon={Sparkles}
      iconColor="text-violet-500"
      action={aiStatus}
    >
      <div className="flex flex-col h-full justify-between gap-4">
        {/* Insights list */}
        <div className="space-y-2.5">
          {insights.map((insight, idx) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleInsightClick(insight.text)}
              className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-slate-50/50 dark:bg-slate-900/20 hover:border-violet-500/30 hover:bg-violet-50/10 transition-all cursor-pointer group"
            >
              <div className="mt-0.5">
                {insight.type === 'alert' && <ShieldAlert className="h-4 w-4 text-rose-500" />}
                {insight.type === 'tip' && <Lightbulb className="h-4 w-4 text-amber-500" />}
                {insight.type === 'success' && <Zap className="h-4 w-4 text-emerald-500" />}
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {insight.text}
              </p>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all mt-0.5" />
            </motion.div>
          ))}
        </div>

        {/* Natural Language Search Input */}
        <form onSubmit={handleSubmit} className="relative mt-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسأل المساعد الذكي عن أي بيانات أو تقارير..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors placeholder:text-muted-foreground/60 text-right"
            dir="rtl"
          />
          <button
            type="submit"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-violet-500 hover:bg-violet-50/15 transition-all"
          >
            <Send className="h-3.5 w-3.5 rotate-180" />
          </button>
        </form>
      </div>
    </DashboardWidget>
  )
}
