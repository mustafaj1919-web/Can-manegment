import { formatMoney } from '@/lib/utils'
import type { PaymentMethodType, ReceiptStatusType } from './installmentReceiptTypes'

export function mapPaymentMethodArabic(method?: PaymentMethodType | null): string {
  if (!method) return 'طريقة دفع غير معروفة'
  const normalized = method.toString().trim().toLowerCase()

  if (normalized.includes('cash') || normalized.includes('نقد')) {
    return 'نقداً'
  }
  if (normalized.includes('bank') || normalized.includes('transfer') || normalized.includes('تحويل')) {
    return 'تحويل مصرفي'
  }
  if (normalized.includes('pos') || normalized.includes('card') || normalized.includes('بطاقة')) {
    return 'نقطة بيع (POS)'
  }
  if (normalized.includes('cheque') || normalized.includes('check') || normalized.includes('شيك')) {
    return 'شيك مصرفي'
  }

  return method || 'طريقة دفع غير معروفة'
}

export function mapReceiptStatusArabic(status?: ReceiptStatusType | null): { label: string; isError: boolean } {
  if (!status) return { label: 'تم الاستلام', isError: false }
  const normalized = status.toString().trim().toLowerCase()

  if (normalized === 'posted' || normalized === 'active' || normalized === 'paid') {
    return { label: 'تم الاستلام والإثبات', isError: false }
  }
  if (normalized === 'pending') {
    return { label: 'قيد المعالجة', isError: false }
  }
  if (normalized === 'reversed') {
    return { label: 'معكوس محاسبياً', isError: true }
  }
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return { label: 'سند ملغي', isError: true }
  }

  return { label: status, isError: false }
}

export function formatCurrencyAmount(amount?: number | null, currency: string = 'IQD'): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '0 ' + currency
  }
  return formatMoney(amount, currency as 'USD' | 'IQD')
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '0%'
  const rounded = Math.round(value * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}%`
}

/** Splits an ISO-ish date string into localized (ar-IQ) date and time parts for receipt display. */
export function formatArabicDate(value?: string | null): { date: string; time: string } {
  if (!value) return { date: '—', time: '' }
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return { date: value, time: '' }
    return {
      date: d.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    }
  } catch {
    return { date: value, time: '' }
  }
}

export function maskNationalId(nationalId?: string | null): string | null {
  if (!nationalId) return null
  const cleaned = nationalId.trim()
  if (cleaned.length <= 4) return cleaned
  const lastFour = cleaned.slice(-4)
  return `********${lastFour}`
}

export function tafqitArabic(num?: number | null, currency: string = 'IQD'): string {
  const val = Number(num) || 0
  if (val === 0) {
    return 'صفر ' + (currency === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي') + ' لا غير'
  }

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة']
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

  function convertGroup(n: number): string {
    let str = ''
    const h = Math.floor(n / 100)
    const rem = n % 100
    const t = Math.floor(rem / 10)
    const o = rem % 10

    if (h > 0) str += hundreds[h]

    if (rem > 0) {
      if (str !== '') str += ' و'
      if (rem < 10) {
        str += ones[o]
      } else if (rem === 10) {
        str += 'عشرة'
      } else if (rem === 11) {
        str += 'أحد عشر'
      } else if (rem === 12) {
        str += 'اثنا عشر'
      } else if (rem < 20) {
        str += ones[o] + ' عشر'
      } else {
        if (o > 0) {
          str += ones[o] + ' و' + tens[t]
        } else {
          str += tens[t]
        }
      }
    }
    return str
  }

  function convertNumber(n: number): string {
    if (n === 0) return ''
    if (n < 1000) return convertGroup(n)

    const millions = Math.floor(n / 1000000)
    let remainder = n % 1000000
    const thousands = Math.floor(remainder / 1000)
    remainder = remainder % 1000

    const parts: string[] = []

    if (millions > 0) {
      if (millions === 1) parts.push('مليون')
      else if (millions === 2) parts.push('مليونان')
      else if (millions >= 3 && millions <= 10) parts.push(convertGroup(millions) + ' ملايين')
      else parts.push(convertGroup(millions) + ' مليوناً')
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف')
      else if (thousands === 2) parts.push('ألفان')
      else if (thousands >= 3 && thousands <= 10) parts.push(convertGroup(thousands) + ' آلاف')
      else parts.push(convertGroup(thousands) + ' ألفاً')
    }

    if (remainder > 0) {
      parts.push(convertGroup(remainder))
    }

    return parts.join(' و')
  }

  const integerPart = Math.floor(Math.abs(val))
  const decimalPart = Math.round((Math.abs(val) - integerPart) * 100)

  const result = convertNumber(integerPart)
  const currencyName = currency === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي'
  const subUnitName = currency === 'IQD' ? 'فلساً' : 'سنتاً'

  let text = 'فقط ' + result + ' ' + currencyName

  if (decimalPart > 0) {
    text += ' و' + convertNumber(decimalPart) + ' ' + subUnitName
  }

  text += ' لا غير'
  return text
}

