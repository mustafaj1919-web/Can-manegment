'use client'

import { Search, X, SlidersHorizontal, EyeOff, Maximize2, Minimize2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const TYPE_OPTS = [
  { value: 'all', label: 'كل أنواع الحسابات' },
  { value: 'Asset', label: 'موجودات (أصول)' },
  { value: 'Liability', label: 'مطلوبات (التزامات)' },
  { value: 'Equity', label: 'حقوق الملكية' },
  { value: 'Income', label: 'إيرادات' },
  { value: 'Expense', label: 'مصروفات' },
]

interface TrialBalanceFiltersProps {
  search: string
  setSearch: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  hideZero: boolean
  setHideZero: (v: boolean) => void
  density: 'comfortable' | 'compact'
  setDensity: (d: 'comfortable' | 'compact') => void
  isFilterActive: boolean
  onReset: () => void
}

export function TrialBalanceFilters({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  hideZero,
  setHideZero,
  density,
  setDensity,
  isFilterActive,
  onReset,
}: TrialBalanceFiltersProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4" dir="rtl">
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Input (Largest width) */}
        <div className="relative flex-1 w-full">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="ابحث برمز الحساب أو الاسم العربي..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-10 h-12 rounded-xl border-[#E2E8F0] bg-slate-50/50 text-sm font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          {/* Type Select */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-12 w-[180px] rounded-xl border-[#E2E8F0] bg-slate-50/50 text-xs font-bold text-[#0F172A]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Hide Zero Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#64748B] hover:text-[#0F172A] bg-slate-50/50 border border-[#E2E8F0] px-3.5 h-12 rounded-xl transition-all">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={e => setHideZero(e.target.checked)}
              className="h-4 w-4 rounded border-[#E2E8F0] text-emerald-600 focus:ring-emerald-500/20"
            />
            <span>إخفاء الحسابات الصفرية</span>
          </label>

          {/* Density Mode Switcher */}
          <div className="flex items-center bg-slate-50/50 border border-[#E2E8F0] p-1 rounded-xl h-12">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                density === 'comfortable'
                  ? 'bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              مريح
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                density === 'compact'
                  ? 'bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              مكثف
            </button>
          </div>

          {/* Reset Action */}
          {isFilterActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-12 px-3 text-xs text-[#64748B] hover:text-rose-600 rounded-xl gap-1.5"
            >
              <X className="h-4 w-4" />
              <span>إعادة ضبط</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
