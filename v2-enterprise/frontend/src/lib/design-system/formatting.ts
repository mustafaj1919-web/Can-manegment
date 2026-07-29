/**
 * Enterprise Design System v1 — Formatting Utilities
 * Standardized en-IQ Locale Formatters for Enterprise ERP.
 */

export function formatMoney(amount: number | null | undefined, currency: 'USD' | 'IQD' | string = 'USD'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '0'
  }
  const formatted = new Intl.NumberFormat('en-IQ', {
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(amount)

  return currency === 'USD' ? `$${formatted}` : `${formatted} د.ع`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0'
  }
  return new Intl.NumberFormat('en-IQ').format(value)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function formatAccountType(type: string | null | undefined): string {
  if (!type) return '—'
  switch (type) {
    case 'Asset': return 'أصول (موجودات)'
    case 'Liability': return 'خصوم (مطلوبات)'
    case 'Equity': return 'حقوق الملكية'
    case 'Income':
    case 'Revenue': return 'إيرادات'
    case 'Expense': return 'مصروفات'
    default: return type
  }
}
