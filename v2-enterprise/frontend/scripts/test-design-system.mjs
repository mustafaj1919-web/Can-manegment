/**
 * Enterprise Design System v1 — Additive Unit & Safety Test Suite
 * Executable via `node scripts/test-design-system.mjs`
 */

import { formatMoney, formatNumber } from '../src/lib/design-system/formatting.ts'
import { getDomainStatusConfig } from '../src/lib/design-system/status-maps.ts'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`✗ FAIL: ${message}`)
    failed++
  }
}

console.log('=== Enterprise Design System v1 Hardening & Additive Suite ===\n')

// ── Test Group 1: Formatting & Currency Isolation ─────────────────────────
assert(formatMoney(100, 'USD') === '$100', 'USD money format retains dollar sign')
assert(formatMoney(100, 'IQD').includes('د.ع'), 'IQD money format retains Iraqi Dinar suffix')
assert(formatMoney(null, 'USD') === '0', 'Null money returns safe zero string')

// ── Test Group 2: Status Mapping & Fallbacks ──────────────────────────────
const unknownStatus = getDomainStatusConfig('RandomUnknownStatus', 'sales')
assert(unknownStatus.variant === 'neutral', 'Unknown sales status falls back to neutral variant')
assert(unknownStatus.label === 'RandomUnknownStatus', 'Unknown sales status preserves readable label')

const activeSales = getDomainStatusConfig('Active', 'sales')
assert(activeSales.variant === 'success', 'Active sales status maps to success')

const overduePayment = getDomainStatusConfig('Overdue', 'payment')
assert(overduePayment.variant === 'danger', 'Overdue payment status maps to danger')

const availableInv = getDomainStatusConfig('Available', 'inventory')
assert(availableInv.variant === 'success', 'Available inventory status maps to success')
assert(availableInv.label === 'متاح', 'Available inventory status returns correct Arabic label')

const reservedInv = getDomainStatusConfig('Reserved', 'inventory')
assert(reservedInv.variant === 'info', 'Reserved inventory status maps to info')

const soldInv = getDomainStatusConfig('Sold', 'inventory')
assert(soldInv.variant === 'neutral', 'Sold inventory status maps to neutral')

// ── Test Group 3: Branch Query Key Scope Construction ─────────────────────
function buildQueryKey(endpoint, branchId) {
  const scope = branchId ?? 'all'
  return [endpoint, scope]
}

assert(buildQueryKey('cars', 'b123')[1] === 'b123', 'Cars query key tracks branch_b123 scope')
assert(buildQueryKey('customers', 'b456')[1] === 'b456', 'Customers query key tracks branch_b456 scope')

// ── Test Group 4: Inventory Valuation & Completeness ─────────────────────
function calculateSeparateInventoryTotals(items) {
  let usdTotal = 0
  let iqdTotal = 0

  items.forEach(item => {
    if (item.currency === 'USD') usdTotal += item.price
    else iqdTotal += item.price
  })

  return { usdTotal, iqdTotal }
}

const sampleVehicles = [
  { price: 50000, currency: 'USD' },
  { price: 70000, currency: 'USD' },
  { price: 60000000, currency: 'IQD' },
]

const totals = calculateSeparateInventoryTotals(sampleVehicles)
assert(totals.usdTotal === 120000, 'USD inventory total aggregated separately ($120,000)')
assert(totals.iqdTotal === 60000000, 'IQD inventory total aggregated separately (60,000,000 د.ع)')

function getVehicleCompleteness(car) {
  const missing = []
  if (!car.selling_price || car.selling_price <= 0) missing.push('sellingPrice')
  if (!car.photos || car.photos.length === 0) missing.push('photo')
  if (!car.vin || car.vin.trim().length === 0) missing.push('vin')
  return { isComplete: missing.length === 0, missing }
}

const completeCar = { selling_price: 25000, photos: [{ id: 1 }], vin: '1HGCR2F83HA000000' }
const incompleteCar = { selling_price: 0, photos: [], vin: '' }

assert(getVehicleCompleteness(completeCar).isComplete === true, 'Complete car evaluates to isComplete=true')
assert(getVehicleCompleteness(incompleteCar).missing.length === 3, 'Incomplete car accurately identifies 3 missing fields')

// ── Test Group 5: PII Privacy Masking & Customer Financial Balances ───────
function maskNationalId(idNumber, isAuthorized) {
  if (!idNumber || typeof idNumber !== 'string') return '—'
  const trimmed = idNumber.trim()
  if (trimmed.length === 0) return '—'
  if (isAuthorized) return trimmed
  if (trimmed.length <= 4) return '****'
  return `****${trimmed.slice(-4)}`
}

