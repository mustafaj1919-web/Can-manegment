'use client'

import React from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronLeft, MoreHorizontal, BookOpen, Plus,
  Pencil, Archive, ArchiveRestore, Eye, AlertCircle, Folder, FolderOpen, FileText
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChartAccountNode, CLASSIFICATION_LABELS } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/design-system/formatting'
import { cn } from '@/lib/utils'
import { TableDensity } from './ChartOfAccountsToolbar'

interface AccountTreeRowProps {
  node: ChartAccountNode
  depth: number
  search: string
  expanded: Set<number>
  onToggle: (id: number) => void
  onSelectRow: (node: ChartAccountNode) => void
  isSelected?: boolean
  onEdit: (node: ChartAccountNode) => void
  onDelete: (node: ChartAccountNode) => void
  onReactivate: (node: ChartAccountNode) => void
  onAddChild: (node: ChartAccountNode) => void
  density: TableDensity
  columnsVisibility: Record<string, boolean>
}

export function AccountTreeRow({
  node,
  depth,
  search,
  expanded,
  onToggle,
  onSelectRow,
  isSelected = false,
  onEdit,
  onDelete,
  onReactivate,
  onAddChild,
  density,
  columnsVisibility,
}: AccountTreeRowProps) {
  const hasChildren = node.children_count > 0 || (node.children && node.children.length > 0)
  const isExpanded = expanded.has(node.id)

  const debit = node.subtree_debit ?? node.debit ?? 0
  const credit = node.subtree_credit ?? node.credit ?? 0
  const balance = node.subtree_balance ?? node.balance ?? 0

  // Hierarchy styling based on depth / account role
  let rowStyleClass = 'bg-white hover:bg-[#F9FAFB]'
  let textStyleClass = 'font-normal text-[#344054] text-[13.5px]'
  let rowHeightClass = 'h-[42px]'

  if (depth === 0 || node.level === 'رئيسي' || node.is_synthetic) {
    rowStyleClass = 'bg-[#F2F4F7] hover:bg-[#EAECF0] border-y border-[#D0D5DD]'
    textStyleClass = 'font-bold text-[#101828] text-[15px]'
    rowHeightClass = 'h-[48px]'
  } else if (depth === 1 || node.level === 'فرعي') {
    rowStyleClass = 'bg-[#F8FAFC] hover:bg-[#F2F4F7]'
    textStyleClass = 'font-semibold text-[#1D2939] text-[14px]'
    rowHeightClass = 'h-[46px]'
  } else if (depth === 2) {
    rowStyleClass = 'bg-white hover:bg-[#F9FAFB]'
    textStyleClass = 'font-medium text-[#344054] text-[14px]'
    rowHeightClass = 'h-[44px]'
  }

  // Adjust row height by density preference
  if (density === 'compact') {
    rowHeightClass = depth === 0 ? 'h-[44px]' : 'h-[38px]'
  } else if (density === 'comfortable') {
    rowHeightClass = depth === 0 ? 'h-[52px]' : 'h-[48px]'
  }

  // RTL Indentation: 8px at depth 0, 36px at depth 1, 64px at depth 2, 92px at depth 3, 120px at depth 4
  const paddingRightPx = 8 + depth * 28

  return (
    <tr
      onClick={() => onSelectRow(node)}
      className={cn(
        'border-b border-[#EAECF0] transition-colors cursor-pointer group',
        rowStyleClass,
        rowHeightClass,
        isSelected && 'bg-[#EFF8FF] border-r-4 border-r-[#1570EF]',
        !node.is_active && 'opacity-60 bg-[#F9FAFB]'
      )}
    >
      {/* Column 1: Account Code (110px) */}
      <td className="px-2.5 py-1 font-mono font-bold text-[#175CD3] whitespace-nowrap text-right w-[110px]">
        <span className="dir-ltr inline-block tracking-tight text-[13.5px]" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
          {node.code}
        </span>
      </td>

      {/* Column 2: Account Name & RTL Tree Hierarchy Indent (min-width 360px, flex-grow 1) */}
      <td className="px-2.5 py-1 min-w-[360px]">
        <div className="flex items-center gap-2" style={{ paddingRight: `${paddingRightPx}px` }}>
          
          {/* Hierarchy Depth Guide Lines for Depth > 0 */}
          {depth > 0 && (
            <div className="h-4 w-[2px] bg-[#D0D5DD] shrink-0 rounded-full ml-1" />
          )}

          {/* Tree Expansion Chevron Control (28px x 28px clickable area) */}
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'طي الحساب الفرعي' : 'توسيع الحساب الفرعي'}
              onClick={(e) => {
                e.stopPropagation()
                onToggle(node.id)
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[#D0D5DD] bg-white text-[#667085] hover:text-[#175CD3] hover:border-[#175CD3] hover:bg-[#EAECF0] transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          ) : (
            /* Reserved 28px x 28px empty space to align detail accounts cleanly */
            <span className="h-7 w-7 shrink-0" />
          )}

          {/* Folder (Parent) vs File (Detail) Account Icon */}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4.5 w-4.5 text-[#175CD3] shrink-0" />
            ) : (
              <Folder className="h-4.5 w-4.5 text-[#475467] shrink-0" />
            )
          ) : (
            <FileText className="h-4 w-4 text-[#98A2B3] shrink-0" />
          )}

          {/* Name Label */}
          <span className={cn('truncate text-right', textStyleClass)}>
            {node.name}
          </span>

          {/* Synthetic Node Tag */}
          {node.is_synthetic && (
            <span className="rounded-md bg-[#F2F4F7] border border-[#D0D5DD] px-1.5 py-0.2 text-[10px] text-[#667085] font-semibold shrink-0 mr-1" title="عقدة هيكلية غير محفوظة">
              هيكلي
            </span>
          )}

          {/* Child Count Badge */}
          {hasChildren && (
            <span className="rounded-full bg-[#EAECF0] border border-[#D0D5DD] px-2 py-0.5 text-[11px] text-[#344054] font-numeric font-semibold shrink-0 mr-1">
              {node.children_count}
            </span>
          )}
        </div>
      </td>

      {/* Column 3: Level (Plain Text, 80px) */}
      {columnsVisibility.level !== false && (
        <td className="px-2 py-1 whitespace-nowrap text-right w-[80px] text-xs text-[#475467] font-medium">
          {node.is_synthetic ? 'هيكلي' : node.level}
        </td>
      )}

      {/* Column 4: Type (Plain Text without pill repetition, 105px) */}
      {columnsVisibility.type !== false && (
        <td className="px-2 py-1 whitespace-nowrap text-right w-[105px] text-xs text-[#475467] font-medium">
          {node.type_label || node.type}
        </td>
      )}

      {/* Column 5: Classification (Plain Text, 105px) */}
      {columnsVisibility.classification !== false && (
        <td className="px-2 py-1 whitespace-nowrap text-right w-[105px] text-xs text-[#475467]">
          {node.classification_label || (node.classification && CLASSIFICATION_LABELS[node.classification]) ? (
            <span>{node.classification_label || CLASSIFICATION_LABELS[node.classification]}</span>
          ) : (
            <span className="text-[#98A2B3]">—</span>
          )}
        </td>
      )}

      {/* Column 6: Currency (Plain Text, 70px) */}
      <td className="px-2 py-1 whitespace-nowrap text-center w-[70px] text-xs text-[#475467] font-medium">
        د.ع
      </td>

      {/* Column 7: Debit Balance (130px, Tabular Numerals) */}
      {columnsVisibility.debit !== false && (
        <td className={cn(
          'px-2.5 py-1 whitespace-nowrap text-left w-[130px] font-numeric text-[13.5px] tabular-nums dir-ltr',
          debit === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#175CD3] font-semibold'
        )}>
          {debit === 0 ? '0 د.ع' : formatMoney(debit, 'IQD')}
        </td>
      )}

      {/* Column 8: Credit Balance (130px, Tabular Numerals) */}
      {columnsVisibility.credit !== false && (
        <td className={cn(
          'px-2.5 py-1 whitespace-nowrap text-left w-[130px] font-numeric text-[13.5px] tabular-nums dir-ltr',
          credit === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#067647] font-semibold'
        )}>
          {credit === 0 ? '0 د.ع' : formatMoney(credit, 'IQD')}
        </td>
      )}

      {/* Column 9: Net Balance (135px, Tabular Numerals) */}
      {columnsVisibility.balance !== false && (
        <td className={cn(
          'px-2.5 py-1 whitespace-nowrap text-left w-[135px] font-numeric text-[13.5px] tabular-nums dir-ltr',
          balance < 0 ? 'text-[#B42318] font-bold' : balance === 0 ? 'text-[#98A2B3] font-normal' : 'text-[#344054] font-bold'
        )}>
          {balance === 0 ? '0 د.ع' : formatMoney(balance, 'IQD')}
        </td>
      )}

      {/* Column 10: Status (Clean Text with Dot, 85px) */}
      {columnsVisibility.status !== false && (
        <td className="px-2 py-1 whitespace-nowrap text-center w-[85px]">
          {node.is_active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#027A48]">
              <span className="h-2 w-2 rounded-full bg-[#12B76A]" />
              <span>نشط</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085]">
              <span className="h-2 w-2 rounded-full bg-[#98A2B3]" />
              <span>مؤرشف</span>
            </span>
          )}
        </td>
      )}

      {/* Column 11: Row Actions (Three-Dot Menu, 52px) */}
      <td className="px-2 py-1 whitespace-nowrap text-center w-[52px]" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D0D5DD] bg-white text-[#667085] hover:text-[#101828] hover:border-[#98A2B3] transition-colors mx-auto"
              aria-label="خيارات الحساب"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 text-right">
            <DropdownMenuItem
              onClick={() => onSelectRow(node)}
              className="gap-2.5 text-xs font-semibold cursor-pointer py-2"
            >
              <Eye className="h-4 w-4 text-[#175CD3]" />
              <span>عرض التفاصيل</span>
            </DropdownMenuItem>

            {/* Edit Action Guarded for Synthetic Nodes */}
            {node.is_active && (
              node.is_synthetic ? (
                <div className="px-2 py-2 text-xs text-[#98A2B3] flex items-center gap-2 cursor-not-allowed opacity-50" title="عقدة هيكلية غير محفوظة في دليل الحسابات">
                  <Pencil className="h-4 w-4 text-[#98A2B3]" />
                  <span>تعديل (عقدة هيكلية)</span>
                </div>
              ) : (
                <DropdownMenuItem
                  onClick={() => onEdit(node)}
                  className="gap-2.5 text-xs font-semibold cursor-pointer py-2"
                >
                  <Pencil className="h-4 w-4 text-[#B54708]" />
                  <span>تعديل الحساب</span>
                </DropdownMenuItem>
              )
            )}

            {node.is_active && (
              <DropdownMenuItem
                onClick={() => onAddChild(node)}
                className="gap-2.5 text-xs font-semibold cursor-pointer py-2"
              >
                <Plus className="h-4 w-4 text-[#027A48]" />
                <span>إضافة حساب فرعي</span>
              </DropdownMenuItem>
            )}

            {node.is_active && node.is_persisted && (
              <DropdownMenuItem asChild className="gap-2.5 text-xs font-semibold cursor-pointer py-2">
                <Link href={`/chart-of-accounts/${node.code}`}>
                  <BookOpen className="h-4 w-4 text-[#175CD3]" />
                  <span>فتح دفتر الأستاذ</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Archive Action Guarded for Synthetic / Parent Nodes */}
            {node.is_active && (
              node.is_synthetic ? (
                <div className="px-2 py-2 text-xs text-[#98A2B3] flex items-center gap-2 cursor-not-allowed opacity-50" title="عقدة هيكلية غير محفوظة في دليل الحسابات">
                  <Archive className="h-4 w-4 text-[#98A2B3]" />
                  <span>أرشفة (عقدة هيكلية)</span>
                </div>
              ) : hasChildren ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="px-2 py-2 text-xs text-[#98A2B3] flex items-center gap-2 cursor-not-allowed opacity-50">
                        <AlertCircle className="h-4 w-4 text-[#98A2B3]" />
                        <span>أرشفة الحساب (ممنوع)</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="text-xs bg-[#101828] text-white p-2">
                      لا يمكن أرشفة حساب يحتوي على حسابات فرعية
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <DropdownMenuItem
                  onClick={() => onDelete(node)}
                  className="gap-2.5 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] cursor-pointer py-2"
                >
                  <Archive className="h-4 w-4 text-[#B42318]" />
                  <span>أرشفة الحساب</span>
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
