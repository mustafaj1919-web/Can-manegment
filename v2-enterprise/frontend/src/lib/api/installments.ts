import { get, post } from './client'
import type { InstallmentPlanEmbed, InstallmentScheduleItem } from './sales'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface InstallmentListItem {
  id: string
  sale_id: string | null
  purchase_id: string | null
  plan_type: 'sale' | 'purchase'
  invoice_number: string | null
  car_name: string | null
  buyer_id: string | null
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
  sale_id: string
  branch_id?: string | null
  branch?: { id: string; name: string; is_main: boolean; created_at?: string } | null
  notes: string | null
  invoice_number: string | null
  car_name: string | null
  buyer_name: string | null
  buyer_phone: string | null
  payments: Array<{
    id: string
    schedule_id: string | null
    amount: number
    currency: 'USD' | 'IQD'
    payment_method: string | null
    payment_date: string | null
    notes: string | null
    archive?: {
      exists: boolean
      is_archived: boolean
      archive_id: string | null
      receipt_number: string | null
      archive_status: string | null
      archive_method: string | null
      storage_reference?: string | null
      document_file_name?: string | null
      archived_by: string | null
      archived_at: string | null
    }
  }>
  customer_statement: {
    customer_id: string
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
  search?: string
} = {}): Promise<InstallmentListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.filter && params.filter !== 'all') {
    qs.set('filter', params.filter)
  }
  if (params.search && params.search.trim()) {
    qs.set('search', params.search.trim())
  }
  return get<InstallmentListResponse>(`/Installments?${qs.toString()}`)
}

export async function getInstallmentPlan(planId: number | string): Promise<InstallmentPlanDetail> {
  return get<InstallmentPlanDetail>(`/Installments/${planId}`)
}

export async function archivePaymentReceipt(
  paymentId: string,
  payload: {
    archive_method?: string
    storage_reference?: string
    document_file_name?: string
    notes?: string
  } = {}
) {
  return post(`/Payments/${paymentId}/archive`, {
    ArchiveMethod: payload.archive_method || 'ManuallyConfirmed',
    StorageReference: payload.storage_reference || null,
    DocumentFileName: payload.document_file_name || null,
    Notes: payload.notes || null,
  })
}

export async function payInstallmentSchedule(
  scheduleId: number | string,
  payload: PaySchedulePayload
): Promise<PayScheduleResponse> {
  // تحويل لـ PascalCase ليطابق PaySchedulePayloadDto (snake_case مثل payment_method لا يُربَط).
  const body = {
    Amount: payload.amount,
    PaymentMethod: payload.payment_method || 'Cash',
    Notes: payload.notes,
  }
  return post<PayScheduleResponse>(`/Installments/schedules/${scheduleId}/payment`, body)
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
  return get<ContractsResponse>(`/Contracts?${qs.toString()}`)
}

/* ─── Aging Report ───────────────────────────────────────────────────────── */

export interface AgingSchedule {
  schedule_id: number | string
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

export async function getInstallmentAgingReport(): Promise<AgingReport> {
  // نقوم بالاتصال بنقطة اتصال محاسبة أعمار الديون الصحيحة بالخلفية
  const res = await get<{ success: boolean; data: any }>('/Accounting/installments-aging')
  
  if (res && res.success && res.data) {
    const data = res.data
    const items = data.Items ?? []
    
    // تقسيم وتصنيف الأعمار ديناميكياً لتطابق واجهة العرض
    const buckets: AgingBucket[] = [
      { bucket: 'current', label: 'غير متأخرة', count: 0, total_iqd: 0, customer_count: 0, schedules: [] },
      { bucket: '1-30', label: '1 - 30 يوم', count: 0, total_iqd: 0, customer_count: 0, schedules: [] },
      { bucket: '31-60', label: '31 - 60 يوم', count: 0, total_iqd: 0, customer_count: 0, schedules: [] },
      { bucket: 'over_60', label: 'أكثر من 60 يوم', count: 0, total_iqd: 0, customer_count: 0, schedules: [] }
    ]
    
    const customersSeen = new Set<string>()
    
    items.forEach((item: any) => {
      const schedule: AgingSchedule = {
        schedule_id: item.InstallmentId,
        plan_id: null,
        installment_no: item.InstallmentNumber,
        due_date: item.DueDate,
        days_overdue: item.DaysPastDue,
        remaining_iqd: item.RemainingAmount,
        customer_name: item.CustomerName,
        customer_id: null,
        car: item.ContractNumber
      }
      
      let targetBucket = buckets[0]
      if (item.DaysPastDue > 60) {
        targetBucket = buckets[3]
      } else if (item.DaysPastDue > 30) {
        targetBucket = buckets[2]
      } else if (item.DaysPastDue > 0) {
        targetBucket = buckets[1]
      }
      
      targetBucket.schedules.push(schedule)
      targetBucket.count++
      targetBucket.total_iqd += item.RemainingAmount
      
      if (!customersSeen.has(item.CustomerName)) {
        customersSeen.add(item.CustomerName)
        targetBucket.customer_count++
      }
    })
    
    return {
      buckets,
      generated_at: new Date().toISOString()
    }
  }
  
  return {
    buckets: [],
    generated_at: new Date().toISOString()
  }
}
