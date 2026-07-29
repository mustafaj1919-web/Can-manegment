'use client'

import React, { useState } from 'react'
import {
  Search, RotateCcw, Filter, LayoutGrid, Eye, Check, Calendar
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'

export type TableDensity = 'compact' | 'standard' | 'comfortable'

interface JournalEntriesToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  refTypeFilter: string
  onRefTypeChange: (type: string) => void
  statusFilter: string
  onStatusChange: (status: string) => void
  startDate: string
  onStartDateChange: (d: string) => void
  endDate: string
  onEndDateChange: (d: string) => void
  onResetFilters: () => void
  onRefresh: () => void
  density: TableDensity
  onDensityChange: (d: TableDensity) => void
  columnsVisibility: Record<string, boolean>
  onColumnVisibilityToggle: (colKey: string) => void
  activeFilterCount: number
}

export function JournalEntriesToolbar({
  searchQuery,
  onSearchChange,
  refTypeFilter,
  onRefTypeChange,
  statusFilter,
  onStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilters,
  onRefresh,
  density,
  onDensityChange,
  columnsVisibility,
  onColumnVisibilityToggle,
  activeFilterCount,
}: JournalEntriesToolbarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-3 shadow-xs space-y-3 text-right dir-rtl" dir="rtl">
      
      {/* Primary Toolbar Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Search Box & Quick Type Select */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* Operation Type Dropdown */}
          <div className="w-full sm:w-[220px] shrink-0">
            <select
              value={refTypeFilter}
              onChange={(e) => onRefTypeChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#101828] focus:border-[#175CD3] focus:outline-none"
            >
              <option value="all">كل أنواع القيود والعمليات</option>
              <option value="sale">فاتورة مبيعات</option>
              <option value="purchase">فاتورة مشتريات</option>
              <option value="payment">سند قبض / تحصيل</option>
              <option value="expense">سند صرف مصاريف</option>
              <option value="income">إيراد آخر</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#667085]" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث برقم القيد، المرجع، أو البيان..."
              className="pr-9 h-9 text-xs border-[#D0D5DD] bg-white text-[#101828] placeholder:text-[#667085] rounded-lg"
            />
          </div>

        </div>

        {/* Date Filter & Options Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          
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
            <span>فلترة</span>
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

          {/* Column Visibility Manager */}
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
                checked={columnsVisibility.ref_type !== false}
                onCheckedChange={() => onColumnVisibilityToggle('ref_type')}
                className="text-xs cursor-pointer"
              >
                نوع القيد
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnsVisibility.lines_count !== false}
                onCheckedChange={() => onColumnVisibilityToggle('lines_count')}
                className="text-xs cursor-pointer"
              >
                عدد البنود
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={columnsVisibility.status !== false}
                onCheckedChange={() => onColumnVisibilityToggle('status')}
                className="text-xs cursor-pointer"
              >
                الحالة
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
              <span>إلغاء الفلاتر</span>
            </Button>
          )}

        </div>

      </div>

      {/* Expandable Advanced Filters */}
      {showAdvancedFilters && (
        <div className="pt-2 border-t border-[#EAECF0] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="text-[11px] font-semibold text-[#344054] mb-1 block">حالة القيد</label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-xs text-[#101828]"
            >
              <option value="all">جميع الحالات (مرحل / مسودة / معكوس)</option>
              <option value="posted">مرحل</option>
              <option value="draft">مسودة</option>
              <option value="reversed">معكوس</option>
            </select>
          </div>
        </div>
      )}

    </div>
  )
}
