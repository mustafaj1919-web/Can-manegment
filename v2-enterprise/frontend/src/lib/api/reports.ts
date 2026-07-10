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
  type: 'Individual' | 'Company'
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
  const today = new Date().toISOString().split('T')[0]

  // Call real backend endpoints in parallel
  const [dashRes, plRes] = await Promise.allSettled([
    get<any>('/dashboard'),
    get<any>(
      `/Accounting/profit-loss${params.start_date || params.end_date
        ? `?${new URLSearchParams({ ...(params.start_date ? { fromDate: params.start_date } : {}), ...(params.end_date ? { toDate: params.end_date } : {}) }).toString()}`
        : ''}`
    ),
  ])

  const dash = dashRes.status === 'fulfilled' ? dashRes.value : null
  const pl   = plRes.status === 'fulfilled' && plRes.value?.success ? plRes.value.data : null

  const totalRevenues = pl?.totalRevenues ?? 0
  const totalExpenses = pl?.totalExpenses ?? 0
  const netProfit     = pl?.netProfitOrLoss ?? (dash?.monthly_profit ?? 0)
  const grossProfit   = totalRevenues - totalExpenses

  return {
    filters: {
      start_date: params.start_date ?? '2026-01-01',
      end_date: params.end_date ?? today,
      branch_id: params.branch_id ? (params.branch_id === 'all' ? null : Number(params.branch_id)) : null
    },
    branches: [],
    summary: {
      sales_count:               dash?.sales_count             ?? 0,
      purchases_count:           dash?.purchases_count          ?? 0,
      installment_plans_count:   dash?.installments             ?? 0,
      overdue_installments_count: dash?.overdue_installments    ?? 0,
      sales_total:               dash?.total_revenue            ?? 0,
      sales_discount:            0,
      sales_paid:                dash?.monthly_sales_paid       ?? 0,
      sales_remaining:           dash?.installment_summary?.total_receivables ?? 0,
      purchases_total:           dash?.total_purchases_paid     ?? 0,
      purchases_paid:            dash?.total_purchases_paid     ?? 0,
      purchases_remaining:       0,
      installment_income:        dash?.installment_summary?.total_receivables ?? 0,
      expenses:                  totalExpenses,
      gross_profit:              grossProfit > 0 ? grossProfit : (dash?.monthly_profit ?? 0),
      net_profit:                netProfit,
      cashbox_balance:           dash?.cashbox_balance          ?? 0,
    },
    sales: [],
    purchases: [],
    installments: [],
    overdue_installments: [],
    customer_balances: [],
    cashbox: {
      sales_paid:         dash?.monthly_sales_paid ?? 0,
      installment_income: 0,
      other_income:       0,
      purchases_paid:     dash?.total_purchases_paid ?? 0,
      expenses:           totalExpenses,
      balance:            dash?.cashbox_balance ?? 0,
    },
    profit_loss: {
      sales_total:    totalRevenues || (dash?.total_revenue ?? 0),
      sales_discount: 0,
      cost_of_cars:   totalExpenses || (dash?.total_purchases_paid ?? 0),
      gross_profit:   grossProfit > 0 ? grossProfit : (dash?.monthly_profit ?? 0),
      other_income:   0,
      expenses:       totalExpenses,
      net_profit:     netProfit,
    },
  }
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
  try {
    const res = await get<{ success: boolean; data: any }>('/Accounting/installments-aging')
    
    if (res && res.success && res.data) {
      const items = res.data.Items ?? []
      
      // Initialize buckets matching frontend expectations
      const bucketsMap: Record<string, ArAgingBucket> = {
        current: { bucket: 'current', label: 'غير متأخرة', min_days: null, max_days: 0, count: 0, customer_count: 0, total_iqd: 0, items: [] },
        '1_30': { bucket: '1_30', label: '1 - 30 يوم', min_days: 1, max_days: 30, count: 0, customer_count: 0, total_iqd: 0, items: [] },
        '31_60': { bucket: '31_60', label: '31 - 60 يوم', min_days: 31, max_days: 60, count: 0, customer_count: 0, total_iqd: 0, items: [] },
        '61_90': { bucket: '61_90', label: '61 - 90 يوم', min_days: 61, max_days: 90, count: 0, customer_count: 0, total_iqd: 0, items: [] },
        '90_plus': { bucket: '90_plus', label: 'أكثر من 90 يوم', min_days: 91, max_days: null, count: 0, customer_count: 0, total_iqd: 0, items: [] }
      }

      const customersMap = new Map<string, ArAgingCustomer>()
      const bucketCustomerSeen = new Map<string, Set<string>>()
      
      // Initialize sets for each bucket to track unique customer names
      Object.keys(bucketsMap).forEach(key => {
        bucketCustomerSeen.set(key, new Set<string>())
      })

      let totalIqd = 0
      let totalCount = 0

      items.forEach((item: any, index: number) => {
        const remaining = item.RemainingAmount ?? 0
        const daysPast = item.DaysPastDue ?? 0
        const custName = item.CustomerName ?? 'عميل غير معروف'

        const agingItem: ArAgingItem = {
          customer_id: item.CustomerId ? Number(item.CustomerId) : index + 1000,
          customer_name: custName,
          sale_id: item.ContractId ? Number(item.ContractId) : null,
          invoice_number: item.ContractNumber ?? null,
          schedule_id: item.InstallmentId ? Number(item.InstallmentId) : null,
          installment_number: item.InstallmentNumber ?? null,
          due_date: item.DueDate ?? null,
          days_past_due: daysPast,
          amount_iqd: remaining,
          currency: 'IQD',
          source: 'installment_schedule',
          car: item.ContractNumber ?? null,
          branch_id: null,
          branch: null
        }

        // Determine bucket
        let bKey = 'current'
        if (daysPast > 90) bKey = '90_plus'
        else if (daysPast > 60) bKey = '61_90'
        else if (daysPast > 30) bKey = '31_60'
        else if (daysPast > 0) bKey = '1_30'

        const bucket = bucketsMap[bKey]
        bucket.items.push(agingItem)
        bucket.count++
        bucket.total_iqd += remaining
        
        const seenSet = bucketCustomerSeen.get(bKey)!
        if (!seenSet.has(custName)) {
          seenSet.add(custName)
          bucket.customer_count++
        }

        totalIqd += remaining
        totalCount++

        // Customer details grouping
        const custKey = custName
        const existingCust = customersMap.get(custKey)
        if (existingCust) {
          existingCust.total_iqd += remaining
          existingCust.items_count++
          if (daysPast > existingCust.oldest_days_past_due) {
            existingCust.oldest_days_past_due = daysPast
          }
        } else {
          customersMap.set(custKey, {
            customer_id: item.CustomerId ? Number(item.CustomerId) : index + 1000,
            customer_name: custName,
            total_iqd: remaining,
            oldest_days_past_due: daysPast,
            items_count: 1
          })
        }
      })

      return {
        as_of: new Date().toISOString(),
        total_iqd: totalIqd,
        total_count: totalCount,
        buckets: Object.values(bucketsMap),
        customers: Array.from(customersMap.values())
      }
    }
  } catch (error) {
    console.error('Error in getArAgingReport:', error)
  }

  return {
    as_of: new Date().toISOString(),
    total_iqd: 0,
    total_count: 0,
    buckets: [],
    customers: []
  }
}