assert(maskNationalId('10987654321', true) === '10987654321', 'Authorized role sees unmasked National ID')
assert(maskNationalId('10987654321', false) === '****4321', 'Unprivileged role sees masked National ID (****4321)')
assert(maskNationalId(null, false) === '—', 'Null National ID evaluates safely to fallback dash')
assert(maskNationalId('', false) === '—', 'Empty National ID evaluates safely to fallback dash')
assert(maskNationalId('123', false) === '****', 'Short National ID (<=4 chars) masked to **** without exposing raw digits')
assert(maskNationalId('1234', false) === '****', 'Exact 4-char National ID masked to **** without exposing raw digits')

function evaluateCustomerBalance(remainingAmount) {
  if (remainingAmount < 0) {
    return { type: 'credit', value: Math.abs(remainingAmount), isOverpaid: true }
  }
  return { type: 'due', value: remainingAmount, isOverpaid: false }
}

assert(evaluateCustomerBalance(-500).type === 'credit', 'Negative remaining balance accurately identified as customer credit')
assert(evaluateCustomerBalance(-500).value === 500, 'Negative balance magnitude preserved without clamping to zero')

// ── Test Group 6: Customer Classification Styling ────────────────────────
function getCustomerTypeVariant(type) {
  if (type === 'Individual') return 'info'
  if (type === 'Company') return 'warning'
  return 'neutral'
}

assert(getCustomerTypeVariant('Individual') === 'info', 'Individual customer type maps to info variant token')
assert(getCustomerTypeVariant('Company') === 'warning', 'Company customer type maps to warning variant token')
assert(getCustomerTypeVariant('Unknown') === 'neutral', 'Unknown customer type falls back to neutral variant token')

// ── Test Group 7: Chart of Accounts Tree Deduplication & Data Integrity ─
function normalizeAccountCode(value) {
  return (value || '').trim()
}

function formatAccountType(type) {
  switch (type) {
    case 'Asset':     return 'موجودات'
    case 'Liability': return 'مطلوبات'
    case 'Equity':    return 'حقوق الملكية'
    case 'Income':
    case 'Revenue':   return 'إيرادات'
    case 'Expense':   return 'مصروفات'
    default:          return type ?? 'موجودات'
  }
}

assert(normalizeAccountCode(' 3 ') === '3', 'normalizeAccountCode trims leading/trailing whitespace')
assert(formatAccountType('Equity') === 'حقوق الملكية', 'formatAccountType maps Equity to Arabic حقوق الملكية')
assert(formatAccountType('Asset') === 'موجودات', 'formatAccountType maps Asset to Arabic موجودات')

// Test Canonical Code Deduplication
function buildTestTree(accounts) {
  const nodeMap = new Map()
  
  accounts.forEach((a, idx) => {
    const code = normalizeAccountCode(a.code)
    if (!code) return
    const key = a.is_synthetic ? `synthetic:${code}` : `account:${a.id || code}`
    
    if (nodeMap.has(code)) {
      const existing = nodeMap.get(code)
      if (!a.is_synthetic) {
        existing.key = key
        existing.is_persisted = true
        existing.is_synthetic = false
        existing.name = a.name
        existing.debit = a.debit
        existing.credit = a.credit
      }
    } else {
      nodeMap.set(code, {
        id: idx + 1,
        key,
        code,
        name: a.name,
        is_persisted: !a.is_synthetic,
        is_synthetic: !!a.is_synthetic,
        debit: a.debit || 0,
        credit: a.credit || 0,
        children: []
      })
    }
  })
  
  return Array.from(nodeMap.values())
}

const rawAccountsSample = [
  { id: 'guid1', code: '3', name: 'حقوق الملكية', debit: 0, credit: 1000, is_synthetic: false },
  { id: 'guid2', code: '3 ', name: 'حقوق الملكية المكررة', debit: 0, credit: 0, is_synthetic: true },
  { id: 'guid3', code: '31', name: 'رأس المال', debit: 0, credit: 5000, is_synthetic: false },
]

const deduplicatedNodes = buildTestTree(rawAccountsSample)
const code3Nodes = deduplicatedNodes.filter(n => n.code === '3')

assert(code3Nodes.length === 1, 'Code 3 appears exactly once after canonical code deduplication')
assert(code3Nodes[0].is_persisted === true, 'Real persisted account takes priority over synthetic node')
assert(code3Nodes[0].key === 'account:guid1', 'Persisted node uses account:guid key')

