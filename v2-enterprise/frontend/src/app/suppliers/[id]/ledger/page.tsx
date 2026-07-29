'use client'

import { Fragment, useRef, useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Printer, RefreshCw, BookOpen, Banknote, X } from 'lucide-react'
import { cn, formatMoney, formatDate } from '@/lib/utils'
import { exportXlsx } from '@/lib/export'
import { getSupplierLedger, paySupplier } from '@/lib/api/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Reusable ledger components
import { SupplierLedgerHero } from '@/components/accounting/ledger/SupplierLedgerHero'
import { CurrencyBalanceSummary } from '@/components/accounting/ledger/CurrencyBalanceSummary'
import { CurrencyBalanceGroup } from '@/components/accounting/ledger/CurrencyBalanceGroup'
import { LedgerKpiStrip } from '@/components/accounting/ledger/LedgerKpiStrip'
import { RunningBalanceChart } from '@/components/accounting/ledger/RunningBalanceChart'
import { LedgerViewSwitcher } from '@/components/accounting/ledger/LedgerViewSwitcher'
import { LedgerTimeline } from '@/components/accounting/ledger/LedgerTimeline'
import { LedgerTable } from '@/components/accounting/ledger/LedgerTable'
import { SupplierRelationshipSummary } from '@/components/accounting/ledger/SupplierRelationshipSummary'
import { SupplierSystemInsights } from '@/components/accounting/ledger/SupplierSystemInsights'
import { LedgerQuickReports } from '@/components/accounting/ledger/LedgerQuickReports'
import { LedgerToolbar } from '@/components/accounting/ledger/LedgerToolbar'
import { LedgerEmptyState } from '@/components/accounting/ledger/LedgerEmptyState'
import { LedgerErrorState } from '@/components/accounting/ledger/LedgerErrorState'

function toDateInput(d: Date) { return d.toISOString().slice(0, 10) }

function SummaryCard({ label, value, currency, icon, colorClass, borderClass }: {
  label: string; value: number; currency: 'USD' | 'IQD'; icon: React.ReactNode; colorClass: string; borderClass: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex items-start gap-3', borderClass)}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', borderClass)}>
        <span className={colorClass}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        <p className={cn('mt-1 font-numeric text-base font-black tabular-nums truncate', colorClass)}>
          {formatMoney(value, currency)}
        </p>
      </div>
    </div>
  )
}

