'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, ChevronDown, ChevronUp, GripVertical, ImagePlus,
  Layers, Loader2, Star, Upload, X, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getCars, bulkUploadImages, type BulkImageUpdateResult } from '@/lib/api/inventory'

interface SpecGroup {
  brand: string
  model: string
  year: number
  trim: string | null
  count: number
}

interface StagedImage {
  key: string
  file: File
  previewUrl: string
}

const NO_TRIM = '__NO_TRIM__'

function Select({ value, onChange, options, label, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: { v: string; l: string }[]
  label: string
  placeholder?: string
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
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
      </div>
    </div>
  )
}

export function BulkModelUpdateModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [allGroups, setAllGroups] = useState<SpecGroup[] | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(false)

  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [trim, setTrim] = useState('') // '' = كل الفئات

  const [images, setImages] = useState<StagedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkImageUpdateResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingGroups(true)
    getCars({ per_page: 1000 })
      .then(res => {
        if (cancelled) return
        const map = new Map<string, SpecGroup>()
        for (const car of res.items) {
          const trimKey = car.trim && car.trim.trim() !== '' ? car.trim : NO_TRIM
          const key = `${car.brand ?? ''}|${car.model}|${car.manufacturing_year}|${trimKey}`
          if (!map.has(key)) {
            map.set(key, { brand: car.brand ?? '', model: car.model, year: car.manufacturing_year, trim: trimKey === NO_TRIM ? null : car.trim, count: 0 })
          }
          map.get(key)!.count++
        }
        setAllGroups(Array.from(map.values()))
      })
      .catch(() => { if (!cancelled) toast.error('فشل تحميل قائمة السيارات') })
      .finally(() => { if (!cancelled) setLoadingGroups(false) })
    return () => { cancelled = true }
  }, [])

  // خيارات كل خطوة مشتقة من بعضها البعض
  const brandModelOptions = useMemo(() => {
    if (!allGroups) return []
    const seen = new Map<string, number>()
    for (const g of allGroups) {
      const key = `${g.brand}|${g.model}`
      seen.set(key, (seen.get(key) ?? 0) + g.count)
    }
    return Array.from(seen.entries())
      .map(([key, count]) => { const [b, m] = key.split('|'); return { v: key, l: `${b} ${m}`, count } })
      .sort((a, b) => b.count - a.count)
  }, [allGroups])

  const yearOptions = useMemo(() => {
    if (!allGroups || !brand || !model) return []
    const years = new Set<number>()
    for (const g of allGroups) if (g.brand === brand && g.model === model) years.add(g.year)
    return Array.from(years).sort((a, b) => b - a).map(y => ({ v: String(y), l: String(y) }))
  }, [allGroups, brand, model])

  const trimOptions = useMemo(() => {
    if (!allGroups || !brand || !model || !year) return []
    const trims = new Set<string>()
    for (const g of allGroups) if (g.brand === brand && g.model === model && g.year === Number(year) && g.trim) trims.add(g.trim)
    return Array.from(trims).sort().map(t => ({ v: t, l: t }))
  }, [allGroups, brand, model, year])

  const matchedCount = useMemo(() => {
    if (!allGroups || !brand || !model || !year) return 0
    return allGroups
      .filter(g => g.brand === brand && g.model === model && g.year === Number(year) && (!trim || g.trim === trim))
      .reduce((sum, g) => sum + g.count, 0)
  }, [allGroups, brand, model, year, trim])

  function resetSelection(field: 'brandModel' | 'year' | 'trim') {
    if (field === 'brandModel') { setBrand(''); setModel(''); setYear(''); setTrim('') }
    if (field === 'year') { setYear(''); setTrim('') }
    if (field === 'trim') setTrim('')
  }

  function addFiles(fileList: FileList | File[]) {
    const accepted = ['.jpg', '.jpeg', '.png', '.webp']
    const next: StagedImage[] = []
    for (const file of Array.from(fileList)) {
      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
      if (!accepted.includes(ext)) { toast.error(`${file.name}: نوع غير مدعوم`); continue }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: أكبر من 5 ميغابايت`); continue }
      next.push({ key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file, previewUrl: URL.createObjectURL(file) })
    }
    if (next.length) setImages(prev => [...prev, ...next])
  }

  function removeImage(key: string) {
    setImages(prev => prev.filter(img => img.key !== key))
  }
  function moveImage(index: number, dir: -1 | 1) {
    setImages(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  function makeCover(index: number) {
    if (index === 0) return
    setImages(prev => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.unshift(item)
      return next
    })
  }

  const canProceedToConfirm = brand && model && year && images.length > 0 && matchedCount > 0

  async function handleApply() {
    setLoading(true)
    try {
      const res = await bulkUploadImages({
        brand, model, year: Number(year), trim: trim || null,
        replaceExisting,
        files: images.map(i => i.file),
      })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setResult(res)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'فشلت العملية، لم يتم تنفيذ أي تغيير')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">تحديث الصور الجماعي</p>
            <p className="text-[10px] text-muted-foreground">طبّق مجموعة صور على كل سيارات نفس النوع/السنة/الفئة دفعة واحدة</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-5 space-y-5">
          {result ? (
            /* ── نتيجة النجاح ── */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-base font-bold text-foreground">تم التحديث بنجاح</p>
              <div className="grid w-full grid-cols-2 gap-2 text-start">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[10px] text-muted-foreground">سيارات محدَّثة</p>
                  <p className="text-lg font-bold text-foreground">{result.vehiclesUpdated}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[10px] text-muted-foreground">صور مرفوعة</p>
                  <p className="text-lg font-bold text-foreground">{result.imagesUploaded}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[10px] text-muted-foreground">مراجع مُعاد استخدامها</p>
                  <p className="text-lg font-bold text-foreground">{result.imagesReused}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[10px] text-muted-foreground">زمن التنفيذ</p>
                  <p className="text-lg font-bold text-foreground">{result.executionTimeMs}ms</p>
                </div>
              </div>
              <Button onClick={onClose} className="mt-2 w-full">إغلاق</Button>
            </div>
          ) : confirming ? (
            /* ── خطوة التأكيد ── */
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                <p className="text-sm font-bold text-foreground">
                  سيتم تحديث الصور لـ <span className="text-amber-500">{matchedCount}</span> مركبة
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {brand} {model} · {year}{trim ? ` · ${trim}` : ' · كل الفئات'}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-foreground">
                  {images.length} صورة سيتم {replaceExisting ? 'استبدال الصور الحالية بها' : 'إضافتها للصور الحالية'}
                </p>
                {replaceExisting && (
                  <p className="mt-1 text-[10px] text-red-400">تحذير: سيتم حذف كل الصور الحالية لهذه المركبات نهائيًا (الملفات المشتركة مع مركبات أخرى تبقى محفوظة).</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5" disabled={loading} onClick={handleApply}>
                  {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التنفيذ...</> : <><Upload className="h-3.5 w-3.5" /> تأكيد التحديث</>}
                </Button>
                <Button variant="outline" className="flex-1" disabled={loading} onClick={() => setConfirming(false)}>رجوع</Button>
              </div>
            </div>
          ) : (
            <>
              {/* ── اختيار السيارة ── */}
              <div className="grid grid-cols-1 gap-3">
                <Select
                  label="نوع السيارة"
                  placeholder={loadingGroups ? 'جاري التحميل...' : 'اختر الماركة والموديل'}
                  value={brand && model ? `${brand}|${model}` : ''}
                  onChange={(v) => { const [b, m] = v.split('|'); setBrand(b ?? ''); setModel(m ?? ''); resetSelection('year') }}
                  options={brandModelOptions.map(o => ({ v: o.v, l: `${o.l} (${o.count})` }))}
                />
                {brand && model && (
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="السنة" placeholder="اختر السنة" value={year} onChange={(v) => { setYear(v); resetSelection('trim') }} options={yearOptions} />
                    <Select label="الفئة (اختياري)" placeholder="كل الفئات" value={trim} onChange={setTrim} options={trimOptions} />
                  </div>
                )}
                {brand && model && year && (
                  <p className="text-[11px] text-muted-foreground">
                    عدد السيارات المطابقة حاليًا: <strong className="text-foreground">{matchedCount}</strong>
                  </p>
                )}
              </div>

              {brand && model && year && (
                <>
                  {/* ── رفع الصور ── */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">الصور</p>
                    <div
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 text-center transition-colors cursor-pointer',
                        isDragging ? 'border-primary bg-primary/10' : 'border-border/50 bg-secondary/10 hover:border-primary/30 hover:bg-secondary/20',
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files) }}
                    >
                      <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-xs font-medium text-muted-foreground/60">اسحب الصور هنا أو اضغط للاختيار</p>
                      <p className="text-[10px] text-muted-foreground/40">JPG / PNG / WebP — حتى 5 ميغابايت لكل صورة</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
                      />
                    </div>

                    {images.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {images.map((img, idx) => (
                          <div key={img.key} className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/10 p-1.5">
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                            <img src={img.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] text-foreground/80">{img.file.name}</p>
                              {idx === 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                  <Star className="h-2.5 w-2.5 fill-amber-500" /> صورة الغلاف
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              {idx !== 0 && (
                                <button type="button" title="اجعلها الغلاف" onClick={() => makeCover(idx)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-amber-500">
                                  <Star className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button type="button" disabled={idx === 0} onClick={() => moveImage(idx, -1)} className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-20">
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" disabled={idx === images.length - 1} onClick={() => moveImage(idx, 1)} className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-20">
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => removeImage(img.key)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-400">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── وضع الاستبدال ── */}
                  <button
                    type="button"
                    onClick={() => setReplaceExisting(v => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-secondary/10 px-3 py-2.5 text-start"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">استبدال الصور الحالية</p>
                        <p className="text-[10px] text-muted-foreground">إن كان مفعّلاً، تُحذف الصور القديمة لهذه السيارات وتُستبدل بالجديدة</p>
                      </div>
                    </div>
                    <div className={cn('h-5 w-9 shrink-0 rounded-full transition-colors', replaceExisting ? 'bg-primary' : 'bg-secondary')}>
                      <div className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform', replaceExisting ? '-translate-x-4' : 'translate-x-0')} />
                    </div>
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && !confirming && (
          <div className="border-t border-border/30 px-5 py-4 flex gap-2">
            <Button className="flex-1 gap-1.5" disabled={!canProceedToConfirm} onClick={() => setConfirming(true)}>
              <Upload className="h-3.5 w-3.5" /> متابعة {matchedCount > 0 ? `(${matchedCount} سيارة)` : ''}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
          </div>
        )}
      </div>
    </div>
  )
}
