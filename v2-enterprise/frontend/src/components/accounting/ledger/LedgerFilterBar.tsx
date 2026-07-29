'use client'

import { Search, RefreshCw, X } from 'lucide-react'
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
}

export function LedgerFilterBar({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  searchQuery,
  setSearchQuery,
  isFetching,
  refetch,
}: Props) {
  const isFiltered = searchQuery !== ''

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-20">
      
      {/* Search Input */}
      <div className="relative flex-1 max-w-md w-full">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="البحث برقم الحركة أو البيان..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="ps-10 bg-slate-50 border-slate-200 focus:bg-white h-9 rounded-2xl text-xs"
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

      {/* Date Filters & Controls */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">من:</span>
          <Input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="h-9 w-36 border-slate-200 bg-slate-50 text-xs rounded-xl font-numeric" 
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">إلى:</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="h-9 w-36 border-slate-200 bg-slate-50 text-xs rounded-xl font-numeric" 
          />
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={refetch} 
          disabled={isFetching}
          className="h-9 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث حركات الفترة
        </Button>
      </div>

    </div>
  )
}
