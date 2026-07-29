'use client'

import { useState } from 'react'
import { Search, RefreshCw, X, Download, Printer, Banknote, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  startDate: string
  endDate: string
  setStartDate: (val: string) => void
  setEndDate: (val: string) => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  isFetching: boolean
  refetch: () => void
  onExport: () => void
  onPrint: () => void
  onPayClick: () => void
  hasEntries: boolean
}

export function LedgerToolbar({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  searchQuery,
  setSearchQuery,
  isFetching,
  refetch,
  onExport,
  onPrint,
  onPayClick,
  hasEntries,
}: Props) {
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const isFiltered = searchQuery !== ''

  return (
    <div className="space-y-3 no-print">
      
      {/* Main Single Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* FILTERS GROUP */}
        <div className="hidden md:flex flex-1 items-center gap-3 max-w-3xl">
          {/* Search input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder="البحث برقم الحركة أو البيان..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ps-10 bg-slate-50/70 border-[#E2E8F0] focus:bg-white h-11 rounded-xl text-xs font-medium"
            />
            {isFiltered && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#64748B] shrink-0">من:</span>
            <Input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="h-11 w-36 border-[#E2E8F0] bg-slate-50/70 text-xs rounded-xl font-numeric font-medium" 
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#64748B] shrink-0">إلى:</span>
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="h-11 w-36 border-[#E2E8F0] bg-slate-50/70 text-xs rounded-xl font-numeric font-medium" 
            />
          </div>
        </div>

        {/* Mobile controls row */}
        <div className="flex md:hidden items-center justify-between gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex-1 h-11 rounded-xl border-[#E2E8F0] text-xs font-semibold gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            تصفية الحركات
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch} 
            disabled={isFetching}
            className="h-11 w-11 rounded-xl border-[#E2E8F0] p-0 flex items-center justify-center"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* ACTIONS GROUP */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch} 
            disabled={isFetching}
            className="hidden md:inline-flex h-11 rounded-xl border-[#E2E8F0] hover:bg-slate-50 text-[#475569] gap-2 text-xs font-semibold px-4"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={!hasEntries}
            className="flex-1 md:flex-none h-11 rounded-xl border-[#E2E8F0] hover:bg-slate-50 text-[#475569] gap-2 text-xs font-semibold px-4"
          >
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            disabled={!hasEntries}
            className="flex-1 md:flex-none h-11 rounded-xl border-[#E2E8F0] hover:bg-slate-50 text-[#475569] gap-2 text-xs font-semibold px-4"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>

          <Button
            size="sm"
            onClick={onPayClick}
            className="flex-1 md:flex-none h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs px-5 shadow-sm"
          >
            <Banknote className="h-4 w-4" />
            سداد للمورد
          </Button>
        </div>

      </div>

      {/* Collapsible Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="md:hidden bg-white border border-[#E2E8F0] rounded-[22px] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div>
            <label className="block text-[13px] font-medium text-[#64748B] mb-2">البحث المالي</label>
            <div className="relative">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="البحث برقم الحركة أو البيان..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-10 bg-slate-50 border-[#E2E8F0] focus:bg-white h-11 rounded-xl text-xs font-medium"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#64748B] mb-2">من تاريخ</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="h-11 w-full border-[#E2E8F0] bg-slate-50 text-xs rounded-xl font-numeric font-medium" 
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#64748B] mb-2">إلى تاريخ</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="h-11 w-full border-[#E2E8F0] bg-slate-50 text-xs rounded-xl font-numeric font-medium" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
