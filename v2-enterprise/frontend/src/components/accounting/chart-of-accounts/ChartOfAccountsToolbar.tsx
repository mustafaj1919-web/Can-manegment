'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Search, RefreshCw, X, Maximize2, Minimize2,
  SlidersHorizontal, LayoutList, Check
} from 'lucide-react'
import { CLASSIFICATION_LABELS } from '@/lib/api/accounting'
import { cn } from '@/lib/utils'

export type TableDensity = 'compact' | 'standard' | 'comfortable'

interface ChartOfAccountsToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  clfFilter: string
  onClfChange: (value: string) => void
  levelFilter: string
  onLevelChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  onlyWithBalance: boolean
  onOnlyWithBalanceToggle: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onRefresh: () => void
  onResetFilters: () => void
  activeFilterCount: number
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  columnsVisibility: Record<string, boolean>
  onColumnVisibilityToggle: (columnKey: string) => void
}

const ACCOUNT_TYPES = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'Asset', label: 'موجودات (الأصول)' },
  { value: 'Liability', label: 'مطلوبات (الالتزامات)' },
  { value: 'Equity', label: 'حقوق الملكية' },
  { value: 'Income', label: 'إيرادات' },
  { value: 'Expense', label: 'مصروفات' },
]

const ACCOUNT_LEVELS = [
  { value: 'all', label: 'جميع المستويات' },
  { value: 'رئيسي', label: 'مستوى 1 — رئيسي' },
  { value: 'فرعي', label: 'مستوى 2 — فرعي' },
  { value: 'تفصيلي', label: 'مستوى 3 — تفصيلي' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'active', label: 'الحسابات النشطة' },
  { value: 'archived', label: 'الحسابات المؤرشفة' },
]

const CLASSIFICATIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'جميع التصانيف' },
  ...Object.entries(CLASSIFICATION_LABELS)
    .filter(([k]) => k !== '')
    .map(([k, label]) => ({ value: k, label }))
]

