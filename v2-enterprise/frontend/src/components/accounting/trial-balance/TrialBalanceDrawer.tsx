'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { TrialBalanceAccount } from '@/lib/api/accounting'
import { formatMoney, formatAccountType } from '@/lib/design-system/formatting'
import { Button } from '@/components/ui/button'
import {
  X, FileText, Calendar, Building2, ExternalLink, BookOpen, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrialBalanceDrawerProps {
  account: TrialBalanceAccount | null
  open: boolean
  onClose: () => void
}

type TabType = 'overview' | 'opening' | 'period' | 'closing' | 'audit'

export function TrialBalanceDrawer({
  account,
  open,
  onClose,
}: TrialBalanceDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  if (!open || !account) return null

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
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#EAECF0] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#101828]">{account.name}</h2>
                  <span className="font-mono text-xs font-bold text-[#175CD3]" style={{ direction: 'ltr' }}>
                    [{account.code}]
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  نوع الحساب: {formatAccountType(account.type)}
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

          {/* Tab Navigation */}
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
              onClick={() => setActiveTab('opening')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'opening'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              الرصيد الافتتاحي
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('period')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'period'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              حركة الفترة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('closing')}
              className={cn(
                'py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap',
                activeTab === 'closing'
                  ? 'border-[#175CD3] text-[#175CD3] font-bold'
                  : 'border-transparent text-[#667085] hover:text-[#101828]'
              )}
            >
              الرصيد الختامي
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#EAECF0] bg-[#F8FAFC] p-4 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">صافي الرصيد الختامي</span>
                    <span className="text-base font-bold text-[#101828] font-numeric dir-ltr mt-0.5 block">
                      {formatMoney(account.balance, 'IQD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] block font-medium">نوع التكلفة / الحساب</span>
                    <span className="text-sm font-bold text-[#175CD3] mt-0.5 block">
                      {formatAccountType(account.type)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#EAECF0] bg-white divide-y divide-[#EAECF0] text-xs">
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">رمز الحساب</span>
                    <span className="font-mono font-bold text-[#175CD3] dir-ltr">{account.code}</span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">اسم الحساب المحاسبي</span>
                    <span className="font-bold text-[#101828]">{account.name}</span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">حركة الفترة مدين</span>
                    <span className="font-numeric font-semibold text-[#175CD3] dir-ltr">
                      {formatMoney(account.period_debit, 'IQD')}
                    </span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="text-[#667085] font-medium">حركة الفترة دائن</span>
                    <span className="font-numeric font-semibold text-[#067647] dir-ltr">
                      {formatMoney(account.period_credit, 'IQD')}
                    </span>
                  </div>
                </div>

                {/* Direct Links */}
                <div className="space-y-2 pt-2">
                  <Link
                    href={`/general-ledger?account_code=${account.code}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="h-4 w-4 text-[#175CD3]" />
                      <span className="font-semibold text-[#101828]">فتح دفتر الأستاذ العام للحساب</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#175CD3]" />
                  </Link>

                  <Link
                    href={`/chart-of-accounts`}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F9FAFB] transition-colors group text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-[#027A48]" />
                      <span className="font-semibold text-[#101828]">استعراض الحساب في شجرة الحسابات</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-[#98A2B3] group-hover:text-[#027A48]" />
                  </Link>
                </div>
              </div>
            )}

            {/* OPENING TAB */}
            {activeTab === 'opening' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-[#101828]">أرصدة بداية الفترة المحاسبية</h3>
                <div className="rounded-xl border border-[#EAECF0] bg-white p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#667085]">الافتتاحي مدين:</span>
                    <span className="font-numeric font-bold dir-ltr">{formatMoney(account.opening_debit, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">الافتتاحي دائن:</span>
                    <span className="font-numeric font-bold dir-ltr">{formatMoney(account.opening_credit, 'IQD')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PERIOD TAB */}
            {activeTab === 'period' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-[#101828]">حركات الفترة الحالية</h3>
                <div className="rounded-xl border border-[#EAECF0] bg-white p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#667085]">إجمالي الحركة مدينة:</span>
                    <span className="font-numeric font-bold text-[#175CD3] dir-ltr">{formatMoney(account.period_debit, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">إجمالي الحركة دائنة:</span>
                    <span className="font-numeric font-bold text-[#067647] dir-ltr">{formatMoney(account.period_credit, 'IQD')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CLOSING TAB */}
            {activeTab === 'closing' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-[#101828]">الرصيد الختامي الصافي</h3>
                <div className="rounded-xl border border-[#EAECF0] bg-white p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#667085]">الختامي مدين:</span>
                    <span className="font-numeric font-bold text-[#101828] dir-ltr">{formatMoney(account.closing_debit, 'IQD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">الختامي دائن:</span>
                    <span className="font-numeric font-bold text-[#101828] dir-ltr">{formatMoney(account.closing_credit, 'IQD')}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
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
            <Link href={`/general-ledger?account_code=${account.code}`} className="flex-1">
              <Button
                type="button"
                size="sm"
                className="w-full bg-[#175CD3] hover:bg-[#1570EF] text-white font-bold text-xs h-9 gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                <span>دفتر الأستاذ العام</span>
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
