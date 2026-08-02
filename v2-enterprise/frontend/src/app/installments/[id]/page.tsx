'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  ArrowRight, Car, User, Banknote, Loader2, DollarSign, MessageCircle, Printer,
  UploadCloud, FileCheck, Eye, FolderArchive, Camera, Paperclip, FileText, Check, X, ShieldCheck,
} from 'lucide-react'
import { cn, formatMoney, formatDate, translateStatus } from '@/lib/utils'
import { getInstallmentPlan, payInstallmentSchedule, archivePaymentReceipt } from '@/lib/api/installments'
import type { InstallmentScheduleItem } from '@/lib/api/sales'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { post } from '@/lib/api/client'
import { InstallmentPaymentWorkflow } from '@/components/installments/workflow/InstallmentPaymentWorkflow'

function toWaPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('964')) return d
  if (d.startsWith('0'))   return '964' + d.slice(1)
  return '964' + d
}

const STATUS_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Paid:    { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  Pending: { icon: Clock,         color: 'text-muted-foreground', bg: 'bg-secondary/30' },
  Partial: { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  Overdue: { icon: AlertTriangle, color: 'text-rose-400',    bg: 'bg-rose-500/10' },
}

const PAYMENT_METHODS = [
  { value: 'Cash',          label: 'نقداً' },
  { value: 'Bank transfer', label: 'حوالة مصرفية' },
]

function PayModal({
  schedule,
  onClose,
  onSuccess,
}: {
  schedule: InstallmentScheduleItem
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount,        setAmount]        = useState(String(schedule.remaining_amount))
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes,         setNotes]         = useState('')

  const mutation = useMutation({
    mutationFn: () => payInstallmentSchedule(schedule.id, {
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      notes: notes || undefined,
    }),
    onSuccess: (res) => {
      toast.success(`تم تسجيل الدفعة — القسط ${res.status === 'Paid' ? 'مسدد بالكامل' : 'جزئي'}`)
      onSuccess()
      onClose()
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { error?: string } } }
      toast.error(axErr?.response?.data?.error ?? 'حدث خطأ أثناء تسجيل الدفعة')
    },
  })

  const amt = parseFloat(amount) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <p className="text-sm font-semibold text-foreground">
            تسجيل دفعة — القسط #{schedule.installment_number}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            المتبقي: <span className="text-rose-400 money">{formatMoney(schedule.remaining_amount, schedule.currency)}</span>
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">المبلغ *</Label>
            <Input
              type="number" min="0.01" step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-secondary/30 border-border/50 money"
            />
            {amt > schedule.remaining_amount && (
              <p className="text-[11px] text-cyan-400 mt-1">
                سيتم سداد هذا القسط وترحيل الفائض ({formatMoney(amt - schedule.remaining_amount, schedule.currency)}) للأقساط القادمة تلقائياً.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">طريقة الدفع *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">ملاحظات</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              className="bg-secondary/30 border-border/50 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/50 bg-secondary/10 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">إلغاء</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || amt <= 0}
            size="sm"
            className="text-xs gap-1.5"
          >
            {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            تسجيل
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export interface ArchivedReceipt {
  scheduleId: string
  fileUrl: string
  fileName: string
  referenceNo: string
  notes?: string
  archivedAt: string
  archivedBy?: string
}

function renderArchiveBadge(archive?: { exists: boolean; is_archived: boolean; archive_status: string | null } | null) {
  if (!archive || !archive.exists) {
    return (
      <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
        <AlertCircle className="h-3 w-3 text-amber-400" /> لم تتم الأرشفة
      </span>
    )
  }
  if (archive.archive_status === 'Pending') {
    return (
      <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
        <Clock className="h-3 w-3 text-sky-400 animate-pulse" /> قيد الأرشفة
      </span>
    )
  }
  if (archive.archive_status === 'Failed') {
    return (
      <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
        <AlertTriangle className="h-3 w-3 text-rose-400" /> فشلت الأرشفة
      </span>
    )
  }
  if (archive.is_archived) {
    return (
      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
        <FileCheck className="h-3 w-3 text-emerald-400" /> مؤرشف
      </span>
    )
  }
  return (
    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
      <AlertCircle className="h-3 w-3 text-amber-400" /> لم تتم الأرشفة
    </span>
  )
}

function ArchivePaymentModal({
  paymentId,
  amount,
  currency,
  paymentDate,
  onClose,
  onSuccess,
}: {
  paymentId: string
  amount: number
  currency: string
  paymentDate?: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [referenceNo, setReferenceNo] = useState(`REF-${paymentId.slice(0, 8).toUpperCase()}`)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await archivePaymentReceipt(paymentId, {
        archive_method: selectedFile ? 'Uploaded' : 'ManuallyConfirmed',
        storage_reference: referenceNo || undefined,
        document_file_name: selectedFile?.name || undefined,
        notes: notes || undefined,
      })

      toast.success('تمت أرشفة وصل السند المالي وتوثيقه بنجاح 📁')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error('تعذر أرشفة وصل الدفعة. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="glass rounded-2xl w-full max-w-lg overflow-hidden border border-emerald-500/30 shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-border/50 bg-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                أرشفة مستند الوصل الورقي الموقّع
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                قيمة الدفعة: <span className="font-semibold text-emerald-400">{formatMoney(amount, currency as any)}</span> {paymentDate ? `· بتاريخ ${formatDate(paymentDate)}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              مستند الوصل الموقّع / صوره من الكاميرا (اختياري)
            </Label>
            <div className="relative border-2 border-dashed border-emerald-500/30 rounded-xl p-4 text-center hover:border-emerald-500/60 transition-colors bg-emerald-500/5">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {previewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  {previewUrl.startsWith('data:image') || previewUrl.startsWith('http') ? (
                    <img src={previewUrl} alt="معاينة الوصل" className="h-28 max-w-full object-contain rounded-lg border border-border/50" />
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <FileCheck className="h-8 w-8" />
                      <span className="text-xs font-semibold">{selectedFile?.name}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <Check className="h-3.5 w-3.5" /> تم تحديد المستند بنجاح (اضغط للتغيير)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <UploadCloud className="h-9 w-9 text-emerald-400/80" />
                  <p className="text-xs font-semibold text-foreground">اضغط أو اسحب صورة/ملف الوصل الورقي الموقّع</p>
                  <p className="text-[11px] text-muted-foreground">يدعم صور الكاميرا المسحوبة، JPG، PNG، أو ملفات PDF</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">رقم المرجع الأرشيفي الورقي</Label>
              <Input
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="مثال: BOX-2026-A12"
                className="bg-secondary/30 border-border/50 text-xs font-numeric"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">حماية المستند</Label>
              <div className="h-9 rounded-md bg-secondary/20 border border-border/40 px-3 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>أرشيف محاسبي مقتطع 1:1</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1 block">ملاحظات الأرشفة (اختياري)</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: وصل موقع من العميل مع ختم الصندوق الأصلي"
              className="bg-secondary/30 border-border/50 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              تأكيد وتوثيق الأرشفة
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ViewArchiveModal({
  schedule,
  archive,
  buyerName,
  onClose,
  onReupload,
}: {
  schedule: InstallmentScheduleItem
  archive: ArchivedReceipt
  buyerName?: string | null
  onClose: () => void
  onReupload: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="glass rounded-2xl w-full max-w-2xl overflow-hidden border border-emerald-500/40 shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-border/50 bg-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">
                  مستند الوصل المنسوخ والمؤرشف — القسط #{schedule.installment_number}
                </p>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> مؤرشف في النظام
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                العميل: {buyerName ?? '—'} · رقم المرجع: <span className="font-numeric font-semibold text-foreground">{archive.referenceNo}</span> · التاريخ: {formatDate(archive.archivedAt)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-black/40 rounded-xl border border-border/50 p-2 flex items-center justify-center min-h-[220px] max-h-[360px] overflow-auto">
            {archive.fileUrl.startsWith('data:image') || archive.fileUrl.startsWith('http') ? (
              <img src={archive.fileUrl} alt="صورة الوصل المؤرشف" className="max-h-[340px] max-w-full object-contain rounded-lg shadow-md" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-emerald-400 py-8">
                <FileText className="h-12 w-12" />
                <span className="text-sm font-semibold">{archive.fileName}</span>
              </div>
            )}
          </div>

          {archive.notes && (
            <div className="bg-secondary/20 border border-border/40 rounded-xl p-3 text-xs">
              <span className="text-muted-foreground font-semibold">ملاحظات الأرشيف: </span>
              <span className="text-foreground">{archive.notes}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={onReupload} className="text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              <UploadCloud className="h-3.5 w-3.5" />
              تحديث / استبدال مستند الوصل
            </Button>
            <div className="flex gap-2">
              {archive.fileUrl && (
                <Button asChild size="sm" className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  <a href={archive.fileUrl} download={archive.fileName} target="_blank" rel="noopener noreferrer">
                    <Paperclip className="h-3.5 w-3.5" />
                    تحميل المستند الأصلي
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function InstallmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params)
  const planId = rawId
  const qc = useQueryClient()
  const [payingSchedule, setPayingSchedule] = useState<InstallmentScheduleItem | null>(null)
  const [archivingSchedule, setArchivingSchedule] = useState<InstallmentScheduleItem | null>(null)
  const [archivingPayment, setArchivingPayment] = useState<{ id: string; amount: number; currency: string; payment_date?: string | null } | null>(null)
  const [viewingArchive, setViewingArchive] = useState<{ schedule: InstallmentScheduleItem; archive: ArchivedReceipt } | null>(null)
  const [archivedMap, setArchivedMap] = useState<Record<string, ArchivedReceipt>>({})
  const [isReminderSending, setIsReminderSending] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !planId) return
    try {
      const saved = localStorage.getItem(`installment_receipt_archives_${planId}`)
      if (saved) {
        setArchivedMap(JSON.parse(saved))
      }
    } catch {}
  }, [planId])

  const handleSaveArchive = (archiveData: ArchivedReceipt) => {
    setArchivedMap(prev => {
      const updated = { ...prev, [archiveData.scheduleId]: archiveData }
      try {
        localStorage.setItem(`installment_receipt_archives_${planId}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  const handleSendServerReminder = async (installmentId: string) => {
    setIsReminderSending(installmentId)
    try {
      const res = await post<any>('/WhatsApp/send-reminder', {
        installmentId: installmentId
      })
      if (res && res.success) {
        toast.success('تم إرسال تذكير القسط بالواتساب تلقائياً وتوثيقه في سجل CRM!')
      } else {
        toast.error('فشل في إرسال تذكير الواتساب.')
      }
    } catch (err: any) {
      toast.error('خطأ أثناء إرسال تذكير الواتساب: ' + (err?.response?.data?.message ?? err.message))
    } finally {
      setIsReminderSending(null)
    }
  }

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['installment-plan', planId],
    queryFn:  () => getInstallmentPlan(planId),
    staleTime: 30_000,
    retry: 1,
    enabled: !!planId,
  })

  function handlePaySuccess() {
    qc.invalidateQueries({ queryKey: ['installment-plan', planId] })
    qc.invalidateQueries({ queryKey: ['installments'] })
    if (plan?.sale_id) {
      qc.invalidateQueries({ queryKey: ['sale', plan.sale_id] })
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400/50" />
        <p className="text-muted-foreground">تعذّر تحميل خطة الأقساط</p>
        <Button asChild variant="ghost" size="sm"><Link href="/installments">العودة</Link></Button>
      </div>
    )
  }

  const paidCount    = plan.schedules.filter(s => s.status === 'Paid').length
  const overdueCount = plan.schedules.filter(s => s.status === 'Overdue').length
  const pct          = plan.total_amount > 0
    ? Math.min(100, Math.round((plan.paid_amount / plan.total_amount) * 100))
    : 0
  const isPlanPaid   = plan.status === 'Paid'

  return (
    <>
      {payingSchedule && (
        <InstallmentPaymentWorkflow
          open={!!payingSchedule}
          onOpenChange={(open) => { if (!open) setPayingSchedule(null) }}
          plan={plan}
          schedule={payingSchedule}
        />
      )}

      {archivingPayment && (
        <ArchivePaymentModal
          paymentId={archivingPayment.id}
          amount={archivingPayment.amount}
          currency={archivingPayment.currency}
          paymentDate={archivingPayment.payment_date}
          onClose={() => setArchivingPayment(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['installment-plan', planId] })}
        />
      )}



      {viewingArchive && (
        <ViewArchiveModal
          schedule={viewingArchive.schedule}
          archive={viewingArchive.archive}
          buyerName={plan.buyer_name}
          onClose={() => setViewingArchive(null)}
          onReupload={() => {
            const sc = viewingArchive.schedule
            setViewingArchive(null)
            setArchivingSchedule(sc)
          }}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-foreground">
                  {plan.invoice_number ?? `خطة #${plan.id}`}
                </h1>
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  isPlanPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                )}>
                  {isPlanPaid ? 'مسدد بالكامل' : 'نشط'}
                </span>
                {overdueCount > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                    {overdueCount} متأخرة
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {paidCount} / {plan.schedules.length} دفعة ·{' '}
                {plan.number_of_months ? `${plan.number_of_months} شهر` : 'مفتوح'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold">
              <Link href={`/installments/${plan.id}/receipt`} title="طباعة وصل سداد القسط A5">
                <Printer className="h-3.5 w-3.5" />
                <span>طباعة الوصل A5</span>
              </Link>
            </Button>
            {!isPlanPaid && (
              <Button
                onClick={() => {
                  const firstUnpaid = plan.schedules.find(s => s.status !== 'Paid' && s.remaining_amount > 0);
                  if (firstUnpaid) setPayingSchedule(firstUnpaid);
                }}
                size="sm"
                className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <Banknote className="h-3.5 w-3.5" />
                تسجيل دفعة
              </Button>
            )}
            {plan.sale_id && (
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link href={`/sales/${plan.sale_id}`}>عرض الفاتورة</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link href="/installments"><ArrowRight className="h-3.5 w-3.5" />الأقساط</Link>
            </Button>
          </div>
        </div>

        {/* Car + Buyer + Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Car */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-muted-foreground">السيارة</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{plan.car_name ?? '—'}</p>
          </div>

          {/* Buyer */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-muted-foreground">المشتري</span>
              </div>
              {plan.buyer_phone && (() => {
                const msg = [
                  `مرحباً ${plan.buyer_name ?? ''}،`,
                  `نود تذكيركم بالأقساط المستحقة لسيارة ${plan.car_name ?? ''}.`,
                  `💰 المتبقي الإجمالي: ${formatMoney(plan.remaining_amount, plan.currency)}`,
                  '',
                  'شركة الأصدقاء لتجارة السيارات 🚗',
                ].join('\n')
                return (
                  <a href={`https://wa.me/${toWaPhone(plan.buyer_phone)}?text=${encodeURIComponent(msg)}`}
                    target="_blank" rel="noopener noreferrer" title="تذكير واتساب"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )
              })()}
            </div>
            <p className="text-sm font-semibold text-foreground">{plan.buyer_name ?? '—'}</p>
            {plan.buyer_phone && <p className="text-xs text-muted-foreground mt-0.5">{plan.buyer_phone}</p>}
          </div>

          {/* Monthly amount */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground">القسط الشهري</span>
            </div>
            <p className="text-sm font-semibold money text-amber-400">
              {formatMoney(plan.installment_amount, plan.currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">يوم {plan.installment_due_day} كل شهر</p>
          </div>
        </div>

        {/* Progress */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">تقدم السداد</span>
            <span className={cn('text-sm font-bold', isPlanPaid ? 'text-emerald-400' : 'text-cyan-400')}>
              {pct}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-secondary/30 overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', isPlanPaid ? 'bg-emerald-500' : 'bg-cyan-500')}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'إجمالي', value: plan.total_amount, color: 'text-foreground' },
              { label: 'مدفوع',  value: plan.paid_amount,  color: 'text-emerald-400' },
              { label: 'متبقي',  value: plan.remaining_amount, color: plan.remaining_amount > 0 ? 'text-rose-400' : 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-secondary/30 border border-border/40 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={cn('text-sm font-bold money mt-0.5', color)}>
                  {formatMoney(value, plan.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {plan.customer_statement && (
          <div className="glass rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                <User className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">كشف أقساط العميل</p>
                <p className="text-xs text-muted-foreground">{plan.customer_statement.customer_name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {[
                { label: 'عدد الخطط', value: plan.customer_statement.plans_count, money: false, color: 'text-foreground' },
                { label: 'الإجمالي', value: plan.customer_statement.total_amount, money: true, color: 'text-foreground' },
                { label: 'مدفوع', value: plan.customer_statement.paid_amount, money: true, color: 'text-emerald-400' },
                { label: 'متبقي', value: plan.customer_statement.remaining_amount, money: true, color: 'text-rose-400' },
                { label: 'متأخر', value: plan.customer_statement.overdue_amount, money: true, color: 'text-amber-400' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/40 bg-secondary/30 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className={cn('mt-1 font-numeric text-sm font-bold', item.color)}>
                    {item.money ? formatMoney(item.value as number, plan.customer_statement!.currency) : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment History Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Banknote className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold">سجل الدفعات</p>
            </div>
            <span className="text-xs text-muted-foreground">{plan.payments.length} دفعة</span>
          </div>
          {plan.payments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {['التاريخ', 'المبلغ', 'الطريقة', 'القسط / المرجع', 'حالة الأرشفة', 'رقم الوصل', 'أرشف بواسطة', 'تاريخ الأرشفة', 'ملاحظات', 'الإجراءات'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.payments.map((payment) => {
                    const arc = payment.archive
                    const isArchived = arc?.is_archived
                    const isPending = arc?.archive_status === 'Pending'
                    const isFailed = arc?.archive_status === 'Failed'

                    return (
                      <tr key={payment.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20">
                        <td className="px-4 py-3 text-xs">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 py-3 font-numeric text-xs font-semibold text-emerald-400">{formatMoney(payment.amount, payment.currency)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{payment.payment_method ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{payment.schedule_id ? `#${payment.schedule_id}` : 'غير مرتبط بقسط تاريخياً'}</td>
                        <td className="px-4 py-3">{renderArchiveBadge(arc)}</td>
                        <td className="px-4 py-3 text-xs font-numeric text-muted-foreground">{arc?.receipt_number ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{arc?.archived_by ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{arc?.archived_at ? formatDate(arc.archived_at) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{payment.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isArchived ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingArchive({
                                  schedule: { installment_number: 1, amount: payment.amount, currency: payment.currency } as any,
                                  archive: {
                                    scheduleId: payment.id,
                                    fileUrl: arc?.storage_reference ?? '',
                                    fileName: arc?.document_file_name ?? `Receipt_${payment.id.slice(0, 6)}.pdf`,
                                    referenceNo: arc?.receipt_number ?? '',
                                    archivedAt: arc?.archived_at ?? '',
                                    archivedBy: arc?.archived_by ?? undefined,
                                  }
                                })}
                                title="معاينة مستند الوصل"
                                className="h-7 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2.5 gap-1 font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                عرض الوصل
                              </Button>
                            ) : isPending ? (
                              <Button size="sm" disabled className="h-7 text-xs bg-secondary/50 text-muted-foreground px-2.5 gap-1">
                                <Clock className="h-3.5 w-3.5 animate-spin" />
                                قيد الأرشفة...
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setArchivingPayment({ id: payment.id, amount: payment.amount, currency: payment.currency, payment_date: payment.payment_date })}
                                title="أرشفة وصل الدفعة"
                                className="h-7 text-xs bg-cyan-600/90 hover:bg-cyan-500 text-white px-2.5 gap-1 font-semibold shadow-sm"
                              >
                                <UploadCloud className="h-3.5 w-3.5" />
                                {isFailed ? 'إعادة المحاولة' : 'أرشفة الوصل'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schedules table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
            <p className="text-sm font-semibold">جدول الأقساط ({plan.schedules.length} قسط)</p>
            {!isPlanPaid && (
              <p className="text-xs text-muted-foreground">اضغط على «دفع» لتسجيل دفعة</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {['#', 'تاريخ الاستحقاق', 'المبلغ', 'مدفوع', 'متبقي', 'الحالة', 'تاريخ الدفع', 'أرشفة الوصل الورقي', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.schedules.map((sc, i) => {
                  const meta  = STATUS_META[sc.status] ?? STATUS_META.Pending
                  const Icon  = meta.icon
                  const canPay = sc.status !== 'Paid' && sc.remaining_amount > 0
                  const isPaid = sc.status === 'Paid' || sc.paid_amount > 0

                  const scPayments = plan.payments.filter(p => String(p.schedule_id) === String(sc.id))

                  return (
                    <motion.tr
                      key={sc.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/20 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">#{sc.installment_number}</td>
                      <td className="px-4 py-3.5 text-xs">{formatDate(sc.due_date)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold money">{formatMoney(sc.amount, sc.currency)}</td>
                      <td className="px-4 py-3.5 text-xs money text-emerald-400">
                        {sc.paid_amount > 0 ? formatMoney(sc.paid_amount, sc.currency) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs money text-rose-400">
                        {sc.remaining_amount > 0 ? formatMoney(sc.remaining_amount, sc.currency) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={cn('flex items-center gap-1.5 w-fit rounded-full px-2 py-1', meta.bg)}>
                          <Icon className={cn('h-3 w-3', meta.color)} />
                          <span className={cn('text-[10px] font-medium', meta.color)}>
                            {translateStatus(sc.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-muted-foreground/60">
                        {sc.payment_date ? formatDate(sc.payment_date) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {isPaid ? (
                          (() => {
                            if (scPayments.length === 0) {
                              return renderArchiveBadge(null)
                            }
                            if (scPayments.length === 1) {
                              const singlePayment = scPayments[0]
                              const singleArc = singlePayment.archive
                              return (
                                <div className="flex items-center gap-1.5">
                                  {renderArchiveBadge(singleArc)}
                                  {singleArc?.is_archived ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setViewingArchive({
                                        schedule: sc,
                                        archive: {
                                          scheduleId: singlePayment.id,
                                          fileUrl: singleArc?.storage_reference ?? '',
                                          fileName: singleArc?.document_file_name ?? `Receipt_${sc.installment_number}.pdf`,
                                          referenceNo: singleArc?.receipt_number ?? '',
                                          archivedAt: singleArc?.archived_at ?? '',
                                          archivedBy: singleArc?.archived_by ?? undefined,
                                        }
                                      })}
                                      title="معاينة مستند الوصل المرفق"
                                      className="h-7 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2.5 gap-1 font-medium"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      عرض
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => setArchivingPayment({ id: singlePayment.id, amount: singlePayment.amount, currency: singlePayment.currency, payment_date: singlePayment.payment_date })}
                                      title="أرشفة المستند الموقّع"
                                      className="h-7 text-xs bg-cyan-600/90 hover:bg-cyan-500 text-white px-2.5 gap-1 font-semibold shadow-sm"
                                    >
                                      <UploadCloud className="h-3.5 w-3.5" />
                                      أرشفة
                                    </Button>
                                  )}
                                </div>
                              )
                            }
                            // Multi-payment handling
                            const archivedCount = scPayments.filter(p => p.archive?.is_archived).length
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  'text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border',
                                  archivedCount === scPayments.length
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                )}>
                                  <FileCheck className="h-3 w-3" />
                                  مؤرشف ({archivedCount}/{scPayments.length})
                                </span>
                              </div>
                            )
                          })()
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {canPay && (
                            <Button
                              size="sm"
                              onClick={() => setPayingSchedule(sc)}
                              className="h-7 text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white px-3"
                            >
                              دفع
                            </Button>
                          )}
                          {canPay && plan.buyer_phone && (
                            <button
                              onClick={() => handleSendServerReminder(String(sc.id))}
                              disabled={isReminderSending === String(sc.id)}
                              title="إرسال تذكير تلقائي عبر الواتساب"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                            >
                              {isReminderSending === String(sc.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
