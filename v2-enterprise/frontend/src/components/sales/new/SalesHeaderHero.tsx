'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Building2, Calendar, FileText, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface SalesHeaderHeroProps {
  saleDate: string
  branchName?: string
  salesRepName?: string
}

export function SalesHeaderHero({
  saleDate,
  branchName = 'الفرع الرئيسي',
  salesRepName = 'مسؤول المبيعات الحلي',
}: SalesHeaderHeroProps) {
  const router = useRouter()

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-9 px-3 gap-2 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-xl font-medium text-xs transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة لجدول المبيعات</span>
        </Button>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-[#64748B]">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-[#0F172A]">مسودة عقد بيع</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-600 font-medium">يتم توليد رقم الفاتورة بعد الحفظ</span>
        </div>
      </div>

      {/* Main Title & Metadata Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1 text-start">
          <h1 className="text-[28px] md:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            فاتورة بيع جديدة
          </h1>
          <p className="text-[13px] font-medium text-[#64748B]">
            تسجيل وتوثيق عقد بيع سيارة متاحة في المعرض وتحديد نظام الدفع
          </p>
        </div>

        {/* Metadata Badges */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[#64748B]">الفرع:</span>
            <span className="font-bold text-[#0F172A]">{branchName}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-numeric">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-[#64748B]">تاريخ الفاتورة:</span>
            <span className="font-bold text-[#0F172A]">{formatDate(saleDate)}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <UserCheck className="h-4 w-4 text-slate-500" />
            <span className="text-[#64748B]">المستخدم:</span>
            <span className="font-bold text-[#0F172A]">{salesRepName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
