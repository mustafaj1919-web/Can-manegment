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

const COMPANY = {
  name: 'شركة الأصدقاء لتجارة السيارات',
  subtitle: 'منصة إدارة المعرض المتكاملة',
  phone: '+964 770 123 4567',
  website: 'www.alasdiqaacars.com',
  address: 'بغداد - الكرادة - شارع 62',
  logoUrl: '/logo.png',
}

/** The 8 named QA datasets (A-H). Each is a fully self-contained literal — deliberately
 *  not built from a shared merge helper — so every worst-case value called out in the
 *  print-QA spec is visible verbatim at its call site instead of hidden behind defaults. */
export const DATASETS: Record<string, InstallmentReceiptViewModel> = {
  // A: normal / typical mid-contract installment — the sanity baseline.
  A: {
    receiptNumber: 'RCPT-TEST-A-NORMAL',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '24/07/2026',
    issuedAtTime: '11:42 ص',
    branchName: 'فرع بغداد الرئيسي',
    customer: {
      id: 1021,
      name: 'محمد عبد الرزاق الفلاحي',
      phone: '0790 123 4567',
      nationalIdMasked: '********4821',
      contractNumber: 'CNT-2025-000317',
      salesRepName: 'أحمد كريم',
    },
    vehicle: {
      name: 'تويوتا لاندكروزر VXR',
      vin: 'JTMHV05J904123456',
      plateNumber: '34218 - بغداد',
      color: 'أبيض لؤلؤي',
    },
    contractDetails: { contractDate: '10/01/2026', installmentMonths: 12, financingType: 'تمويل داخلي' },
    payment: {
      id: 5521,
      installmentNumber: 4,
      totalInstallments: 12,
      amount: 3500000,
      currency: 'IQD',
      paymentMethod: 'Cash',
      paymentDate: '24/07/2026',
      paymentTime: '11:42 ص',
      referenceNumber: 'PMT-5521',
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
    nextInstallment: { installmentNumber: 5, dueDate: '24/08/2026', amount: 3500000, currency: 'IQD' },
    verification: {
      journalEntryNumber: 'JE-5521',
      cashAccountName: 'صندوق الأقساط الرئيسي',
      receivedBy: 'أمين الصندوق',
      approvedBy: 'مدير الفرع',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=RCPT-TEST-A-NORMAL',
    },
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // B: worst-case long Arabic identity data + long business identifiers, verbatim from spec.
  B: {
    receiptNumber: 'RCPT-20260801-BGD-00000002871',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '01/08/2026',
    issuedAtTime: '09:15 ص',
    branchName: 'فرع بغداد - المنطقة التجارية المركزية',
    customer: {
      id: 88213,
      name: 'عبد الرحمن محمد عبد الكريم الجبوري الموسوي',
      phone: '0770 999 8888',
      nationalIdMasked: '********7734',
      contractNumber: 'INV-20260801-BGD-MAIN-000000193',
      salesRepName: 'عبد الستار جبار العبيدي الساعدي',
    },
    vehicle: {
      name: 'Toyota Land Cruiser Prado First Edition 2026',
      vin: 'JTEBU5JR9M5987654',
      plateNumber: '77401 - بغداد',
      color: 'أسود معدني',
      engineSize: '4.0L V6',
    },
    contractDetails: { contractDate: '01/08/2026', installmentMonths: 36, financingType: 'تمويل مصرفي بالشراكة مع مصرف التنمية الدولي' },
    payment: {
      id: 71234,
      installmentNumber: 7,
      totalInstallments: 36,
      amount: 4750000,
      currency: 'USD',
      paymentMethod: 'Bank',
      paymentDate: '01/08/2026',
      paymentTime: '09:15 ص',
      referenceNumber: 'TXN-20260801-000771234',
      transactionId: 'MTCN-88221199773',
      bankName: 'مصرف التنمية الدولي للاستثمار والتمويل',
      approvalCode: 'APV-99213',
    },
    contractProgress: {
      totalAmount: 171000000,
      previouslyPaid: 28500000,
      paidThisTime: 4750000,
      totalPaid: 33250000,
      remainingBalance: 137750000,
      paidInstallmentsCount: 7,
      totalInstallmentsCount: 36,
      completionPercentage: 19.4,
      isCompleted: false,
    },
    nextInstallment: { installmentNumber: 8, dueDate: '01/09/2026', amount: 4750000, currency: 'USD' },
    verification: {
      journalEntryNumber: 'JE-71234',
      cashAccountName: 'صندوق الحوالات المصرفية',
      receivedBy: 'محمد عبد الحسين عبد الزهرة',
      approvedBy: 'رئيس قسم التحصيل',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=RCPT-20260801-BGD-00000002871',
    },
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // C: large monetary values — tests the hero's smallest font tier and tafqit length.
  C: {
    receiptNumber: 'RCPT-TEST-C-LARGEAMOUNT',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '15/07/2026',
    issuedAtTime: '02:30 م',
    branchName: 'فرع أربيل',
    customer: {
      id: 55012,
      name: 'شركة الفرات للاستثمارات العامة المحدودة',
      phone: '0750 444 3322',
      contractNumber: 'CNT-2026-009981',
    },
    vehicle: { name: 'Mercedes-Benz G63 AMG 2026', vin: 'WDCYC7DF9ML123987', plateNumber: '10099 - أربيل' },
    contractDetails: { contractDate: '01/02/2026', installmentMonths: 4, financingType: 'دفعة نقدية كبرى' },
    payment: {
      id: 90031,
      installmentNumber: 2,
      totalInstallments: 4,
      amount: 99999999.99,
      currency: 'USD',
      paymentMethod: 'BankTransfer',
      paymentDate: '15/07/2026',
      paymentTime: '02:30 م',
      referenceNumber: 'TXN-90031',
      bankName: 'بنك بغداد',
    },
    contractProgress: {
      totalAmount: 500000000,
      previouslyPaid: 125000000,
      paidThisTime: 99999999.99,
      totalPaid: 224999999.99,
      remainingBalance: 275000000.01,
      paidInstallmentsCount: 2,
      totalInstallmentsCount: 4,
      completionPercentage: 45,
      isCompleted: false,
    },
    nextInstallment: { installmentNumber: 3, dueDate: '15/08/2026', amount: 125000000, currency: 'USD' },
    verification: {
      journalEntryNumber: 'JE-90031',
      receivedBy: 'أمين الصندوق',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=RCPT-TEST-C-LARGEAMOUNT',
    },
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // D: large installment denominator, still in progress (99/120), near-100%-but-not
  // completion percentage — exercises the 99.9% rounding/clamp edge case.
  D: {
    receiptNumber: 'RCPT-TEST-D-LASTSTRETCH',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '20/07/2026',
    issuedAtTime: '10:05 ص',
    customer: { id: 33012, name: 'ياسين طارق حميد', phone: '0781 222 5566', contractNumber: 'CNT-2018-000042' },
    vehicle: { name: 'Kia Sportage 2019', vin: 'KNAPH81ADK6112233', plateNumber: '5541 - النجف' },
    contractDetails: { contractDate: '05/01/2017', installmentMonths: 120, financingType: 'تمويل طويل الأجل' },
    payment: {
      id: 44892,
      installmentNumber: 99,
      totalInstallments: 120,
      amount: 210000,
      currency: 'IQD',
      paymentMethod: 'Cash',
      paymentDate: '20/07/2026',
      paymentTime: '10:05 ص',
      referenceNumber: 'PMT-44892',
    },
    contractProgress: {
      totalAmount: 25200000,
      previouslyPaid: 20370000,
      paidThisTime: 210000,
      totalPaid: 20580000,
      remainingBalance: 4620000,
      paidInstallmentsCount: 99,
      totalInstallmentsCount: 120,
      completionPercentage: 99.9,
      isCompleted: false,
    },
    nextInstallment: { installmentNumber: 100, dueDate: '20/08/2026', amount: 210000, currency: 'IQD', overdueDays: null },
    verification: { receivedBy: 'أمين الصندوق', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=RCPT-TEST-D-LASTSTRETCH' },
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // E: fully paid contract, last installment (12/12) — must render the exact
  // "اكتمل سداد العقد" / "PAID IN FULL" fallback copy instead of a next-installment strip.
  E: {
    receiptNumber: 'RCPT-TEST-E-FULLYPAID',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '28/07/2026',
    issuedAtTime: '04:50 م',
    branchName: 'فرع البصرة',
    customer: { id: 67098, name: 'سارة أحمد ناجي', phone: '0771 333 9900', contractNumber: 'CNT-2025-000512' },
    vehicle: { name: 'Hyundai Tucson 2025', vin: 'KMHJ381ADPU556677', plateNumber: '9021 - البصرة' },
    contractDetails: { contractDate: '28/07/2025', installmentMonths: 12, financingType: 'تمويل داخلي' },
    payment: {
      id: 51203,
      installmentNumber: 12,
      totalInstallments: 12,
      amount: 2900000,
      currency: 'IQD',
      paymentMethod: 'Cash',
      paymentDate: '28/07/2026',
      paymentTime: '04:50 م',
      referenceNumber: 'PMT-51203',
    },
    contractProgress: {
      totalAmount: 34800000,
      previouslyPaid: 31900000,
      paidThisTime: 2900000,
      totalPaid: 34800000,
      remainingBalance: 0,
      paidInstallmentsCount: 12,
      totalInstallmentsCount: 12,
      completionPercentage: 100,
      isCompleted: true,
    },
    nextInstallment: null,
    verification: {
      journalEntryNumber: 'JE-51203',
      receivedBy: 'أمين الصندوق',
      approvedBy: 'مدير الفرع',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=RCPT-TEST-E-FULLYPAID',
    },
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // F: cash payment, very first installment — zero-progress edge case (0%) and the
  // leanest possible TransactionStrip (no bank/transactionId/approvalCode).
  F: {
    receiptNumber: 'RCPT-TEST-F-CASHFIRST',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '02/08/2026',
    issuedAtTime: '08:00 ص',
    customer: { id: 90111, name: 'علي حسين جبار', phone: '0790 555 1122', contractNumber: 'CNT-2026-000601' },
    vehicle: { name: 'Toyota Corolla 2026', vin: 'JTDBR32E730112244', plateNumber: '2201 - كربلاء' },
    contractDetails: { contractDate: '02/08/2026', installmentMonths: 24 },
    payment: {
      id: 61550,
      installmentNumber: 1,
      totalInstallments: 24,
      amount: 850000,
      currency: 'IQD',
      paymentMethod: 'Cash',
      paymentDate: '02/08/2026',
      paymentTime: '08:00 ص',
    },
    contractProgress: {
      totalAmount: 20400000,
      previouslyPaid: 0,
      paidThisTime: 850000,
      totalPaid: 850000,
      remainingBalance: 19550000,
      paidInstallmentsCount: 1,
      totalInstallmentsCount: 24,
      completionPercentage: 0,
      isCompleted: false,
    },
    nextInstallment: { installmentNumber: 2, dueDate: '02/09/2026', amount: 850000, currency: 'IQD' },
    verification: null,
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // G: bank payment, every optional field populated — the densest possible
  // TransactionStrip + discount/penalty/tax lines in the financial summary, near-0.1%.
  G: {
    receiptNumber: 'RCPT-TEST-G-FULLDATA',
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '03/08/2026',
    issuedAtTime: '01:20 م',
    branchName: 'فرع بغداد - المنصور',
    customer: {
      id: 12099,
      name: 'زينب كاظم عبد الأمير',
      phone: '0783 777 6655',
      nationalIdMasked: '********2290',
      customerCode: 'CUST-12099',
      contractNumber: 'CNT-2026-000777',
      salesRepName: 'حيدر منعم',
    },
    vehicle: {
      name: 'Nissan Patrol 2026',
      brand: 'Nissan',
      model: 'Patrol',
      year: 2026,
      vin: 'JN8AY2NC0M9887766',
      plateNumber: '30044 - بغداد',
      color: 'رمادي',
      engineSize: '5.6L V8',
    },
    contractDetails: { contractDate: '03/08/2026', installmentMonths: 48, financingType: 'تمويل مصرفي' },
    payment: {
      id: 70099,
      installmentNumber: 1,
      totalInstallments: 48,
      amount: 1850000,
      currency: 'USD',
      paymentMethod: 'Bank',
      paymentDate: '03/08/2026',
      paymentTime: '01:20 م',
      referenceNumber: 'TXN-70099',
      transactionId: 'MTCN-11223344556',
      bankName: 'مصرف الرشيد',
      approvalCode: 'APV-70099',
      notes: 'دفعة أولى ضمن اتفاقية إعادة الجدولة',
    },
    contractProgress: {
      totalAmount: 88800000,
      previouslyPaid: 0,
      paidThisTime: 1850000,
      totalPaid: 1850000,
      remainingBalance: 86865000,
      paidInstallmentsCount: 1,
      totalInstallmentsCount: 48,
      completionPercentage: 0.1,
      isCompleted: false,
      discount: 50000,
      penalty: 35000,
      tax: 30000,
    },
    nextInstallment: { installmentNumber: 2, dueDate: '03/09/2026', amount: 1850000, currency: 'USD', overdueDays: null },
    verification: {
      journalEntryNumber: 'JE-70099',
      cashAccountName: 'صندوق الحوالات المصرفية الرئيسي',
      verificationUrl: 'https://admin.al-asdiqa.com/verify/RCPT-TEST-G-FULLDATA',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=RCPT-TEST-G-FULLDATA',
      receivedBy: 'محمد عبد الحسين عبد الزهرة',
      approvedBy: 'مدير الفرع',
    },
    company: { ...COMPANY, email: 'info@alasdiqaacars.com' },
    isCancelledOrReversed: false,
    cancellationReason: null,
  },

  // H: missing optional fields across the board — no verification/QR, no next
  // installment, no branch, no vehicle metadata, no financial adjustments.
  H: {
    receiptNumber: 'RCPT-TEST-H-MINIMAL',
    status: 'Posted',
    statusLabel: 'تم الاستلام',
    issuedAtDate: '03/08/2026',
    customer: { id: 40021, name: 'كريم صالح', contractNumber: 'CNT-2026-000888' },
    vehicle: { name: 'Suzuki Vitara 2024' },
    contractDetails: null,
    payment: {
      id: 80234,
      amount: 500000,
      currency: 'IQD',
      paymentMethod: 'Cash',
      paymentDate: '03/08/2026',
    },
    contractProgress: {
      totalAmount: 12000000,
      previouslyPaid: 5500000,
      paidThisTime: 500000,
      totalPaid: 6000000,
      remainingBalance: 6000000,
      paidInstallmentsCount: 6,
      totalInstallmentsCount: 12,
      completionPercentage: 50,
      isCompleted: false,
    },
    nextInstallment: null,
    verification: null,
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  },
}

/** Fixed, never-renamed pair reserved for the print-ownership regression suite
 *  (tests/e2e/receipt-print.spec.ts), which asserts these exact receipt numbers verbatim
 *  and never exercises live network requests (no qrCodeUrl) so the suite stays fast and
 *  deterministic offline. Content-QA datasets live in DATASETS above and are selected via
 *  ?dataset=A..H — kept fully separate so extending them can never break that suite. */
function ownershipTestMock(receiptNumber: string): InstallmentReceiptViewModel {
  return {
    receiptNumber,
    status: 'Posted',
    statusLabel: 'تم الاستلام والإثبات',
    issuedAtDate: '24/07/2026',
    issuedAtTime: '11:42 ص',
    customer: { id: 1021, name: 'محمد عبد الرزاق الفلاحي', phone: '0790 123 4567', contractNumber: 'CNT-2025-000317' },
    vehicle: { name: 'تويوتا لاندكروزر VXR', vin: 'JTMHV05J904123456', plateNumber: '34218 - بغداد' },
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
    nextInstallment: { installmentNumber: 5, dueDate: '24/08/2026', amount: 3500000, currency: 'IQD' },
    verification: { journalEntryNumber: 'JE-5521', cashAccountName: 'صندوق الأقساط الرئيسي', receivedBy: 'أمين الصندوق' },
    company: COMPANY,
    isCancelledOrReversed: false,
    cancellationReason: null,
  }
}
const OWNERSHIP_TEST_PRIMARY = ownershipTestMock('RCPT-TEST-AAA111')
const OWNERSHIP_TEST_SECONDARY = ownershipTestMock('RCPT-TEST-BBB222')

function Harness({ dual, datasetKey }: { dual: boolean; datasetKey: string | null }) {
  const [showReceipt, setShowReceipt] = useState(true)
  const primary = datasetKey ? (DATASETS[datasetKey] ?? DATASETS.A) : OWNERSHIP_TEST_PRIMARY
  const secondary = OWNERSHIP_TEST_SECONDARY

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
                {primary.customer.name} — دفعة اختبار ({datasetKey ?? 'ownership'})
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
                {showReceipt && <InstallmentReceiptA5Document data={primary} />}
                {/* In dual mode, B mounts after the primary dataset in the same commit —
                    per "last mounted wins" ownership semantics (see
                    receiptPrintOwnership.ts), B ends up owning #print-root and the
                    primary document must not appear in the print output. */}
                {dual && showReceipt && <InstallmentReceiptA5Document data={secondary} />}
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
  const rawDataset = params.get('dataset')
  const datasetKey = rawDataset ? rawDataset.toUpperCase() : null
  return <Harness dual={mode === 'dual'} datasetKey={datasetKey} />
}

export function PrintTestFixtureClient() {
  return (
    <Suspense fallback={null}>
      <PrintTestFixtureInner />
    </Suspense>
  )
}
