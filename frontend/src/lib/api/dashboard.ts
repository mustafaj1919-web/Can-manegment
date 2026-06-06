import { get } from './client'
import type { DashboardStats, Notification, AuditLog } from '@/types'

/* ─── Dashboard Stats ────────────────────────────────────────────────────── */

interface RawDashboardResponse {
  stats?: Record<string, number>
  labels?: Record<string, string>
  installment_summary?: DashboardStats['installment_summary']
  monthly_summary?: DashboardStats['monthly_summary']
  // also accept flat format
  [key: string]: unknown
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const raw = await get<RawDashboardResponse>('/dashboard')

  // Flask returns { stats: { available_cars_count, sold_cars_count, ... }, labels: {...} }
  const s: Record<string, number> = (raw.stats as Record<string, number>) ?? (raw as unknown as Record<string, number>)

  return {
    available_cars:        s.available_cars_count  ?? s.available_cars  ?? 0,
    sold_cars:             s.sold_cars_count        ?? s.sold_cars       ?? 0,
    reserved_cars:         s.reserved_cars          ?? 0,
    customers:             s.customers_count        ?? s.customers       ?? 0,
    sales:                 s.sales_count            ?? s.sales           ?? 0,
    purchases:             s.purchases_count        ?? s.purchases       ?? 0,
    installments:          s.installments           ?? 0,
    cashbox_balance:       s.cashbox_balance        ?? 0,
    cashbox_currency:      'IQD',
    overdue_installments:  s.overdue_installments   ?? 0,
    total_sales_amount:    s.total_revenue          ?? s.total_sales_amount    ?? 0,
    total_purchases_amount: s.total_purchases_paid  ?? s.total_purchases_amount ?? 0,
    overdue_amount:        s.overdue_amount         ?? raw.installment_summary?.overdue_amount ?? 0,
    receivables:           s.receivables            ?? raw.installment_summary?.total_receivables ?? 0,
    today_payments:        s.today_payments         ?? 0,
    monthly_sales_paid:    s.monthly_sales_paid     ?? raw.monthly_summary?.sales_paid ?? 0,
    monthly_purchases_paid: s.monthly_purchases_paid ?? raw.monthly_summary?.purchases_paid ?? 0,
    monthly_profit:        s.monthly_profit         ?? raw.monthly_summary?.profit ?? 0,
    inventory_value:       s.inventory_value        ?? 0,
    payables:              s.payables               ?? 0,
    annual_profit:         s.annual_profit          ?? 0,
    cars_sold_month:       s.cars_sold_month        ?? 0,
    installment_summary:   raw.installment_summary,
    monthly_summary:       raw.monthly_summary,
  }
}

/* ─── Notifications ──────────────────────────────────────────────────────── */

interface RawNotification {
  type: 'installment_due' | 'audit' | 'defaulting_customer'
  // installment_due fields
  installment_id?: number
  plan_id?: number
  sale_id?: number
  due_date?: string
  amount?: number
  currency?: string
  status?: string
  customer_name?: string
  car_name?: string
  invoice_number?: string
  // defaulting_customer fields
  customer_id?: number
  customer_phone?: string
  overdue_count?: number
  overdue_amount?: number
  // audit fields
  id?: number
  user_id?: number
  action?: string
  entity_type?: string
  entity_id?: number
  details?: string
  created_at?: string
}

export interface DefaultingCustomer {
  customer_id: number
  customer_name: string
  customer_phone: string | null
  overdue_count: number
  overdue_amount: number
  currency: 'IQD'
}

interface RawNotificationsResponse {
  notifications?: RawNotification[]
  overdue?: Notification[]
  due_today?: Notification[]
  due_soon?: Notification[]
  audit_logs?: AuditLog[]
}

export async function getNotifications(): Promise<{
  overdue: Notification[]
  due_today: Notification[]
  defaulting_customers?: DefaultingCustomer[]
  due_soon: Notification[]
  audit_logs: AuditLog[]
}> {
  const raw = await get<RawNotificationsResponse>('/notifications')

  // If the API already returns the expected format (future-proofing), pass it through
  if (raw.overdue || raw.due_today || raw.due_soon) {
    return {
      overdue:    raw.overdue    ?? [],
      due_today:  raw.due_today  ?? [],
      due_soon:   raw.due_soon   ?? [],
      audit_logs: raw.audit_logs ?? [],
    }
  }

  // Flask returns flat { notifications: [...] } with mixed types
  const all: RawNotification[] = raw.notifications ?? []

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setDate(todayEnd.getDate() + 1)
  const soonEnd  = new Date(now); soonEnd.setDate(soonEnd.getDate() + 7)

  const overdue:              Notification[]       = []
  const due_today:            Notification[]       = []
  const due_soon:             Notification[]       = []
  const audit_logs:           AuditLog[]           = []
  const defaulting_customers: DefaultingCustomer[] = []

  for (const n of all) {
    if (n.type === 'installment_due') {
      const notif: Notification = {
        id:               n.installment_id ?? 0,
        customer_name:    n.customer_name  ?? `قسط #${n.installment_id ?? ''}`,
        car_name:         n.car_name       ?? (n.plan_id ? `خطة #${n.plan_id}` : '—'),
        invoice_number:   n.invoice_number ?? (n.sale_id ? `فاتورة #${n.sale_id}` : '—'),
        amount:           n.amount         ?? 0,
        currency:         (n.currency as 'USD' | 'IQD') ?? 'IQD',
        due_date:         n.due_date       ?? '',
        status:           (n.status as any) ?? 'Pending',
      }
      const dueDate = n.due_date ? new Date(n.due_date) : null
      if (!dueDate) { due_soon.push(notif); continue }

      const isOverdue = n.status === 'Overdue' || dueDate < now
      if (isOverdue) {
        overdue.push(notif)
      } else if (dueDate < todayEnd) {
        due_today.push(notif)
      } else if (dueDate < soonEnd) {
        due_soon.push(notif)
      }
    } else if (n.type === 'defaulting_customer') {
      defaulting_customers.push({
        customer_id:    n.customer_id    ?? 0,
        customer_name:  n.customer_name  ?? '—',
        customer_phone: n.customer_phone ?? null,
        overdue_count:  n.overdue_count  ?? 0,
        overdue_amount: n.overdue_amount ?? 0,
        currency:       'IQD',
      })
    } else if (n.type === 'audit') {
      audit_logs.push({
        id:          n.id          ?? 0,
        user_id:     n.user_id     ?? null,
        action:      n.action      ?? '',
        entity_type: n.entity_type ?? null,
        entity_id:   n.entity_id   ?? null,
        details:     n.details     ?? null,
        created_at:  n.created_at  ?? '',
      })
    }
  }

  return { overdue, due_today, due_soon, audit_logs, defaulting_customers }
}