/* ─── Cost Center Report ─────────────────────────────────────────────────── */

export interface CostCenterItem {
  id: string
  title: string
  amount: number
  currency: string
  date: string
  notes: string | null
}

export interface CostCenterGroup {
  center: string
  total: number
  count: number
  items: CostCenterItem[]
}

export interface CostCenterResponse {
  from_date: string | null
  to_date: string | null
  total_revenue: number
  sales_count: number
  total_expenses: number
  total_vehicle_costs: number
  net_result: number
  expense_centers: CostCenterGroup[]
  vehicle_cost_centers: CostCenterGroup[]
}

export async function getCostCenterReport(params: { from_date?: string; to_date?: string } = {}): Promise<CostCenterResponse> {
  const qs = new URLSearchParams()
  if (params.from_date) qs.set('from_date', params.from_date)
  if (params.to_date)   qs.set('to_date', params.to_date)
  const url = `/Accounting/cost-center-report${qs.toString() ? '?' + qs.toString() : ''}`
  const res = await get<any>(url)
  if (res && res.success && res.data) return res.data
  return res
}

/* ─── Branch Comparison Report ───────────────────────────────────────────── */

export interface BranchComparisonRow {
  branch_id: string
  branch_name: string
  branch_code: string
  is_active: boolean
  sales_count: number
  purchases_count: number
  customers_count: number
  available_cars: number
  sold_cars: number
  total_revenue: number
  total_purchases: number
  total_expenses: number
  net_profit: number
}

