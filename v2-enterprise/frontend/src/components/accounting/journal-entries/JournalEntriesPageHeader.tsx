'use client'

import React from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet, FileText, Printer, RefreshCw, SlidersHorizontal,
  ChevronLeft, Building2, Calendar, DollarSign, Clock, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface JournalEntriesPageHeaderProps {
  onNewEntry: () => void
  onExportExcel: () => void
  onExportPdf: () => void
  onPrint: () => void
  onRefresh: () => void
  isRefreshing?: boolean
  lastSyncTime?: string
  currentBranch?: string
}

export function JournalEntriesPageHeader({
  onNewEntry,
  onExportExcel,
  onExportPdf,
  onPrint,
  onRefresh,
  isRefreshing = false,
  lastSyncTime = 'منذ لحظات',
  currentBranch = 'الفرع الرئيسي',
}: JournalEntriesPageHeaderProps) {
  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white p-4 sm:p-5 shadow-xs text-right dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Title & Metadata Region */}
        <div className="space-y-1.5">
          
          {/* RTL Enterprise Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-[#667085]">
            <Link href="/" className="hover:text-[#101828] transition-colors">
              الرئيسية
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-[#98A2B3] rotate-180" />
            <Link href="/accounting" className="hover:text-[#101828] transition-colors">
              المحاسبة
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-[#98A2B3] rotate-180" />
            <span className="text-[#175CD3] font-bold">القيود اليومية</span>
          </nav>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828]">
              القيود اليومية
            </h1>
            <p className="text-xs sm:text-sm text-[#475467] mt-0.5">
              إدارة وإنشاء واعتماد القيود المحاسبية اليومية ومتابعة الترحيل والعكس الدوري
            </p>
          </div>

          {/* Context Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F2F4F7] border border-[#D0D5DD] px-2.5 py-1 text-[#344054] font-medium">
              <Calendar className="h-3.5 w-3.5 text-[#667085]" />
              <span>السنة المالية: 2026</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F2F4F7] border border-[#D0D5DD] px-2.5 py-1 text-[#344054] font-medium">
              <Building2 className="h-3.5 w-3.5 text-[#667085]" />
              <span>{currentBranch}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F2F4F7] border border-[#D0D5DD] px-2.5 py-1 text-[#344054] font-medium">
              <DollarSign className="h-3.5 w-3.5 text-[#667085]" />
              <span>العملة: د.ع (IQD)</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#667085] pr-1">
              <Clock className="h-3.5 w-3.5 text-[#98A2B3]" />
              <span>آخر تحديث: {lastSyncTime}</span>
            </span>
          </div>

        </div>

        {/* Action Controls Region */}
        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
          
          {/* Secondary Action: Export Excel */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            className="h-9 gap-2 border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB] hover:text-[#101828] font-bold text-xs shadow-2xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#027A48]" />
            <span>تصدير Excel</span>
          </Button>

          {/* Primary Action: New Journal Entry */}
          <Link href="/journal-entries/new">
            <Button
              type="button"
              size="sm"
              className="h-9 gap-2 bg-[#175CD3] text-white hover:bg-[#1570EF] font-bold text-xs shadow-xs"
            >
              <Plus className="h-4 w-4 text-white" />
              <span>قيد محاسبي جديد</span>
            </Button>
          </Link>

          {/* Overflow Menu */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-[#D0D5DD] bg-white text-[#667085] hover:text-[#101828]"
                aria-label="خيارات إضافية"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-right">
              <DropdownMenuItem onClick={onExportPdf} className="gap-2.5 text-xs font-semibold cursor-pointer py-2">
                <FileText className="h-4 w-4 text-[#D92D20]" />
                <span>تصدير PDF</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={onPrint} className="gap-2.5 text-xs font-semibold cursor-pointer py-2">
                <Printer className="h-4 w-4 text-[#475467]" />
                <span>طباعة السجل</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing} className="gap-2.5 text-xs font-semibold cursor-pointer py-2">
                <RefreshCw className={`h-4 w-4 text-[#175CD3] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>تحديث البيانات</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>

      </div>
    </div>
  )
}
