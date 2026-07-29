import { get } from './client'
import { getChartOfAccounts } from './accounting'

export interface GeneralLedgerParams {
  account_code?: string
  start_date?: string
  end_date?: string
  branch_id?: string
  currency?: string
  cost_center?: string
  document_type?: string
  status?: string
  search?: string
  entry_number?: string
  reference?: string
  page?: number
  per_page?: number
}

export interface GeneralLedgerRow {
  id: string
  entry_id: string
  date: string
  journal_ref: string
  document_number: string
  document_type: string
  account_code: string
  account_name: string
  description: string
  branch_name: string
  cost_center: string
  currency: string
  debit: number
  credit: number
  running_balance: number
  created_by: string
  status: 'posted' | 'draft' | 'reversed'
  customer_id?: string
  customer_name?: string
  vehicle_id?: string
  vehicle_vin?: string
  installment_id?: string
  sale_id?: string
}

export interface GeneralLedgerSummary {
  opening_balance: number
  total_debit: number
  total_credit: number
  net_movement: number
  closing_balance: number
  total_entries: number
}

export interface GeneralLedgerResponse {
  summary: GeneralLedgerSummary
  total: number
  page: number
  per_page: number
  items: GeneralLedgerRow[]
  accounts_list: Array<{ code: string; name: string; type: string }>
}

export async function getGeneralLedger(params: GeneralLedgerParams = {}): Promise<GeneralLedgerResponse> {
  // Fetch Chart of Accounts for full account select list
  const coa = await getChartOfAccounts().catch(() => ({ flat: [] }))
  const accountsList = (coa.flat || []).map(a => ({ code: a.code, name: a.name, type: a.type }))

  // Query Backend Journal Entries
  const qs = new URLSearchParams()
  if (params.page)      qs.set('page', String(params.page))
  if (params.per_page)  qs.set('per_page', String(params.per_page || 50))
  if (params.start_date) qs.set('date_from', params.start_date)
  if (params.end_date)   qs.set('date_to', params.end_date)
  if (params.search)    qs.set('search', params.search)
  if (params.account_code && params.account_code !== 'all') {
    qs.set('account_code', params.account_code)
  }

  let entriesRaw: any = null
  try {
    entriesRaw = await get<any>(`/Accounting/journal-entries${qs.toString() ? `?${qs.toString()}` : ''}`)
  } catch {
    entriesRaw = null
  }

  const data = (entriesRaw && entriesRaw.success && entriesRaw.data) ? entriesRaw.data : entriesRaw

  const rawItems: any[] = data?.items ?? []
  const totalEntriesCount = data?.total ?? rawItems.length

  // Flatten lines into Ledger Rows
  const rows: GeneralLedgerRow[] = []
  let cumulativeBalance = 0

  // Pre-sort chronologically for strict running balance
  const sortedEntries = [...rawItems].sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

  sortedEntries.forEach((entry, entryIdx) => {
    const lines = entry.lines || []
    
    lines.forEach((line: any, lineIdx: number) => {
      // If account_code filter is active, only include matching line
      if (params.account_code && params.account_code !== 'all') {
        if (line.account_code !== params.account_code) return
      }

      // If document_type filter is active
      if (params.document_type && params.document_type !== 'all') {
        if ((entry.reference_type || 'General').toLowerCase() !== params.document_type.toLowerCase()) return
      }

      // If status filter is active
      if (params.status && params.status !== 'all') {
        if (entry.status !== params.status) return
      }

      const debit = Number(line.debit || 0)
      const credit = Number(line.credit || 0)
      cumulativeBalance += (debit - credit)

      rows.push({
        id: `${entry.id || entryIdx}-${lineIdx}`,
        entry_id: String(entry.id || entryIdx),
        date: entry.entry_date || new Date().toISOString(),
        journal_ref: entry.reference_number || `JE-${entryIdx + 1}`,
        document_number: entry.reference_number || `DOC-${entryIdx + 1}`,
        document_type: entry.reference_type || 'قيد عام',
        account_code: line.account_code || '111001',
        account_name: line.account_name || 'حساب عام',
        description: line.description || entry.description || 'حركة محاسبية',
        branch_name: 'الفرع الرئيسي',
        cost_center: 'المركز الرئيسي',
        currency: 'IQD',
        debit,
        credit,
        running_balance: cumulativeBalance,
        created_by: 'النظام المحاسبي',
        status: entry.status === 'reversed' ? 'reversed' : entry.status === 'draft' ? 'draft' : 'posted',
        customer_name: entry.reference_type === 'SaleInvoice' ? 'عميل معتمد' : undefined,
      })
    })
  })

  // Calculate Aggregates
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  const netMovement = totalDebit - totalCredit
  const openingBalance = 0
  const closingBalance = openingBalance + netMovement

  return {
    summary: {
      opening_balance: openingBalance,
      total_debit: totalDebit,
      total_credit: totalCredit,
      net_movement: netMovement,
      closing_balance: closingBalance,
      total_entries: totalEntriesCount,
    },
    total: rows.length,
    page: params.page || 1,
    per_page: params.per_page || 50,
    items: rows,
    accounts_list: accountsList,
  }
}
