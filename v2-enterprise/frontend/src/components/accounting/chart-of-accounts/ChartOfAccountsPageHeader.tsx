'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, FileSpreadsheet, RefreshCw, MoreVertical, Upload,
  Printer, History, SlidersHorizontal, ChevronLeft, ShieldCheck, Clock, Coins, Building2
} from 'lucide-react'

interface ChartOfAccountsPageHeaderProps {
  onAddAccount: () => void
  onExportExcel: () => void
  onRecomputeBalances: () => void
  isRecomputing: boolean
  lastSyncTime: string
  branchLabel?: string
}

export function ChartOfAccountsPageHeader({
  onAddAccount,
  onExportExcel,
  onRecomputeBalances,
  isRecomputing,
  lastSyncTime,
  branchLabel = 'جميع الفروع',
}: ChartOfAccountsPageHeaderProps) {
  return (
    <div className="space-y-3.5 border-b border-[#EAECF0] bg-white pb-4 pt-1 text-right dir-rtl" dir="rtl">
      {/* Breadcrumb Bar */}
      <div className="flex items-center gap-1.5 text-xs text-[#667085] font-medium">
        <Link href="/" className="hover:text-[#175CD3] transition-colors">
          الرئيسية
        </Link>
        <ChevronLeft className="h-3.5 w-3.5 text-[#98A2B3] rotate-180" />
        <Link href="/accounting" className="hover:text-[#175CD3] transition-colors">
          المحاسبة والتقارير
        </Link>
        <ChevronLeft className="h-3.5 w-3.5 text-[#98A2B3] rotate-180" />
        <span className="font-semibold text-[#101828]">دليل الحسابات</span>
      </div>

      {/* Main Title Row: Title & Action Buttons aligned vertically */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Subtitle Block */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101828]">
              دليل الحسابات
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-[#F9FAFB] px-2.5 py-0.5 text-xs font-semibold text-[#344054]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#175CD3]" />
              <span>السنة المالية 2026</span>
            </span>
          </div>

          <p className="text-sm font-normal text-[#667085]">
            إدارة الهيكل المحاسبي والحسابات والأرصدة المالية لنظام ERP المركزي
          </p>
        </div>

        {/* Action Buttons Block (Aligned with Title on Desktop) */}
        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
          <Button
            type="button"
            onClick={onAddAccount}
            size="sm"
            className="bg-[#175CD3] hover:bg-[#1570EF] text-white font-semibold text-sm h-10 px-4 gap-2 shadow-xs border border-[#175CD3] rounded-md"
          >
            <Plus className="h-4 w-4" />
            <span>حساب جديد</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onExportExcel}
            size="sm"
            className="border-[#D0D5DD] hover:bg-[#F9FAFB] text-[#344054] font-semibold text-sm h-10 px-4 gap-2 rounded-md"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#067647]" />
            <span>تصدير Excel</span>
          </Button>

          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[#D0D5DD] hover:bg-[#F9FAFB] text-[#667085] h-10 w-10 p-0 rounded-md"
                aria-label="خيارات إضافية"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56 text-right">
              <DropdownMenuItem
                onClick={onRecomputeBalances}
                disabled={isRecomputing}
                className="gap-2.5 text-xs font-semibold cursor-pointer py-2"
              >
                <RefreshCw className={`h-4 w-4 text-[#175CD3] ${isRecomputing ? 'animate-spin' : ''}`} />
                <span>إعادة احتساب الأرصدة</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => alert('استيراد الحسابات متاح عبر مسؤول البيانات المالية')}
                className="gap-2.5 text-xs font-medium cursor-pointer py-2"
              >
                <Upload className="h-4 w-4 text-[#667085]" />
                <span>استيراد الحسابات</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => window.print()}
                className="gap-2.5 text-xs font-medium cursor-pointer py-2"
              >
                <Printer className="h-4 w-4 text-[#667085]" />
                <span>طباعة دليل الحسابات</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => alert('سجل تغييرات دليل الحسابات يتطلب صلاحيات مدير النظم')}
                className="gap-2.5 text-xs font-medium cursor-pointer py-2"
              >
                <History className="h-4 w-4 text-[#667085]" />
                <span>سجل التغييرات</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => alert('إعدادات الترقيم الشجري محفوظة وفق الدليل المحاسبي الموحد')}
                className="gap-2.5 text-xs font-medium cursor-pointer py-2"
              >
                <SlidersHorizontal className="h-4 w-4 text-[#667085]" />
                <span>إعدادات الترقيم</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header Metadata Pills (Positioned below Subtitle) */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085]">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-[#EAECF0] bg-white px-2.5 py-1 font-medium">
          <Building2 className="h-3.5 w-3.5 text-[#667085]" />
          <span>الفرع: <strong className="text-[#101828]">{branchLabel}</strong></span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-md border border-[#EAECF0] bg-white px-2.5 py-1 font-medium">
          <Coins className="h-3.5 w-3.5 text-[#175CD3]" />
          <span>العملة الأساسية: <strong className="text-[#101828]">الدينار العراقي (IQD)</strong></span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[#98A2B3]">
          <Clock className="h-3.5 w-3.5" />
          <span>آخر تحديث: {lastSyncTime}</span>
        </div>
      </div>
    </div>
  )
}
