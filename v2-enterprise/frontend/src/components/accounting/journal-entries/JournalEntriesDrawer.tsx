'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { JournalEntryItem } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/design-system/formatting'
import { Button } from '@/components/ui/button'
import {
  X, FileText, Calendar, Building2, CheckCircle2,
  Paperclip, ExternalLink, Car, Users, Receipt, BookOpen, RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JournalEntriesDrawerProps {
  item: JournalEntryItem | null
  open: boolean
  onClose: () => void
  onReverse: (item: JournalEntryItem) => void
}

type TabType = 'overview' | 'lines' | 'audit' | 'attachments' | 'related'

export function JournalEntriesDrawer({
  item,
  open,
  onClose,
  onReverse,
}: JournalEntriesDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  if (!open || !item) return null

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
                  <h2 className="text-base font-bold text-[#101828]">القيد المحاسبي</h2>
                  <span className="font-mono text-xs font-bold text-[#175CD3]" style={{ direction: 'ltr' }}>
                    {item.reference_number}
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  تاريخ القيد: {item.entry_date ? new Date(item.entry_date).toLocaleDateString('ar-IQ') : '—'}
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

          {/* Tab Navigation Bar */}
          <div className="border-b border-[#EAECF0] bg-[#FAFAFA] px-4 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
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
              onClick={() => setActiveTab('lines')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'lines'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              بنود القيد ({item.lines?.length || 0})
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
                {/* Financial Summary Box */}
                <div className="rounded-xl border border-[#EAECF0] bg-[#F8FAFC] p-4 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">إجمالي المدين</span>
                    <span className="text-base font-bold text-[#175CD3] font-numeric dir-ltr mt-0.5 block">
                      {formatMoney(item.total_debit, 'IQD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">إجمالي الدائن</span>
                    <span className="text-base font-bold text-[#067647] font-numeric dir-ltr mt-0.5 block">
                      {formatMoney(item.total_credit, 'IQD')}
                    </span>
                  </div>
                </div>

                {/* Key Attributes Table */}
                <div className="rounded-xl border border-[#EAECF0] bg-white divide-y divide-[#EAECF0] text-xs">
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">رقم القيد والمرجع</span>
                    <span className="font-mono font-bold text-[#175CD3] dir-ltr">
                      {item.reference_number}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">نوع العملية</span>
                    <span className="font-semibold text-[#101828]">
                      {(item as any).ref_type || item.reference_type || 'قيد محاسبي عام'}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">البيان والوصف</span>
                    <span className="font-medium text-[#344054] text-left max-w-[280px]">
                      {item.description || 'بدون بيان'}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">حالة القيد</span>
                    <span className="font-semibold text-[#027A48]">
                      {item.status === 'posted' ? 'مرحل ومقيد' : item.status === 'reversed' ? 'معكوس' : 'مسودة'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: JOURNAL LINES */}
            {activeTab === 'lines' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#101828]">سطور القيد المحاسبي</h3>
                  <span className="text-[11px] text-[#027A48] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    قيد متوازن
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
                      {item.lines && item.lines.length > 0 ? (
                        item.lines.map((line, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-2.5 py-2 font-medium text-[#101828]">
                              <span className="font-mono text-[#175CD3] ml-1">[{line.account_code}]</span>
                              {line.account_name}
                            </td>
                            <td className="px-2 py-2 text-left font-mono font-semibold text-[#175CD3]">
                              {line.debit > 0 ? formatMoney(line.debit, 'IQD') : '0 د.ع'}
                            </td>
                            <td className="px-2 py-2 text-left font-mono font-semibold text-[#067647]">
                              {line.credit > 0 ? formatMoney(line.credit, 'IQD') : '0 د.ع'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-[#667085]">
                            لا توجد سطور مفصلة لهذا القيد
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: RELATED DOCUMENTS (DRILL DOWN LINKS) */}
            {activeTab === 'related' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#101828]">الانتقال المباشر والربط السريع</h3>
                
                <div className="space-y-2 text-xs">
                  {/* General Ledger Drill-Down Link */}
                  <Link
                    href={`/general-ledger`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="h-4 w-4 text-[#175CD3]" />
                      <div>
                        <p className="font-semibold text-[#101828]">فتح دفتر الأستاذ العام للحساب</p>
                        <p className="text-[11px] text-[#667085]">عرض جميع الحركات والرصيد الجاري</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#175CD3]" />
                  </Link>

                  {/* Customer Link */}
                  <Link
                    href={`/customers`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-[#027A48]" />
                      <div>
                        <p className="font-semibold text-[#101828]">سجل العميل المحاسبي</p>
                        <p className="text-[11px] text-[#667085]">استعراض الأقساط والتعاملات</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#027A48]" />
                  </Link>

                  {/* Vehicle Link */}
                  <Link
                    href={`/inventory`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Car className="h-4 w-4 text-[#B54708]" />
                      <div>
                        <p className="font-semibold text-[#101828]">بطاقة المركبة في المخزون</p>
                        <p className="text-[11px] text-[#667085]">التكاليف والمبيعات</p>
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
                <h3 className="text-xs font-bold text-[#101828]">سجل الأنشطة والتدقيق</h3>
                <div className="border-r border-[#D0D5DD] pr-4 space-y-3">
                  <div>
                    <p className="font-bold text-[#101828]">تم إنشاء القيد وترحيله بنجاح</p>
                    <p className="text-[11px] text-[#667085]">{item.entry_date ? new Date(item.entry_date).toLocaleString('ar-IQ') : '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-3 text-xs text-center py-8 text-[#667085]">
                <Paperclip className="h-8 w-8 text-[#98A2B3] mx-auto" />
                <p className="font-semibold text-[#101828]">لا توجد مرفقات مع هذا القيد</p>
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

            {item.status !== 'reversed' && (
              <Button
                type="button"
                size="sm"
                onClick={() => onReverse(item)}
                className="flex-1 bg-[#B42318] hover:bg-[#912018] text-white font-bold text-xs h-9 gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                <span>عكس هذا القيد</span>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
