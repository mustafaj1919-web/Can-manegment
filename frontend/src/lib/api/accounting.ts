import { get, post, put, del } from './client'
import type { ReportBranch } from './reports'

export interface ExpensesParams {
  start_date?: string
  end_date?: string
  branch_id?: string
}

export interface ExpenseItem {
  id: number
  title: string
  amount: number
  amount_iqd: number
  currency: 'USD' | 'IQD'
  category: string | null
  notes: string | null
  expense_date: string | null
  created_at: string | null
  branch_id?: number | null
}

export interface ExpensesResponse {
  filters: {
    start_date: string
    end_date: string
    branch_id: number | null
  }
  branches: ReportBranch[]
  total: number
  total_iqd: number
  items: ExpenseItem[]
}

export interface CreateExpensePayload {
  title: string
  amount: number
  currency: 'USD' | 'IQD'
  category?: string
  notes?: string
  expense_date: string
}

export interface CashboxMovement {
  id: string
  date: string | null
  type: string
  description: string | null
  inflow_iqd: number
  outflow_iqd: number
  source_id: number
}

export interface CashboxResponse {
  filters: {
    start_date: string
    end_date: string
    branch_id: number | null
  }
  branches: ReportBranch[]
  summary: {
    sales_paid: number
    purchase_paid: number
    installment_paid: number
    other_income: number
    expenses: number
    balance: number
  }
  movements: CashboxMovement[]
}

export type AccountClassification =
  | 'current_asset'
  | 'fixed_asset'
  | 'current_liability'
  | 'long_term_liability'
  | 'equity'
  | 'operating_revenue'
  | 'other_revenue'
  | 'cogs'
  | 'operating_expense'
  | 'admin_expense'
  | ''

export const CLASSIFICATION_LABELS: Record<AccountClassification, string> = {
  current_asset:       'الأصول المتداولة',
  fixed_asset:         'الأصول الثابتة',
  current_liability:   'المطلوبات المتداولة',
  long_term_liability: 'المطلوبات طويلة الأجل',
  equity:              'حقوق الملكية',
  operating_revenue:   'الإيرادات التشغيلية',
  other_revenue:       'الإيرادات الأخرى',
  cogs:                'تكلفة البضاعة المباعة',
  operating_expense:   'المصاريف التشغيلية',
  admin_expense:       'المصاريف الإدارية',
  '':                  '',
}

export const CLASSIFICATION_TYPE: Record<AccountClassification, string> = {
  current_asset: 'Asset', fixed_asset: 'Asset',
  current_liability: 'Liability', long_term_liability: 'Liability',
  equity: 'Equity',
  operating_revenue: 'Income', other_revenue: 'Income',
  cogs: 'Expense', operating_expense: 'Expense', admin_expense: 'Expense',
  '': '',
}

export interface ChartAccountNode {
  id: number
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  type_label: string
  classification: AccountClassification
  classification_label: string
  level: 'رئيسي' | 'فرعي' | 'تفصيلي'
  depth: number
  parent_id: number | null
  parent_code: string | null
  debit: number
  credit: number
  balance: number
  own_debit: number
  own_credit: number
  own_balance: number
  subtree_debit: number
  subtree_credit: number
  subtree_balance: number
  children_count: number
  children: ChartAccountNode[]
}

export interface ClassificationSummaryEntry {
  label: string
  type: string
  count: number
  debit: number
  credit: number
  balance: number
}

export interface ChartOfAccountsResponse {
  total: number
  summary: {
    main: number
    branch: number
    detail: number
  }
  totals: {
    total_debit: number
    total_credit: number
    difference: number
    status: 'balanced' | 'unbalanced'
  }
  type_summary: Record<string, {
    label: string
    count: number
    debit: number
    credit: number
    balance: number
  }>
  classification_summary: Record<AccountClassification, ClassificationSummaryEntry>
  items: ChartAccountNode[]
  flat: Omit<ChartAccountNode, 'children'>[]
}

export interface TrialBalanceAccount {
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  debit: number
  credit: number
  balance: number
}

export interface TrialBalanceResponse {
  accounts: TrialBalanceAccount[]
  total_debit: number
  total_credit: number
  difference: number
  status: 'balanced' | 'unbalanced'
}

function buildQuery(params: ExpensesParams = {}) {
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date) qs.set('end_date', params.end_date)
  if (params.branch_id && params.branch_id !== 'all') qs.set('branch_id', params.branch_id)
  return qs.toString()
}

export async function getExpenses(params: ExpensesParams = {}): Promise<ExpensesResponse> {
  return get<ExpensesResponse>(`/expenses?${buildQuery(params)}`)
}