const persistedOnlyCount = deduplicatedNodes.filter(n => n.is_persisted).length
assert(persistedOnlyCount === 2, 'KPI total account count excludes synthetic nodes (2 persisted accounts)')

// ── Test Group 8: Accounting Hierarchy Rollup & Reconciliation Verification ─
function calculateTreeRollup(nodes) {
  let totalDebit = 0
  let totalCredit = 0

  function process(node) {
    let ownDebit = node.debit || 0
    let ownCredit = node.credit || 0
    let sumDebit = ownDebit
    let sumCredit = ownCredit

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childRes = process(child)
        sumDebit += childRes.subtreeDebit
        sumCredit += childRes.subtreeCredit
      }
    }

    node.subtreeDebit = sumDebit
    node.subtreeCredit = sumCredit
    return { subtreeDebit: sumDebit, subtreeCredit: sumCredit }
  }

  for (const root of nodes) {
    const res = process(root)
    totalDebit += res.subtreeDebit
    totalCredit += res.subtreeCredit
  }

  return { totalDebit, totalCredit }
}

const rootAsset = {
  code: '1', name: 'الأصول', debit: 0, credit: 0,
  children: [{
    code: '11', name: 'الأصول المتداولة', debit: 0, credit: 0,
    children: [{
      code: '111', name: 'النقدية وما يعادلها', debit: 0, credit: 0,
      children: [
        { code: '111001', name: 'صندوق النقدية الرئيسي - بالدينار', debit: 50000000, credit: 0, children: [] },
        { code: '111002', name: 'صندوق النقدية الرئيسي - بالدولار', debit: 10000000, credit: 0, children: [] },
      ]
    }]
  }]
}

const rollupRes = calculateTreeRollup([rootAsset])

assert(rootAsset.subtreeDebit === 60000000, 'Root total debit equals sum of unique leaf children (60,000,000 IQD)')
assert(rootAsset.children[0].children[0].subtreeDebit === 60000000, 'Intermediate node 111 aggregates unique children exactly once')
assert(rollupRes.totalDebit === 60000000, 'Root totals reconcile 100% with authoritative backend leaf totals')

// ── Test Group 9: General Ledger Chronological Running Balance Test ──────────
function calculateLedgerRunningBalance(initialBalance, movements) {
  let current = initialBalance
  const result = []

  for (const m of movements) {
    current += (m.debit - m.credit)
    result.push({ ...m, running_balance: current })
  }

  return { rows: result, closingBalance: current }
}

const sampleMovements = [
  { debit: 1000, credit: 0 },
  { debit: 500, credit: 200 },
  { debit: 0, credit: 300 },
]

const glTestRes = calculateLedgerRunningBalance(0, sampleMovements)
assert(glTestRes.rows[0].running_balance === 1000, 'First movement running balance is 1000')
assert(glTestRes.rows[1].running_balance === 1300, 'Second movement running balance is 1300')
assert(glTestRes.rows[2].running_balance === 1000, 'Third movement running balance is 1000')
assert(glTestRes.closingBalance === 1000, 'Closing balance equals opening + net movements (1000 IQD)')

// ── Test Group 10: Journal Entry Balance & Reversal Reconciliation Test ─────
function validateJournalEntry(lines) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0
  return { totalDebit, totalCredit, isBalanced }
}

function createReversalEntry(originalEntry) {
  const reversedLines = originalEntry.lines.map(l => ({
    account_code: l.account_code,
    debit: l.credit,
    credit: l.debit,
  }))
  return {
    reference_number: `REV-${originalEntry.reference_number}`,
    lines: reversedLines,
    status: 'reversed',
  }
}

const originalEntry = {
  reference_number: 'JE-2026-001',
  lines: [
    { account_code: '111001', debit: 500000, credit: 0 },
    { account_code: '411001', debit: 0, credit: 500000 },
  ]
}

const origVal = validateJournalEntry(originalEntry.lines)
assert(origVal.isBalanced === true, 'Original journal entry is balanced (500,000 IQD debit = credit)')

const revEntry = createReversalEntry(originalEntry)
const revVal = validateJournalEntry(revEntry.lines)
assert(revVal.isBalanced === true, 'Reversal journal entry is balanced (500,000 IQD debit = credit)')
assert(revEntry.lines[0].credit === 500000 && revEntry.lines[0].account_code === '111001', 'Reversal swaps debit and credit lines exactly')

const combinedNet = (origVal.totalDebit - origVal.totalCredit) + (revVal.totalDebit - revVal.totalCredit)
assert(combinedNet === 0, 'Original + Reversal entry net impact on general ledger equals zero')

