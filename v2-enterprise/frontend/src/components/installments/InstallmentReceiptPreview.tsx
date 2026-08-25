'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { Printer, ArrowRight, Share2, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InstallmentReceiptViewModel } from './installmentReceiptTypes'
import { InstallmentReceiptA5Document, printInstallmentReceipt } from './InstallmentReceiptA5Document'

interface InstallmentReceiptPreviewProps {
  data: InstallmentReceiptViewModel
  backUrl?: string
}

export function InstallmentReceiptPreview({ data, backUrl = '/installments' }: InstallmentReceiptPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    void printInstallmentReceipt()
  }

  const handleWhatsAppShare = () => {
    if (typeof window === 'undefined') return
    const shareText = encodeURIComponent(`تم إصدار وصل سداد القسط رقم [${data.receiptNumber}] - ${data.company.name}`)
    const shareUrl = data.verification?.verificationUrl ?? window.location.href
    const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(shareUrl)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col font-receipt select-none" dir="rtl">
      {/* ── Screen Action Bar (no-print) ── */}
      <header className="no-print bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB] px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] gap-2 rounded-xl h-9 px-2.5 sm:px-3.5 shrink-0">
            <Link href={backUrl}>
              <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
              <span className="hidden sm:inline">العودة لبيانات العقد</span>
            </Link>
          </Button>
          <div className="h-4 w-px bg-[#E5E7EB] hidden md:block" />
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-[#475569]">
            <FileCheck className="h-4 w-4 text-[#059669]" />
            <span>معاينة المستند ورقة A5 أفقية (210mm × 148mm)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* WhatsApp Share */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="border-[#E5E7EB] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] gap-2 text-xs font-semibold rounded-xl h-9 px-2.5 sm:px-3.5"
          >
            <Share2 className="h-4 w-4 text-[#059669]" />
            <span className="hidden sm:inline">مشاركة الوصل</span>
          </Button>

          {/* Print / Save PDF */}
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="bg-[#059669] hover:bg-[#047857] text-white font-bold gap-2 text-xs rounded-xl h-9 px-3.5 sm:px-5 shadow-sm transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">طباعة / حفظ PDF</span>
            <span className="sm:hidden">طباعة</span>
          </Button>
        </div>
      </header>

      {/* ── Document Preview Canvas Stage (Simulating A5 paper on a desk) ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
        <div
          ref={containerRef}
          className="a5-paper-wrapper shrink-0 w-full sm:w-[210mm] transform sm:scale-85 md:scale-90 lg:scale-100 origin-center transition-transform"
          style={{
            maxWidth: '210mm',
          }}
        >
          <InstallmentReceiptA5Document data={data} />
        </div>
      </main>
    </div>
  )
}
