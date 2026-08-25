'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scale,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  Printer,
  Coins
} from 'lucide-react'
import { getCurrentBalance, createCashboxClose, getCashboxCloses } from '@/lib/api/vouchers'
import { formatMoney, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { PrintReceiptModal } from '@/components/cashier/PrintReceiptModal'

export default function DailyClosePage() {
  const [actualBalanceInput, setActualBalanceInput] = useState('')
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printData, setPrintData] = useState<any>(null)

  // 1. Fetch current system expected balance
  const { data: balanceData, isLoading: isBalanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['cashbox-balance', '111001'],
    queryFn: () => getCurrentBalance('111001'),
    staleTime: 5_000,
  })

  // 2. Fetch past closes
  const { data: pastCloses = [], isLoading: isClosesLoading } = useQuery({
    queryKey: ['cashbox-closes', '111001'],
    queryFn: () => getCashboxCloses('111001'),
    staleTime: 30_000,
  })

  const systemBalance = balanceData?.balance ?? 0
  const actualBalance = parseFloat(actualBalanceInput) || 0
  const difference = actualBalance - systemBalance

  // Submit close mutation
  const closeMutation = useMutation({
    mutationFn: createCashboxClose,
    onSuccess: (res) => {
      toast.success('تم إقفال الصندوق اليومي وحفظ القيود بنجاح')
      
      // Load print modal data
      setPrintData({
        close_date: res.close_date,
        account_name: res.account_name ?? 'الصندوق الرئيسي',
        account_code: res.account_code ?? '111001',
        system_balance: res.system_balance,
        actual_balance: res.actual_balance,
        difference: res.difference,
        note: res.note,
        closed_by: res.closed_by,
        created_at: res.created_at,
      })
      setShowPrintModal(true)

      // Refresh states
      setActualBalanceInput('')
      setNote('')
      queryClient.invalidateQueries({ queryKey: ['cashbox-balance'] })
      queryClient.invalidateQueries({ queryKey: ['cashbox-closes'] })
      queryClient.invalidateQueries({ queryKey: ['cash-dashboard'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'حدث خطأ أثناء إرسال إقفال الصندوق'
      toast.error(msg)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!actualBalanceInput.trim()) {
      toast.error('يرجى إدخال الرصيد الفعلي المتوفر بالصندوق')
      return
    }

    closeMutation.mutate({
      account_code: '111001',
      actual_balance: actualBalance,
      note: note.trim() || undefined,
    })
  }

  const handlePrintPastClose = (item: any) => {
    setPrintData({
      close_date: item.close_date,
      account_name: item.account_name ?? 'الصندوق الرئيسي',
      account_code: item.account_code ?? '111001',
      system_balance: item.system_balance,
      actual_balance: item.actual_balance,
      difference: item.difference,
      note: item.note,
      closed_by: item.closed_by,
      created_at: item.created_at,
    })
    setShowPrintModal(true)
  }

  const isLoading = isBalanceLoading || isClosesLoading

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      
      <PageHeader
        title="إقفال الصندوق اليومي"
        subtitle="إجراء مطابقة النقد الفعلي بالصندوق مع الرصيد الدفتري للنظام"
        icon={<Scale className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Close Form (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="نموذج مطابقة النقدية" description="مطابقة المبالغ المتوفرة يدوياً وتسجيل الإغلاق المالي">
            {isBalanceLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* System Balance Display */}
                  <div className="p-4 rounded-xl border border-border/50 bg-secondary/10 text-xs">
                    <span className="text-muted-foreground block mb-1">الرصيد الدفتري المتوقع (النظام)</span>
                    <span className="font-numeric text-lg font-black text-foreground block">
                      {formatMoney(systemBalance, 'IQD')}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 block mt-1">
                      المجموع التراكمي للحركات المحاسبية المسجلة
                    </span>
                  </div>

                  {/* Counted Cash Input */}
                  <div className="space-y-2">
                    <Label htmlFor="actual-cash" className="text-xs text-muted-foreground">الرصيد الفعلي المتوفر (المعدود) *</Label>
                    <Input
                      id="actual-cash"
                      type="number"
                      step="any"
                      placeholder="أدخل إجمالي النقد الفعلي بالصندوق..."
                      value={actualBalanceInput}
                      onChange={(e) => setActualBalanceInput(e.target.value)}
                      className="h-10 bg-secondary/30 border-border/50 font-numeric font-bold text-cyan-400 text-md"
                    />
                    <span className="text-[10px] text-muted-foreground/70 block">
                      احسب الفئات النقدية المتوفرة بالصندوق وأدخل المجموع
                    </span>
                  </div>
                </div>

                {/* Settlement Difference Display */}
                {actualBalanceInput.trim() !== '' && (
                  <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                    difference === 0 
                      ? 'border-emerald-500/30 bg-emerald-500/[0.04]' 
                      : 'border-rose-500/30 bg-rose-500/[0.04]'
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={difference === 0 ? 'text-emerald-400 h-5 w-5' : 'text-rose-400 h-5 w-5'} />
                      <div>
                        <span className="font-bold block">فارق المطابقة والتسوية</span>
                        <span className="text-muted-foreground text-[10px]">
                          {difference === 0 
                            ? 'الرصيد الفعلي متطابق تماماً مع الرصيد الدفتري.' 
                            : difference > 0 
                            ? 'يوجد زيادة نقدية غير مفسرة بالصندوق.' 
                            : 'يوجد عجز نقدي بالصندوق يجب تفسيره.'}
                        </span>
                      </div>
                    </div>
                    <span className={`font-numeric text-base font-black ${difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {difference > 0 ? '+' : ''}{formatMoney(difference, 'IQD')}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="close-notes" className="text-xs text-muted-foreground">ملاحظات أو تفسير الفوارق</Label>
                  <Input
                    id="close-notes"
                    placeholder="اكتب أي ملاحظات أو مبررات للفارق في حال وجود عجز أو زيادة..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-secondary/30 border-border/50 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
                  <Button
                    type="submit"
                    disabled={closeMutation.isPending || isBalanceLoading}
                    className="bg-amber-600 hover:bg-amber-500 text-white min-w-[140px] font-bold"
                  >
                    {closeMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />جاري التسجيل...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4" />إقفال الصندوق الآن</>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </SectionCard>
        </div>

        {/* History Closes (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard title="الإقفالات السابقة" description="استعراض وطباعة تقارير تسوية الصندوق السابقة">
            {isClosesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : pastCloses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <History className="mx-auto h-8 w-8 opacity-30 text-cyan-400" />
                <p className="text-xs">لا تتوفر إغلاقات سابقة</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {pastCloses.map((item: any) => (
                  <div key={item.id} className="border border-border/40 rounded-xl p-3 flex flex-col gap-2 hover:bg-secondary/10 transition-colors text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{item.close_date ? formatDate(item.close_date) : '-'}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintPastClose(item)}
                        className="h-6 w-6 p-0 text-cyan-400 hover:bg-cyan-500/10"
                        title="طباعة التقرير"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-1 text-[11px] text-muted-foreground border-t border-border/20 pt-1.5">
                      <span>الرصيد الفعلي:</span>
                      <span className="font-numeric font-semibold text-foreground text-left">{formatMoney(item.actual_balance, 'IQD')}</span>
                      <span>الفارق:</span>
                      <span className={`font-numeric font-bold text-left ${item.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.difference > 0 ? '+' : ''}{formatMoney(item.difference, 'IQD')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

      </div>

      {/* Close Receipt Printing Modal */}
      <PrintReceiptModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        type="close"
        data={printData}
      />
    </div>
  )
}
