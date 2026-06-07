import { get } from './client'

export interface ReportBranch {
  id: number
  name: string
  is_main: boolean
}

export interface ReportSummary {
  sales_count: number
  purchases_count: number
  installment_plans_count: number
  overdue_installments_count: number
  sales_total: number
  sales_discount: number
  sales_paid: number
  sales_remaining: number
  purchases_total: number
  purchases_paid: number
  purchases_remaining: number
  installment_income: number
  expenses: number
  gross_profit: number
  net_profit: number
  cashbox_balance: number
}

export interface ReportRow {
  id: number
  invoice_number?: string | null
  date?: string | null
  due_date?: string | null
  customer?: string | null
  car?: string | null
  total_iqd?: number
  discount_iqd?: number
  paid_iqd?: number
  remaining_iqd?: number
  amount_iqd?: number
  payment_method?: string | null
  months?: number | null
  status?: string | null
  plan_id?: number
}

export interface CustomerBalanceRow {
  id: number
  name: string
  type: 'Buyer' | 'Seller'
  balance_iqd: number
}

export interface CashboxSummary {
  sales_paid: number
  installment_income: number
  other_income: number
  purchases_paid: number
  expenses: number
  balance: number
}

export interface ProfitLossSummary {
  sales_total: number
  sales_discount: number
  cost_of_cars: number
  gross_profit: number
  other_income: number
  expenses: number
  net_profit: number
}

export interface ReportsResponse {
  filters: {
    start_date: string
    end_date: string
    branch_id: number | null
  }
  branches: ReportBranch[]
  summary: ReportSummary
  sales: ReportRow[]
  purchases: ReportRow[]
  installments: ReportRow[]
  overdue_installments: ReportRow[]
  customer_balances: CustomerBalanceRow[]
  cashbox: CashboxSummary
  profit_loss: ProfitLossSummary
}

export interface ReportsParams {
  start_date?: string
  end_date?: string
  branch_id?: string
}

export async function getReports(params: ReportsParams = {}): Promise<ReportsResponse> {
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date) qs.set('end_date', params.end_date)
  if (params.branch_id && params.branch_id !== 'all') qs.set('branch_id', params.branch_id)
  return get<ReportsResponse>(`/reports?${qs.toString()}`)
}

export interface ArAgingItem {
  customer_id: number | null
  customer_name: string
  sale_id: number | null
  invoice_number: string | null
  schedule_id: number | null
  installment_number: number | null
  due_date: string | null
  days_past_due: number
  amount_iqd: number
  currency: string
  source: 'installment_schedule' | 'sale_balance' | string
  car: string | null
  branch_id: number | null
  branch: ReportBranch | null
}

export interface ArAgingBucket {
  bucket: string
  label: string
  min_days: number | null
  max_days: number | null
  count: number
  customer_count: number
  total_iqd: number
  items: ArAgingItem[]
}

export interface ArAgingCustomer {
  customer_id: number
  customer_name: string
  total_iqd: number
  oldest_days_past_due: number
  items_count: number
}

export interface ArAgingResponse {
  as_of: string
  total_iqd: number
  total_count: number
  buckets: ArAgingBucket[]
  customers: ArAgingCustomer[]
}

export async function getArAgingReport(): Promise<ArAgingResponse> {
  return get<ArAgingResponse>('/reports/ar-aging')
}

export interface BranchComparisonRow {
  branch: ReportBranch | null
  sales_count: number
  purchases_count: number
  customers_count: number
  available_cars_count: number
  sold_cars_count: number
  sales_total_iqd: number
  sales_discount_iqd: number
  sales_paid_iqd: number
  sales_remaining_iqd: number
  installment_income_iqd: number
  purchase_paid_iqd: number
  expenses_iqd: number
  gross_profit_iqd: number
  net_profit_iqd: number
  cashbox_balance_iqd: number
}

export interface BranchComparisonResponse {
  filters: {
    start_date: string
    end_date: string
  }
  branches: BranchComparisonRow[]
  totals: {
    sales_count: number
    purchases_count: number
    sales_total_iqd: number
    sales_paid_iqd: number
    sales_remaining_iqd: number
    expenses_iqd: number
    gross_profit_iqd: number
    net_profit_iqd: number
    cashbox_balance_iqd: number
  }
}

export async function getBranchComparison(params: { start_date?: string; end_date?: string } = {}): Promise<BranchComparisonResponse> {
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date) qs.set('end_date', params.end_date)
  return get<BranchComparisonResponse>(`/reports/branch-comparison${qs.toString() ? '?' + qs.toString() : ''}`)
}

export interface MonthlyProfitRow {
  month: string
  label: string
  sales_count: number
  revenue: number
  cost: number
  expenses: number
  gross_profit: number
  net_profit: number
}

export interface MonthlyProfitResponse {
  months: MonthlyProfitRow[]
  totals: {
    revenue: number
    cost: number
    expenses: number
    gross_profit: number
    net_profit: number
    sales_count: number
  }
}

export async function getMonthlyProfitReport(months = 12): Promise<MonthlyProfitResponse> {
  return get<MonthlyProfitResponse>(`/reports/monthly-profit?months=${months}`)
}
