'use client'

import React, { useState } from 'react'
import {
  Search, RotateCcw, Filter, LayoutGrid, Eye, Check, Calendar,
  ListFilter, GitFork, EyeOff
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'

export type TableDensity = 'compact' | 'standard' | 'comfortable'
export type ViewMode = 'flat' | 'hierarchy'

interface TrialBalanceToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  startDate: string
  onStartDateChange: (d: string) => void
  endDate: string
  onEndDateChange: (d: string) => void
  accountTypeFilter: string
  onAccountTypeChange: (t: string) => void
  accountLevelFilter: string
  onAccountLevelChange: (l: string) => void
  viewMode: ViewMode
  onViewModeChange: (m: ViewMode) => void
  hideZeroBalances: boolean
  onHideZeroBalancesToggle: () => void
  onResetFilters: () => void
  onRefresh: () => void
  density: TableDensity
  onDensityChange: (d: TableDensity) => void
  columnsVisibility: Record<string, boolean>
  onColumnVisibilityToggle: (colKey: string) => void
  activeFilterCount: number
}

export function TrialBalanceToolbar({
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  accountTypeFilter,
  onAccountTypeChange,
  accountLevelFilter,
  onAccountLevelChange,
  viewMode,
  onViewModeChange,
  hideZeroBalances,
  onHideZeroBalancesToggle,
  onResetFilters,
  onRefresh,
  density,
  onDensityChange,
  columnsVisibility,
  onColumnVisibilityToggle,
  activeFilterCount,
}: TrialBalanceToolbarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-3 shadow-xs space-y-3 text-right dir-rtl" dir="rtl">
      
      {/* Primary Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Search Box & View Mode Toggle */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* View Mode Selector: Flat vs Hierarchy */}
          <div className="inline-flex rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('flat')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'flat' ? 'bg-white text-[#175CD3] shadow-xs' : 'text-[#667085] hover:text-[#101828]'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>عرض مسطح</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('hierarchy')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'hierarchy' ? 'bg-white text-[#175CD3] shadow-xs' : 'text-[#667085] hover:text-[#101828]'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>عرض شجري</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#667085]" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث برقم الحساب، الاسم العربي، أو الانكليزي..."
              className="pr-9 h-9 text-xs border-[#D0D5DD] bg-white text-[#101828] placeholder:text-[#667085] rounded-lg"
            />
          </div>

        </div>

        {/* Date Filter & Option Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          
          {/* Hide Zero Balances Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onHideZeroBalancesToggle}
            className={`h-9 gap-1.5 text-xs font-semibold border-[#D0D5DD] ${
              hideZeroBalances ? 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' : 'bg-white text-[#344054]'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>إخفاء الحسابات الصفرية</span>
          </Button>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#D0D5DD] rounded-lg p-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#667085] ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-[#344054] focus:outline-none"
            />
            <span className="text-[#98A2B3] font-bold">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-[#344054] focus:outline-none"
            />
          </div>

          {/* Advanced Filter Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            className="h-9 gap-1.5 border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
          >
            <Filter className="h-3.5 w-3.5 text-[#667085]" />
            <span>تصفية</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#175CD3] text-white text-[10px] h-4 w-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Density Selector */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 px-2.5 border-[#D0D5DD] text-xs">
                <LayoutGrid className="h-3.5 w-3.5 text-[#667085]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-right">
              <DropdownMenuLabel className="text-[11px] text-[#667085]">كثافة العرض</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDensityChange('compact')} className="gap-2 text-xs cursor-pointer">
                <span>مكثف (Compact)</span>
                {density === 'compact' && <Check className="h-3.5 w-3.5 text-[#175CD3] mr-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDensityChange('standard')} className="gap-2 text-xs cursor-pointer">
                <span>قياسي (Standard)</span>
                {density === 'standard' && <Check className="h-3.5 w-3.5 text-[#175CD3] mr-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDensityChange('comfortable')} className="gap-2 text-xs cursor-pointer">
                <span>مريح (Comfortable)</span>
                {density === 'comfortable' && <Check className="h-3.5 w-3.5 text-[#175CD3] mr-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Visibility */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 px-2.5 border-[#D0D5DD] text-xs">
                <Eye className="h-3.5 w-3.5 text-[#667085]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-right">
              <DropdownMenuLabel className="text-[11px] text-[#667085]">إدارة الأعمدة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={columnsVisibility.opening !== false}
                onCheckedChange={() => onColumnVisibilityToggle('opening')}
                className="text-xs cursor-pointer"
              >
                أعمدة الرصيد الافتتاحي
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnsVisibility.period !== false}
                onCheckedChange={() => onColumnVisibilityToggle('period')}
                className="text-xs cursor-pointer"
              >
                أعمدة حركة الفترة
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnsVisibility.closing !== false}
                onCheckedChange={() => onColumnVisibilityToggle('closing')}
                className="text-xs cursor-pointer"
              >
                أعمدة الرصيد الختامي
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 gap-1 text-xs text-[#B42318] hover:bg-[#FEF3F2]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إلغاء</span>
            </Button>
          )}

        </div>

      </div>

      {/* Advanced Filter Sub-row */}
      {showAdvancedFilters && (
        <div className="pt-2 border-t border-[#EAECF0] grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="text-[11px] font-semibold text-[#344054] mb-1 block">نوع الحساب المحاسبي</label>
            <select
              value={accountTypeFilter}
              onChange={(e) => onAccountTypeChange(e.target.value)}
              className="w-full h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-xs text-[#101828]"
            >
              <option value="all">جميع أنواع الحسابات</option>
              <option value="Asset">الأصول (الموجودات)</option>
              <option value="Liability">الخصوم (المطلوبات)</option>
              <option value="Equity">حقوق الملكية</option>
              <option value="Income">الإيرادات</option>
              <option value="Expense">المصروفات</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#344054] mb-1 block">مستوى الحساب</label>
            <select
              value={accountLevelFilter}
              onChange={(e) => onAccountLevelChange(e.target.value)}
              className="w-full h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-xs text-[#101828]"
            >
              <option value="all">جميع المستويات</option>
              <option value="1">المستوى الأول (رئيسي)</option>
              <option value="2">المستوى الثاني (مجموعة)</option>
              <option value="3">المستوى الثالث (فرعي)</option>
              <option value="4">المستوى الرابع فما فوق (تفصيلي)</option>
            </select>
          </div>
        </div>
      )}

    </div>
  )
}