export interface BranchComparisonResponse {
  from_date: string | null
  to_date: string | null
  branches: BranchComparisonRow[]
  totals: {
    sales_count: number
    purchases_count: number
    total_revenue: number
    total_purchases: number
    total_expenses: number
    net_profit: number
  }
}

export async function getBranchComparison(params: { start_date?: string; end_date?: string } = {}): Promise<BranchComparisonResponse> {
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('from_date', params.start_date)
  if (params.end_date)   qs.set('to_date', params.end_date)
  const url = `/Accounting/branch-comparison${qs.toString() ? '?' + qs.toString() : ''}`
  const res = await get<any>(url)
  if (res && res.success && res.data) return res.data
  return res
}

/* ─── Accounting Rules Check ─────────────────────────────────────────────── */

export interface AccountingRulesIssue {
  type: string
  label: string
  ref_num?: string
  date?: string
  debit?: number
  credit?: number
  diff?: number
  account_code?: string
  account_name?: string
  lines_count?: number
}

export interface AccountingRulesResponse {
  passed: boolean
  score: number
  stats: { total_entries: number; total_accounts: number }
  issues: AccountingRulesIssue[]
  warnings: AccountingRulesIssue[]
  summary: string
}

export async function getAccountingRulesCheck(): Promise<AccountingRulesResponse> {
  const res = await get<any>('/Accounting/accounting-rules')
  if (res && res.success && res.data) return res.data
  return res
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

/* ─── Supplier Ledger ────────────────────────────────────────────────────── */

export interface LedgerTransaction {
  journal_entry_id: string
  entry_number: string
  entry_date: string
  description: string
  debit: number
  credit: number
  running_balance: number
}

export interface SupplierLedger {
  supplier_id: string
  supplier_name: string
  account_code: string
  opening_balance: number
  closing_balance: number
  total_count: number
  transactions: LedgerTransaction[]
}

export async function getSupplierLedger(params: {
  supplierId: string
  fromDate?: string
  toDate?: string
  page?: number
  per_page?: number
}): Promise<SupplierLedger> {
  const qs = new URLSearchParams()
  qs.set('supplierId', params.supplierId)
  if (params.fromDate) qs.set('fromDate', params.fromDate)
  if (params.toDate)   qs.set('toDate', params.toDate)
  qs.set('page',     String(params.page ?? 1))
  qs.set('per_page', String(params.per_page ?? 50))
  const res = await get<any>(`/Accounting/supplier-ledger?${qs.toString()}`)
  return (res?.success && res?.data) ? res.data : res
}

/* ─── Inventory Valuation ────────────────────────────────────────────────── */

export interface InventoryVehicleRow {
  vehicle_id: string
  model: string
  chassis_number: string
  purchase_cost: number
  book_value: number
  purchase_date: string | null
  supplier_name: string
}

export interface InventoryValuation {
  total_vehicles_count: number
  total_book_value: number
  total_purchase_cost: number
  vehicles: InventoryVehicleRow[]
}

export async function getInventoryValuation(asOfDate?: string): Promise<InventoryValuation> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : ''
  const res = await get<any>(`/Accounting/inventory-valuation${qs}`)
  return (res?.success && res?.data) ? res.data : res
}

/* ─── Sales Profit Report ────────────────────────────────────────────────── */

export interface SalesProfitItem {
  contract_id: string
  contract_number: string
  sale_date: string
  customer_name: string
  vehicle_model: string
  sale_price: number
  book_value: number
  direct_profit?: number
  deferred_profit_markup?: number
  recognized_installment_profit?: number
  overall_profit?: number
  payment_type?: string
}

export interface SalesProfitReport {
  total_sale_price: number
  total_book_value: number
  total_direct_profit: number
  total_deferred_profit_markup: number
  total_recognized_installment_profit: number
  total_overall_profit: number
  sales: SalesProfitItem[]
}

export async function getSalesProfitReport(params: { fromDate?: string; toDate?: string } = {}): Promise<SalesProfitReport> {
  const qs = new URLSearchParams()
  if (params.fromDate) qs.set('fromDate', params.fromDate)
  if (params.toDate)   qs.set('toDate', params.toDate)
  const res = await get<any>(`/Accounting/sales-profit${qs.toString() ? '?' + qs.toString() : ''}`)
  return (res?.success && res?.data) ? res.data : res
}

export async function getMonthlyProfitReport(months = 12): Promise<MonthlyProfitResponse> {
  const res = await get<any>(`/reports/monthly-profit?months=${months}`)
  if (res && res.success && res.data) {
    return res.data
  }
  return res
}
