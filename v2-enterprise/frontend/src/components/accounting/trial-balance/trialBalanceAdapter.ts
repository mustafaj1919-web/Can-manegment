'use client'

import { TrialBalanceAccount, TrialBalanceResponse } from '@/lib/api/accounting'

export interface TrialBalanceStatusAdapter {
  isBalanced: boolean | null
  statusSource: 'backend-flag' | 'backend-status' | 'backend-difference' | 'unknown'
  statusLabel: string
  difference: number
}

/**
 * Priority order status adapter:
 * 1. Backend `isBalanced` flag if present
 * 2. Backend `status` string/enum ('balanced' | 'Balanced')
 * 3. Backend-provided `difference` check fallback
 */
export function adaptTrialBalanceStatus(data?: TrialBalanceResponse | null): TrialBalanceStatusAdapter {
  if (!data) {
    return {
      isBalanced: null,
      statusSource: 'unknown',
      statusLabel: 'الحالة غير متوفرة',
      difference: 0,
    }
  }

  const raw = data as any
  const difference = typeof data.difference === 'number' ? data.difference : 0

  // 1. Check explicit isBalanced boolean flag
  if (typeof raw.isBalanced === 'boolean') {
    return {
      isBalanced: raw.isBalanced,
      statusSource: 'backend-flag',
      statusLabel: raw.isBalanced ? 'متوازن' : 'غير متوازن',
      difference,
    }
  }

  // 2. Check backend status string/enum
  if (typeof data.status === 'string' && data.status.trim().length > 0) {
    const statusLower = data.status.trim().toLowerCase()
    if (statusLower === 'balanced') {
      return {
        isBalanced: true,
        statusSource: 'backend-status',
        statusLabel: 'متوازن',
        difference,
      }
    }
    if (statusLower === 'unbalanced') {
      return {
        isBalanced: false,
        statusSource: 'backend-status',
        statusLabel: 'غير متوازن',
        difference,
      }
    }
  }

  // 3. Difference check fallback
  const isBalancedFallback = Math.abs(difference) < 0.01
  return {
    isBalanced: isBalancedFallback,
    statusSource: 'backend-difference',
    statusLabel: isBalancedFallback ? 'متوازن' : 'غير متوازن',
    difference,
  }
}

/**
 * Map account type backend values safely.
 * Fallback to neutral "غير مصنف" for unknown types.
 */
export interface AccountTypeInfo {
  label: string
  colorClass: string
  bgClass: string
  borderClass: string
  isKnown: boolean
}

export function getAccountTypeInfo(type?: string | null): AccountTypeInfo {
  if (!type) {
    return {
      label: 'غير مصنف',
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-100',
      borderClass: 'border-slate-200',
      isKnown: false,
    }
  }

  const normalized = type.trim()
  switch (normalized) {
    case 'Asset':
    case 'Assets':
    case 'موجودات':
      return {
        label: 'موجودات',
        colorClass: 'text-cyan-800',
        bgClass: 'bg-cyan-50',
        borderClass: 'border-cyan-200',
        isKnown: true,
      }
    case 'Liability':
    case 'Liabilities':
    case 'مطلوبات':
      return {
        label: 'مطلوبات',
        colorClass: 'text-rose-800',
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200',
        isKnown: true,
      }
    case 'Equity':
    case 'حقوق الملكية':
      return {
        label: 'حقوق الملكية',
        colorClass: 'text-violet-800',
        bgClass: 'bg-violet-50',
        borderClass: 'border-violet-200',
        isKnown: true,
      }
    case 'Income':
    case 'Revenue':
    case 'إيرادات':
      return {
        label: 'إيرادات',
        colorClass: 'text-emerald-800',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        isKnown: true,
      }
    case 'Expense':
    case 'Expenses':
    case 'مصروفات':
      return {
        label: 'مصروفات',
        colorClass: 'text-amber-800',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        isKnown: true,
      }
    default:
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[TrialBalance] Unknown account type encountered: "${type}"`)
      }
      return {
        label: 'غير مصنف',
        colorClass: 'text-slate-600',
        bgClass: 'bg-slate-100',
        borderClass: 'border-slate-200',
        isKnown: false,
      }
  }
}

/**
 * Arabic text normalization for frontend search comparison only.
 * Does not mutate displayed string values.
 */
export function normalizeArabicSearch(text?: string | null): string {
  if (!text) return ''
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '') // remove Arabic diacritics
}
