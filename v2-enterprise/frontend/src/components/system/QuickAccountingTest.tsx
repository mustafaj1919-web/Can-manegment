'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  FlaskConical, Loader2, ShieldCheck, XCircle,
} from 'lucide-react'
import { post, extractApiError } from '@/lib/api/client'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Check {
  code:       string
  label:      string
  type:       string
  direction:  string
  expected:   number
  actual:     number
  passed:     boolean
  diff:       number
}

interface Scenario {
  purchase_price:   number
  supplier_paid:    number
  vehicle_cost:     number
  selling_price:    number
  cash_collected:   number
  ar_amount:        number
  installment_pay:  number
  expense_amount:   number
  expected_profit:  number
}

interface TestResult {
  passed:       boolean
  total_checks: number
  passed_count: number
  failed_count: number
  checks:       Check[]
  scenario:     Scenario
  note:         string
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function money(v: number) { return formatMoney(v, 'IQD') }
function usd(v: number)   { return `${v.toLocaleString('en-US')} USD` }

const TYPE_BADGE: Record<string, string> = {
  asset:     'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  liability: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  revenue:   'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  expense:   'border-orange-500/25 bg-orange-500/10 text-orange-300',
  derived:   'border-violet-500/25 bg-violet-500/10 text-violet-300',
  trial:     'border-sky-500/25 bg-sky-500/10 text-sky-300',
}

const TYPE_LABEL: Record<string, string> = {
  asset:     'أصل',
  liability: 'خصم',
  revenue:   'إيراد',
  expense:   'مصروف',
  derived:   'محسوب',
  trial:     'ميزان',
}

/* ─── Scenario Card ─────────────────────────────────────────────────────── */

function ScenarioCard({ s }: { s: Scenario }) {
  const steps = [
    { n: 1, label: 'شراء سيارة',              out: usd(s.purchase_price),  dir: 'شراء' },
    { n: 2, label: 'دفع للمورد',               out: usd(s.supplier_paid),   dir: 'صندوق خارج' },
    { n: 3, label: 'تكلفة شحن السيارة',        out: usd(s.vehicle_cost),    dir: 'صندوق خارج' },
    { n: 4, label: `بيع السيارة (نقد ${usd(s.cash_collected)} + ذمم ${usd(s.ar_amount)})`, out: usd(s.selling_price), dir: 'إيراد' },
    { n: 5, label: 'تحصيل قسط',               out: usd(s.installment_pay), dir: 'صندوق داخل' },
    { n: 6, label: 'مصروف عام',               out: usd(s.expense_amount),  dir: 'صندوق خارج' },
  ]
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/10 p-4">
      <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">السيناريو التجريبي</p>
      <div className="space-y-1.5">
        {steps.map(step => (
          <div key={step.n} className="flex items-center gap-2 text-xs">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary/30 text-[9px] font-bold text-muted-foreground/60">{step.n}</span>
            <span className="flex-1 text-foreground/80">{step.label}</span>
            <span className="font-numeric font-semibold text-foreground">{step.out}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2">
        <span className="text-xs text-muted-foreground">صافي الربح المتوقع</span>
        <span className="font-numeric text-sm font-black text-violet-300">{usd(s.expected_profit)}</span>
      </div>
    </div>
  )
}

/* ─── Check Row ─────────────────────────────────────────────────────────── */

function CheckRow({ check }: { check: Check }) {
  const badge = TYPE_BADGE[check.type] ?? 'border-border/50 bg-secondary/30 text-muted-foreground'
  const isTrialBalance = check.code === 'TRIAL_BALANCE'

  return (
    <tr className={`border-b border-border/20 transition-colors ${check.passed ? 'hover:bg-secondary/10' : 'bg-rose-500/[0.04] hover:bg-rose-500/[0.07]'}`}>
      {/* Status icon */}
      <td className="px-4 py-3 text-center">
        {check.passed
          ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" />
          : <XCircle     className="mx-auto h-4 w-4 text-rose-400 animate-pulse" />}
      </td>

      {/* Account code */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {check.code !== 'NET_PROFIT' && check.code !== 'TRIAL_BALANCE' && (
            <span className="font-numeric text-[10px] text-cyan-300/70">{check.code}</span>
          )}
          <span className="text-xs font-semibold text-foreground">{check.label}</span>
        </div>
      </td>

      {/* Type badge */}
      <td className="px-3 py-3">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge}`}>
          {TYPE_LABEL[check.type] ?? check.type}
        </span>
      </td>

      {/* Expected */}
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span className="font-numeric text-xs font-bold text-foreground">
            {isTrialBalance ? (check.expected === 0 ? 'متوازن (0)' : String(check.expected)) : usd(check.expected)}
          </span>
          {check.direction && (
            <span className="text-[9px] text-muted-foreground/50">{check.direction}</span>
          )}
        </div>
      </td>

      {/* Actual */}
      <td className="px-4 py-3 text-right">
        <span className={`font-numeric text-xs font-bold ${check.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
          {isTrialBalance
            ? (Math.abs(check.actual) < 0.01 ? 'متوازن (0)' : `فرق: ${usd(check.actual)}`)
            : usd(check.actual)}
        </span>
      </td>

      {/* Diff */}
      <td className="px-4 py-3 text-center">
        {check.passed
          ? <span className="text-[10px] text-emerald-400">✓</span>
          : <span className="font-numeric text-[11px] font-bold text-rose-400">
              {check.diff > 0 ? '+' : ''}{usd(check.diff)}
            </span>}
      </td>
    </tr>
  )
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export function QuickAccountingTest() {
  const [result, setResult]         = useState<TestResult | null>(null)
  const [showScenario, setShowScenario] = useState(false)
  const [showDetails, setShowDetails]   = useState(false)

  const mutation = useMutation({
    mutationFn: () => post<TestResult>('/accounting/quick-test', {}),
    onSuccess: (data) => {
      setResult(data)
      setShowDetails(!data.passed)  // افتح التفاصيل تلقائياً إذا كان هناك فشل
      if (data.passed) {
        toast.success('✅ الشجرة المحاسبية تعمل بشكل صحيح')
      } else {
        toast.error(`❌ ${data.failed_count} فحص فشل — راجع النتائج`)
      }
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const isRunning = mutation.isPending

  return (
    <section className="dash-card overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <FlaskConical className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">اختبار محاسبي سريع</h2>
            <p className="text-[11px] text-muted-foreground">يختبر الشجرة المحاسبية على بيانات تجريبية معزولة — لا تأثير على البيانات الحقيقية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScenario(v => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            السيناريو
            {showScenario ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <Button
            onClick={() => mutation.mutate()}
            disabled={isRunning}
            size="sm"
            className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4"
          >
            {isRunning
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الاختبار...</>
              : <><FlaskConical className="h-3.5 w-3.5" />تشغيل الاختبار</>}
          </Button>
        </div>
      </div>

      {/* Scenario (collapsible) */}
      <AnimatePresence>
        {showScenario && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/30 px-5 py-4"
          >
            {result?.scenario
              ? <ScenarioCard s={result.scenario} />
              : (
                <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 space-y-1.5">
                  {[
                    ['1', 'شراء سيارة', '10,000 USD'],
                    ['2', 'دفع للمورد', '4,000 USD'],
                    ['3', 'تكلفة شحن', '500 USD'],
                    ['4', 'بيع السيارة (نقد 5,000 + ذمم 8,000)', '13,000 USD'],
                    ['5', 'تحصيل قسط', '1,000 USD'],
                    ['6', 'مصروف عام', '200 USD'],
                  ].map(([n, lbl, val]) => (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary/30 text-[9px] font-bold text-muted-foreground/60">{n}</span>
                      <span className="flex-1 text-foreground/80">{lbl}</span>
                      <span className="font-numeric font-semibold text-foreground">{val}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2">
                    <span className="text-xs text-muted-foreground">صافي الربح المتوقع</span>
                    <span className="font-numeric text-sm font-black text-violet-300">2,300 USD</span>
                  </div>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isRunning && (
        <div className="flex items-center justify-center gap-3 px-5 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <div>
            <p className="text-sm font-medium text-foreground">جاري تشغيل الاختبار...</p>
            <p className="text-[11px] text-muted-foreground">ينشئ قيوداً تجريبية ويتحقق من الأرصدة ثم يُلغيها</p>
          </div>
        </div>
      )}

      {/* Result summary */}
      <AnimatePresence>
        {result && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 py-4 space-y-4"
          >
            {/* Overall result banner */}
            <div className={`flex items-center gap-4 rounded-xl border p-4 ${
              result.passed
                ? 'border-emerald-500/30 bg-emerald-500/[0.07]'
                : 'border-rose-500/30 bg-rose-500/[0.07]'
            }`}>
              {result.passed
                ? <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
                : <AlertTriangle className="h-8 w-8 text-rose-400 shrink-0 animate-pulse" />}
              <div className="flex-1">
                <p className={`text-base font-black ${result.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {result.passed
                    ? '✅ الشجرة المحاسبية تعمل بشكل صحيح'
                    : `❌ ${result.failed_count} من ${result.total_checks} فحص فشل`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {result.passed
                    ? `اجتاز ${result.passed_count}/${result.total_checks} فحصاً — القيود التلقائية تعمل بدقة`
                    : 'توجد حسابات فيها فرق — راجع التفاصيل أدناه'}
                </p>
              </div>
              <div className="flex gap-2 text-center shrink-0">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                  <p className="font-numeric text-lg font-black text-emerald-300">{result.passed_count}</p>
                  <p className="text-[9px] text-muted-foreground">ناجح</p>
                </div>
                {result.failed_count > 0 && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5">
                    <p className="font-numeric text-lg font-black text-rose-300">{result.failed_count}</p>
                    <p className="text-[9px] text-muted-foreground">فاشل</p>
                  </div>
                )}
              </div>
            </div>

            {/* Details toggle */}
            <button
              onClick={() => setShowDetails(v => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-secondary/10 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>تفاصيل الفحوصات ({result.total_checks} فحص)</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {/* Detailed results table */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-secondary/20 text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                          <th className="w-10 px-4 py-3 text-center">حالة</th>
                          <th className="px-4 py-3 text-right">الحساب</th>
                          <th className="px-3 py-3 text-right">النوع</th>
                          <th className="px-4 py-3 text-right">المتوقع</th>
                          <th className="px-4 py-3 text-right">الفعلي</th>
                          <th className="px-4 py-3 text-center">الفرق</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.checks.map((check) => (
                          <CheckRow key={check.code} check={check} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Note */}
                  <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                    <ShieldCheck className="h-3 w-3" />
                    {result.note}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !isRunning && (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <FlaskConical className="h-8 w-8 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">اضغط "تشغيل الاختبار" للتحقق من الشجرة المحاسبية</p>
          <p className="text-[11px] text-muted-foreground/50">يستغرق أقل من ثانية · لا يُعدّل أي بيانات حقيقية</p>
        </div>
      )}
    </section>
  )
}
