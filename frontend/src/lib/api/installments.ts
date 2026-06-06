import { get, post } from './client'
import type { InstallmentPlanEmbed, InstallmentScheduleItem } from './sales'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface InstallmentListItem {
  id: number
  sale_id: number
  invoice_number: string | null
  car_name: string | null
  buyer_id: number | null
  buyer_name: string | null
  buyer_phone: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  currency: 'USD' | 'IQD'
  number_of_months: number | null
  installment_amount: number
  installment_due_day: number
  next_due_date: string | null
  next_due_amount: number
  schedule_count: number
  paid_schedule_count: number
  partial_count: number
  unpaid_count: number
  overdue_count: number
  due_today_count: number
  due_tomorrow_count: number
  due_in_2_days_count: number
  status: 'Active' | 'Paid'
}

export interface InstallmentSummary {
  total_plans: number
  active_plans: number
  paid_plans: number
  total_receivables: number
  total_paid_amount: number
  overdue_amount: number
  due_today_amount: number
  due_tomorrow_amount: number
  due_in_2_days_amount: number
  overdue_count: number
  due_today_count: number
  due_tomorrow_count: number
  due_in_2_days_count: number
  partial_count: number
  unpaid_count: number
  paid_schedule_count: number
}

export interface InstallmentListResponse {
  total: number
  page: number
  per_page: number
  summary: InstallmentSummary
  items: InstallmentListItem[]
}

export interface InstallmentPlanDetail extends InstallmentPlanEmbed {
  sale_id: number
  branch_id?: number | null
  branch?: { id: number; name: string; is_main: boolean; created_at?: string } | null
  notes: string | null
  invoice_number: string | null
  car_name: string | null
  buyer_name: string | null
  buyer_phone: string | null
  payments: Array<{
    id: number
    schedule_id: number | null
    amount: number
    currency: 'USD' | 'IQD'
    payment_method: string | null
    payment_date: string | null
    notes: string | null
  }>
  customer_statement: {
    customer_id: number
    customer_name: string
    plans_count: number
    total_amount: number
    paid_amount: number
    remaining_amount: number
    overdue_amount: number
    currency: 'USD' | 'IQD'
  } | null
}

export interface PaySchedulePayload {
  amount: number
  payment_method?: string
  notes?: string
}

export interface PayScheduleResponse {
  schedule_id: number
  status: string
  paid_amount: number
  remaining_amount: number
  plan_status: string
  plan_remaining: number
}

/* ─── API functions ──────────────────────────────────────────────────────── */

export type InstallmentFilter =
  | 'all'
  | 'overdue'
  | 'due_today'
  | 'due_tomorrow'
  | 'due_in_2_days'
  | 'due_in_7_days'
  | 'partial'
  | 'paid'
  | 'unpaid'

export async function getInstallments(params: {
  page?: number
  per_page?: number
  filter?: InstallmentFilter
} = {}): Promise<InstallmentListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.filter && params.filter !== 'all') {
    qs.set('filter', params.filter)
  }
  return get<InstallmentListResponse>(`/installments?${qs.toString()}`)
}

export async function getInstallmentPlan(planId: number): Promise<InstallmentPlanDetail> {
  return get<InstallmentPlanDetail>(`/installments/${planId}`)
}

export async function payInstallmentSchedule(
  scheduleId: number,
  payload: PaySchedulePayload
): Promise<PayScheduleResponse> {
  return post<PayScheduleResponse>(`/installments/schedules/${scheduleId}/payment`, payload)
}

/* ─── Contracts ──────────────────────────────────────────────────────────── */

export interface ContractItem {
  sale_id: number
  plan_id: number | null
  invoice_number: string | null
  sale_date: string | null
  car: string
  customer_name: string
  customer_id: number | null
  selling_price: number
  currency: string
  paid_amount: number
  remaining_amount: number
  number_of_months: number | null
  installment_amount: number | null
  installment_start_date: string | null
  sale_status: string
  plan_status: string | null
}

export interface ContractsResponse {
  total: number
  page: number
  per_page: number
  items: ContractItem[]
}

export function getContracts(params?: {
  page?: number; per_page?: number; status?: string; search?: string
}): Promise<ContractsResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params?.page     ?? 1))
  qs.set('per_page', String(params?.per_page ?? 25))
  if (params?.status) qs.set('status', params.status)
  if (params?.search) qs.set('search', params.search)
  return get<ContractsResponse>(`/contracts?${qs.toString()}`)
}

/* ─── Aging Report ───────────────────────────────────────────────────────── */

export interface AgingSchedule {
  schedule_id: number
  plan_id: number | null
  installment_no: number
  due_date: string | null
  days_overdue: number
  remaining_iqd: number
  customer_name: string
  customer_id: number | null
  car: string
}

export interface AgingBucket {
  bucket: string
  label: string
  count: number
  total_iqd: number
  customer_count: number
  schedules: AgingSchedule[]
}

export interface AgingReport {
  buckets: AgingBucket[]
  generated_at: string
}

export function getInstallmentAgingReport(): Promise<AgingReport> {
  return get<AgingReport>('/reports/installment-aging')
}
