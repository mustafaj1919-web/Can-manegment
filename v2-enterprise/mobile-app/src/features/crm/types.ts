export type DealStage =
  | 'lead'
  | 'contacted'
  | 'test_drive'
  | 'negotiating'
  | 'reserved'
  | 'won'
  | 'lost'
  | string

export interface DealItem {
  id: string
  customer_id: string
  customer_name?: string | null
  customer_phone?: string | null
  car_id?: string | null
  car_name?: string | null
  assigned_to_id?: string | null
  assigned_name?: string | null
  sale_id?: string | null
  stage: DealStage
  stage_label: string
  stage_color: string
  expected_price?: number | null
  currency: string
  notes?: string | null
  lost_reason?: string | null
  stage_changed_at: string
  created_at: string
  days_in_stage: number
}

export interface PipelineSummaryData {
  by_stage: Record<string, DealItem[]>
  stage_labels: Record<string, string>
  stage_colors: Record<string, string>
  total_deals: number
  active_deals: number
  total_expected_iqd: number
  conversion_rate: number
  won_count: number
  lost_count: number
}

export interface CrmInteraction {
  id: string
  customer_id: string
  customer_name?: string | null
  employee_id?: string | null
  employee_name?: string | null
  interaction_type: string
  type_label: string
  notes?: string | null
  outcome?: string | null
  outcome_label?: string | null
  follow_up_date?: string | null
  interaction_date: string
  created_at: string
}

export interface CreateDealRequest {
  customerId: string
  vehicleId?: string | null
  assignedToId?: string | null
  stage?: string
  expectedPrice?: number | null
  currency?: string
  notes?: string | null
}

export interface MoveStageRequest {
  stage: string
  lostReason?: string | null
  notes?: string | null
}

export interface CreateInteractionRequest {
  customerId: string
  employeeId?: string | null
  interactionType?: 'call' | 'whatsapp' | 'visit' | 'test_drive' | 'email' | 'other' | string
  notes?: string | null
  outcome?: 'interested' | 'not_interested' | 'follow_up' | 'closed' | string
  followUpDate?: string | null
  interactionDate?: string | null
}

export interface CustomerSearchItem {
  id: string
  name: string
  full_name?: string | null
  phone: string
  customer_type?: string | null
}

export function getStageConfig(stage: DealStage): {
  label: string
  badgeStatus: 'Available' | 'Reserved' | 'Sold' | 'Overdue' | 'Cancelled' | 'Paid'
} {
  switch (stage) {
    case 'lead':
      return { label: 'جديد / مهتم', badgeStatus: 'Available' }
    case 'contacted':
      return { label: 'تم التواصل', badgeStatus: 'Available' }
    case 'test_drive':
      return { label: 'تجربة قيادة', badgeStatus: 'Reserved' }
    case 'negotiating':
      return { label: 'قيد التفاوض', badgeStatus: 'Reserved' }
    case 'reserved':
      return { label: 'محجوز', badgeStatus: 'Reserved' }
    case 'won':
      return { label: 'مكتمل (فوز)', badgeStatus: 'Paid' }
    case 'lost':
      return { label: 'خسر / مغلق', badgeStatus: 'Cancelled' }
    default:
      return { label: stage, badgeStatus: 'Available' }
  }
}
