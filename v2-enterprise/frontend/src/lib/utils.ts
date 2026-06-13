import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { ar } from 'date-fns/locale'

/* ─── Tailwind Class Merger ──────────────────────────────────────────────── */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ─── Money Formatting ───────────────────────────────────────────────────── */

/**
 * Formats a number with thousands separators.
 * Integers show no decimals; fractions strip trailing zeros.
 * Example: 1250000 → "1,250,000"  |  5000.5 → "5,000.5"
 */
export function formatNumber(value: number | string | null | undefined): string {
  const numericValue = typeof value === 'string' ? Number(value) : value
  if (numericValue === null || numericValue === undefined || Number.isNaN(numericValue)) return '0'

  const hasFraction = !Number.isInteger(numericValue)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(numericValue)
}

/** Formats money with currency label in Arabic */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: 'USD' | 'IQD' = 'USD'
): string {
  const formatted = formatNumber(amount ?? 0)
  const label = currency === 'IQD' ? 'د.ع' : '$'
  return `${label} ${formatted}`
}

/** Returns both USD and IQD representations */
export function formatMoneyPair(
  amount: number | null | undefined,
  currency: 'USD' | 'IQD' = 'USD',
  rate?: number | null
): string {
  const main = formatMoney(amount ?? 0, currency)
  if (!rate) return main
  const otherCurrency = currency === 'USD' ? 'IQD' : 'USD'
  const converted = currency === 'USD' ? (amount ?? 0) * rate : (amount ?? 0) / rate
  const other = formatMoney(converted, otherCurrency)
  return `${main} / ${other}`
}

/** Currency label in Arabic */
export function currencyLabel(currency: 'USD' | 'IQD'): string {
  return currency === 'IQD' ? 'الدينار العراقي' : 'الدولار'
}

/** Currency symbol */
export function currencySymbol(currency: 'USD' | 'IQD'): string {
  return currency === 'IQD' ? 'د.ع' : '$'
}

/* ─── Date Formatting ────────────────────────────────────────────────────── */

export function formatDate(
  dateString: string | null | undefined,
  pattern = 'yyyy/MM/dd'
): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return format(date, pattern)
  } catch {
    return '—'
  }
}

export function formatDateArabic(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return format(date, 'd MMMM yyyy', { locale: ar })
  } catch {
    return '—'
  }
}

export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '—'
    return formatDistanceToNow(date, { addSuffix: true, locale: ar })
  } catch {
    return '—'
  }
}

/* ─── Status Translations ────────────────────────────────────────────────── */

export const STATUS_LABELS: Record<string, string> = {
  Available: 'متاحة',
  Reserved: 'محجوزة',
  Sold: 'مباعة',
  Active: 'نشط',
  Cancelled: 'ملغاة',
  Pending: 'بانتظار الدفع',
  Partial: 'مدفوع جزئياً',
  Paid: 'مدفوع',
  Overdue: 'متأخر',
  New: 'جديدة',
  Used: 'مستعملة',
  Damaged: 'متضررة',
  Salvage: 'سكراب',
  Buyer: 'مشتري',
  Seller: 'بائع',
  Cash: 'نقداً',
  Installment: 'أقساط',
  'Bank transfer': 'حوالة مصرفية',
  'No Plate': 'بدون لوحة',
  Temporary: 'مؤقتة',
  Registered: 'مسجلة',
  Gasoline: 'بنزين',
  Diesel: 'ديزل',
  Hybrid: 'هايبرد',
  Electric: 'كهرباء',
  Automatic: 'أوتوماتيك',
  Manual: 'يدوي',
  CVT: 'CVT',
  DCT: 'DCT',
  Income: 'إيراد',
  Expense: 'مصروف',
  online: 'إلكتروني',
  manual: 'يدوي',
  USD: 'الدولار',
  IQD: 'الدينار',
}

export function translateStatus(key: string): string {
  return STATUS_LABELS[key] ?? key
}

export const ROLE_LABELS: Record<string, string> = {
  Owner: 'مالك المعرض',
  Admin: 'مدير النظام',
  Accountant: 'محاسب',
  Sales: 'موظف مبيعات',
}

/* ─── Status Color Variants ──────────────────────────────────────────────── */

export function getStatusVariant(status: string): string {
  const map: Record<string, string> = {
    Available: 'status-available',
    Sold: 'status-sold',
    Reserved: 'status-reserved',
    Pending: 'status-pending',
    Overdue: 'status-overdue',
    Partial: 'status-partial',
    Paid: 'status-paid',
    Active: 'status-active',
    Cancelled: 'status-cancelled',
  }
  return map[status] ?? 'status-pending'
}

/* ─── Car Display Helpers ────────────────────────────────────────────────── */

export function carDisplayName(car: { brand: string; model: string; manufacturing_year: number; trim?: string | null }): string {
  const parts = [car.manufacturing_year, car.brand, car.model]
  if (car.trim) parts.push(car.trim)
  return parts.join(' ')
}

export function photoUrl(filename: string, subfolder = ''): string {
  const path = subfolder ? `${subfolder}/${filename}` : filename
  return `/static/uploads/${path}`
}

/* ─── Number Utilities ───────────────────────────────────────────────────── */

export function clampToZero(value: number): number {
  return Math.max(0, value)
}

export function percentOf(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}