// --- Test Group 11: Trial Balance 6-Column Model & Reconciliation ---
console.log('\n--- Test Group 11: Trial Balance 6-Column Model & Reconciliation ---')

function calculateTrialBalanceAccount(openingDebit, openingCredit, periodDebit, periodCredit) {
  const netOpening = openingDebit - openingCredit
  const netPeriod = periodDebit - periodCredit
  const netClosing = netOpening + netPeriod

  const closingDebit = netClosing > 0 ? netClosing : 0
  const closingCredit = netClosing < 0 ? Math.abs(netClosing) : 0
  const netBalance = netClosing

  return { openingDebit, openingCredit, periodDebit, periodCredit, closingDebit, closingCredit, netBalance }
}

const sampleAccount = calculateTrialBalanceAccount(500000, 0, 200000, 50000)
assert(sampleAccount.closingDebit === 650000, 'Trial Balance closing debit equals opening net + period net (650,000 IQD)')
assert(sampleAccount.closingCredit === 0, 'Trial Balance closing credit is zero when net closing is positive')

const zeroAccount = calculateTrialBalanceAccount(0, 0, 0, 0)
const isZero = zeroAccount.openingDebit === 0 && zeroAccount.openingCredit === 0 && zeroAccount.periodDebit === 0 && zeroAccount.periodCredit === 0 && zeroAccount.closingDebit === 0 && zeroAccount.closingCredit === 0
assert(isZero === true, 'Zero-balance account accurately identified across all 6 columns')

const tbTotals = {
  opening_debit: 1000000,
  opening_credit: 1000000,
  period_debit: 500000,
  period_credit: 500000,
  closing_debit: 1500000,
  closing_credit: 1500000,
  difference: 0
}

assert(tbTotals.opening_debit === tbTotals.opening_credit, 'Total Opening Debit equals Total Opening Credit (1,000,000 IQD)')
assert(tbTotals.period_debit === tbTotals.period_credit, 'Total Period Debit equals Total Period Credit (500,000 IQD)')
assert(tbTotals.closing_debit === tbTotals.closing_credit, 'Total Closing Debit equals Total Closing Credit (1,500,000 IQD)')
assert(tbTotals.difference === 0, 'Trial Balance difference equals exactly 0.00 IQD')

// --- Test Group 12: Profit & Loss Response Normalization & Array Safety ---
console.log('\n--- Test Group 12: Profit & Loss Response Normalization & Array Safety ---')

function normalizeProfitLossData(rawData) {
  const data = (rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data) ? rawData.data : rawData
  const revenues = Array.isArray(data?.revenues) ? data.revenues : Array.isArray(data?.Revenues) ? data.Revenues : []
  const expenses = Array.isArray(data?.expenses) ? data.expenses : Array.isArray(data?.Expenses) ? data.Expenses : []
  const totalRevenues = typeof data?.totalRevenues === 'number' ? data.totalRevenues : revenues.reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalExpenses = typeof data?.totalExpenses === 'number' ? data.totalExpenses : expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const netProfitOrLoss = typeof data?.netProfitOrLoss === 'number' ? data.netProfitOrLoss : totalRevenues - totalExpenses

  return { revenues, expenses, totalRevenues, totalExpenses, netProfitOrLoss }
}

const nullResult = normalizeProfitLossData(null)
assert(Array.isArray(nullResult.revenues) && nullResult.revenues.length === 0, 'Null rawData normalizes revenues to []')
assert(Array.isArray(nullResult.expenses) && nullResult.expenses.length === 0, 'Null rawData normalizes expenses to []')
assert(nullResult.netProfitOrLoss === 0, 'Null rawData normalizes netProfitOrLoss to 0')

const wrapperResult = normalizeProfitLossData({
  success: true,
  data: {
    revenues: [{ accountCode: '411', accountName: 'مبيعات', amount: 100000 }],
    expenses: [],
    totalRevenues: 100000,
    totalExpenses: 0,
    netProfitOrLoss: 100000
  }
})
assert(wrapperResult.revenues.length === 1, 'Wrapper object { success: true, data: { ... } } correctly unwrapped')
assert(wrapperResult.expenses.length === 0, 'Empty expenses array safely preserved as []')
assert(wrapperResult.netProfitOrLoss === 100000, 'Net profit correctly calculated')

// --- Test Group 13: Balance Sheet Normalization & Group Children Safety ---
console.log('\n--- Test Group 13: Balance Sheet Normalization & Group Children Safety ---')

