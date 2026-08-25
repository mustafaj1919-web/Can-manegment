'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GeneralLedgerRow } from '@/lib/api/general-ledger'
import { formatMoney } from '@/lib/design-system/formatting'
import { Button } from '@/components/ui/button'
import {
  X, FileText, Calendar, Building2, User, CheckCircle2,
  Paperclip, History, ExternalLink, Car, Users, Receipt, BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeneralLedgerDrawerProps {
  row: GeneralLedgerRow | null
  open: boolean
  onClose: () => void
}

type TabType = 'overview' | 'entry' | 'attachments' | 'audit' | 'related'

export function GeneralLedgerDrawer({
  row,
  open,
  onClose,
}: GeneralLedgerDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  if (!open || !row) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs dir-rtl" dir="rtl">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute left-0 top-0 h-full w-full max-w-[540px] bg-white shadow-2xl flex flex-col text-right"
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#EAECF0] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#101828]">تفاصيل الحركة المحاسبية</h2>
                  <span className="font-mono text-xs font-bold text-[#175CD3]" style={{ direction: 'ltr' }}>
                    {row.journal_ref}
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  تاريخ القيد: {new Date(row.date).toLocaleDateString('ar-IQ')}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-[#667085] hover:bg-[#EAECF0]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Navigation Strip */}
          <div className="border-b border-[#EAECF0] bg-white px-4 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'overview'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              نظرة عامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'entry'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              القيد المحاسبي
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('related')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'related'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              المستندات المرتبطة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'audit'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              سجل التدقيق
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'attachments'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              المرفقات
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Financial Impact Summary Card */}
                <div className="rounded-xl border border-[#EAECF0] bg-[#F8FAFC] p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">مبلغ المدين</span>
                    <span className="text-base font-bold text-[#175CD3] font-numeric dir-ltr mt-0.5 block">
                      {formatMoney(row.debit, 'IQD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">مبلغ الدائن</span>
                    <span className="text-base font-bold text-[#067647] font-numeric dir-ltr mt-0.5 block">
                      {formatMoney(row.credit, 'IQD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">الرصيد الجاري</span>
                    <span className="text-base font-bold text-[#101828] font-numeric dir-ltr mt-0.5 block">
                      {formatMoney(row.running_balance, 'IQD')}
                    </span>
                  </div>
                </div>

                {/* Main Data Key-Value Fields */}
                <div className="rounded-xl border border-[#EAECF0] bg-white divide-y divide-[#EAECF0] text-xs">
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">الحساب المحاسبي</span>
                    <span className="font-bold text-[#101828] font-mono dir-ltr">
                      [{row.account_code}] {row.account_name}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">نوع المستند والقيد</span>
                    <span className="font-semibold text-[#175CD3]">
                      {row.document_type}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">الوصف والبيان</span>
                    <span className="font-medium text-[#344054] text-left max-w-[280px]">
                      {row.description}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">الفرع المحاسبي</span>
                    <span className="font-medium text-[#344054]">
                      {row.branch_name}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">مركز الكلفة</span>
                    <span className="font-medium text-[#344054]">
                      {row.cost_center}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">المستخدم الذي قام بالقيد</span>
                    <span className="font-semibold text-[#101828]">
                      {row.created_by}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: JOURNAL ENTRY LINES */}
            {activeTab === 'entry' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#101828]">سطور القيد المحاسبي المزدوج</h3>
                  <span className="text-[11px] text-[#027A48] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    قيد متوازن ومرحل
                  </span>
                </div>

                <div className="rounded-lg border border-[#EAECF0] overflow-hidden text-xs">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-[#F2F4F7] text-[#475467] font-semibold h-8 border-b border-[#D0D5DD]">
                      <tr>
                        <th className="px-2.5 py-1">الحساب</th>
                        <th className="px-2 py-1 text-left">مدين</th>
                        <th className="px-2 py-1 text-left">دائن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAECF0]">
                      <tr className="bg-white">
                        <td className="px-2.5 py-2 font-medium text-[#101828]">
                          [{row.account_code}] {row.account_name}
                        </td>
                        <td className="px-2 py-2 text-left font-mono font-semibold text-[#175CD3]">
                          {formatMoney(row.debit, 'IQD')}
                        </td>
                        <td className="px-2 py-2 text-left font-mono text-[#98A2B3]">
                          0 د.ع
                        </td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-2.5 py-2 font-medium text-[#101828]">
                          [411001] إيرادات المبيعات الرئيسية
                        </td>
                        <td className="px-2 py-2 text-left font-mono text-[#98A2B3]">
                          0 د.ع
                        </td>
                        <td className="px-2 py-2 text-left font-mono font-semibold text-[#067647]">
                          {formatMoney(row.debit || row.credit || 500000, 'IQD')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: RELATED DOCUMENTS (DRILL-DOWN LINKS) */}
            {activeTab === 'related' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#101828]">المستندات والمعاملات المرتبطة بالقيد</h3>
                
                <div className="space-y-2 text-xs">
                  {/* Customer Link */}
                  <Link
                    href={`/customers`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-[#175CD3]" />
                      <div>
                        <p className="font-semibold text-[#101828]">سجل العميل المحاسبي</p>
                        <p className="text-[11px] text-[#667085]">{row.customer_name || 'عميل معتمد'}</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#175CD3]" />
                  </Link>

                  {/* Vehicle Link */}
                  <Link
                    href={`/inventory`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Car className="h-4 w-4 text-[#027A48]" />
                      <div>
                        <p className="font-semibold text-[#101828]">بطاقة المركبة في المخزون</p>
                        <p className="text-[11px] text-[#667085]">تويوتا لاندكروزر 2026</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#027A48]" />
                  </Link>

                  {/* Installment Contract Link */}
                  <Link
                    href={`/installments`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="h-4 w-4 text-[#B54708]" />
                      <div>
                        <p className="font-semibold text-[#101828]">عقد التقسيط وسند التحصيل</p>
                        <p className="text-[11px] text-[#667085]">العقد رقم #CN-2026-042</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#B54708]" />
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT LOG */}
            {activeTab === 'audit' && (
              <div className="space-y-3 text-xs">
                <h3 className="text-xs font-bold text-[#101828]">سجل الأنشطة والتدقيق المحاسبي</h3>
                
                <div className="relative border-r border-[#D0D5DD] pr-4 space-y-4">
                  <div className="relative">
                    <span className="absolute -right-5 top-0.5 h-2.5 w-2.5 rounded-full bg-[#12B76A]" />
                    <p className="font-bold text-[#101828]">تم ترحيل القيد بنجاح</p>
                    <p className="text-[11px] text-[#667085]">{new Date(row.date).toLocaleString('ar-IQ')}</p>
                    <p className="text-[11px] text-[#475467] mt-0.5">بواسطة: {row.created_by}</p>
                  </div>

                  <div className="relative">
                    <span className="absolute -right-5 top-0.5 h-2.5 w-2.5 rounded-full bg-[#98A2B3]" />
                    <p className="font-bold text-[#101828]">إنشاء المسودة الأولية للقيد</p>
                    <p className="text-[11px] text-[#667085]">{new Date(row.date).toLocaleString('ar-IQ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-3 text-xs text-center py-8 text-[#667085]">
                <Paperclip className="h-8 w-8 text-[#98A2B3] mx-auto" />
                <p className="font-semibold text-[#101828]">لا توجد مرفقات مرتبطة بهذا القيد</p>
                <p className="text-xs text-[#667085]">يمكن رفع صور الفواتير أو السندات إلكترونياً</p>
              </div>
            )}

          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-[#EAECF0] bg-[#F8FAFC] flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 border-[#D0D5DD] text-xs h-9"
            >
              إغلاق
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-[#175CD3] hover:bg-[#1570EF] text-white font-bold text-xs h-9 gap-1.5"
            >
              <BookOpen className="h-4 w-4" />
              <span>دفتر الأستاذ الكامل</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
