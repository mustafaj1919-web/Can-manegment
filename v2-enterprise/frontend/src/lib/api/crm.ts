import { get, post, put, del } from './client'

/* ─── Interaction Types ──────────────────────────────────────────────────── */

export type InteractionType = 'call' | 'whatsapp' | 'visit' | 'test_drive' | 'email' | 'other'
export type OutcomeType     = 'interested' | 'not_interested' | 'follow_up' | 'closed'

export const INTERACTION_ICONS: Record<InteractionType, string> = {
  call:       '📞', whatsapp: '💬', visit: '🏢',
  test_drive: '🚗', email:    '📧', other: '📝',
}

export interface Interaction {
  id:               number
  customer_id:      number
  customer_name:    string | null
  employee_id:      number | null
  employee_name:    string | null
  interaction_type: InteractionType
  type_label:       string
  notes:            string | null
  outcome:          OutcomeType | null
  outcome_label:    string
  follow_up_date:   string | null
  interaction_date: string | null
  created_at:       string | null
}

export interface InteractionsResponse {
  total:          number
  page:           number
  per_page:       number
  items:          Interaction[]
  due_soon:       Interaction[]
  type_labels:    Record<string, string>
  outcome_labels: Record<string, string>
}

export interface CrmSummary {
  total_customers:   number
  new_this_month:    number
  interactions_week: number
  follow_ups_due:    number
  by_type:           Record<string, { count: number; label: string }>
  by_outcome:        Record<string, { count: number; label: string }>
}

export async function getCrmInteractions(params: {
  customer_id?: number | string; page?: number; type?: string; outcome?: string
} = {}): Promise<InteractionsResponse> {
  const qs = new URLSearchParams()
  if (params.customer_id) qs.set('customer_id', String(params.customer_id))
  if (params.page)        qs.set('page', String(params.page))
  if (params.type)        qs.set('type', params.type)
  if (params.outcome)     qs.set('outcome', params.outcome)
  const res = await get<any>(`/Crm/interactions${qs.toString() ? `?${qs.toString()}` : ''}`)
  const d = (res && res.success && res.data) ? res.data : res
  return {
    total: d?.total ?? 0, page: d?.page ?? 1, per_page: d?.per_page ?? 25,
    items: d?.items ?? [], due_soon: d?.due_soon ?? [],
    type_labels: d?.type_labels ?? {}, outcome_labels: d?.outcome_labels ?? {},
  }
}

export async function createInteraction(payload: {
  customer_id:      number | string
  interaction_type: InteractionType
  notes?:           string
  outcome?:         OutcomeType
  follow_up_date?:  string
  interaction_date?: string
  employee_id?:     number | string
}): Promise<Interaction> {
  const res = await post<any>('/Crm/interactions', {
    CustomerId: payload.customer_id, EmployeeId: payload.employee_id ?? null,
    InteractionType: payload.interaction_type, Notes: payload.notes, Outcome: payload.outcome,
    FollowUpDate: payload.follow_up_date || null, InteractionDate: payload.interaction_date || null,
  })
  return { id: res.id, ...payload } as any
}

export async function updateInteraction(id: number | string, payload: Partial<{
  interaction_type: InteractionType; notes: string; outcome: OutcomeType; follow_up_date: string
}>): Promise<Interaction> {
  await put<any>(`/Crm/interactions/${id}`, {
    InteractionType: payload.interaction_type, Notes: payload.notes,
    Outcome: payload.outcome, FollowUpDate: payload.follow_up_date || null,
  })
  return { id, ...payload } as any
}

export async function deleteInteraction(id: number | string): Promise<{ success: boolean }> {
  await del<any>(`/Crm/interactions/${id}`)
  return { success: true }
}

export async function getCrmSummary(): Promise<CrmSummary> {
  const res = await get<any>('/Crm/summary')
  const d = (res && res.success && res.data) ? res.data : res
  return {
    total_customers: d?.total_customers ?? 0, new_this_month: d?.new_this_month ?? 0,
    interactions_week: d?.interactions_week ?? 0, follow_ups_due: d?.follow_ups_due ?? 0,
    by_type: d?.by_type ?? {}, by_outcome: d?.by_outcome ?? {},
  }
}

/* ─── Pipeline ──────────────────────────────────────────────────────────── */

export type PipelineStage = 'lead' | 'contacted' | 'test_drive' | 'negotiating' | 'reserved' | 'won' | 'lost'

export const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'مهتم', contacted: 'تم التواصل', test_drive: 'تجربة قيادة',
  negotiating: 'تفاوض', reserved: 'محجوز', won: 'مكتمل ✅', lost: 'خسر ❌',
}

export const STAGE_COLORS: Record<PipelineStage, string> = {
  lead:        'slate',
  contacted:   'cyan',
  test_drive:  'violet',
  negotiating: 'amber',
  reserved:    'orange',
  won:         'emerald',
  lost:        'rose',
}

export const STAGE_TONE: Record<PipelineStage, string> = {
  lead:        'border-slate-500/25 bg-slate-500/10 text-slate-300',
  contacted:   'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  test_drive:  'border-violet-500/25 bg-violet-500/10 text-violet-300',
  negotiating: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  reserved:    'border-orange-500/25 bg-orange-500/10 text-orange-300',
  won:         'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  lost:        'border-rose-500/25 bg-rose-500/10 text-rose-300',
}

export interface Deal {
  id:               number
  customer_id:      number
  customer_name:    string | null
  customer_phone:   string | null
  car_id:           number | null
  car_name:         string | null
  assigned_to_id:   number | null
  assigned_name:    string | null
  sale_id:          number | null
  stage:            PipelineStage
  stage_label:      string
  stage_color:      string
  expected_price:   number | null
  currency:         string
  notes:            string | null
  lost_reason:      string | null
  stage_changed_at: string | null
  created_at:       string | null
  days_in_stage:    number
}

