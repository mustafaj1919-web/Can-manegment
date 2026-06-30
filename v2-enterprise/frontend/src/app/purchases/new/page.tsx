'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle, CalendarDays, CheckCircle2, Loader2, ScanLine, Layers, FileText,
  Plus, X, Check, Image as ImageIcon, Upload, ChevronDown, ChevronRight, Camera, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatMoney } from '@/lib/utils'
import { createPurchase, getSellers } from '@/lib/api/purchases'
import { bulkCreatePurchase } from '@/lib/api/suppliers'
import { uploadCarPhotos } from '@/lib/api/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandModelSelect, type TrimSpec } from '@/components/forms/BrandModelSelect'
import { useVinDecoder } from '@/lib/useVinDecoder'
import { useBranchStore } from '@/lib/stores/branch-store'
import { DetailHeader } from '@/components/shared/DetailHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { QuickSupplierDialog } from '@/components/purchases/QuickSupplierDialog'
import { OcrScannerDialog, type OcrResultData } from '@/components/ui/OcrScannerDialog'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'نقداً' },
  { value: 'Bank', label: 'حوالة مصرفية' },
  { value: 'Cheque', label: 'شيك / آجل' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] text-rose-400">{msg}</p>
}

// ── Per-vehicle detail row ────────────────────────────────────────────────────

interface PerCarDetail {
  color: string
  plateNumber: string
  notes: string
  targetSellingPrice: string
  photos: File[]
  previewUrls: string[]
}

function emptyDetail(): PerCarDetail {
  return { color: '', plateNumber: '', notes: '', targetSellingPrice: '', photos: [], previewUrls: [] }
}

