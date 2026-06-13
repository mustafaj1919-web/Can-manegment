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
  // مراكز التكلفة غير مدعومة بالخلفية، نعيد مصفوفة فارغة لتفادي 404
  return Promise.resolve([])
}

export function getCostCenterReport(params?: { start_date?: string; end_date?: string }): Promise<CostCenterReport> {
  // تقارير مراكز التكلفة غير مدعومة بالخلفية، نعيد هيكل تقرير فارغ
  return Promise.resolve({ centers: [] })
}
