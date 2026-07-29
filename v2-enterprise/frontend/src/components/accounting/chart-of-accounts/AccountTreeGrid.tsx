'use client'

import React, { useMemo } from 'react'
import { ChartAccountNode } from '@/lib/api/accounting'
import { AccountTreeRow } from './AccountTreeRow'
import { TableDensity } from './ChartOfAccountsToolbar'
import { AlertCircle, FolderTree } from 'lucide-react'

export function flattenVisibleTree(
  nodes: ChartAccountNode[],
  expandedIds: Set<number>
): ChartAccountNode[] {
  const result: ChartAccountNode[] = []

  function traverse(node: ChartAccountNode) {
    result.push(node)
    const hasChildren = node.children_count > 0 || (node.children && node.children.length > 0)
    if (hasChildren && expandedIds.has(node.id)) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  for (const node of nodes) {
    traverse(node)
  }

  return result
}

interface AccountTreeGridProps {
  nodes: ChartAccountNode[]
  searchQuery: string
  expanded: Set<number>
  onToggleExpand: (id: number) => void
  onSelectRow: (node: ChartAccountNode) => void
  selectedAccountId?: number | null
  onEdit: (node: ChartAccountNode) => void
  onDelete: (node: ChartAccountNode) => void
  onReactivate: (node: ChartAccountNode) => void
  onAddChild: (node: ChartAccountNode) => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  density: TableDensity
  columnsVisibility: Record<string, boolean>
}

export function AccountTreeGrid({
  nodes,
  searchQuery,
  expanded,
  onToggleExpand,
  onSelectRow,
  selectedAccountId,
  onEdit,
  onDelete,
  onReactivate,
  onAddChild,
  isLoading = false,
  isError = false,
  onRetry,
  density,
  columnsVisibility,
}: AccountTreeGridProps) {
  // Compute visible rows list from normalized tree and expanded state
  const visibleRows = useMemo(() => flattenVisibleTree(nodes, expanded), [nodes, expanded])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-11 w-full rounded bg-[#F9FAFB] animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[#EAECF0] bg-white p-12 text-center shadow-xs">
        <AlertCircle className="mx-auto h-8 w-8 text-[#B42318]" />
        <p className="mt-2 text-sm font-semibold text-[#101828]">تعذر تحميل دليل الحسابات</p>
        <p className="mt-1 text-xs text-[#667085]">يرجى التحقق من اتصال الشبكة ثم إرسال الطلب مجدداً</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#175CD3] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1570EF]"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] bg-white shadow-xs overflow-hidden text-right dir-rtl" dir="rtl">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] min-h-[520px]">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
          {/* Sticky Enterprise Header */}
          <thead className="sticky top-0 z-10 bg-[#F2F4F7] border-b border-[#D0D5DD]">
            <tr className="text-[#475467] font-semibold text-xs h-11">
              <th className="px-2.5 py-2 text-right w-[110px]">رمز الحساب</th>
              <th className="px-2.5 py-2 text-right min-w-[360px]">اسم الحساب والهيكل الشجري</th>
              {columnsVisibility.level !== false && <th className="px-2 py-2 text-right w-[80px]">المستوى</th>}
              {columnsVisibility.type !== false && <th className="px-2 py-2 text-right w-[105px]">النوع</th>}
              {columnsVisibility.classification !== false && <th className="px-2 py-2 text-right w-[105px]">التصنيف</th>}
              <th className="px-2 py-2 text-center w-[70px]">العملة</th>
              {columnsVisibility.debit !== false && <th className="px-2.5 py-2 text-left w-[130px]">الرصيد المدين</th>}
              {columnsVisibility.credit !== false && <th className="px-2.5 py-2 text-left w-[130px]">الرصيد الدائن</th>}
              {columnsVisibility.balance !== false && <th className="px-2.5 py-2 text-left w-[135px]">صافي الرصيد</th>}
              {columnsVisibility.status !== false && <th className="px-2 py-2 text-center w-[85px]">الحالة</th>}
              <th className="px-2 py-2 text-center w-[52px]">الإجراءات</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#EAECF0]">
            {visibleRows.length > 0 ? (
              visibleRows.map(node => (
                <AccountTreeRow
                  key={node.id}
                  node={node}
                  depth={node.depth}
                  search={searchQuery}
                  expanded={expanded}
                  onToggle={onToggleExpand}
                  onSelectRow={onSelectRow}
                  isSelected={selectedAccountId === node.id}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReactivate={onReactivate}
                  onAddChild={onAddChild}
                  density={density}
                  columnsVisibility={columnsVisibility}
                />
              ))
            ) : (
              <tr>
                <td colSpan={11} className="py-20 text-center text-[#667085]">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <FolderTree className="h-9 w-9 text-[#98A2B3]" />
                    <span className="text-sm font-semibold text-[#101828]">لا توجد حسابات مطابقة للبحث أو التصفية</span>
                    <span className="text-xs text-[#667085]">جرب تعديل مصطلحات البحث أو إزالة بعض فلاتر الفئات</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
