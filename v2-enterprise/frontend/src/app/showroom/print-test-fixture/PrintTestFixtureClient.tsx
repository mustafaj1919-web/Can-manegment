'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { InstallmentReceiptViewModel } from '@/components/installments/installmentReceiptTypes'
import { InstallmentReceiptA5Document } from '@/components/installments/InstallmentReceiptA5Document'

function makeMock(receiptNumber: string): InstallmentReceiptViewModel {
  return {
    receiptNumber,
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '24/07/2026',
    issuedAtTime: '11:42 ص',
    customer: {
      id: 1021,
      name: 'محمد عبد الرزاق الفلاحي',
      phone: '0790 123 4567',
      contractNumber: 'CNT-2025-000317',
    },
    vehicle: {
      name: 'تويوتا لاندكروزر VXR',
      vin: 'JTMHV05J904123456',
      plateNumber: '34218 - بغداد',
    },
    payment: {
      id: 5521,
      installmentNumber: 4,
      totalInstallments: 12,
      amount: 3500000,
      currency: 'IQD',
      paymentMethod: 'Cash',
      paymentDate: '24/07/2026',
      paymentTime: '11:42 ص',
    },
    contractProgress: {
      totalAmount: 42000000,
      previouslyPaid: 10500000,
      paidThisTime: 3500000,
      totalPaid: 14000000,
      remainingBalance: 28000000,
      paidInstallmentsCount: 4,
      totalInstallmentsCount: 12,
      completionPercentage: 33.3,
      isCompleted: false,
    },
    nextInstallment: {
      installmentNumber: 5,
      dueDate: '24/08/2026',
      amount: 3500000,
      currency: 'IQD',
    },
    verification: {
      journalEntryNumber: 'JE-5521',
      cashAccountName: 'صندوق الأقساط الرئيسي',
      receivedBy: 'أمين الصندوق',
    },
    company: {
      name: 'شركة الأصدقاء لتجارة السيارات',
      subtitle: 'منصة إدارة المعرض المتكاملة',
      phone: '+964 770 123 4567',
      website: 'www.alasdiqaacars.com',
      address: 'بغداد - الكرادة - شارع 62',
      logoUrl: '/logo.png',
    },
    isCancelledOrReversed: false,
    cancellationReason: null,
  }
}

const receiptA = makeMock('RCPT-TEST-AAA111')
const receiptB = makeMock('RCPT-TEST-BBB222')

function Harness({ dual }: { dual: boolean }) {
  const [showReceipt, setShowReceipt] = useState(true)

  return (
    <div>
      <button
        type="button"
        data-testid="unmount-receipt-toggle"
        onClick={() => setShowReceipt((v) => !v)}
        style={{ position: 'fixed', top: 8, insetInlineStart: 8, zIndex: 9999 }}
      >
        {showReceipt ? 'Unmount receipt' : 'Remount receipt'}
      </button>
      {/* Long underlying page — must never appear in print output */}
      <div style={{ background: '#0f172a', color: 'white' }} data-testid="background-page">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{ height: 80, borderBottom: '1px solid #333', padding: 16 }}>
            BACKGROUND_MARKER_TEXT row {i + 1}
          </div>
        ))}
      </div>

      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="max-w-[980px] p-0 gap-0 !bg-white !text-slate-900 border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden text-right font-tajawal"
          dir="rtl"
        >
          <DialogHeader
            data-testid="workflow-dialog-header"
            className="px-8 py-5 border-b border-slate-100 !bg-white flex flex-row items-center justify-between"
          >
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold !text-slate-900">
                WORKFLOW_HEADER_MARKER_TEXT
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                محمد الفلاحي — عقد تجريبي
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Fake stepper — must never appear in print output */}
          <div data-testid="workflow-stepper" style={{ display: 'flex', gap: 12, padding: 24, background: '#f8fafc' }}>
            {['الدفعة', 'المراجعة', 'الترحيل', 'الوصل', 'الأرشفة'].map((step, i) => (
              <div
                key={step}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: i === 3 ? '#059669' : '#e2e8f0',
                  color: i === 3 ? 'white' : '#334155',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                STEPPER_MARKER_TEXT {i + 1}. {step}
              </div>
            ))}
          </div>

          <div className="p-8 bg-slate-50/50 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-center bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
              <div className="shrink-0 transform scale-75 sm:scale-85 origin-top transition-transform my-auto">
                {showReceipt && <InstallmentReceiptA5Document data={receiptA} />}
                {/* In dual mode, B mounts after A in the same commit — per "last mounted
                    wins" ownership semantics (see receiptPrintOwnership.ts), B ends up
                    owning #print-root and A must not appear in the print output. */}
                {dual && showReceipt && <InstallmentReceiptA5Document data={receiptB} />}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PrintTestFixtureInner() {
  const params = useSearchParams()
  const mode = params.get('mode') ?? 'single'
  return <Harness dual={mode === 'dual'} />
}

export function PrintTestFixtureClient() {
  return (
    <Suspense fallback={null}>
      <PrintTestFixtureInner />
    </Suspense>
  )
}