function PayDialog({ supplierId, supplierName, balancesByCurrency, onClose, onSuccess }: {
  supplierId: string; supplierName: string
  balancesByCurrency: { currency: 'USD' | 'IQD'; balance: number }[]
  onClose: () => void; onSuccess: () => void
}) {
  // نبدأ بأول عملة فيها مبلغ مستحق فعلاً، وإلا أول عملة بالقائمة
  const initialCurrency = balancesByCurrency.find(c => c.balance > 0)?.currency ?? balancesByCurrency[0]?.currency ?? 'IQD'
  const [currency, setCurrency] = useState<'USD' | 'IQD'>(initialCurrency)
  const [amount, setAmount]   = useState('')
  // لا يوجد صندوق نقدي بالدولار — الدفع بالدولار يكون حوالة بنكية فقط
  const [method, setMethod]   = useState(initialCurrency === 'USD' ? 'Bank' : 'Cash')
  const [notes,  setNotes]    = useState('')
  const [loading, setLoading] = useState(false)

  const balance = balancesByCurrency.find(c => c.currency === currency)?.balance ?? 0

  function handleCurrencyChange(next: 'USD' | 'IQD') {
    setCurrency(next)
    if (next === 'USD') setMethod('Bank')
  }

  async function handlePay() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    setLoading(true)
    try {
      await paySupplier(supplierId, { amount: amt, currency, paymentMethod: method, notes })
      toast.success(`تم سداد ${formatMoney(amt, currency)} للمورد ${supplierName}`)
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? 'فشل السداد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute left-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary/50">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <Banknote className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">سداد للمورد</h2>
            <p className="text-xs text-muted-foreground/70">{supplierName}</p>
          </div>
        </div>

        {balance > 0 && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground/70">المستحق حالياً بالـ {currency}</p>
            <p className="font-numeric text-lg font-black text-amber-400">{formatMoney(balance, currency)}</p>
          </div>
        )}

        <div className="space-y-4">
          {balancesByCurrency.length > 1 && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">العملة *</Label>
              <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as 'USD' | 'IQD')}>
                <SelectTrigger className="bg-secondary/30 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {balancesByCurrency.map(c => (
                    <SelectItem key={c.currency} value={c.currency}>{c.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">المبلغ المدفوع ({currency}) *</Label>
            <Input
              type="number" min="1" step="any" autoFocus
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePay()}
              placeholder="أدخل المبلغ"
              className="font-numeric bg-secondary/30 border-border/60 text-lg"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-secondary/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currency === 'IQD' && <SelectItem value="Cash">نقداً</SelectItem>}
                <SelectItem value="Bank">حوالة بنكية{currency === 'USD' ? ' (حساب الدولار)' : ''}</SelectItem>
                {currency === 'IQD' && <SelectItem value="Cheque">شيك</SelectItem>}
              </SelectContent>
            </Select>
            {currency === 'USD' && (
              <p className="mt-1.5 text-[11px] text-muted-foreground/60">لا يوجد صندوق نقدي بالدولار — الدفع بالدولار حوالة بنكية فقط.</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات (اختياري)</Label>
            <Input
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="رقم الإيصال، ملاحظة..."
              className="bg-secondary/30 border-border/60"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={handlePay} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              {loading ? 'جاري السداد...' : 'تأكيد السداد'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SupplierLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const printRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [startDate, setStartDate] = useState(toDateInput(firstOfMonth))
  const [endDate,   setEndDate]   = useState(toDateInput(now))
  const [showPay,   setShowPay]   = useState(false)

  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'IQD'>('USD')
  const [activeView, setActiveView] = useState<'timeline' | 'table'>('timeline')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['supplier-ledger', id, startDate, endDate],
    queryFn: () => getSupplierLedger(id, startDate, endDate),
    staleTime: 30_000,
    enabled: !!id,
  })

  const currency = ((data?.summary as any)?.currency || 'USD') as 'USD' | 'IQD'
  const byCurrency = ((data?.summary as any)?.by_currency as
    { currency: 'USD' | 'IQD'; total_debit: number; total_credit: number; balance: number; unpaid_purchases: number }[]
    | undefined) ?? [{ currency, total_debit: data?.summary?.total_debit ?? 0, total_credit: data?.summary?.total_credit ?? 0, balance: data?.summary?.balance ?? 0, unpaid_purchases: data?.summary?.unpaid_purchases ?? 0 }]

  useEffect(() => {
    if (currency) {
      setActiveCurrency(currency)
    }
  }, [currency])

  const filteredEntries = useMemo(() => {
    const list = data?.entries ?? []
    return list.filter((e: any) => {
      const matchCurrency = e.currency === activeCurrency
      const q = searchQuery.toLowerCase().trim()
      const matchQuery = !q || 
        (e.entry_number ?? '').toLowerCase().includes(q) || 
        (e.description ?? '').toLowerCase().includes(q)
      return matchCurrency && matchQuery
    })
  }, [data?.entries, activeCurrency, searchQuery])

  const activeSummary = useMemo(() => {
    return byCurrency.find(c => c.currency === activeCurrency) ?? {
      currency: activeCurrency,
      total_debit: 0,
      total_credit: 0,
      balance: 0,
      unpaid_purchases: 0
    }
  }, [byCurrency, activeCurrency])

  const lastPurchaseDate = useMemo(() => {
    const purchases = filteredEntries.filter(e => e.credit > 0 && e.reference_type === 'Purchase')
    return purchases.length > 0 ? purchases[purchases.length - 1].date : undefined
  }, [filteredEntries])

  const lastPaymentDate = useMemo(() => {
    const payments = filteredEntries.filter(e => e.debit > 0 && e.reference_type === 'Payment')
    return payments.length > 0 ? payments[payments.length - 1].date : undefined
  }, [filteredEntries])

  function handlePrint() { window.print() }

  async function handleExportXlsx() {
    if (!data?.entries?.length) return
    const headers = ['التاريخ', 'رقم القيد', 'البيان', 'العملة', 'مدين', 'دائن', 'الرصيد المتراكم']
    const rows = data.entries.map((e: any) => [
      formatDate(e.date), e.entry_number, e.description, e.currency,
      e.debit > 0 ? e.debit : '',
      e.credit > 0 ? e.credit : '',
      e.running_balance
    ])
    await exportXlsx(`كشف-${data.supplier?.name}-${startDate}`, headers, rows)
  }

  const currenciesList = useMemo(() => {
    return byCurrency.map(c => c.currency)
  }, [byCurrency])

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; inset: 0; background: white; padding: 24px; color: black; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
          th { background: #f3f4f6; font-weight: 700; }
          .print-header { text-align: center; margin-bottom: 16px; }
          .print-summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
          .print-summary-card { border: 1px solid #ccc; border-radius: 8px; padding: 8px 12px; min-width: 140px; }
        }
      `}</style>

      {showPay && (
        <PayDialog
          supplierId={id}
          supplierName={data?.supplier?.name ?? ''}
          balancesByCurrency={byCurrency.map(c => ({ currency: c.currency, balance: c.balance }))}
          onClose={() => setShowPay(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger', id] })
            refetch()
          }}
        />
      )}

      <div className="space-y-8 max-w-[1540px] mx-auto px-4 md:px-6 py-6 bg-[#F8FAFC] min-h-screen" dir="rtl">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 no-print">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-slate-500 hover:text-slate-900 rounded-xl">
            <ArrowRight className="h-4 w-4" />
            <span>العودة للموردين</span>
          </Button>
        </div>

        {isError ? (
          <LedgerErrorState onRetry={refetch} />
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-[22px] w-full" />
            <Skeleton className="h-10 rounded-xl w-48" />
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-[22px]" />)}
            </div>
            <Skeleton className="h-[200px] rounded-[22px] w-full" />
          </div>
        ) : (
          <>
            {/* 1. Supplier Financial Hero */}
            <SupplierLedgerHero
              supplierName={data?.supplier?.name ?? ''}
              supplierPhone={data?.supplier?.phone ?? ''}
              accountCode={data?.supplier?.account_id ?? ''}
              startDate={startDate}
              endDate={endDate}
              balances={byCurrency.map(c => ({ currency: c.currency, balance: c.balance }))}
              onPayClick={() => setShowPay(true)}
            />

            {/* 2. Filter and Action Toolbar */}
            <LedgerToolbar
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isFetching={isFetching}
              refetch={refetch}
              onExport={handleExportXlsx}
              onPrint={handlePrint}
              onPayClick={() => setShowPay(true)}
              hasEntries={filteredEntries.length > 0}
            />

            {/* 3. Currency Balance Summary */}
            <CurrencyBalanceSummary
              byCurrency={byCurrency}
              movementCountByCurrency={(() => {
                const list = data?.entries ?? []
                return {
                  USD: list.filter((e: any) => e.currency === 'USD').length,
                  IQD: list.filter((e: any) => e.currency === 'IQD').length,
                }
              })()}
            />

            {/* 4. Compact Financial KPI Strip */}
            <div className="no-print">
              <LedgerKpiStrip
                currency={activeCurrency}
                totalCredit={activeSummary.total_credit}
                totalDebit={activeSummary.total_debit}
                balance={activeSummary.balance}
                movementCount={filteredEntries.length}
                lastPurchaseDate={lastPurchaseDate}
                lastPaymentDate={lastPaymentDate}
              />
            </div>

            {/* Switcher & Currencies tabs row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 no-print">
              <CurrencyBalanceGroup
                currencies={currenciesList}
                active={activeCurrency}
                onChange={setActiveCurrency}
              />
              <LedgerViewSwitcher
                activeView={activeView}
                onChange={setActiveView}
              />
            </div>

            {/* Main content grid: 8 cols left, 4 cols right, gap 8 (32px) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column (Ledger details & chart) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 5. Running Balance Analytics */}
                <div className="no-print">
                  <RunningBalanceChart
                    entries={data?.entries ?? []}
                    currency={activeCurrency}
                  />
                </div>

                {/* 6. Timeline / Ledger View Switcher Target */}
                <div>
                  {filteredEntries.length === 0 ? (
                    <LedgerEmptyState />
                  ) : activeView === 'timeline' ? (
                    <div className="no-print">
                      <LedgerTimeline
                        entries={data?.entries ?? []}
                        currency={activeCurrency}
                      />
                    </div>
                  ) : (
                    <div className="no-print">
                      <LedgerTable
                        entries={data?.entries ?? []}
                        currency={activeCurrency}
                        totalDebit={activeSummary.total_debit}
                        totalCredit={activeSummary.total_credit}
                        balance={activeSummary.balance}
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (Sticky Financial Insights Panel) */}
              <div className="lg:col-span-4 no-print space-y-4 lg:sticky lg:top-24">
                
                {/* 8. Relationship Summary */}
                <SupplierRelationshipSummary
                  isActive={(data?.supplier as any)?.is_active ?? true}
                  branchName="الفرع الرئيسي"
                  accountCode={data?.supplier?.account_id ?? ''}
                  currencies={currenciesList}
                  movementCount={filteredEntries.length}
                  lastMovementDate={filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].date : undefined}
                />

                {/* 8. System Insights & 9. Suggested Review */}
                <SupplierSystemInsights
                  currency={activeCurrency}
                  balance={activeSummary.balance}
                  entries={data?.entries ?? []}
                />

                {/* 10. Quick Reports */}
                <LedgerQuickReports
                  onExport={handleExportXlsx}
                  onPrint={handlePrint}
                  hasEntries={filteredEntries.length > 0}
                />

              </div>

            </div>
          </>
        )}

        {/* Traditional A4 Printable area */}
        <div id="print-area">
          <div className="hidden print-header">
            <h2 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
              كشف حساب المورد: {data?.supplier?.name}
            </h2>
            <p style={{ fontSize: 11, color: '#666' }}>الفترة: {startDate} — {endDate}</p>
            <div className="print-summary">
              {byCurrency.map(c => (
                <Fragment key={c.currency}>
                  <div className="print-summary-card"><b>المشتريات ({c.currency}):</b> {formatMoney(c.total_credit, c.currency)}</div>
                  <div className="print-summary-card"><b>المدفوع ({c.currency}):</b> {formatMoney(c.total_debit, c.currency)}</div>
                  <div className="print-summary-card"><b>الرصيد ({c.currency}):</b> {formatMoney(c.balance, c.currency)}</div>
                </Fragment>
              ))}
            </div>
          </div>

          {data?.entries && (
            <div className="hidden print:block mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'right' }}>التاريخ</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>رقم الحركة</th>
                    <th style={{ textAlign: 'right' }}>البيان</th>
                    <th style={{ width: '100px', textAlign: 'left' }}>العملة</th>
                    <th style={{ width: '120px', textAlign: 'left' }}>مدين (سداد)</th>
                    <th style={{ width: '120px', textAlign: 'left' }}>دائن (شراء)</th>
                    <th style={{ width: '120px', textAlign: 'left' }}>الرصيد المتراكم</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry: any, i: number) => (
                    <tr key={i}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.entry_number}</td>
                      <td>{entry.description}</td>
                      <td>{entry.currency}</td>
                      <td style={{ textAlign: 'left' }}>{entry.debit > 0 ? formatMoney(entry.debit, entry.currency) : '—'}</td>
                      <td style={{ textAlign: 'left' }}>{entry.credit > 0 ? formatMoney(entry.credit, entry.currency) : '—'}</td>
                      <td style={{ textAlign: 'left' }}>{formatMoney(entry.running_balance, entry.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
