'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, ImagePlus, Layers, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { bulkUploadPhoto, bulkUpdateSpecs, getCars } from '@/lib/api/inventory'

interface ModelGroup {
  brand: string
  model: string
  count: number
}

const FUEL_OPTS  = [{ v: '', l: 'لا تغيير' }, { v: 'Gasoline', l: 'بنزين' }, { v: 'Diesel', l: 'ديزل' }, { v: 'Hybrid', l: 'هايبرد' }, { v: 'Electric', l: 'كهربائي' }]
const TRANS_OPTS = [{ v: '', l: 'لا تغيير' }, { v: 'Automatic', l: 'أوتوماتيك' }, { v: 'Manual', l: 'يدوي' }, { v: 'CVT', l: 'CVT' }, { v: 'DCT', l: 'DCT' }]
const COND_OPTS  = [{ v: '', l: 'لا تغيير' }, { v: 'New', l: 'جديدة' }, { v: 'Used', l: 'مستعملة' }, { v: 'Damaged', l: 'متضررة' }]

function Select({ value, onChange, opts, label }: {
  value: string
  onChange: (v: string) => void
  opts: { v: string; l: string }[]
  label: string
}) {
  return (
    <div className="relative">
      <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 pr-8 text-xs text-foreground focus:border-primary/50 focus:outline-none"
        >
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
      </div>
    </div>
  )
}

export function BulkModelUpdateModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [groups, setGroups]         = useState<ModelGroup[] | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<ModelGroup | null>(null)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [condition, setCondition]     = useState('')
  const [fuelType, setFuelType]       = useState('')
  const [transmission, setTransmission] = useState('')
  const [engineSize, setEngineSize]   = useState('')
  const [cylinders, setCylinders]     = useState('')
  const [seatCount, setSeatCount]     = useState('')
  const [importCountry, setImportCountry] = useState('')

  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ updated: number; action: string } | null>(null)

  async function loadGroups() {
    setLoadingGroups(true)
    try {
      const all = await getCars({ per_page: 1000 })
      const map = new Map<string, ModelGroup>()
      for (const car of all.items) {
        const key = `${car.brand ?? ''}|${car.model}`
        if (!map.has(key)) {
          map.set(key, { brand: car.brand ?? '', model: car.model, count: 0 })
        }
        map.get(key)!.count++
      }
      setGroups(Array.from(map.values()).sort((a, b) => b.count - a.count))
    } catch {
      toast.error('فشل تحميل قائمة الموديلات')
    } finally {
      setLoadingGroups(false)
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  const hasSpecs = condition || fuelType || transmission || engineSize || cylinders || seatCount || importCountry
  const canSubmit = selectedGroup && (photoFile || hasSpecs)

  async function handleSubmit() {
    if (!selectedGroup || !canSubmit) return
    setLoading(true)
    try {
      let updatedCount = 0
      let actions: string[] = []

      if (photoFile) {
        const res = await bulkUploadPhoto(selectedGroup.brand, selectedGroup.model, photoFile)
        updatedCount = res.updated_count
        actions.push('الصور')
      }

      if (hasSpecs) {
        const res = await bulkUpdateSpecs(selectedGroup.brand, selectedGroup.model, {
          condition: condition || undefined,
          fuelType:  fuelType  || undefined,
          transmission: transmission || undefined,
          engineSize: engineSize || undefined,
          cylinders: cylinders ? Number(cylinders) : undefined,
          seatCount: seatCount ? Number(seatCount) : undefined,
          importCountry: importCountry || undefined,
        })
        updatedCount = res.updated_count
        actions.push('المواصفات')
      }

      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setResult({ updated: updatedCount, action: actions.join(' و') })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  // On mount: load groups
  if (groups === null && !loadingGroups) loadGroups()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">تحديث جماعي حسب نوع السيارة</p>
            <p className="text-[10px] text-muted-foreground">اختر موديلاً وأضف صوراً أو مواصفات لكل سيارات هذا الموديل</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">

          {result ? (
            /* ── نتيجة النجاح ── */
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">تم التحديث بنجاح</p>
                <p className="text-xs text-muted-foreground mt-1">
                  تم تحديث {result.action} لـ <strong className="text-foreground">{result.updated}</strong> سيارة
                </p>
              </div>
              <Button onClick={onClose} className="mt-2">إغلاق</Button>
            </div>
          ) : (
            <>
              {/* ── Step 1: اختيار الموديل ── */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">اختر نوع السيارة</p>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري تحميل الموديلات...
                  </div>
                ) : groups && groups.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border/40 bg-secondary/10 p-2">
                    {groups.map(g => (
                      <button
                        key={`${g.brand}|${g.model}`}
                        type="button"
                        onClick={() => setSelectedGroup(g)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors text-start',
                          selectedGroup?.model === g.model && selectedGroup?.brand === g.brand
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-foreground/80 hover:bg-secondary/50',
                        )}
                      >
                        <span className="font-semibold">{g.brand} {g.model}</span>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {g.count} سيارة
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">لا يوجد سيارات في المخزون</p>
                )}
              </div>

              {selectedGroup && (
                <>
                  {/* ── Step 2: رفع صورة ── */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">صورة مشتركة (اختياري)</p>
                    <div
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors cursor-pointer',
                        photoFile ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-secondary/10 hover:border-primary/30 hover:bg-secondary/20',
                      )}
                      style={{ minHeight: photoFile ? 'auto' : 96 }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <div className="relative w-full">
                          <img src={photoPreview} alt="preview" className="h-36 w-full rounded-xl object-cover" />
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setPhotoFile(null); setPhotoPreview(null) }}
                            className="absolute top-2 end-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="absolute bottom-2 start-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                            ستُضاف لـ {selectedGroup.count} سيارة
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                          <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
                          <p className="text-xs font-medium text-muted-foreground/60">اضغط لرفع صورة</p>
                          <p className="text-[10px] text-muted-foreground/40">JPG / PNG / WebP — حتى 5 MB</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </div>
                  </div>

                  {/* ── Step 3: مواصفات ── */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-3">مواصفات مشتركة (اختياري)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={condition}    onChange={setCondition}    opts={COND_OPTS}  label="الحالة" />
                      <Select value={fuelType}     onChange={setFuelType}     opts={FUEL_OPTS}  label="نوع الوقود" />
                      <Select value={transmission} onChange={setTransmission} opts={TRANS_OPTS} label="ناقل الحركة" />
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">حجم المحرك</label>
                        <Input value={engineSize} onChange={e => setEngineSize(e.target.value)} placeholder="مثال: 2.0T" className="h-9 text-xs border-border/50 bg-secondary/30" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">عدد الأسطوانات</label>
                        <Input type="number" value={cylinders} onChange={e => setCylinders(e.target.value)} placeholder="4" className="h-9 text-xs border-border/50 bg-secondary/30" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">عدد المقاعد</label>
                        <Input type="number" value={seatCount} onChange={e => setSeatCount(e.target.value)} placeholder="5" className="h-9 text-xs border-border/50 bg-secondary/30" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">بلد الاستيراد</label>
                        <Input value={importCountry} onChange={e => setImportCountry(e.target.value)} placeholder="الصين" className="h-9 text-xs border-border/50 bg-secondary/30" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t border-border/30 px-5 py-4 flex gap-2">
            <Button
              className="flex-1 gap-1.5"
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحديث...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> تحديث {selectedGroup ? `(${selectedGroup.count} سيارة)` : ''}</>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
          </div>
        )}
      </div>
    </div>
  )
}
