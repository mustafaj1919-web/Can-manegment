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
  is_active: boolean
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
  const qs = new URLSearchParams()
  if (params.start_date) qs.set('start_date', params.start_date)
  if (params.end_date)   qs.set('end_date',   params.end_date)
  const res = await get<any>(`/Expenses${qs.toString() ? `?${qs.toString()}` : ''}`)
  const data = (res && res.success && res.data) ? res.data : res
  return {
    filters: data?.filters ?? { start_date: '', end_date: '', branch_id: null },
    branches: data?.branches ?? [],
    total: data?.total ?? 0,
    total_iqd: data?.total_iqd ?? data?.total ?? 0,
    items: data?.items ?? [],
  }
}

export async function createExpense(payload: CreateExpensePayload): Promise<ExpenseItem> {
  const body = {
    Title: payload.title,
    Amount: payload.amount,
    Currency: payload.currency,
    Category: payload.category,
    Notes: payload.notes,
    ExpenseDate: payload.expense_date || null,
  }
  const res = await post<any>('/Expenses', body)
  return { id: res.expenseId ?? '', ...payload } as any
}

export async function getCashbox(params: ExpensesParams = {}): Promise<CashboxResponse> {
  // حركات الصندوق غير مدعومة، نعيد هيكل فارغ
  return Promise.resolve({ filters: { start_date: '', end_date: '', branch_id: null }, branches: [], summary: { sales_paid: 0, purchase_paid: 0, installment_paid: 0, other_income: 0, expenses: 0, balance: 0 }, movements: [] })
}

export async function getChartOfAccounts(): Promise<ChartOfAccountsResponse> {
  const tb = await getTrialBalance()
  const items: ChartAccountNode[] = tb.accounts.map((a, i) => ({
    id: i + 1, code: a.code, name: a.name, type: a.type,
    type_label: a.type, classification: 'detail' as AccountClassification,
    classification_label: 'تفصيلي', is_active: true,
    level: 'تفصيلي' as const, depth: 1,
    parent_id: null, parent_code: null,
    debit: a.debit, credit: a.credit, balance: a.balance,
    own_debit: a.debit, own_credit: a.credit, own_balance: a.balance,
    subtree_debit: a.debit, subtree_credit: a.credit, subtree_balance: a.balance,
    children_count: 0, children: [],
  }))
  const total_debit  = tb.total_debit
  const total_credit = tb.total_credit
  return {
    total: items.length,
    summary: { main: 0, branch: 0, detail: items.length },
    totals: { total_debit, total_credit, difference: tb.difference, status: tb.status },
    type_summary: {},
    classification_summary: {} as any,
    items,
    flat: items,
  }
}

export async function getTrialBalance(): Promise<TrialBalanceResponse> {
  const raw = await get<{ success: boolean; data: Array<{
    accountId: string; accountCode: string; accountName: string;
    accountType: string; totalDebit: number; totalCredit: number;
    netDebit: number; netCredit: number;
  }> }>('/Accounting/trial-balance')

  const accounts: TrialBalanceAccount[] = (raw.data ?? []).map(a => ({
    code:    a.accountCode,
    name:    a.accountName,
    type:    a.accountType as TrialBalanceAccount['type'],
    debit:   a.totalDebit,
    credit:  a.totalCredit,
    balance: a.netDebit - a.netCredit,
  }))

  const total_debit  = accounts.reduce((s, a) => s + a.debit, 0)
  const total_credit = accounts.reduce((s, a) => s + a.credit, 0)
  const difference   = total_debit - total_credit

  return {
    accounts,
    total_debit,
    total_credit,
    difference,
    status: Math.abs(difference) < 0.01 ? 'balanced' : 'unbalanced',
  }
}

/* ─── Account CRUD ──────────────────────────────────────────────────────── */

export interface AccountPayload {
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  classification?: AccountClassification
  parent_code?: string | null
  is_active?: boolean
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
  is_active: boolean
}

export async function createAccount(payload: AccountPayload): Promise<AccountItem> {
  const res = await post<any>('/Accounting/accounts', {
    Code: payload.code,
    Name: payload.name,
    Type: payload.type,
    ParentCode: payload.parent_code ?? null,
    IsActive: payload.is_active ?? true,
  })
  return { ...payload, code: res.code ?? payload.code } as any
}

// يُعرّف الحساب بالكود (الكود فريد وثابت بعكس المعرّف التخيّلي في الواجهة)
export async function updateAccount(code: string, payload: Partial<AccountPayload>): Promise<AccountItem> {
  const res = await put<any>(`/Accounting/accounts/${code}`, {
    Name: payload.name,
    Type: payload.type,
    IsActive: payload.is_active,
  })
  return { ...payload, code: res.code ?? code } as any
}

export async function deleteAccount(code: string): Promise<{ success: boolean; is_active: boolean }> {
  const res = await del<any>(`/Accounting/accounts/${code}`)
  return { success: true, is_active: res?.is_active ?? false }
}

export async function recomputeAccountBalances(): Promise<{ success: boolean; message: string }> {
  const res = await post<any>('/Accounting/recompute-balances', {})
  return { success: true, message: res?.message ?? 'تم' }
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
  const res = await get<any>('/Accounting/balance-sheet')
  if (res && res.success && res.data) {
    return res.data
  }
  return res
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
  if (params.page)      qs.set('page', String(params.page))
  if (params.per_page)  qs.set('per_page', String(params.per_page))
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to)   qs.set('date_to', params.date_to)
  if (params.ref_type)  qs.set('ref_type', params.ref_type)
  if (params.search)    qs.set('search', params.search)
  const res = await get<any>(`/Accounting/journal-entries${qs.toString() ? `?${qs.toString()}` : ''}`)
  const data = (res && res.success && res.data) ? res.data : res
  return {
    total: data?.total ?? 0,
    page: data?.page ?? params.page ?? 1,
    per_page: data?.per_page ?? params.per_page ?? 30,
    items: data?.items ?? [],
  }
}

export async function reverseJournalEntry(id: number | string): Promise<{ id: string; reference_number: string; original_id: string }> {
  const res = await post<any>(`/Accounting/journal-entries/${id}/reverse`, {})
  return { id: res.id, reference_number: res.reference_number, original_id: res.original_id }
}

export async function postJournalEntry(id: number | string): Promise<{ id: string; status: string }> {
  const res = await post<any>(`/Accounting/journal-entries/${id}/post`, {})
  return { id: res.id, status: res.status }
}

export interface AccountingRulesCheckResult {
  parent_account_violations: Array<{ entry_id: number; ref: string | null; account_code: string | null; account_name: string | null }>
  unbalanced_entries: Array<{ id: number; ref: string | null; description: string | null; debit: number; credit: number }>
  missing_reference_number: Array<{ id: number; description: string | null }>
}

export function getAccountingRulesCheck(): Promise<AccountingRulesCheckResult> {
  return Promise.resolve({
    parent_account_violations: [],
    unbalanced_entries: [],
    missing_reference_number: []
  })
}