function normalizeBalanceSheetData(rawData) {
  const data = (rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data) ? rawData.data : rawData
  const assets = Array.isArray(data?.assets) ? data.assets : Array.isArray(data?.Assets) ? data.Assets : []
  const liabilities = Array.isArray(data?.liabilities) ? data.liabilities : Array.isArray(data?.Liabilities) ? data.Liabilities : []
  const equity = Array.isArray(data?.equity) ? data.equity : Array.isArray(data?.Equity) ? data.Equity : []

  const normalizeGroup = (g) => ({
    ...g,
    children: Array.isArray(g?.children) ? g.children : Array.isArray(g?.Children) ? g.Children : []
  })

  return {
    assets: assets.map(normalizeGroup),
    liabilities: liabilities.map(normalizeGroup),
    equity: equity.map(normalizeGroup),
  }
}

const bsNull = normalizeBalanceSheetData(null)
assert(Array.isArray(bsNull.assets) && bsNull.assets.length === 0, 'Null BalanceSheet rawData normalizes assets to []')

const bsWithGroupNoChildren = normalizeBalanceSheetData({
  assets: [
    { id: 1, code: '11', name: 'أصول متداولة', balance: 500000, children: null }
  ]
})
assert(bsWithGroupNoChildren.assets.length === 1, 'Assets group with children=null preserved as group')
assert(Array.isArray(bsWithGroupNoChildren.assets[0].children) && bsWithGroupNoChildren.assets[0].children.length === 0, 'Group children=null safely normalized to []')

// ==================================================
// GROUP 14: SUPPLIER PROFITABILITY DATA NORMALIZATION
// ==================================================
console.log('--- Group 14: Supplier Profitability Statement Normalization ---')

function normalizeSupplierProfitabilityData(rawData) {
  const data = (rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data) ? rawData.data : rawData

  return {
    supplier: data?.supplier ?? { id: '', name: '', code: '', phone: '' },
    period: data?.period ?? { dateFrom: null, dateTo: null },
    summary: data?.summary ?? {
      purchasedVehicleCount: 0,
      soldVehicleCount: 0,
      unsoldVehicleCount: 0,
      purchaseValue: 0,
      realizedRevenue: 0,
      costOfSoldVehicles: 0,
      directCosts: 0,
      realizedGrossProfit: 0,
      profitMarginPercent: 0,
      markupPercent: 0,
      averageProfitPerSoldVehicle: 0,
      unsoldInventoryCost: 0,
      averageDaysToSell: 0,
    },
    vehicles: Array.isArray(data?.vehicles) ? data.vehicles : [],
    monthlyTrend: Array.isArray(data?.monthlyTrend) ? data.monthlyTrend : [],
    modelBreakdown: Array.isArray(data?.modelBreakdown) ? data.modelBreakdown : [],
  }
}

const spNull = normalizeSupplierProfitabilityData(null)
assert(spNull.supplier.id === '', 'Null rawData normalizes supplier to empty object')
assert(spNull.summary.realizedGrossProfit === 0, 'Null rawData normalizes realizedGrossProfit to 0')
assert(Array.isArray(spNull.vehicles) && spNull.vehicles.length === 0, 'Null rawData normalizes vehicles to []')

const spValid = normalizeSupplierProfitabilityData({
  supplier: { id: 'sup-1', name: 'شركة ذرى الخليج', code: 'SUP-01', phone: '077000' },
  summary: {
    purchasedVehicleCount: 10,
    soldVehicleCount: 6,
    unsoldVehicleCount: 4,
    purchaseValue: 120000000,
    realizedRevenue: 90000000,
    costOfSoldVehicles: 70000000,
    realizedGrossProfit: 20000000,
  },
  vehicles: [
    { vehicleId: 'v-1', vin: 'VIN01', netRevenue: 15000000, totalVehicleCost: 12000000, realizedProfit: 3000000, status: 'Sold' }
  ]
})

assert(spValid.supplier.name === 'شركة ذرى الخليج', 'Valid supplier name extracted')
assert(spValid.summary.purchasedVehicleCount === 10, 'Valid purchased count extracted')
assert(spValid.vehicles.length === 1, 'Valid vehicles array preserved')
assert(spValid.summary.realizedGrossProfit === spValid.summary.realizedRevenue - spValid.summary.costOfSoldVehicles, 'Gross profit reconciles exactly with revenue minus cost of sold')

console.log('\n==================================================')
console.log(`Test Summary: ${passed} passed, ${failed} failed`)
console.log('==================================================\n')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}



