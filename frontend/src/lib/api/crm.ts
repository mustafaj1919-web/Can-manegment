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
  customer_id?: number; page?: number; type?: string; outcome?: string
} = {}): Promise<InteractionsResponse> {
  const qs = new URLSearchParams()
  if (params.customer_id) qs.set('customer_id', String(params.customer_id))
  if (params.page)        qs.set('page',        String(params.page))
  if (params.type)        qs.set('type',         params.type)
  if (params.outcome)     qs.set('outcome',      params.outcome)
  return get<InteractionsResponse>(`/crm/interactions?${qs.toString()}`)
}

export async function createInteraction(payload: {
  customer_id:      number
  interaction_type: InteractionType
  notes?:           string
  outcome?:         OutcomeType
  follow_up_date?:  string
  interaction_date?: string
  employee_id?:     number
}): Promise<Interaction> {
  return post<Interaction>('/crm/interactions', payload)
}

export async function updateInteraction(id: number, payload: Partial<{
  interaction_type: InteractionType; notes: string; outcome: OutcomeType; follow_up_date: string
}>): Promise<Interaction> {
  return put<Interaction>(`/crm/interactions/${id}`, payload)
}

export async function deleteInteraction(id: number): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/crm/interactions/${id}`)
}

export async function getCrmSummary(): Promise<CrmSummary> {
  return get<CrmSummary>('/crm/summary')
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

export async function getPipeline(params: { stage?: string; employee_id?: number } = {}): Promise<PipelineResponse> {
  const qs = new URLSearchParams()
  if (params.stage)       qs.set('stage',       params.stage)
  if (params.employee_id) qs.set('employee_id', String(params.employee_id))
  return get<PipelineResponse>(`/pipeline?${qs.toString()}`)
}

export async function createDeal(payload: {
  customer_id:     number
  car_id?:         number
  assigned_to_id?: number
  stage?:          PipelineStage
  expected_price?: number
  currency?:       string
  notes?:          string
}): Promise<Deal> {
  return post<Deal>('/pipeline', payload)
}

export async function moveDealStage(id: number, stage: PipelineStage, opts: { lost_reason?: string; notes?: string } = {}): Promise<Deal> {
  return put<Deal>(`/pipeline/${id}/stage`, { stage, ...opts })
}

export async function updateDeal(id: number, payload: Partial<Deal>): Promise<Deal> {
  return put<Deal>(`/pipeline/${id}`, payload)
}

export async function deleteDeal(id: number): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/pipeline/${id}`)
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

export async function getEmployeePerformance(params: { period?: string; employee_id?: number } = {}): Promise<PerformanceResponse> {
  const qs = new URLSearchParams()
  if (params.period)      qs.set('period',      params.period)
  if (params.employee_id) qs.set('employee_id', String(params.employee_id))
  return get<PerformanceResponse>(`/employees/performance?${qs.toString()}`)
}

export async function setEmployeeTarget(payload: {
  employee_id:        number
  period?:            string
  target_sales_count: number
  target_revenue:     number
  target_profit:      number
  currency?:          string
}): Promise<{ success: boolean }> {
  return post('/employees/targets', payload)
}

export async function addCommission(payload: {
  employee_id:      number
  sale_id:          number
  commission_rate?: number
  commission_amount?: number
  currency?:        string
}): Promise<{ success: boolean; id: number; amount: number }> {
  return post('/employees/commissions', payload)
}

export async function markCommissionPaid(id: number): Promise<{ success: boolean }> {
  return post(`/employees/commissions/${id}/mark-paid`, {})
}