function VehicleDetailRow({
  index,
  vin,
  detail,
  sharedColor,
  onChange,
}: {
  index: number
  vin: string
  detail: PerCarDetail
  sharedColor: string
  onChange: (d: PerCarDetail) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasData = detail.color || detail.plateNumber || detail.notes || detail.photos.length > 0

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!newFiles.length) return
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    onChange({
      ...detail,
      photos: [...detail.photos, ...newFiles],
      previewUrls: [...detail.previewUrls, ...newPreviews],
    })
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(detail.previewUrls[i])
    const photos = detail.photos.filter((_, j) => j !== i)
    const previewUrls = detail.previewUrls.filter((_, j) => j !== i)
    onChange({ ...detail, photos, previewUrls })
  }

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      hasData ? 'border-violet-500/30 bg-violet-500/5' : 'border-border/30 bg-secondary/10',
    )}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-right"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/60 text-[10px] font-bold text-muted-foreground">
          {index + 1}
        </span>
        <span className="font-mono text-xs font-semibold text-foreground flex-1 text-left">{vin}</span>
        <div className="flex items-center gap-2 mr-auto">
          {detail.photos.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <Camera className="h-3 w-3" />
              {detail.photos.length}
            </span>
          )}
          {detail.color && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
              {detail.color}
            </span>
          )}
          {detail.plateNumber && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              {detail.plateNumber}
            </span>
          )}
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          }
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/20 px-3 pb-3 pt-2.5 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground/70">اللون</Label>
              <Input
                value={detail.color}
                onChange={e => onChange({ ...detail, color: e.target.value })}
                placeholder={sharedColor || 'مشترك'}
                className="h-8 bg-secondary/30 border-border/50 text-xs"
              />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground/70">رقم اللوحة</Label>
              <Input
                value={detail.plateNumber}
                onChange={e => onChange({ ...detail, plateNumber: e.target.value })}
                placeholder="اختياري"
                className="h-8 bg-secondary/30 border-border/50 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground/70">سعر البيع (تخصيص)</Label>
              <Input
                type="number"
                value={detail.targetSellingPrice}
                onChange={e => onChange({ ...detail, targetSellingPrice: e.target.value })}
                placeholder="مشترك"
                className="h-8 bg-secondary/30 border-border/50 text-xs font-numeric"
              />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] text-muted-foreground/70">ملاحظات</Label>
              <Input
                value={detail.notes}
                onChange={e => onChange({ ...detail, notes: e.target.value })}
                placeholder="اختياري"
                className="h-8 bg-secondary/30 border-border/50 text-xs"
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground/70">صور السيارة</Label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded-md border border-border/50 bg-secondary/40 px-2 py-1 text-[10px] text-muted-foreground hover:border-violet-500/40 hover:text-violet-300 transition-colors"
              >
                <Upload className="h-3 w-3" />
                إضافة صور
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
                onClick={e => { (e.target as HTMLInputElement).value = '' }}
              />
            </div>

            {detail.previewUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.previewUrls.map((url, i) => (
                  <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-md border border-border/40">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-violet-600/80 text-[9px] text-center text-white py-0.5">غلاف</span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border/50 text-muted-foreground/40 hover:border-violet-500/40 hover:text-violet-400 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground/50 hover:border-violet-500/30 hover:text-violet-400 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                اسحب الصور هنا أو اضغط لاختيارها
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bulk Purchase Form ────────────────────────────────────────────────────────

function BulkPurchaseForm({ sellers, sellersLoading }: { sellers: any[]; sellersLoading: boolean }) {
  const router = useRouter()
  const { branches, activeBranch } = useBranchStore()
  const [selectedBranchId, setSelectedBranchId] = useState('')

  useEffect(() => {
    if (activeBranch && !selectedBranchId) {
      setSelectedBranchId(String(activeBranch.id))
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0].id))
    }
  }, [activeBranch, branches, selectedBranchId])

  const [sellerId, setSellerId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [totalPaidAmount, setTotalPaidAmount] = useState('')
  const [vinInput, setVinInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [perCarDetails, setPerCarDetails] = useState<Record<string, PerCarDetail>>({})
  const [uploading, setUploading] = useState(false)

  const vinList = vinInput.split('\n').map(v => v.trim()).filter(Boolean)
  const uniqueVins = [...new Set(vinList)]
  const hasDuplicates = vinList.length !== uniqueVins.length

  // Sync perCarDetails when VINs change
  useEffect(() => {
    setPerCarDetails(prev => {
      const next: Record<string, PerCarDetail> = {}
      for (const vin of uniqueVins) {
        next[vin] = prev[vin] ?? emptyDetail()
      }
      return next
    })
  }, [vinInput])

  const pricePerCar = parseFloat(purchasePrice) || 0
  const carCount = uniqueVins.length || 1
  const totalInvoice = pricePerCar * carCount
  const totalPaid = parseFloat(totalPaidAmount) || 0
  const totalRemaining = Math.max(0, totalInvoice - totalPaid)
  const paidPerCar = carCount > 0 ? totalPaid / carCount : 0

  const hasAnyPhotos = uniqueVins.some(v => (perCarDetails[v]?.photos?.length ?? 0) > 0)
  const totalPhotos = uniqueVins.reduce((sum, v) => sum + (perCarDetails[v]?.photos?.length ?? 0), 0)

  const bulkMut = useMutation({
    mutationFn: bulkCreatePurchase,
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'حدث خطأ أثناء الشراء الجماعي'),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!sellerId) e.sellerId = 'اختر المورد'
    if (!model.trim()) e.model = 'الموديل مطلوب'
    if (!year || isNaN(Number(year))) e.year = 'السنة مطلوبة'
    if (!purchasePrice || Number(purchasePrice) <= 0) e.purchasePrice = 'سعر الشراء مطلوب'
    if (uniqueVins.length === 0) e.vins = 'أدخل رقم شاصي واحد على الأقل'
    if (uniqueVins.length > 50) e.vins = 'الحد الأقصى 50 سيارة في عملية واحدة'
    if (hasDuplicates) e.vins = 'يوجد أرقام شاصي مكررة'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    // Build overrides (only VINs with non-empty overrides)
    const vehicleOverrides: Record<string, any> = {}
    for (const vin of uniqueVins) {
      const d = perCarDetails[vin]
      if (d && (d.color || d.plateNumber || d.notes || d.targetSellingPrice)) {
        vehicleOverrides[vin] = {
          color: d.color || undefined,
          plateNumber: d.plateNumber || undefined,
          notes: d.notes || undefined,
          targetSellingPrice: d.targetSellingPrice ? Number(d.targetSellingPrice) : undefined,
        }
      }
    }

    let res: any
    try {
      res = await bulkMut.mutateAsync({
        supplierId: sellerId,
        brand: brand.trim() || undefined,
        model: model.trim(),
        year: Number(year),
        color: color.trim() || undefined,
        purchaseCost: Number(purchasePrice),
        paidAmount: totalPaid > 0 ? paidPerCar : 0,
        targetSellingPrice: Number(targetPrice) || Number(purchasePrice),
        paymentMethod: paymentMethod as any,
        chassisNumbers: uniqueVins,
        vehicleOverrides: Object.keys(vehicleOverrides).length > 0 ? vehicleOverrides : undefined,
        branchId: selectedBranchId || undefined,
      })
    } catch {
      return
    }

    // Upload photos if any
    const chassisMap: Record<string, string> = res?.chassis_to_vehicle_id ?? {}
    const vinsWithPhotos = uniqueVins.filter(v => (perCarDetails[v]?.photos?.length ?? 0) > 0)

    if (vinsWithPhotos.length > 0) {
      setUploading(true)
      let uploadedCount = 0
      for (const vin of vinsWithPhotos) {
        const vehicleId = chassisMap[vin]
        if (!vehicleId) continue
        try {
          await uploadCarPhotos(vehicleId, perCarDetails[vin].photos)
          uploadedCount++
        } catch {
          toast.error(`فشل رفع صور ${vin}`)
        }
      }
      setUploading(false)
      if (uploadedCount > 0) toast.success(`تم رفع صور ${uploadedCount} سيارة`)
    }

    if (res?.errors?.length > 0) {
      toast.warning(`تم تسجيل ${res.created_count} سيارة. أخطاء: ${res.errors.join('، ')}`)
    } else {
      toast.success(res?.message || `تم تسجيل ${res?.created_count ?? uniqueVins.length} سيارة`)
    }

    router.push('/purchases')
  }

  const isPending = bulkMut.isPending || uploading

  return (
    <div className="space-y-5">
      {/* Supplier & Branch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="المورد">
          <div className="mb-3 flex justify-end">
            <QuickSupplierDialog onSuccess={(id) => { setSellerId(id); setErrors(e => ({ ...e, sellerId: '' })) }} />
          </div>
          {sellersLoading ? (
            <div className="h-10 animate-pulse rounded-lg bg-secondary/40" />
          ) : (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">اختر المورد *</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.sellerId && 'border-rose-500/60')}>
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sellers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.full_name || s.name} — {s.phone || '-'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.sellerId} />
            </div>
          )}
        </SectionCard>

        <SectionCard title="فرع الشراء والتسجيل">
          <div className="mb-3 flex h-[28px] justify-end" />
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">اختر الفرع المستهدف للشراء *</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="bg-secondary/30 border-border/60">
                <SelectValue placeholder="اختر الفرع" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {branches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SectionCard>
      </div>

      {/* Shared car details */}
      <SectionCard title="بيانات السيارة (مشتركة)" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BrandModelSelect
          brand={brand}
          model={model}
          trim=""
          onBrandChange={(b) => { setBrand(b); setModel('') }}
          onModelChange={(m) => setModel(m)}
          onTrimSelect={() => {}}
          brandError={errors.brand}
          modelError={errors.model}
        />
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سنة الصنع *</Label>
          <Input type="number" value={year} onChange={e => setYear(e.target.value)}
            className={cn('font-numeric bg-secondary/30 border-border/60', errors.year && 'border-rose-500/60')} />
          <FieldError msg={errors.year} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">اللون (مشترك)</Label>
          <Input value={color} onChange={e => setColor(e.target.value)}
            placeholder="أبيض، أسود... (يمكن تخصيص لكل سيارة)"
            className="bg-secondary/30 border-border/60" />
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard title="السعر والدفع" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سعر الشراء لكل سيارة (IQD) *</Label>
          <Input type="number" min="0" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
            className={cn('font-numeric bg-secondary/30 border-border/60', errors.purchasePrice && 'border-rose-500/60')} />
          <FieldError msg={errors.purchasePrice} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سعر البيع المستهدف (IQD)</Label>
          <Input type="number" min="0" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
            placeholder="اختياري — يمكن تخصيص لكل سيارة"
            className="font-numeric bg-secondary/30 border-border/60" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع الفوري</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">المدفوع الآن — إجمالي كل السيارات (IQD)</Label>
          <Input
            type="number" min="0" step="any"
            value={totalPaidAmount}
            onChange={e => setTotalPaidAmount(e.target.value)}
            placeholder="0 = آجل كامل على حساب المورد"
            className="font-numeric bg-secondary/30 border-border/60"
          />
        </div>
        {pricePerCar > 0 && (
          <div className="sm:col-span-2 grid grid-cols-3 gap-3 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2.5 text-[11px]">
            <div className="text-center">
              <p className="text-muted-foreground/60">إجمالي الفاتورة</p>
              <p className="font-semibold font-numeric text-foreground money">{formatMoney(totalInvoice, 'IQD')}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground/60">المدفوع الآن</p>
              <p className="font-semibold font-numeric text-emerald-400 money">{formatMoney(totalPaid, 'IQD')}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground/60">المتبقي على المورد</p>
              <p className="font-semibold font-numeric text-rose-400 money">{formatMoney(totalRemaining, 'IQD')}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Chassis numbers */}
      <SectionCard title="أرقام الشاصي">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">أدخل رقم شاصي واحد في كل سطر (حتى 50 سيارة)</p>
          <span className={cn('text-xs font-semibold', uniqueVins.length > 50 ? 'text-rose-400' : 'text-emerald-400')}>
            {uniqueVins.length} سيارة
          </span>
        </div>
        <textarea
          value={vinInput}
          onChange={e => { setVinInput(e.target.value); setErrors(err => ({ ...err, vins: '' })) }}
          placeholder={'WBAWL31040PY38989\nWBAWL31040PY38990\nWBAWL31040PY38991'}
          rows={6}
          dir="ltr"
          className={cn(
            'w-full rounded-md border bg-secondary/30 px-3 py-2 font-mono text-sm text-left resize-none focus:outline-none focus:ring-1 focus:ring-ring',
            errors.vins ? 'border-rose-500/60' : 'border-border/60',
          )}
        />
        {hasDuplicates && (
          <p className="mt-1 text-[11px] text-amber-400">تحذير: يوجد أرقام مكررة — سيتم إزالة التكرار تلقائياً ({vinList.length - uniqueVins.length} مكرر)</p>
        )}
        <FieldError msg={errors.vins} />

        {uniqueVins.length > 0 && Number(purchasePrice) > 0 && (
          <div className="mt-3 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">إجمالي التكلفة: </span>
            <span className="font-semibold text-amber-400">{formatMoney(uniqueVins.length * Number(purchasePrice), 'IQD')}</span>
            <span className="mx-2 text-border">·</span>
            <span className="text-muted-foreground">{uniqueVins.length} سيارة × {formatMoney(Number(purchasePrice), 'IQD')}</span>
          </div>
        )}
      </SectionCard>

      {/* Per-vehicle details & photos */}
      {uniqueVins.length > 0 && (
        <SectionCard
          title={
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-violet-400" />
              <span>تفاصيل وصور كل سيارة</span>
              {totalPhotos > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {totalPhotos} صورة
                </span>
              )}
            </div>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground/70">
            اضغط على كل سيارة لتخصيص لونها، رقم لوحتها، وإضافة صورها. الحقول اختيارية.
          </p>
          <div className="space-y-2">
            {uniqueVins.map((vin, i) => (
              <VehicleDetailRow
                key={vin}
                index={i}
                vin={vin}
                detail={perCarDetails[vin] ?? emptyDetail()}
                sharedColor={color}
                onChange={d => setPerCarDetails(prev => ({ ...prev, [vin]: d }))}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>إلغاء</Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || uniqueVins.length === 0}
          className="min-w-[200px] gap-2 bg-amber-600 text-white hover:bg-amber-500"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {uploading ? 'جاري رفع الصور...' : 'جاري التسجيل...'}
            </>
          ) : (
            <>
              <Layers className="h-4 w-4" />
              تسجيل {uniqueVins.length > 0 ? `${uniqueVins.length} سيارة` : ''}
              {totalPhotos > 0 && <span className="text-amber-200 text-[10px]">+ {totalPhotos} صورة</span>}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Single Purchase Form ──────────────────────────────────────────────────────

function SinglePurchaseForm({ sellers, sellersLoading }: { sellers: any[]; sellersLoading: boolean }) {
  const router = useRouter()
  const [sellerId, setSellerId] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [trim, setTrim] = useState('')
  const [transmission, setTransmission] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [engineSize, setEngineSize] = useState('')
  const [cylinders, setCylinders] = useState('')
  const [seatCount, setSeatCount] = useState('')
  const [importCountry, setImportCountry] = useState('')

  const handleTrimSelect = (t: string, specs: TrimSpec) => {
    setTrim(t)
    if (specs.transmission) setTransmission(specs.transmission)
    if (specs.fuel_type) setFuelType(specs.fuel_type)
    if (specs.engine_size) setEngineSize(specs.engine_size)
    if (specs.cylinders !== undefined) setCylinders(specs.cylinders === 0 ? '' : String(specs.cylinders))
    if (specs.seat_count) setSeatCount(String(specs.seat_count))
    if (specs.import_country) setImportCountry(specs.import_country)
  }

  const { decode: decodeVin, loading: vinLoading } = useVinDecoder()

  async function handleVinDecode() {
    const result = await decodeVin(vin)
    if (!result) { toast.error('لم يتم العثور على بيانات لهذا الشاصي'); return }
    if (result.brand) { setBrand(result.brand); setModel(''); setTrim('') }
    if (result.model) setModel(result.model)
    if (result.year) setYear(result.year)
    const parts = [result.brand, result.model, result.year].filter(Boolean)
    toast.success(`✓ ${parts.join(' ')} — تم تعبئة البيانات تلقائياً`)
  }

  const [isOcrOpen, setIsOcrOpen] = useState(false)

  const handleOcrComplete = (data: OcrResultData) => {
    if (data.brand) { setBrand(data.brand); setModel(''); setTrim('') }
    if (data.model) setModel(data.model)
    if (data.year) setYear(String(data.year))
    if (data.color) setColor(data.color)
    if (data.chassisNumber) setVin(data.chassisNumber)
    if (data.plateNumber) setPlateNumber(data.plateNumber)
  }

  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [color, setColor] = useState('')
  const [vin, setVin] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [mileage, setMileage] = useState('0')
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [numMonths, setNumMonths] = useState('')
  const [startDate, setStartDate] = useState('')

  const price = Number.parseFloat(purchasePrice) || 0
  const paid = Number.parseFloat(paidAmount) || 0
  const remaining = Math.max(price - paid, 0)

  const selectedSeller = sellers.find((s) => String(s.id) === sellerId)

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: (res) => {
      toast.success(`تم إنشاء فاتورة الشراء ${res.invoice_number}`)
      router.push(`/purchases/${res.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'حدث خطأ أثناء إنشاء الفاتورة'),
  })

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!sellerId) nextErrors.sellerId = 'اختر البائع'
    if (!brand.trim()) nextErrors.brand = 'الماركة مطلوبة'
    if (!model.trim()) nextErrors.model = 'الموديل مطلوب'
    if (!year || Number.isNaN(Number.parseInt(year, 10))) nextErrors.year = 'سنة الصنع مطلوبة'
    if (!color.trim()) nextErrors.color = 'اللون مطلوب'
    if (!vin.trim()) nextErrors.vin = 'رقم الشاصي مطلوب'
    if (!purchasePrice || price <= 0) nextErrors.purchasePrice = 'سعر الشراء مطلوب'
    if (!paymentMethod) nextErrors.paymentMethod = 'اختر طريقة الدفع'
    if (!purchaseDate) nextErrors.purchaseDate = 'تاريخ الشراء مطلوب'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      brand: brand.trim(),
      model: model.trim(),
      manufacturing_year: Number.parseInt(year, 10),
      color: color.trim(),
      vin: vin.trim(),
      plate_number: plateNumber.trim(),
      mileage: Number.parseInt(mileage || '0', 10),
      seller_id: sellerId,
      purchase_price: price,
      paid_amount: paid,
      currency,
      payment_method: paymentMethod,
      purchase_date: purchaseDate,
      number_of_months: numMonths ? parseInt(numMonths) : null,
      installment_start_date: startDate || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SectionCard title="البائع">
        <div className="mb-3 flex justify-end">
          <QuickSupplierDialog onSuccess={(id) => { setSellerId(id); setErrors((e) => ({ ...e, sellerId: '' })) }} />
        </div>
        {sellersLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-secondary/40" />
        ) : sellers.length === 0 ? (
          <div className="py-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-cyan-400/60" />
            <p className="text-sm text-muted-foreground">لا يوجد موردون مسجّلون بعد — أضِف موردًا للبدء.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">اختر البائع *</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.sellerId && 'border-rose-500/60')}>
                  <SelectValue placeholder="اختر البائع" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={String(seller.id)}>
                      {(seller.full_name || seller.name)} — {seller.phone || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.sellerId} />
            </div>
            {selectedSeller && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs">
                <span className="text-muted-foreground">رقم الهاتف</span>
                <span className="text-foreground">{selectedSeller.phone || '-'}</span>
                <span className="text-muted-foreground">رقم الهوية</span>
                <span className="text-foreground">{selectedSeller.id_number || '-'}</span>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="السيارة" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BrandModelSelect
          brand={brand} model={model} trim={trim}
          onBrandChange={(b) => { setBrand(b); setModel(''); setTrim('') }}
          onModelChange={(m) => { setModel(m); setTrim('') }}
          onTrimSelect={handleTrimSelect}
          brandError={errors.brand} modelError={errors.model}
        />
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سنة الصنع *</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)}
            className={cn('font-numeric bg-secondary/30 border-border/60', errors.year && 'border-rose-500/60')} />
          <FieldError msg={errors.year} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">اللون *</Label>
          <Input value={color} onChange={(e) => setColor(e.target.value)}
            className={cn('bg-secondary/30 border-border/60', errors.color && 'border-rose-500/60')} />
          <FieldError msg={errors.color} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الشاصي *</Label>
          <div className="flex gap-2">
            <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN — 17 حرف"
              className={cn('font-numeric bg-secondary/30 border-border/60', errors.vin && 'border-rose-500/60')} />
            <button
              type="button" onClick={handleVinDecode}
              disabled={vinLoading || vin.trim().length !== 17}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary/30 text-muted-foreground transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              title="فك الترميز القياسي"
            >
              {vinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            </button>
            <button
              type="button" onClick={() => setIsOcrOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:text-emerald-400"
              title="مسح السنوية بالذكاء الاصطناعي (AI OCR)"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
          <FieldError msg={errors.vin} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">رقم اللوحة</Label>
          <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)}
            className="font-numeric bg-secondary/30 border-border/60" />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs text-muted-foreground">المسافة المقطوعة (كم)</Label>
          <Input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)}
            className="font-numeric bg-secondary/30 border-border/60" />
        </div>
      </SectionCard>

      <SectionCard title="السعر والدفع" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">العملة</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
            <SelectTrigger className="bg-secondary/30 border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">دولار (USD)</SelectItem>
              <SelectItem value="IQD">دينار عراقي (IQD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">طريقة الدفع *</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className={cn('bg-secondary/30 border-border/60', errors.paymentMethod && 'border-rose-500/60')}>
              <SelectValue placeholder="اختر الطريقة" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError msg={errors.paymentMethod} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">سعر الشراء *</Label>
          <Input type="number" min="0" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
            className={cn('font-numeric bg-secondary/30 border-border/60', errors.purchasePrice && 'border-rose-500/60')} />
          <FieldError msg={errors.purchasePrice} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">المبلغ المدفوع</Label>
          <Input type="number" min="0" step="any" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
            className="font-numeric bg-secondary/30 border-border/60" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">تاريخ الشراء *</Label>
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
            className={cn('bg-secondary/30 border-border/60', errors.purchaseDate && 'border-rose-500/60')} />
          <FieldError msg={errors.purchaseDate} />
        </div>
        {price > 0 && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border/40 bg-secondary/20 px-4 py-2.5">
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">السعر</span>
              <span className="font-semibold tabular-nums font-numeric text-foreground money">{formatMoney(price, currency)}</span>
            </span>
            <span className="pointer-events-none select-none text-border">·</span>
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">مدفوع</span>
              <span className="font-semibold tabular-nums font-numeric text-emerald-400 money">{formatMoney(paid, currency)}</span>
            </span>
            <span className="pointer-events-none select-none text-border">·</span>
            <span className="flex items-baseline gap-1.5 text-[11px]">
              <span className="text-muted-foreground/60">متبقي</span>
              <span className={cn('font-semibold tabular-nums font-numeric money', remaining > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                {formatMoney(remaining, currency)}
              </span>
            </span>
          </div>
        )}
      </SectionCard>

      {price > 0 && paid < price && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-400" />
            <p className="text-sm font-semibold text-cyan-300">جدول سداد الأقساط للمورد (اختياري)</p>
          </div>
          <p className="text-xs text-muted-foreground">
            المبلغ المتبقي: <strong className="text-rose-400">{formatMoney(price - paid, 'IQD')}</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">عدد الأشهر</Label>
              <Input type="number" min="1" placeholder="6" value={numMonths} onChange={e => setNumMonths(e.target.value)}
                className="bg-secondary/30 border-border/60" />
              {numMonths && parseInt(numMonths) > 0 && price > paid && (
                <p className="text-[11px] text-cyan-400/80 mt-1">
                  القسط الشهري: {formatMoney((price - paid) / parseInt(numMonths), 'IQD')}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">تاريخ بدء الأقساط</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-secondary/30 border-border/60" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>إلغاء</Button>
        <Button type="submit" disabled={mutation.isPending || sellersLoading} className="min-w-[150px] gap-2 bg-blue-600 text-white hover:bg-blue-500">
          {mutation.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الحفظ...</>
            : <><CheckCircle2 className="h-4 w-4" />حفظ الفاتورة</>
          }
        </Button>
      </div>

      <OcrScannerDialog
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onScanComplete={handleOcrComplete}
      />
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewPurchasePage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ['purchase-sellers'],
    queryFn: getSellers,
    staleTime: 60_000,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <DetailHeader
        backHref="/purchases"
        backLabel="المشتريات"
        title="فاتورة شراء جديدة"
        subtitle="شراء سيارة من مورد وإضافتها للمخزون"
      />

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border bg-card p-1 gap-1">
        <button
          onClick={() => setMode('single')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
            mode === 'single' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText className="h-4 w-4" />
          سيارة واحدة
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
            mode === 'bulk' ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Layers className="h-4 w-4" />
          شراء جماعي
        </button>
      </div>

      {mode === 'single'
        ? <SinglePurchaseForm sellers={sellers} sellersLoading={sellersLoading} />
        : <BulkPurchaseForm sellers={sellers} sellersLoading={sellersLoading} />
      }
    </div>
  )
}