export function ChartOfAccountsToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  clfFilter,
  onClfChange,
  levelFilter,
  onLevelChange,
  statusFilter,
  onStatusChange,
  onlyWithBalance,
  onOnlyWithBalanceToggle,
  onExpandAll,
  onCollapseAll,
  onRefresh,
  onResetFilters,
  activeFilterCount,
  density,
  onDensityChange,
  columnsVisibility,
  onColumnVisibilityToggle,
}: ChartOfAccountsToolbarProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[#EAECF0] bg-white p-3.5 shadow-xs text-right dir-rtl" dir="rtl">
      
      {/* Primary Toolbar Line: Single row layout on desktop */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* RTL Right Side: Search & Primary Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[320px]">
          {/* Search Box (Min 320px flex-1) */}
          <div className="relative min-w-[320px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="البحث برمز الحساب أو الاسم..."
              className="h-10 pr-9 pl-4 text-sm font-medium border-[#D0D5DD] bg-white focus:border-[#175CD3] rounded-[7px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#101828]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Account Type Select Filter */}
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="h-10 border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] w-[140px] rounded-[7px]">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent align="end" className="text-right">
              {ACCOUNT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Classification Select Filter */}
          <Select value={clfFilter} onValueChange={onClfChange}>
            <SelectTrigger className="h-10 border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] w-[145px] rounded-[7px]">
              <SelectValue placeholder="التصنيف" />
            </SelectTrigger>
            <SelectContent align="end" className="text-right">
              {CLASSIFICATIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account Level Select Filter */}
          <Select value={levelFilter} onValueChange={onLevelChange}>
            <SelectTrigger className="h-10 border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] w-[135px] rounded-[7px]">
              <SelectValue placeholder="المستوى" />
            </SelectTrigger>
            <SelectContent align="end" className="text-right">
              {ACCOUNT_LEVELS.map(l => (
                <SelectItem key={l.value} value={l.value} className="text-xs">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account Status Select Filter */}
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10 border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] w-[130px] rounded-[7px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent align="end" className="text-right">
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* RTL Left Side: Non-Zero Toggle, Tree Expand, Preferences & Refresh */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Non-Zero Balances Toggle */}
          <button
            type="button"
            onClick={onOnlyWithBalanceToggle}
            className={cn(
              'h-10 px-3 py-1.5 text-xs font-semibold rounded-[7px] border transition-colors flex items-center gap-1.5',
              onlyWithBalance
                ? 'border-[#175CD3] bg-[#EFF8FF] text-[#175CD3]'
                : 'border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]'
            )}
          >
            <Check className={cn('h-3.5 w-3.5', onlyWithBalance ? 'opacity-100' : 'opacity-0')} />
            <span>ذات رصيد فقط</span>
          </button>

          {/* Tree Expand / Collapse Controls */}
          <div className="flex items-center rounded-[7px] border border-[#D0D5DD] bg-white p-0.5 h-10">
            <button
              type="button"
              onClick={onExpandAll}
              title="توسيع كافة المستويات"
              className="px-2.5 py-1 text-xs font-semibold text-[#344054] hover:text-[#175CD3] flex items-center gap-1 rounded hover:bg-[#F9FAFB] transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">توسيع الكل</span>
            </button>
            <div className="h-4 w-[1px] bg-[#EAECF0]" />
            <button
              type="button"
              onClick={onCollapseAll}
              title="طي كافة المستويات"
              className="px-2.5 py-1 text-xs font-semibold text-[#344054] hover:text-[#175CD3] flex items-center gap-1 rounded hover:bg-[#F9FAFB] transition-colors"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">طي الكل</span>
            </button>
          </div>

          {/* Density Menu */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] gap-1.5 px-3 rounded-[7px]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#667085]" />
                <span className="hidden sm:inline">الكثافة:</span>
                <span className="font-bold text-[#101828]">
                  {density === 'compact' ? 'مضغوط' : density === 'standard' ? 'قياسي' : 'مريح'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 text-right">
              <DropdownMenuLabel className="text-[11px] text-[#98A2B3]">ارتفاع الصفوف</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDensityChange('compact')} className="text-xs font-medium py-1.5">
                <span>مضغوط (40px)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDensityChange('standard')} className="text-xs font-medium py-1.5">
                <span>قياسي (48px)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDensityChange('comfortable')} className="text-xs font-medium py-1.5">
                <span>مريح (56px)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Visibility Menu */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] gap-1.5 px-3 rounded-[7px]"
              >
                <LayoutList className="h-3.5 w-3.5 text-[#667085]" />
                <span className="hidden sm:inline">الأعمدة</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-right">
              <DropdownMenuLabel className="text-[11px] text-[#98A2B3]">إظهار / إخفاء الأعمدة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: 'level', label: 'المستوى' },
                { key: 'type', label: 'النوع' },
                { key: 'classification', label: 'التصنيف' },
                { key: 'debit', label: 'المدين' },
                { key: 'credit', label: 'الدائن' },
                { key: 'balance', label: 'صافي الرصيد' },
                { key: 'status', label: 'الحالة' },
              ].map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={columnsVisibility[col.key] !== false}
                  onCheckedChange={() => onColumnVisibilityToggle(col.key)}
                  className="text-xs cursor-pointer"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-10 w-10 p-0 border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB] rounded-[7px]"
            title="تحديث البيانات"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Reset Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-10 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] px-2.5 gap-1 rounded-[7px]"
            >
              <X className="h-3.5 w-3.5" />
              <span>إعادة ضبط ({activeFilterCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EAECF0]">
          <span className="text-xs text-[#98A2B3]">الفلاتر النشطة:</span>
          {typeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF8FF] text-[#175CD3] px-2.5 py-0.5 text-xs font-semibold border border-[#B2DDFF]">
              النوع: {ACCOUNT_TYPES.find(t => t.value === typeFilter)?.label}
              <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => onTypeChange('all')} />
            </span>
          )}
          {clfFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8F9FC] text-[#344054] px-2.5 py-0.5 text-xs font-semibold border border-[#D0D5DD]">
              التصنيف: {CLASSIFICATIONS.find(c => c.value === clfFilter)?.label}
              <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => onClfChange('all')} />
            </span>
          )}
          {levelFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF0C7] text-[#B54708] px-2.5 py-0.5 text-xs font-semibold border border-[#FEDF89]">
              المستوى: {ACCOUNT_LEVELS.find(l => l.value === levelFilter)?.label}
              <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => onLevelChange('all')} />
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F4F7] text-[#344054] px-2.5 py-0.5 text-xs font-semibold border border-[#D0D5DD]">
              الحالة: {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
              <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => onStatusChange('all')} />
            </span>
          )}
          {onlyWithBalance && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] text-[#027A48] px-2.5 py-0.5 text-xs font-semibold border border-[#ABE5C6]">
              ذات رصيد فقط
              <X className="h-3.5 w-3.5 cursor-pointer" onClick={onOnlyWithBalanceToggle} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
