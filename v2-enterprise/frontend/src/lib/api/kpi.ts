import { get } from './client'

export interface KpiDashboard {
  generated_at: string
  today: {
    sales_count: number
    sales_revenue: number
    due_installments_count: number
  }
  this_month: {
    sales_count: number
    sales_revenue: number
    gross_profit: number
    profit_margin_pct: number
    expenses: number
    revenue_vs_last_month_pct: number
  }
  balances: {
    cash: number
    bank: number
    total_liquid: number
    inventory_count: number
  }
  alerts: {
    overdue_installments_count: number
    overdue_installments_amount: number
    unpaid_suppliers_count: number
    unpaid_suppliers_amount: number
  }
}

export async function getKpiDashboard(): Promise<KpiDashboard | null> {
  try {
    const res = await get<any>('/Reports/kpi')
    return res ?? null
  } catch {
    return null
  }
}
