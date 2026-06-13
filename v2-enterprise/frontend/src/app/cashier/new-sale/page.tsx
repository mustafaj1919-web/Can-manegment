'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Sparkles,
  TrendingDown,
  Search,
  Car,
  User,
  Info,
  Printer
} from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'
import { getAvailableCars, getBuyers, createSale } from '@/lib/api/sales'
import { extractApiError } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { QuickCustomerDialog } from '@/components/cashier/QuickCustomerDialog'
import { PrintReceiptModal } from '@/components/cashier/PrintReceiptModal'
import { StepIndicator } from '@/components/cashier/StepIndicator'

const PAYMENT_METHODS = [
  { value: 'Cash',          label: 'نقداً (صندوق)' },
  { value: 'Bank transfer', label: 'حوالة مصرفية (بنك)' },
  { value: 'Installment',   label: 'بيع بالأقساط' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-[11px] text-rose-400 mt-1">{msg}</p>
}

export default function CashierNewSale() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const isPrivileged = currentUser?.role === 'Owner' || currentUser?.role === 'Admin' || currentUser?.role === 'Accountant'

  /* ── Form state ── */
  const [carId,         setCarId]         = useState('')
  const [buyerId,       setBuyerId]       = useState('')
  const [sellingPrice,  setSellingPrice]  = useState('')
  const [discount,      setDiscount]      = useState('0')
  const [paidAmount,    setPaidAmount]    = useState('')
  const [currency,      setCurrency]      = useState<'USD' | 'IQD'>('USD')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [saleDate,      setSaleDate]      = useState(new Date().toISOString().slice(0, 10))

  /* ── Search inputs ── */
  const [carSearch, setCarSearch] = useState('')
  const [buyerSearch, setBuyerSearch] = useState('')

  /* ── Installment state ── */
  const [enableInstallment, setEnableInstallment] = useState(false)
  const [numMonths,         setNumMonths]         = useState('')
  const [startDate,         setStartDate]         = useState('')
  const [dueDay,            setDueDay]            = useState('')
  const [installNotes,      setInstallNotes]      = useState('')

  /* ── Receipt modal state ── */
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [completedSaleData, setCompletedSaleData] = useState<any>(null)

  /* ── Validation errors ── */
  const [errors, setErrors] = useState<Record<string, string>>({})

  /* ── Fetch Cars and Buyers ── */
  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ['available-cars'],
    queryFn: getAvailableCars,
    staleTime: 30_000,
  })

  const { data: buyers = [], isLoading: buyersLoading, refetch: refetchBuyers } = useQuery({
    queryKey: ['buyers'],
    queryFn: getBuyers,
    staleTime: 30_000,
  })

  /* ── Keyboard Shortcuts Listener ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Open quick customer dialog
      if (e.key === 'F2') {
        e.preventDefault()
        document.getElementById('btn-quick-customer')?.click()
      }
      // F4: Toggle currency (USD / IQD)
      if (e.key === 'F4') {
        e.preventDefault()
        setCurrency(prev => {
          const nextVal = prev === 'USD' ? 'IQD' : 'USD'
          toast.info(`تم تبديل العملة إلى: ${nextVal === 'USD' ? 'دولار أمريكي (USD)' : 'دينار عراقي (IQD)'}`)
          return nextVal
        })
      }
      // F8: Focus car search input
      if (e.key === 'F8') {
        e.preventDefault()
        document.getElementById('car-search-input')?.focus()
      }
      // F9: Focus buyer search input
      if (e.key === 'F9') {
        e.preventDefault()
        document.getElementById('buyer-search-input')?.focus()
      }
      // Ctrl + Enter: Submit invoice
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        const submitBtn = document.getElementById('btn-submit-invoice')
        if (submitBtn) {
          submitBtn.click()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /* ── Filtered selections ── */
  const filteredCars = cars.filter(car => {
    const query = carSearch.toLowerCase()
    return (
      (car.brand ?? '').toLowerCase().includes(query) ||
      (car.model ?? '').toLowerCase().includes(query) ||
      (car.vin ?? '').toLowerCase().includes(query) ||
      (car.plate_number ?? '').toLowerCase().includes(query)
    )
  })

  const filteredBuyers = buyers.filter(b => {
    const query = buyerSearch.toLowerCase()
    const fullName = b.full_name || b.name || ''
    return (
      fullName.toLowerCase().includes(query) ||
      b.phone.includes(query) ||
      b.id_number.includes(query)
    )
  })

  const selectedCar   = cars.find(c => String(c.id) === carId)
  const selectedBuyer = buyers.find(b => String(b.id) === buyerId)

  /* ── Prefill from car ── */
  useEffect(() => {
    if (selectedCar?.selling_price && !sellingPrice) {
      setSellingPrice(String(selectedCar.selling_price))
      setCurrency(selectedCar.currency)
    }
  }, [selectedCar])

  /* ── Price Calculations ── */
  const sp        = parseFloat(sellingPrice) || 0
  const dc        = parseFloat(discount)     || 0
  const pa        = parseFloat(paidAmount)   || 0
  const remaining = Math.max(sp - dc - pa, 0)

  /* ── Automatically enable installment when POS chooses Installment payment ── */
  useEffect(() => {
    if (paymentMethod === 'Installment') {
      setEnableInstallment(true)
    } else {
      setEnableInstallment(false)
    }
  }, [paymentMethod])

  /* ── Automatically set paid amount for Cash/Bank sales ── */
  useEffect(() => {
    if (paymentMethod === 'Cash' || paymentMethod === 'Bank transfer') {
      setPaidAmount(String(Math.max(sp - dc, 0)))
    }
  }, [paymentMethod, sp, dc])

  /* ── Profit calculations (privileged only) ── */
  const purchaseCost   = selectedCar ? (parseFloat(String(selectedCar.purchase_price)) || 0) : 0
  const netRevenue     = Math.max(sp - dc, 0)
  const profit         = purchaseCost > 0 ? netRevenue - purchaseCost : 0
  const profitPct      = purchaseCost > 0 ? (profit / purchaseCost) * 100 : 0
  const isBelowCost    = purchaseCost > 0 && netRevenue < purchaseCost
  const suggestedPrice = purchaseCost > 0 ? Math.ceil(purchaseCost * 1.10) : 0

  /* ── Submit mutation ── */
  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['available-cars'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`تم تسجيل عملية البيع بنجاح فاتورة #${res.invoice_number}`)
      setCompletedSaleData({
        id: res.id,
        invoice_number: res.invoice_number,
        sale_date: saleDate,
        buyer_name: selectedBuyer?.full_name || selectedBuyer?.name,
        buyer_phone: selectedBuyer?.phone,
        payment_method: paymentMethod,
        car_name: selectedCar ? `${selectedCar.brand} ${selectedCar.model} ${selectedCar.manufacturing_year}` : 'سيارة',
        car_vin: selectedCar?.vin,
        plate_number: selectedCar?.plate_number,
        color: selectedCar?.color,
        selling_price: sp,
        discount: dc,
        paid_amount: pa,
        currency: currency,
      })
      setShowPrintModal(true)
    },
    onError: (err: any) => {
      toast.error(extractApiError(err))
    },
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!carId)                  e.carId         = 'يرجى اختيار السيارة أولاً'
    if (!buyerId)                e.buyerId       = 'يرجى اختيار المشتري'
    if (!sellingPrice || sp <= 0) e.sellingPrice = 'سعر البيع مطلوب ويجب أن يكون أكبر من 0'
    if (!paymentMethod)          e.paymentMethod = 'اختر طريقة الدفع'
    if (!saleDate)               e.saleDate      = 'تاريخ الفاتورة مطلوب'

    if (paymentMethod === 'Installment') {
      if (remaining <= 0) e.paymentMethod = 'لا يمكن اختيار الدفع بالأقساط بدون متبقي على الفاتورة'
      if (!startDate) e.startDate = 'تاريخ بدء سداد الأقساط مطلوب'
      if (!dueDay)    e.dueDay    = 'يوم الاستحقاق مطلوب'
      const dd = parseInt(dueDay)
      if (dueDay && (dd < 1 || dd > 31)) e.dueDay = 'يوم الاستحقاق يجب أن يكون بين 1 و 31'
      if (numMonths && parseInt(numMonths) <= 0) e.numMonths = 'عدد الأشهر غير صالح'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    mutation.mutate({
      car_id:         carId as any,
      buyer_id:       buyerId as any,
      selling_price:  sp,
      discount:       dc,
      paid_amount:    pa,
      currency,
      payment_method: paymentMethod,
      sale_date:      saleDate,
      enable_installment:      paymentMethod === 'Installment',
      number_of_months:        numMonths  ? parseInt(numMonths)  : null,
      installment_start_date:  startDate  || null,
      installment_due_day:     dueDay     ? parseInt(dueDay)     : null,
      installment_notes:       installNotes || null,
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 text-right animate-in fade-in duration-200" dir="rtl">
      
      <PageHeader
        title="شاشة نقطة البيع (POS)"
        subtitle="إنشاء فواتير بيع سريعة ومباشرة للمركبات وصرف السندات المرتبطة"
        icon={<Car className="h-5 w-5" />}
      />

      <StepIndicator steps={[
        { label: 'اختيار السيارة',  done: !!selectedCar,   active: !selectedCar },
        { label: 'اختيار العميل',   done: !!selectedBuyer, active: !!selectedCar && !selectedBuyer },
        { label: 'تفاصيل الدفع',    done: !!paymentMethod && !!sellingPrice, active: !!selectedBuyer && !paymentMethod },
        { label: 'تأكيد الفاتورة',  done: false, active: !!paymentMethod && !!sellingPrice && !!selectedCar && !!selectedBuyer },
      ]} />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section (2 columns): Selections & Parameters */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* السيارة */}
          <SectionCard 
            title={
              <div className="flex items-center gap-2">
                <span>اختيار المركبة</span>
                <kbd className="hidden sm:inline-flex h-4.5 select-none items-center gap-1 rounded border border-border/80 bg-background/50 px-1 font-mono text-[8px] font-semibold text-muted-foreground">
                  F8
                </kbd>
              </div>
            } 
            description="البحث واختيار السيارة المتاحة في المعرض"
          >
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="car-search-input"
                  placeholder="ابحث بماركة السيارة، الموديل، رقم اللوحة أو الشاصي... (اضغط F8)"
                  value={carSearch}
                  onChange={(e) => setCarSearch(e.target.value)}
                  className="pr-10 h-11 text-sm border-border/50 bg-secondary/20 focus-visible:ring-cyan-500/50"
                />
              </div>

              {carsLoading ? (
                <div className="h-11 bg-secondary/30 rounded-lg animate-pulse" />
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">السيارات المتاحة المطابقة ({filteredCars.length})</Label>
                  <Select value={carId} onValueChange={setCarId}>
                    <SelectTrigger className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.carId && 'border-rose-500/50')}>
                      <SelectValue placeholder="اختر السيارة من القائمة..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {filteredCars.map(car => (
                        <SelectItem key={car.id} value={String(car.id)}>
                          <span className="font-semibold">{car.brand} {car.model} ({car.manufacturing_year})</span>
                          <span className="text-muted-foreground text-[10px] ms-2">لوحة: {car.plate_number} | شاصي: {car.vin}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError msg={errors.carId} />
                </div>
              )}

              <AnimatePresence>
                {selectedCar && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/[0.02] p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs backdrop-blur-sm">
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span className="text-muted-foreground">اللون والموديل:</span>
                        <span className="font-bold">{selectedCar.color} / {selectedCar.manufacturing_year}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span className="text-muted-foreground">رقم اللوحة:</span>
                        <span className="font-bold">{selectedCar.plate_number}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1 col-span-2">
                        <span className="text-muted-foreground">رقم الشاصي (VIN):</span>
                        <span className="font-mono font-semibold text-cyan-400">{selectedCar.vin}</span>
                      </div>
                      {isPrivileged && (
                        <div className="flex justify-between pt-1 col-span-2 text-rose-400">
                          <span>كلفة الشراء الدفترية:</span>
                          <span className="font-numeric font-bold">{formatMoney(selectedCar.purchase_price, selectedCar.currency)}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SectionCard>

          {/* المشتري */}
          <SectionCard 
            title={
              <div className="flex items-center gap-2">
                <span>بيانات المشتري</span>
                <kbd className="hidden sm:inline-flex h-4.5 select-none items-center gap-1 rounded border border-border/80 bg-background/50 px-1 font-mono text-[8px] font-semibold text-muted-foreground">
                  F9
                </kbd>
              </div>
            } 
            description="اختيار العميل أو إضافة عميل جديد بسرعة في النظام"
            action={<QuickCustomerDialog onSuccess={(newCust) => {
              refetchBuyers().then(() => {
                setBuyerId(String(newCust.id))
              })
            }} />}
          >
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="buyer-search-input"
                  placeholder="ابحث باسم العميل أو رقم الهاتف... (اضغط F9)"
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  className="pr-10 h-11 text-sm border-border/50 bg-secondary/20"
                />
              </div>

              {buyersLoading ? (
                <div className="h-11 bg-secondary/30 rounded-lg animate-pulse" />
              ) : (
                <div className="space-y-2">
                  <Select value={buyerId} onValueChange={setBuyerId}>
                    <SelectTrigger className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.buyerId && 'border-rose-500/50')}>
                      <SelectValue placeholder="اختر العميل المشتري..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {filteredBuyers.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          <span className="font-semibold">{b.full_name || b.name}</span>
                          <span className="text-muted-foreground text-[10px] ms-2">هاتف: {b.phone}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError msg={errors.buyerId} />
                </div>
              )}

              <AnimatePresence>
                {selectedBuyer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-border/50 bg-secondary/10 p-3 grid grid-cols-2 gap-4 text-xs backdrop-blur-sm">
                      <div>
                        <span className="text-muted-foreground block">اسم العميل</span>
                        <span className="font-bold text-foreground mt-0.5 block">{selectedBuyer.full_name || selectedBuyer.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">رقم الهاتف</span>
                        <span className="font-bold text-foreground mt-0.5 block">{selectedBuyer.phone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">رقم الهوية الوطنية / الإقامة</span>
                        <span className="font-bold text-foreground mt-0.5 block">{selectedBuyer.id_number}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SectionCard>

          {/* الأقساط */}
          <AnimatePresence>
            {paymentMethod === 'Installment' && remaining > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <SectionCard title="جدولة الأقساط" description="تحديد فترة السداد وتاريخ الاستحقاق للأقساط الشهرية">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">فترة السداد (بالأشهر) *</Label>
                      <Input
                        type="number" min="1" placeholder="مثال: 12"
                        value={numMonths}
                        onChange={(e) => setNumMonths(e.target.value)}
                        className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.numMonths && 'border-rose-500/50')}
                      />
                      <FieldError msg={errors.numMonths} />
                      {numMonths && parseInt(numMonths) > 0 && (
                        <p className="text-[11px] text-cyan-400 mt-1">
                          القسط الشهري المتوقع: {formatMoney(remaining / parseInt(numMonths), currency)}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">يوم الاستحقاق الشهري (1 - 31) *</Label>
                      <Input
                        type="number" min="1" max="31" placeholder="مثال: 5"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.dueDay && 'border-rose-500/50')}
                      />
                      <FieldError msg={errors.dueDay} />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">تاريخ بداية الأقساط *</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.startDate && 'border-rose-500/50')}
                      />
                      <FieldError msg={errors.startDate} />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">ملاحظات خطة التقسيط</Label>
                      <Input
                        placeholder="ملاحظات اختيارية..."
                        value={installNotes}
                        onChange={(e) => setInstallNotes(e.target.value)}
                        className="h-11 text-sm bg-secondary/30 border-border/60"
                      />
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Section (1 column): Pricing Summary & Submit */}
        <div className="space-y-6">
          <SectionCard title="المالية والتسوية">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>العملة</span>
                  <kbd className="hidden sm:inline-flex h-4 select-none items-center gap-1 rounded border border-border/80 bg-background/50 px-1 font-mono text-[7px] font-semibold text-muted-foreground">
                    F4 للتبديل
                  </kbd>
                </Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as 'USD' | 'IQD')}>
                  <SelectTrigger className="h-11 text-sm bg-secondary/30 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">طريقة الدفع *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.paymentMethod && 'border-rose-500/50')}>
                    <SelectValue placeholder="اختر طريقة الدفع..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.paymentMethod} />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">سعر البيع الفعلي *</Label>
                <Input
                  type="number" min="0" step="any" placeholder="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className={cn('h-11 bg-secondary/30 border-border/60 font-numeric font-bold text-sm', errors.sellingPrice && 'border-rose-500/50')}
                />
                <FieldError msg={errors.sellingPrice} />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">الخصم الممنوح</Label>
                <Input
                  type="number" min="0" step="any" placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-11 text-sm bg-secondary/30 border-border/60 font-numeric"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">المبلغ المقبوض (المقدمة)</Label>
                <Input
                  type="number" min="0" step="any" placeholder="0"
                  value={paidAmount}
                  disabled={paymentMethod === 'Cash' && sp > 0} // Auto lock to full amount for pure Cash sales
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-11 bg-secondary/30 border-border/60 font-numeric text-emerald-400 font-bold text-sm"
                />
              </div>

              {/* Set paid amount to full price minus discount automatically for pure cash sales */}

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">تاريخ الفاتورة *</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className={cn('h-11 text-sm bg-secondary/30 border-border/60', errors.saleDate && 'border-rose-500/50')}
                />
                <FieldError msg={errors.saleDate} />
              </div>

              {/* Summary calculations card */}
              <div className="border-t border-border/40 pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي الفاتورة:</span>
                  <span className="font-numeric font-semibold tabular-nums">{formatMoney(sp, currency)}</span>
                </div>
                {dc > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>الخصم:</span>
                    <span className="font-numeric font-semibold tabular-nums">- {formatMoney(dc, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground">
                  <span>الصافي المطلوب:</span>
                  <span className="font-numeric text-amber-400 tabular-nums">{formatMoney(sp - dc, currency)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>المدفوع نقداً:</span>
                  <span className="font-numeric tabular-nums">{formatMoney(pa, currency)}</span>
                </div>
                <div className="flex justify-between text-rose-400 border-t border-border/40 pt-2 font-bold">
                  <span>المتبقي في الذمة:</span>
                  <span className="font-numeric tabular-nums">{formatMoney(remaining, currency)}</span>
                </div>
              </div>

              {/* Profit metrics (Privileged users) */}
              {isPrivileged && selectedCar && sp > 0 && (
                <div className={cn(
                  'rounded-xl border p-3.5 mt-2 text-xs',
                  isBelowCost ? 'border-rose-500/30 bg-rose-500/[0.04]' : 'border-emerald-500/30 bg-emerald-500/[0.03]'
                )}>
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="font-bold text-[11px]">
                        {isBelowCost ? 'تحذير البيع بأقل من التكلفة' : 'تحليل أرباح الفاتورة'}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        كلفة الشراء: {formatMoney(purchaseCost, selectedCar.currency)}
                      </p>
                      <p className={cn('text-[11px] font-bold font-numeric tabular-nums', isBelowCost ? 'text-rose-400' : 'text-emerald-400')}>
                        صافي الربح: {formatMoney(profit, currency)} ({profitPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2">
                <Button
                  id="btn-submit-invoice"
                  type="submit"
                  disabled={mutation.isPending || carsLoading || buyersLoading}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white h-11 font-bold text-sm shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  {mutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin me-2" />جاري إصدار الفاتورة...</>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>إصدار الفاتورة وحفظها</span>
                      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-white/10 px-1.5 font-mono text-[9px] font-medium text-white/90">
                        Ctrl+Enter
                      </kbd>
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="w-full mt-2 text-xs text-muted-foreground h-10"
                >
                  إلغاء وتراجع
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </form>

      {/* Printable receipt modal */}
      <PrintReceiptModal
        open={showPrintModal}
        onOpenChange={(op) => {
          setShowPrintModal(op)
          if (!op && completedSaleData) {
            router.push(`/sales/${completedSaleData.id}`)
          }
        }}
        type="sale"
        data={completedSaleData}
      />
    </div>
  )
}
