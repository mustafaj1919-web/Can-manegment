'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Search,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  Coins
} from 'lucide-react'
import { getInstallments, getInstallmentPlan, payInstallmentSchedule } from '@/lib/api/installments'
import { formatMoney, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { PrintReceiptModal } from '@/components/cashier/PrintReceiptModal'

export default function InstallmentPaymentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  
  // Active schedule selected for payment
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  
  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printData, setPrintData] = useState<any>(null)

  const queryClient = useQueryClient()

  // 1. Fetch active plans list
  const { data: plansData, isLoading: isPlansLoading } = useQuery({
    queryKey: ['active-installments'],
    queryFn: () => getInstallments({ per_page: 100, filter: 'unpaid' }),
    staleTime: 20_000,
  })

  // 2. Fetch specific plan details
  const { data: planDetail, isLoading: isDetailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['installment-plan', selectedPlanId],
    queryFn: () => getInstallmentPlan(selectedPlanId!),
    enabled: selectedPlanId !== null,
    staleTime: 10_000,
  })

  const plans = plansData?.items ?? []

  // Filter plans in memory
  const filteredPlans = plans.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      (p.buyer_name || '').toLowerCase().includes(q) ||
      (p.buyer_phone || '').includes(q) ||
      (p.invoice_number || '').toLowerCase().includes(q) ||
      (p.car_name || '').toLowerCase().includes(q)
    )
  })

  // Submit payment mutation
  const paymentMutation = useMutation({
    mutationFn: ({ scheduleId, payload }: { scheduleId: number; payload: any }) => 
      payInstallmentSchedule(scheduleId, payload),
    onSuccess: (res) => {
      toast.success('تم تسجيل دفعة السداد وتوليد السند المحاسبي بنجاح')

      // Raw shape consumed by adaptInstallmentReceiptData (mirrors the same mapping
      // already proven in InstallmentPaymentWorkflow.tsx's receipt step) so the cashier
      // "collect installment" flow prints the same official A5 receipt as the
      // installment-detail payment workflow, not the old generic 80mm cash voucher.
      setPrintData({
        payment: {
          id: res.schedule_id,
          amount: res.paid_amount,
          currency: 'IQD',
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          notes: notes || `سداد قسط عقد بيع سيارة ${planDetail?.car_name ?? ''}`,
        },
        schedule: selectedSchedule,
        plan: planDetail,
        customer: { name: planDetail?.buyer_name, phone: planDetail?.buyer_phone },
        car: { name: planDetail?.car_name },
        branch_name: planDetail?.branch?.name,
      })
      setShowPrintModal(true)

      // Refresh states
      queryClient.invalidateQueries({ queryKey: ['active-installments'] })
      refetchDetail()
      setSelectedSchedule(null)
      setPaymentAmount('')
      setNotes('')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'حدث خطأ أثناء دفع القسط'
      toast.error(msg)
    }
  })

  const handleSelectSchedule = (schedule: any) => {
    setSelectedSchedule(schedule)
    setPaymentAmount(String(schedule.remaining_amount))
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchedule) return
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('يرجى إدخال مبلغ دفع صالح')
      return
    }

    paymentMutation.mutate({
      scheduleId: selectedSchedule.id,
      payload: {
        amount: amt,
        payment_method: paymentMethod,
        notes: notes,
      }
    })
  }

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      
      <PageHeader
        title="تحصيل أقساط المشترين"
        subtitle="متابعة خطط السداد الجارية وقبول الدفعات المباشرة وتصفيتها"
        icon={<Coins className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Right Pane (1 column): Customer Search */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard title="البحث عن العميل / الخطة" description="ابحث باسم المشتري أو رقم العقد">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم، الهاتف أو العقد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 border-border/50 bg-secondary/20"
                />
              </div>

              {isPlansLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <AlertCircle className="mx-auto h-8 w-8 opacity-30" />
                  <p className="text-xs">لا توجد خطط تقسيط نشطة مطابقة</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {filteredPlans.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(p.id)
                        setSelectedSchedule(null)
                      }}
                      className={`w-full text-right p-3 rounded-lg border transition-all flex flex-col gap-1.5 text-xs ${
                        selectedPlanId === p.id
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                          : 'border-border/40 hover:bg-secondary/10'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>{p.buyer_name}</span>
                        <span className="font-numeric text-[10px] text-muted-foreground">عقد: {p.invoice_number}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>المركبة: {p.car_name}</span>
                        <span className="font-numeric font-bold text-rose-400">{formatMoney(p.remaining_amount, 'IQD')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Left Pane (2 columns): Plan schedules & payment terminal */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPlanId === null ? (
            <div className="glass rounded-xl py-24 text-center text-muted-foreground border border-border/40 space-y-3">
              <CalendarDays className="mx-auto h-12 w-12 opacity-30 text-cyan-400" />
              <h3 className="font-bold text-foreground">لم يتم اختيار عميل</h3>
              <p className="text-xs max-w-xs mx-auto">يرجى تحديد خطة تقسيط من شريط البحث الجانبي لبدء استعراض الأقساط وجدول السداد.</p>
            </div>
          ) : isDetailLoading ? (
            <div className="space-y-4">
              <div className="h-32 bg-secondary/30 rounded-xl animate-pulse" />
              <div className="h-64 bg-secondary/30 rounded-xl animate-pulse" />
            </div>
          ) : planDetail ? (
            <div className="space-y-6">
              
              {/* Client Statement Summary Card */}
              <div className="glass rounded-xl p-5 border border-cyan-500/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">العميل المشتري</span>
                  <span className="font-bold text-foreground block mt-1">{planDetail.buyer_name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">{planDetail.buyer_phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">المركبة</span>
                  <span className="font-bold text-foreground block mt-1">{planDetail.car_name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">عقد #{planDetail.invoice_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">إجمالي قيمة التقسيط</span>
                  <span className="font-numeric font-bold block mt-1 text-foreground">{formatMoney(planDetail.total_amount, 'IQD')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">المتبقي المطلوب تصفيتها</span>
                  <span className="font-numeric font-bold text-rose-400 block mt-1">{formatMoney(planDetail.remaining_amount, 'IQD')}</span>
                </div>
              </div>

              {/* Installment Schedules Table */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Schedules list (2 cols) */}
                <div className="md:col-span-2 space-y-4">
                  <div className="glass rounded-xl overflow-hidden border border-border/40">
                    <div className="px-4 py-3 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground">جدول الأقساط المستحقة</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-border/40 text-[10px] text-muted-foreground">
                            <th className="p-3">رقم القسط</th>
                            <th className="p-3">تاريخ الاستحقاق</th>
                            <th className="p-3">المبلغ</th>
                            <th className="p-3">المتبقي</th>
                            <th className="p-3 text-center">الحالة</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(planDetail.schedules ?? []).map((inst) => {
                            const isPaid = inst.status === 'Paid'
                            return (
                              <tr key={inst.id} className="border-b border-border/20 hover:bg-secondary/15">
                                <td className="p-3 font-semibold">قسط #{inst.installment_number}</td>
                                <td className="p-3 font-numeric text-muted-foreground">{inst.due_date ? formatDate(inst.due_date) : '-'}</td>
                                <td className="p-3 font-numeric">{formatMoney(inst.amount, 'IQD')}</td>
                                <td className="p-3 font-numeric text-rose-400">{formatMoney(inst.remaining_amount, 'IQD')}</td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                    isPaid 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                      : inst.status === 'Partial'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {isPaid ? 'مكتمل' : inst.status === 'Overdue' ? 'متأخر' : 'معلق'}
                                  </span>
                                </td>
                                <td className="p-3 text-left">
                                  {!isPaid && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectSchedule(inst)}
                                      className="h-7 text-[10px] px-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                                    >
                                      تحصيل
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Receipt Processing Form (1 col) */}
                <div className="md:col-span-1">
                  {selectedSchedule ? (
                    <div className="glass rounded-xl p-4 border border-cyan-500/20 bg-cyan-500/[0.02] space-y-4">
                      <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 border-b border-border/40 pb-2">
                        <Coins className="h-4 w-4" />
                        سداد القسط #{selectedSchedule.installment_number}
                      </h3>

                      <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">قيمة القسط المطلوبة</Label>
                          <div className="h-9 px-3 flex items-center rounded-lg bg-secondary/40 border border-border/40 text-xs font-numeric font-bold">
                            {formatMoney(selectedSchedule.remaining_amount, 'IQD')}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="pay-amount" className="text-[11px] text-muted-foreground">المبلغ المستلم *</Label>
                          <Input
                            id="pay-amount"
                            type="number"
                            step="any"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="bg-secondary/30 border-border/50 font-numeric font-bold text-emerald-400 text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">طريقة الدفع</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="bg-secondary/30 border-border/50 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">نقداً (صندوق الكاشير)</SelectItem>
                              <SelectItem value="Bank">تحويل بنكي</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="pay-notes" className="text-[11px] text-muted-foreground">ملاحظات السند</Label>
                          <Input
                            id="pay-notes"
                            placeholder="مثال: سداد القسط الثاني"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-secondary/30 border-border/50 text-xs"
                          />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSchedule(null)}
                            disabled={paymentMutation.isPending}
                          >
                            إلغاء
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={paymentMutation.isPending}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[90px]"
                          >
                            {paymentMutation.isPending ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin me-1" />جاري الدفع...</>
                            ) : (
                              <><CheckCircle2 className="h-3.5 w-3.5 me-1" />تأكيد الدفع</>
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-6 text-center text-muted-foreground border border-border/40 space-y-2 text-xs">
                      <Clock className="mx-auto h-8 w-8 opacity-25" />
                      <p className="font-bold text-foreground">بانتظار تحديد قسط</p>
                      <p className="text-[11px] text-muted-foreground/80 leading-normal">
                        اضغط على زر (تحصيل) بجوار أي قسط في الجدول لبدء ملء سند القبض.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>

      {/* Receipts Printer Modal */}
      <PrintReceiptModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        type="installment-payment-a5"
        data={printData}
      />
    </div>
  )
}