export interface PipelineResponse {
  by_stage:           Record<PipelineStage, Deal[]>
  stage_labels:       Record<string, string>
  stage_colors:       Record<string, string>
  total_deals:        number
  active_deals:       number
  total_expected_iqd: number
  conversion_rate:    number
  won_count:          number
  lost_count:         number
}

export async function getPipeline(params: { stage?: string; employee_id?: number | string } = {}): Promise<PipelineResponse> {
  const qs = new URLSearchParams()
  if (params.employee_id) qs.set('employee_id', String(params.employee_id))
  const res = await get<any>(`/Crm/pipeline${qs.toString() ? `?${qs.toString()}` : ''}`)
  const d = (res && res.success && res.data) ? res.data : res
  return {
    by_stage: d?.by_stage ?? { lead: [], contacted: [], test_drive: [], negotiating: [], reserved: [], won: [], lost: [] },
    stage_labels: d?.stage_labels ?? STAGE_LABELS,
    stage_colors: d?.stage_colors ?? STAGE_COLORS,
    total_deals: d?.total_deals ?? 0, active_deals: d?.active_deals ?? 0,
    total_expected_iqd: d?.total_expected_iqd ?? 0, conversion_rate: d?.conversion_rate ?? 0,
    won_count: d?.won_count ?? 0, lost_count: d?.lost_count ?? 0,
  }
}

export async function createDeal(payload: {
  customer_id:     number | string
  car_id?:         number | string
  assigned_to_id?: number | string
  stage?:          PipelineStage
  expected_price?: number
  currency?:       string
  notes?:          string
}): Promise<Deal> {
  const res = await post<any>('/Crm/deals', {
    CustomerId: payload.customer_id, VehicleId: payload.car_id ?? null, AssignedToId: payload.assigned_to_id ?? null,
    Stage: payload.stage, ExpectedPrice: payload.expected_price, Currency: payload.currency, Notes: payload.notes,
  })
  return { id: res.id, ...payload } as any
}

export async function moveDealStage(id: number | string, stage: PipelineStage, opts: { lost_reason?: string; notes?: string } = {}): Promise<Deal> {
  await post<any>(`/Crm/deals/${id}/stage`, { Stage: stage, LostReason: opts.lost_reason, Notes: opts.notes })
  return { id, stage } as any
}

export async function updateDeal(id: number | string, payload: Partial<Deal>): Promise<Deal> {
  await put<any>(`/Crm/deals/${id}`, {
    VehicleId: payload.car_id ?? null, AssignedToId: payload.assigned_to_id ?? null,
    ExpectedPrice: payload.expected_price, Notes: payload.notes,
  })
  return { id, ...payload } as any
}

export async function deleteDeal(id: number | string): Promise<{ success: boolean }> {
  await del<any>(`/Crm/deals/${id}`)
  return { success: true }
}

/* ─── Employee Performance ──────────────────────────────────────────────── */

export interface EmployeePerf {
  employee_id:           number
  employee_name:         string
  employee_phone:        string
  title:                 string | null
  rank:                  number
  sales_count:           number
  revenue_iqd:           number
  profit_iqd:            number
  total_commission_iqd:  number
  crm_interactions:      number
  pipeline_active:       number
  target:                { sales: number; revenue: number; profit: number }
  achievement:           { sales_pct: number | null; revenue_pct: number | null; profit_pct: number | null }
  performance_score:     number | null
  period:                string
}

export interface PerformanceResponse {
  period:    string
  employees: EmployeePerf[]
  summary:   { total_sales: number; total_revenue: number; total_profit: number; best_employee: string | null }
}

export async function getEmployeePerformance(params: { period?: string; employee_id?: number | string } = {}): Promise<PerformanceResponse> {
  const qs = new URLSearchParams()
  if (params.period) qs.set('period', params.period)
  const res = await get<any>(`/Crm/performance${qs.toString() ? `?${qs.toString()}` : ''}`)
  const d = (res && res.success && res.data) ? res.data : res
  return {
    period: d?.period ?? params.period ?? '',
    employees: d?.employees ?? [],
    summary: d?.summary ?? { total_sales: 0, total_revenue: 0, total_profit: 0, best_employee: null },
  }
}

export async function setEmployeeTarget(payload: {
  employee_id:        number | string
  period?:            string
  target_sales_count: number
  target_revenue:     number
  target_profit:      number
  currency?:          string
}): Promise<{ success: boolean }> {
  await post<any>('/Crm/targets', {
    EmployeeId: payload.employee_id, Period: payload.period,
    TargetSalesCount: payload.target_sales_count, TargetRevenue: payload.target_revenue,
    TargetProfit: payload.target_profit, Currency: payload.currency,
  })
  return { success: true }
}

export async function addCommission(payload: {
  employee_id:      number | string
  sale_id:          number | string
  commission_rate?: number
  commission_amount?: number
  currency?:        string
}): Promise<{ success: boolean; id: string; amount: number }> {
  const res = await post<any>('/Crm/commissions', {
    EmployeeId: payload.employee_id, SaleId: payload.sale_id,
    CommissionRate: payload.commission_rate, CommissionAmount: payload.commission_amount, Currency: payload.currency,
  })
  return { success: true, id: res.id, amount: res.amount }
}

export async function markCommissionPaid(id: number | string): Promise<{ success: boolean }> {
  await post<any>(`/Crm/commissions/${id}/pay`, {})
  return { success: true }
}
