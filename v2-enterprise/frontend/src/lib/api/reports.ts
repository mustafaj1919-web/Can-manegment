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
  const today = new Date().toISOString().split('T')[0]
  return Promise.resolve({
    filters: {
      start_date: params.start_date ?? '2026-01-01',
      end_date: params.end_date ?? today,
      branch_id: params.branch_id ? (params.branch_id === 'all' ? null : Number(params.branch_id)) : null
    },
    branches: [],
    summary: {
      sales_count: 0,
      purchases_count: 0,
      installment_plans_count: 0,
      overdue_installments_count: 0,
      sales_total: 0,
      sales_discount: 0,
      sales_paid: 0,
      sales_remaining: 0,
      purchases_total: 0,
      purchases_paid: 0,
      purchases_remaining: 0,
      installment_income: 0,
      expenses: 0,
      gross_profit: 0,
      net_profit: 0,
      cashbox_balance: 0
    },
    sales: [],
    purchases: [],
    installments: [],
    overdue_installments: [],
    customer_balances: [],
    cashbox: {
      sales_paid: 0,
      installment_income: 0,
      other_income: 0,
      purchases_paid: 0,
      expenses: 0,
      balance: 0
    },
    profit_loss: {
      sales_total: 0,
      sales_discount: 0,
      cost_of_cars: 0,
      gross_profit: 0,
      other_income: 0,
      expenses: 0,
      net_profit: 0
    }
  })
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
  return Promise.resolve({
    filters: {
      start_date: params.start_date ?? '2026-01-01',
      end_date: params.end_date ?? '2026-06-11'
    },
    branches: [],
    totals: {
      sales_count: 0,
      purchases_count: 0,
      sales_total_iqd: 0,
      sales_paid_iqd: 0,
      sales_remaining_iqd: 0,
      expenses_iqd: 0,
      gross_profit_iqd: 0,
      net_profit_iqd: 0,
      cashbox_balance_iqd: 0
    }
  })
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
  try {
    const res = await get<any>(`/reports/monthly-profit?months=${months}`)
    if (res && res.success && res.data) {
      return res.data
    }
    return res
  } catch (error) {
    throw error
  }
}
