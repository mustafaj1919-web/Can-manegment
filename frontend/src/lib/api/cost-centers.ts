import { get } from './client'

export interface CostCenter {
  id: number
  name: string
  code: string | null
}

export interface CostCenterReportItem {
  id: number | null
  name: string
  code: string | null
  revenue_iqd: number
  expense_iqd: number
  net_profit_iqd: number
  entry_count: number
}

export interface CostCenterReport {
  centers: CostCenterReportItem[]
}

export function getCostCenters(): Promise<CostCenter[]> {
  return get<CostCenter[]>('/cost-centers')
}

export function getCostCenterReport(params?: { start_date?: string; end_date?: string }): Promise<CostCenterReport> {
  const qs = new URLSearchParams()
  if (params?.start_date) qs.set('start_date', params.start_date)
  if (params?.end_date)   qs.set('end_date',   params.end_date)
  const q = qs.toString()
  return get<CostCenterReport>(`/reports/cost-center${q ? '?' + q : ''}`)
}
