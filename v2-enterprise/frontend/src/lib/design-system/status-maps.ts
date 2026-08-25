/**
 * Enterprise Design System v1 — Domain-Specific Status Mapping
 * Provides domain-scoped status mappers for Sales, Payments, Inventory, Installments, & Receipts.
 */

export type SemanticStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface StatusConfig {
  variant: SemanticStatus
  label: string
  dot: boolean
  iconName?: string
}

// 1. Sales & Invoices Domain
export const salesStatusMap: Record<string, StatusConfig> = {
  Active:    { variant: 'success', label: 'نشطة',    dot: true },
  Cancelled: { variant: 'danger',  label: 'ملغاة',    dot: true },
  Draft:     { variant: 'neutral', label: 'مسودة',   dot: false },
}

// 2. Payments & Collections Domain
export const paymentStatusMap: Record<string, StatusConfig> = {
  Paid:      { variant: 'success', label: 'مسدد',    dot: true },
  Partial:   { variant: 'warning', label: 'جزئي',    dot: true },
  Pending:   { variant: 'warning', label: 'معلق',    dot: true },
  Overdue:   { variant: 'danger',  label: 'متأخر',    dot: true },
}

// 3. Inventory & Vehicles Domain
export const inventoryStatusMap: Record<string, StatusConfig> = {
  Available:   { variant: 'success', label: 'متاح',    dot: true },
  Reserved:    { variant: 'info',    label: 'محجوز',   dot: true },
  Sold:        { variant: 'neutral', label: 'مباع',    dot: false },
  Maintenance: { variant: 'warning', label: 'صيانة',   dot: true },
}

// 4. Installments & Contracts Domain
export const installmentStatusMap: Record<string, StatusConfig> = {
  Active:    { variant: 'success', label: 'قائم',    dot: true },
  Completed: { variant: 'info',    label: 'مكتمل',   dot: false },
  Defaulted: { variant: 'danger',  label: 'تعثر',    dot: true },
  GracePeriod:{ variant: 'warning',label: 'فترة سماح', dot: true },
}

// 5. Receipts & Vouchers Domain
export const receiptStatusMap: Record<string, StatusConfig> = {
  Posted:    { variant: 'success', label: 'رحّل',   dot: true },
  Unposted:  { variant: 'warning', label: 'غير مرحّل', dot: true },
  Voided:    { variant: 'danger',  label: 'ملغى',    dot: true },
}

export type DomainType = 'sales' | 'payment' | 'inventory' | 'installment' | 'receipt'

export function getDomainStatusConfig(status?: string | null, domain: DomainType = 'sales'): StatusConfig {
  if (!status) return { variant: 'neutral', label: '—', dot: false }

  let map: Record<string, StatusConfig>
  switch (domain) {
    case 'payment':
      map = paymentStatusMap
      break
    case 'inventory':
      map = inventoryStatusMap
      break
    case 'installment':
      map = installmentStatusMap
      break
    case 'receipt':
      map = receiptStatusMap
      break
    case 'sales':
    default:
      map = salesStatusMap
      break
  }

  // Safe fallback to neutral preserving original string if unknown
  return map[status] ?? { variant: 'neutral', label: status, dot: false }
}

export function getStatusConfig(status?: string | null): StatusConfig {
  if (!status) return { variant: 'neutral', label: '—', dot: false }
  
  // Try sales first, then payment, then inventory
  return salesStatusMap[status] ?? paymentStatusMap[status] ?? inventoryStatusMap[status] ?? {
    variant: 'neutral',
    label: status,
    dot: false,
  }
}
