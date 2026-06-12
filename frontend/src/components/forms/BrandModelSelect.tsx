'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { CAR_BRANDS, BRAND_NAMES } from '@/data/carBrands'
import { type TrimSpec, getTrims, getTrimSpec } from '@/data/carSpecs'

export type { TrimSpec }

interface Props {
  brand: string
  model: string
  trim: string
  onBrandChange: (brand: string) => void
  onModelChange: (model: string) => void
  onTrimSelect: (trim: string, specs: TrimSpec) => void
  brandError?: string
  modelError?: string
}

function ComboBox({
  value,
  options,
  placeholder,
  onChange,
  disabled,
  error,
  allowCustom,
  hasSpecs,
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (v: string) => void
  disabled?: boolean
  error?: boolean
  allowCustom?: boolean
  hasSpecs?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => { if (open) setQuery('') }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && open) {
        setOpen(false)
        setQuery('')
        if (allowCustom && query.trim()) onChange(query.trim())
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, query, allowCustom, onChange])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
          'border-white/10 bg-white/5 text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-40',
          error && 'border-rose-500/60',
          open && 'border-white/20',
        )}
      >
        <span className={cn('flex items-center gap-1.5', !value && 'text-muted-foreground')}>
          {value || placeholder}
          {value && hasSpecs && (
            <Sparkles className="h-3 w-3 text-amber-400 opacity-70" />
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-popover shadow-lg">
          <div className="border-b border-white/10 px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (filtered.length > 0) { onChange(filtered[0]); setOpen(false) }
                  else if (allowCustom && query.trim()) { onChange(query.trim()); setOpen(false) }
                }
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder="ابحث..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              allowCustom && query.trim() ? (
                <button type="button"
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent/10"
                  onClick={() => { onChange(query.trim()); setOpen(false); setQuery('') }}>
                  <span className="text-muted-foreground me-1">إضافة:</span> {query.trim()}
                </button>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</p>
              )
            ) : (
              filtered.map((opt) => (
                <button key={opt} type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/10"
                  onClick={() => { onChange(opt); setOpen(false); setQuery('') }}>
                  <Check className={cn('h-4 w-4 shrink-0', value === opt ? 'opacity-100' : 'opacity-0')} />
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function BrandModelSelect({
  brand, model, trim,
  onBrandChange, onModelChange, onTrimSelect,
  brandError, modelError,
}: Props) {
  const modelOptions = brand && CAR_BRANDS[brand] ? CAR_BRANDS[brand] : []
  const trimOptions  = brand && model ? getTrims(brand, model) : []
  const hasSpecsForTrim = (t: string) => Object.keys(getTrimSpec(brand, model, t)).length > 0

  const handleTrimChange = (t: string) => {
    const specs = getTrimSpec(brand, model, t)
    onTrimSelect(t, specs)
  }

  return (
    <>
      {/* الماركة */}
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">الماركة *</Label>
        <ComboBox
          value={brand}
          options={BRAND_NAMES}
          placeholder="اختر الماركة..."
          onChange={(v) => { onBrandChange(v); onModelChange(''); onTrimSelect('', {}) }}
          error={!!brandError}
          allowCustom
        />
        {brandError && <p className="mt-1 text-[11px] text-rose-400">{brandError}</p>}
      </div>

      {/* الموديل */}
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">الموديل *</Label>
        <ComboBox
          value={model}
          options={modelOptions}
          placeholder={brand ? 'اختر الموديل...' : 'اختر الماركة أولاً'}
          onChange={(v) => { onModelChange(v); onTrimSelect('', {}) }}
          disabled={!brand}
          error={!!modelError}
          allowCustom
        />
        {modelError && <p className="mt-1 text-[11px] text-rose-400">{modelError}</p>}
      </div>

      {/* الفئة */}
      <div className="sm:col-span-2">
        <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          الفئة
          {trim && hasSpecsForTrim(trim) && (
            <span className="flex items-center gap-1 text-amber-400">
              <Sparkles className="h-3 w-3" />
              <span>تم تعبئة المواصفات تلقائياً</span>
            </span>
          )}
        </Label>
        <ComboBox
          value={trim}
          options={trimOptions}
          placeholder={model ? (trimOptions.length > 0 ? 'اختر الفئة...' : 'أدخل الفئة يدوياً') : 'اختر الموديل أولاً'}
          onChange={handleTrimChange}
          disabled={!model}
          allowCustom
          hasSpecs={trim ? hasSpecsForTrim(trim) : false}
        />
        {trim && hasSpecsForTrim(trim) && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-md border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-[11px]">
            {Object.entries(getTrimSpec(brand, model, trim)).map(([k, v]) => (
              <span key={k} className="flex gap-1">
                <span className="text-muted-foreground">
                  {k === 'transmission' ? 'ناقل الحركة' :
                   k === 'fuel_type'    ? 'الوقود' :
                   k === 'engine_size'  ? 'المحرك' :
                   k === 'cylinders'    ? 'الأسطوانات' :
                   k === 'seat_count'   ? 'المقاعد' :
                   k === 'import_country' ? 'بلد الاستيراد' : k}:
                </span>
                <span className="text-foreground font-medium">
                  {k === 'transmission' ? (v === 'Automatic' ? 'أوتوماتيك' : v === 'Manual' ? 'يدوي' : v as string) :
                   k === 'fuel_type'    ? (v === 'Gasoline' ? 'بنزين' : v === 'Diesel' ? 'ديزل' : v === 'Hybrid' ? 'هايبرد' : v === 'Electric' ? 'كهربائي' : v as string) :
                   k === 'cylinders'    ? (v === 0 ? '—' : `${v} أسطوانة`) :
                   k === 'seat_count'   ? `${v} مقعد` :
                   String(v)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
