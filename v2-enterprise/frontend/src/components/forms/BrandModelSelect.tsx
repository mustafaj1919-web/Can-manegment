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
          'flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition-all text-right',
          'border-slate-200 bg-white text-slate-900',
          'disabled:cursor-not-allowed disabled:opacity-40',
          error && 'border-rose-500',
          open && 'border-emerald-500 ring-2 ring-emerald-500/10',
        )}
      >
        <span className={cn('flex items-center gap-1.5', !value && 'text-slate-400 font-normal')}>
          {value || placeholder}
          {value && hasSpecs && (
            <Sparkles className="h-3.5 w-3.5 text-amber-500 opacity-80" />
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white shadow-xl max-h-64 overflow-hidden">
          <div className="border-b border-slate-100 px-3 py-2 bg-slate-50/50">
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
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 font-family-cairo py-1 text-right"
              dir="rtl"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5" dir="rtl">
            {filtered.length === 0 ? (
              allowCustom && query.trim() ? (
                <button type="button"
                  className="flex w-full items-center rounded-xl px-3 py-2 text-sm hover:bg-slate-50 text-right"
                  onClick={() => { onChange(query.trim()); setOpen(false); setQuery('') }}>
                  <span className="text-slate-400 me-1">إضافة:</span> {query.trim()}
                </button>
              ) : (
                <p className="py-6 text-center text-sm text-slate-400 font-family-cairo">لا توجد نتائج</p>
              )
            ) : (
              filtered.map((opt) => (
                <button key={opt} type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-right"
                  onClick={() => { onChange(opt); setOpen(false); setQuery('') }}>
                  <span className={cn(value === opt ? 'font-bold text-emerald-600' : 'text-slate-700')}>{opt}</span>
                  <Check className={cn('h-4 w-4 shrink-0 text-emerald-600', value === opt ? 'opacity-100' : 'opacity-0')} />
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
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-500">الماركة *</label>
        <ComboBox
          value={brand}
          options={BRAND_NAMES}
          placeholder="اختر الماركة..."
          onChange={(v) => { onBrandChange(v); onModelChange(''); onTrimSelect('', {}) }}
          error={!!brandError}
          allowCustom
        />
        {brandError && <p className="text-[11px] text-rose-600 font-medium">{brandError}</p>}
      </div>

      {/* الموديل */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-500">الموديل *</label>
        <ComboBox
          value={model}
          options={modelOptions}
          placeholder={brand ? 'اختر الموديل...' : 'اختر الماركة أولاً'}
          onChange={(v) => { onModelChange(v); onTrimSelect('', {}) }}
          disabled={!brand}
          error={!!modelError}
          allowCustom
        />
        {modelError && <p className="text-[11px] text-rose-600 font-medium">{modelError}</p>}
      </div>

      {/* الفئة */}
      <div className="sm:col-span-2 space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          الفئة
          {trim && hasSpecsForTrim(trim) && (
            <span className="flex items-center gap-1 text-amber-500">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px]">تم تعبئة المواصفات تلقائياً</span>
            </span>
          )}
        </label>
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
