'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, FileText, Loader2, Paperclip, ScanLine, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AuthImage, openAuthDocument } from '@/components/shared/AuthImage'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  createCustomer,
  deleteCustomerDocument,
  DOCUMENT_SLOTS,
  DOC_TYPE_LABEL,
  uploadCustomerDocument,
  updateCustomer,
  scanDocument,
} from '@/lib/api/customers'
import type { Customer, CustomerDocument, CustomerDocumentType, CustomerPayload } from '@/lib/api/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'

interface CustomerFormProps {
  customer?: Customer
}

const ID_TYPES = [
  { value: 'National ID',     label: 'البطاقة الوطنية' },
  { value: 'Passport',        label: 'جواز السفر' },
  { value: 'Residence Card',  label: 'بطاقة السكن' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router  = useRouter()
  const isEdit  = Boolean(customer)
  const token   = useAuthStore(s => s.token)

  const [name,          setName]          = useState(customer?.full_name || customer?.name || '')
  const [phone,         setPhone]         = useState(customer?.phone || '')
  const [customerType,  setCustomerType]  = useState<'Individual' | 'Company'>((customer?.customer_type as 'Individual' | 'Company') || 'Individual')
  const [idType,        setIdType]        = useState(customer?.id_type || '')
  const [idNumber,      setIdNumber]      = useState(customer?.id_number || '')
  const [idIssueDate,   setIdIssueDate]   = useState(customer?.id_issue_date  ? customer.id_issue_date.slice(0, 10)  : '')
  const [idExpiryDate,  setIdExpiryDate]  = useState(customer?.id_expiry_date ? customer.id_expiry_date.slice(0, 10) : '')
  const [address,       setAddress]       = useState(customer?.address || '')
  const [nationality,   setNationality]   = useState(customer?.nationality || '')
  const [dateOfBirth,   setDateOfBirth]   = useState(customer?.date_of_birth  ? customer.date_of_birth.slice(0, 10)  : '')
  const [notes,         setNotes]         = useState(customer?.notes || '')
  const [errors,        setErrors]        = useState<Record<string, string>>({})

  const [pendingFiles,  setPendingFiles]  = useState<Partial<Record<CustomerDocumentType, File>>>({})
  const [localDocs,     setLocalDocs]     = useState<CustomerDocument[]>(customer?.documents ?? [])
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const [scanningSlot,  setScanningSlot]  = useState<CustomerDocumentType | null>(null)
  const [scanCrop,      setScanCrop]      = useState<{
    slotType: CustomerDocumentType
    dataUrl: string
    mimeType: string
    filename: string
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const fileInputRefs = useRef<Partial<Record<CustomerDocumentType, HTMLInputElement | null>>>({})

  async function handleDeleteDoc(docId: number) {
    if (!customer?.id) return
    setDeletingDocId(docId)
    try {
      await deleteCustomerDocument(customer.id, docId)
      setLocalDocs((prev) => prev.filter((d) => d.id !== docId))
      toast.success('تم حذف الوثيقة')
    } catch {
      toast.error('فشل حذف الوثيقة')
    } finally {
      setDeletingDocId(null)
    }
  }

  async function handleScan(slotType: CustomerDocumentType) {
    setScanningSlot(slotType)
    try {
      const result = await scanDocument()

      if ('error' in result) {
        switch (result.error) {
          case 'scan_cancelled':
            return

          case 'no_scanner':
            toast.error('لم يتم العثور على ماسح ضوئي — تحقق من توصيل الطابعة/الماسح بالجهاز')
            return

          case 'scanner_unavailable':
            toast.error('خدمة المسح غير مفعلة — يرجى تثبيت pywin32 وإعادة تشغيل التطبيق')
            return

          case 'scan_failed':
            toast.error(('message' in result && result.message) ? result.message : 'فشل المسح الضوئي — تحقق من توصيل الماسح')
            return

          case 'scan_busy':
            toast.error(('message' in result && result.message) ? result.message : 'يوجد مسح ضوئي قيد التنفيذ حالياً')
            return

          case 'scan_too_large':
            toast.error(('message' in result && result.message) ? result.message : 'حجم صورة المسح كبير جداً')
            return

          default:
            toast.error('خطأ غير متوقع في المسح الضوئي')
            return
        }
      }

      setScanCrop({
        slotType,
        dataUrl: `data:${result.mime_type};base64,${result.data}`,
        mimeType: result.mime_type,
        filename: result.filename,
        x: 10,
        y: 18,
        w: 80,
        h: 50,
      })
      toast.success('تم المسح الضوئي — احفظ النموذج لرفع الوثيقة')

    } catch {
      toast.error('تعذر الاتصال بالخادم — تأكد من تشغيل التطبيق وأعد المحاولة')
    } finally {
      setScanningSlot(null)
    }
  }

  function setCardCrop() {
    setScanCrop((prev) => prev ? { ...prev, x: 8, y: 22, w: 84, h: 53 } : prev)
  }

  function setFullCrop() {
    setScanCrop((prev) => prev ? { ...prev, x: 0, y: 0, w: 100, h: 100 } : prev)
  }

  async function confirmScanCrop() {
    if (!scanCrop) return

    const img = await loadImage(scanCrop.dataUrl)
    const sx  = Math.round((scanCrop.x / 100) * img.naturalWidth)
    const sy  = Math.round((scanCrop.y / 100) * img.naturalHeight)
    const sw  = Math.max(1, Math.round((scanCrop.w / 100) * img.naturalWidth))
    const sh  = Math.max(1, Math.round((scanCrop.h / 100) * img.naturalHeight))

    const canvas       = document.createElement('canvas')
    canvas.width       = Math.min(1400, sw)
    canvas.height      = Math.round(canvas.width * (sh / sw))
    const ctx          = canvas.getContext('2d')
    if (!ctx) { toast.error('تعذر تجهيز صورة المسح'); return }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })
    if (!blob) { toast.error('تعذر قص الصورة'); return }

    const file = new File([blob], `scan-${scanCrop.slotType}.jpg`, { type: 'image/jpeg' })
    setPendingFiles((prev) => ({ ...prev, [scanCrop.slotType]: file }))
    setScanCrop(null)
    toast.success('تم اعتماد المسح. اضغط حفظ لرفع الوثيقة.')
  }

  function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img    = new Image()
      img.onload   = () => resolve(img)
      img.onerror  = reject
      img.src      = src
    })
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!name.trim())     nextErrors.name     = 'الاسم مطلوب'
    if (!phone.trim())    nextErrors.phone    = 'رقم الهاتف مطلوب'
    if (!idNumber.trim()) nextErrors.idNumber = 'رقم الهوية مطلوب'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function optional(value: string) {
    return value.trim() || undefined
  }

  function buildPayload(): CustomerPayload {
    return {
      name:          name.trim(),
      phone:         phone.trim(),
      id_number:     idNumber.trim(),
      customer_type: customerType,
      address:       optional(address),
      id_type:       idType || undefined,
      id_issue_date:  idIssueDate  || undefined,
      id_expiry_date: idExpiryDate || undefined,
      nationality:   optional(nationality),
      date_of_birth: dateOfBirth || undefined,
      notes:         optional(notes),
    }
  }

  const mutation = useMutation({
    mutationFn: () => (
      isEdit
        ? updateCustomer(customer!.id, buildPayload())
        : createCustomer(buildPayload())
    ),
    onSuccess: async (savedCustomer) => {
      const uploads = Object.entries(pendingFiles) as [CustomerDocumentType, File][]
      for (const [docType, file] of uploads) {
        try {
          await uploadCustomerDocument(savedCustomer.id, docType, file)
        } catch {
          toast.warning(`تعذر رفع وثيقة ${DOC_TYPE_LABEL[docType]}`)
        }
      }
      toast.success(isEdit ? 'تم تحديث بيانات العميل' : 'تمت إضافة العميل بنجاح')
      router.push(`/customers/${savedCustomer.id}`)
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { error?: string } } }
      toast.error(apiError?.response?.data?.error ?? 'حدث خطأ أثناء حفظ البيانات')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl">

      <div className="mb-5">
        <DetailHeader
          backHref={isEdit ? `/customers/${customer!.id}` : '/customers'}
          backLabel={isEdit ? 'تفاصيل العميل' : 'العملاء'}
          title={isEdit ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          subtitle={isEdit ? (customer?.full_name || customer?.name) : 'أدخل بيانات العميل الأساسية والرسمية'}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 pb-4">

          {/* ── Section 1: Basic data ── */}
          <SectionCard title="البيانات الأساسية" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">الاسم الكامل *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم العميل الكامل"
                className={cn('bg-secondary/30 border-border/60', errors.name && 'border-rose-500/60')}
              />
              <FieldError msg={errors.name} />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">نوع العميل *</Label>
              <Select value={customerType} onValueChange={(value) => setCustomerType(value as 'Individual' | 'Company')}>
                <SelectTrigger className="bg-secondary/30 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">فرد</SelectItem>
                  <SelectItem value="Company">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الهاتف *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07X XXXX XXXX"
                className={cn('bg-secondary/30 border-border/60', errors.phone && 'border-rose-500/60')}
              />
              <FieldError msg={errors.phone} />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">الجنسية</Label>
              <Input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="عراقي"
                className="bg-secondary/30 border-border/60"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ الميلاد</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="bg-secondary/30 border-border/60"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">العنوان</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المدينة، الحي، الشارع"
                className="bg-secondary/30 border-border/60"
              />
            </div>
          </SectionCard>

          {/* ── Section 2: Official ID ── */}
          <SectionCard title="الهوية الرسمية" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">نوع الهوية</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger className="bg-secondary/30 border-border/60">
                  <SelectValue placeholder="اختر نوع الهوية" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الهوية *</Label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="رقم الهوية أو جواز السفر"
                className={cn('font-numeric bg-secondary/30 border-border/60', errors.idNumber && 'border-rose-500/60')}
              />
              <FieldError msg={errors.idNumber} />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ الإصدار</Label>
              <Input
                type="date"
                value={idIssueDate}
                onChange={(e) => setIdIssueDate(e.target.value)}
                className="bg-secondary/30 border-border/60"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ الانتهاء</Label>
              <Input
                type="date"
                value={idExpiryDate}
                onChange={(e) => setIdExpiryDate(e.target.value)}
                className="bg-secondary/30 border-border/60"
              />
            </div>
          </SectionCard>

          {/* ── Section 3: Document uploads ── */}
          <SectionCard
            title="وثائق العميل"
            description="JPG · PNG · WEBP · PDF — يتم الرفع بعد حفظ البيانات"
            contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {DOCUMENT_SLOTS.map((slot) => {
              const existingDocs = localDocs.filter((d) => d.document_type === slot.type)
              const pendingFile  = pendingFiles[slot.type]

              return (
                <div key={slot.type} className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">{slot.label}</Label>

                  {existingDocs.map((doc) => {
                    const isPdf = doc.filename.endsWith('.pdf')
                    const url   = `/api/Customers/${customer!.id}/documents/${doc.filename}`
                    return (
                      <div key={doc.id} className="relative overflow-hidden rounded-lg border border-border/40 bg-secondary/20">
                        {isPdf ? (
                          <button type="button" onClick={() => openAuthDocument(url, token)}
                            className="flex h-24 w-full items-center justify-center gap-2 text-xs text-cyan-400 hover:text-cyan-300">
                            <FileText className="h-8 w-8 opacity-60" />
                            <span className="truncate">{doc.original_filename ?? 'PDF'}</span>
                          </button>
                        ) : (
                          <button type="button" onClick={() => openAuthDocument(url, token)} className="w-full">
                            <AuthImage src={url} alt={slot.label}
                              className="aspect-[1.586] w-full bg-black/20 object-contain hover:opacity-90 transition-opacity" />
                          </button>
                        )}
                        {isEdit && (
                          <button type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            disabled={deletingDocId === doc.id}
                            className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-500 transition-colors"
                            aria-label="حذف الوثيقة">
                            {deletingDocId === doc.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Trash2 className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {pendingFile && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        <span className="truncate text-foreground">{pendingFile.name}</span>
                      </div>
                      <button type="button"
                        aria-label="حذف الملف"
                        onClick={() => setPendingFiles((prev) => { const next = { ...prev }; delete next[slot.type]; return next })}
                        className="shrink-0 text-muted-foreground hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {!pendingFile && (slot.multiple || existingDocs.length === 0) && (
                    <div className="flex gap-1.5">
                      <button type="button"
                        onClick={() => fileInputRefs.current[slot.type]?.click()}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground hover:border-cyan-500/40 hover:text-cyan-400 transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        اختر ملف (صورة / PDF)
                      </button>
                    </div>
                  )}

                  <input
                    ref={(el) => { fileInputRefs.current[slot.type] = el }}
                    type="file"
                    aria-label={`رفع ${slot.label}`}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setPendingFiles((prev) => ({ ...prev, [slot.type]: file }))
                      e.target.value = ''
                    }}
                  />
                </div>
              )
            })}
          </SectionCard>

          {/* ── Section 4: Scan crop preview (conditional) ── */}
          {scanCrop && (
            <SectionCard
              title="معاينة المسح وتحديد الأبعاد"
              description="حرّك الإطار الأزرق حتى يغطي الوثيقة فقط، ثم اضغط اعتماد."
              className="border-cyan-500/25"
              noPadding
            >
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
                <div className="relative overflow-hidden rounded-lg border border-border/40 bg-black/30">
                  <img src={scanCrop.dataUrl} alt="معاينة المسح" className="max-h-[520px] w-full object-contain" />
                  <div
                    className="absolute border-2 border-cyan-400 bg-cyan-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]"
                    style={{
                      left:   `${scanCrop.x}%`,
                      top:    `${scanCrop.y}%`,
                      width:  `${scanCrop.w}%`,
                      height: `${scanCrop.h}%`,
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={setCardCrop} className="flex-1">حجم كارت</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={setFullCrop}  className="flex-1">كامل</Button>
                  </div>

                  {([
                    ['x', 'يمين / يسار'],
                    ['y', 'فوق / جوه'],
                    ['w', 'العرض'],
                    ['h', 'الارتفاع'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block space-y-1.5">
                      <span className="text-xs text-muted-foreground">{label}: {Math.round(scanCrop[key])}%</span>
                      <input
                        type="range"
                        min={key === 'w' || key === 'h' ? 10 : 0}
                        max={key === 'x' ? 100 - scanCrop.w : key === 'y' ? 100 - scanCrop.h : 100}
                        value={scanCrop[key]}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          setScanCrop((prev) => {
                            if (!prev) return prev
                            const next = { ...prev, [key]: value }
                            if (key === 'w') next.x = Math.min(next.x, 100 - value)
                            if (key === 'h') next.y = Math.min(next.y, 100 - value)
                            return next
                          })
                        }}
                        className="w-full accent-cyan-400"
                      />
                    </label>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setScanCrop(null)}>إلغاء</Button>
                    <Button type="button" className="flex-1 bg-cyan-600 text-white hover:bg-cyan-500" onClick={confirmScanCrop}>اعتماد</Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Section 5: Notes ── */}
          <SectionCard title="ملاحظات">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية اختيارية"
              rows={3}
              className="w-full resize-none rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </SectionCard>

        </div>

        {/* ── Sticky action bar ── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border/40 bg-background/95 py-4 backdrop-blur-sm">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="min-w-[150px] gap-2 bg-cyan-600 text-white hover:bg-cyan-500"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" />{isEdit ? 'حفظ التعديلات' : 'إضافة العميل'}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