export async function createExpense(payload: CreateExpensePayload): Promise<ExpenseItem> {
  return post<ExpenseItem>('/expenses', payload)
}

export async function getCashbox(params: ExpensesParams = {}): Promise<CashboxResponse> {
  return get<CashboxResponse>(`/cashbox?${buildQuery(params)}`)
}

export async function getChartOfAccounts(): Promise<ChartOfAccountsResponse> {
  return get<ChartOfAccountsResponse>('/chart-of-accounts')
}

export async function getTrialBalance(): Promise<TrialBalanceResponse> {
  return get<TrialBalanceResponse>('/trial-balance')
}

/* ─── Account CRUD ──────────────────────────────────────────────────────── */

export interface AccountPayload {
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  classification?: AccountClassification
  parent_id?: number | null
}

export interface AccountItem {
  id: number
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  classification: AccountClassification
  parent_id: number | null
  parent_code: string | null
  balance: number
  children_count: number
}

export async function createAccount(payload: AccountPayload): Promise<AccountItem> {
  return post<AccountItem>('/accounts', payload)
}

export async function updateAccount(id: number, payload: Partial<AccountPayload>): Promise<AccountItem> {
  return put<AccountItem>(`/accounts/${id}`, payload)
}

export async function deleteAccount(id: number): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/accounts/${id}`)
}

export async function recomputeAccountBalances(): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>('/accounts/recompute-balances', {})
}

/* ─── Balance Sheet ─────────────────────────────────────────────────────── */

export interface BalanceSheetGroup {
  id: number
  code: string
  name: string
  balance: number
  children: Array<{ id: number; code: string; name: string; balance: number; classification: string }>
}

export interface BalanceSheetResponse {
  assets: BalanceSheetGroup[]
  liabilities: BalanceSheetGroup[]
  equity: BalanceSheetGroup[]
  total_assets: number
  total_liabilities: number
  total_equity: number
  total_liabilities_equity: number
  difference: number
  is_balanced: boolean
}

export async function getBalanceSheet(): Promise<BalanceSheetResponse> {
  return get<BalanceSheetResponse>('/reports/balance-sheet')
}

/* ─── Journal Entries ───────────────────────────────────────────────────── */

export interface JournalEntryLine {
  account_code: string | null
  account_name: string | null
  debit: number
  credit: number
  description: string | null
}

export interface JournalEntryItem {
  id: number
  reference_number: string | null
  status: 'draft' | 'posted' | 'reversed'
  reversal_of_id: number | null
  entry_date: string | null
  description: string | null
  reference_type: string | null
  reference_id: number | null
  branch_id: number | null
  line_count: number
  total_debit: number
  total_credit: number
  is_balanced: boolean
  lines: JournalEntryLine[]
}

export interface JournalEntriesParams {
  page?: number
  per_page?: number
  date_from?: string
  date_to?: string
  ref_type?: string
  search?: string
  account_code?: string
}

export interface JournalEntriesResponse {
  total: number
  page: number
  per_page: number
  items: JournalEntryItem[]
}

export async function getJournalEntries(params: JournalEntriesParams = {}): Promise<JournalEntriesResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 30))
  if (params.date_from)    qs.set('date_from',    params.date_from)
  if (params.date_to)      qs.set('date_to',      params.date_to)
  if (params.ref_type)     qs.set('ref_type',     params.ref_type)
  if (params.search)       qs.set('search',       params.search)
  if (params.account_code) qs.set('account_code', params.account_code)
  return get<JournalEntriesResponse>(`/journal-entries?${qs.toString()}`)
}

export function reverseJournalEntry(id: number): Promise<{ id: number; reference_number: string; original_id: number }> {
  return post<{ id: number; reference_number: string; original_id: number }>(`/journal-entries/${id}/reverse`, {})
}

export function postJournalEntry(id: number): Promise<{ id: number; status: string }> {
  return post<{ id: number; status: string }>(`/journal-entries/${id}/post`, {})
}

export interface AccountingRulesCheckResult {
  parent_account_violations: Array<{ entry_id: number; ref: string | null; account_code: string | null; account_name: string | null }>
  unbalanced_entries: Array<{ id: number; ref: string | null; description: string | null; debit: number; credit: number }>
  missing_reference_number: Array<{ id: number; description: string | null }>
}

export function getAccountingRulesCheck(): Promise<AccountingRulesCheckResult> {
  return get<AccountingRulesCheckResult>('/reports/accounting-rules-check')
}
