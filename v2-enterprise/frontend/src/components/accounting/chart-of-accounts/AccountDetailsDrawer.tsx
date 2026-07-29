'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ChartAccountNode, CLASSIFICATION_LABELS } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/design-system/formatting'
import {
  BookOpen, Plus, Pencil, Archive, ArchiveRestore,
  History, ArrowRightLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountDetailsDrawerProps {
  account: ChartAccountNode | null
  open: boolean
  onClose: () => void
  onEdit: (account: ChartAccountNode) => void
  onAddChild: (account: ChartAccountNode) => void
  onArchive: (account: ChartAccountNode) => void
  onReactivate: (account: ChartAccountNode) => void
}

export function AccountDetailsDrawer({
  account,
  open,
  onClose,
  onEdit,
  onAddChild,
  onArchive,
  onReactivate,
}: AccountDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'children' | 'audit'>('overview')

  if (!account) return null

  const debit = account.subtree_debit ?? account.debit ?? 0
  const credit = account.subtree_credit ?? account.credit ?? 0
  const balance = account.subtree_balance ?? account.balance ?? 0
  const hasChildren = account.children && account.children.length > 0

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={account.name}
      subtitle={`رمز الحساب: ${account.code} • ${account.level}`}
    >
      <div className="space-y-4 text-right dir-rtl w-full max-w-[540px]" dir="rtl">

        {/* Financial Balance Overview Header Card */}
        <div className="rounded-xl border border-[#EAECF0] bg-[#F9FAFB] p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085]">صافي رصيد الحساب الحالية</span>
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border',
              account.is_active
                ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABE5C6]'
                : 'bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', account.is_active ? 'bg-[#12B76A]' : 'bg-[#98A2B3]')} />
              {account.is_active ? 'حساب نشط' : 'حساب مؤرشف'}
            </span>
          </div>

          <div className="text-2xl font-bold font-numeric text-[#101828] dir-ltr text-right tabular-nums">
            {formatMoney(balance, 'IQD')}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAECF0] text-xs">
            <div>
              <span className="text-xs text-[#667085] block font-medium">إجمالي المدين</span>
              <span className="font-bold font-numeric text-[#175CD3] text-sm dir-ltr inline-block tabular-nums">
                {formatMoney(debit, 'IQD')}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#667085] block font-medium">إجمالي الدائن</span>
              <span className="font-bold font-numeric text-[#067647] text-sm dir-ltr inline-block tabular-nums">
                {formatMoney(credit, 'IQD')}
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Navigation Tabs Bar */}
        <div className="flex items-center gap-1 border-b border-[#EAECF0] pb-1">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'transactions', label: 'الحركات' },
            { id: 'children', label: `الحسابات الفرعية (${account.children_count})` },
            { id: 'audit', label: 'سجل التغييرات' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-[#175CD3] text-white'
                  : 'text-[#667085] hover:text-[#101828] hover:bg-[#F9FAFB]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview - Enterprise Compact Definition List */}
        {activeTab === 'overview' && (
          <div className="rounded-xl border border-[#EAECF0] bg-white p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">رمز الحساب:</span>
              <span className="font-mono font-bold text-[#175CD3] text-sm dir-ltr">{account.code}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">اسم الحساب:</span>
              <span className="font-bold text-[#101828] text-sm">{account.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">نوع الحساب:</span>
              <span className="font-semibold text-[#101828]">{account.type_label || account.type}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">التصنيف المحاسبي:</span>
              <span className="font-semibold text-[#344054]">
                {account.classification_label || (account.classification && CLASSIFICATION_LABELS[account.classification]) || '—'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">المستوى الشجري:</span>
              <span className="font-bold text-[#101828]">{account.level} (عمق {account.depth})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">الحساب الأب:</span>
              <span className="font-mono text-[#667085] font-semibold">{account.parent_code ?? 'بدون حساب أب (رئيسي)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">عملة التقييم:</span>
              <span className="font-semibold text-[#101828]">الدينار العراقي (IQD)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F2F4F7]">
              <span className="text-[#667085] font-medium">نطاق الفروع:</span>
              <span className="font-semibold text-[#101828]">جميع الفروع</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#667085] font-medium">قابليّة الترحيل:</span>
              <span className="font-bold text-[#027A48]">
                {account.level === 'تفصيلي' ? 'مسموح بالترحيل المباشر (تفصيلي)' : 'حساب تجميعي (أب)'}
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Transactions / Ledger Link */}
        {activeTab === 'transactions' && (
          <div className="rounded-xl border border-[#EAECF0] bg-white p-5 space-y-3 text-center">
            <ArrowRightLeft className="mx-auto h-9 w-9 text-[#175CD3]" />
            <p className="text-sm font-bold text-[#101828]">حركات القيود والدفتر للحساب</p>
            <p className="text-xs text-[#667085]">يمكنك فتح دفتر الأستاذ التفصيلي واستعراض القيود والعمليات المحاسبية المكتملة</p>
            <Button asChild size="sm" className="w-full justify-center bg-[#175CD3] text-white hover:bg-[#1570EF] font-bold text-xs h-10">
              <Link href={`/chart-of-accounts/${account.code}`}>
                <BookOpen className="h-4 w-4 ml-1.5" />
                <span>فتح كشف حساب دفتر الأستاذ ({account.code})</span>
              </Link>
            </Button>
          </div>
        )}

        {/* Tab 3: Sub-accounts */}
        {activeTab === 'children' && (
          <div className="rounded-xl border border-[#EAECF0] bg-white p-3.5 space-y-2">
            {hasChildren ? (
              account.children.map(child => (
                <div key={child.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F9FAFB] border border-[#EAECF0] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#175CD3]">{child.code}</span>
                    <span className="font-semibold text-[#101828]">{child.name}</span>
                  </div>
                  <span className="font-mono font-bold text-[#344054] dir-ltr tabular-nums">
                    {formatMoney(child.balance, 'IQD')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-[#667085] py-6">لا توجد حسابات فرعية مرتبطة بهذا الحساب</p>
            )}
          </div>
        )}

        {/* Tab 4: Audit Log */}
        {activeTab === 'audit' && (
          <div className="rounded-xl border border-[#EAECF0] bg-white p-4 space-y-2 text-xs text-[#667085]">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#175CD3]" />
              <span>سجل التغييرات والتحديثات المحاسبية محفوظ ومؤرخ تلقائياً.</span>
            </div>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="border-t border-[#EAECF0] pt-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(account)}
              className="border-[#D0D5DD] text-xs font-semibold h-9 gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5 text-[#B54708]" />
              <span>تعديل البيانات</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddChild(account)}
              className="border-[#D0D5DD] text-xs font-semibold h-9 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-[#027A48]" />
              <span>إضافة حساب فرعي</span>
            </Button>
          </div>

          <Button asChild size="sm" className="w-full justify-center bg-[#175CD3] text-white hover:bg-[#1570EF] font-bold text-xs h-10">
            <Link href={`/chart-of-accounts/${account.code}`}>
              <BookOpen className="h-4 w-4 ml-1.5" />
              <span>عرض كشف حساب دفتر الأستاذ</span>
            </Link>
          </Button>

          {account.is_active ? (
            !hasChildren && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onArchive(account)}
                className="w-full justify-center border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2] text-xs font-semibold h-9"
              >
                <Archive className="h-3.5 w-3.5 ml-1.5" />
                <span>أرشفة هذا الحساب</span>
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onReactivate(account)}
              className="w-full justify-center border-[#ABE5C6] text-[#027A48] hover:bg-[#ECFDF3] text-xs font-semibold h-9"
            >
              <ArchiveRestore className="h-3.5 w-3.5 ml-1.5" />
              <span>إعادة تفعيل الحساب</span>
            </Button>
          )}
        </div>

      </div>
    </Drawer>
  )
}
