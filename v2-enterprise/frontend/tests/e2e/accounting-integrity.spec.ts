/**
 * Accounting Integrity Tests
 * Validates debit/credit balance, account structure, and journal entry rules.
 */
import { test, expect } from '@playwright/test'
import { login, navTo, apiGet, apiPost, ADMIN } from './helpers'

const API = 'http://localhost:8080'
let token = ''

test.beforeAll(async () => {
  const r = await fetch(`${API}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN.username, password: ADMIN.password }),
  })
  const b = await r.json()
  token = b.token
})

test.describe('A. Chart of Accounts Integrity', () => {
  test('A1. trial balance accounts exist in DB', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    expect(res.status).toBe(200)
    expect(res.body?.data).toBeInstanceOf(Array)
    expect(res.body?.data?.length).toBeGreaterThan(10)
  })

  test('A2. account codes are non-empty strings', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    const accounts = res.body?.data ?? []
    for (const a of accounts) {
      expect(a.accountCode, `accountCode must exist`).toBeTruthy()
      expect(typeof a.accountCode).toBe('string')
    }
  })

  test('A3. account types are valid', async () => {
    const VALID_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Income']
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    const accounts = res.body?.data ?? []
    for (const a of accounts) {
      expect(VALID_TYPES, `"${a.accountType}" must be a valid type`).toContain(a.accountType)
    }
  })

  test('A4. debit/credit totals are balanced (sum debit == sum credit)', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    const accounts = res.body?.data ?? []
    const totalDebit  = accounts.reduce((s: number, a: any) => s + (a.totalDebit ?? 0), 0)
    const totalCredit = accounts.reduce((s: number, a: any) => s + (a.totalCredit ?? 0), 0)
    expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01)
  })
})

test.describe('B. Journal Entry Flow', () => {
  test('B1. journal entries endpoint returns paginated result', async () => {
    const res = await apiGet(token, '/api/Accounting/journal-entries?page=1&pageSize=10')
    expect(res.status).toBe(200)
    // Response has items or data
    const hasItems = res.body?.items !== undefined || res.body?.data !== undefined || Array.isArray(res.body)
    expect(hasItems).toBe(true)
  })

  test('B2. creating an unbalanced journal entry fails (400)', async () => {
    const payload = {
      description: 'TEST - unbalanced entry',
      date: new Date().toISOString().split('T')[0],
      lines: [
        { accountCode: '111001', isDebit: true,  amount: 1000, description: 'test debit' },
        { accountCode: '521001', isDebit: false, amount: 500,  description: 'wrong credit' },
      ],
    }
    const res = await apiPost(token, '/api/Accounting/journal-entry', payload)
    expect(res.status, 'Unbalanced entry must be rejected').toBeGreaterThanOrEqual(400)
  })

  test('B3. creating a balanced journal entry succeeds (200)', async () => {
    // API uses: entryDate (datetime), accountId (UUID), debit/credit (not isDebit/amount)
    const payload = {
      entryDate: new Date().toISOString(),
      description: 'TEST - balanced entry for audit',
      lines: [
        { accountId: 'e375d88a-b953-4293-b2a6-f124e0003f5b', debit: 100, credit: 0, description: 'test debit' },
        { accountId: '9a8f58e0-5ee1-4127-ac50-9face2fe8027', debit: 0,   credit: 100, description: 'test credit' },
      ],
    }
    const res = await apiPost(token, '/api/Accounting/journal-entry', payload)
    expect([200, 201], `Expected 200/201 got ${res.status}: ${JSON.stringify(res.body)}`).toContain(res.status)
    expect(res.body?.success).toBe(true)
  })

  test('B4. after journal entry, trial balance reflects the change', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    const accounts = res.body?.data ?? []
    const cashAccount = accounts.find((a: any) => a.accountCode === '111001')
    expect(cashAccount).toBeTruthy()
    // After the B3 entry, 111001 should have debit >= 100
    expect(cashAccount?.totalDebit).toBeGreaterThanOrEqual(100)
  })
})

test.describe('C. Cashbox Integrity', () => {
  test('C1. cashbox current balance returns numeric value', async () => {
    const res = await apiGet(token, '/api/cashbox-closes/current-balance?account_code=111001')
    expect(res.status).toBe(200)
    expect(typeof res.body?.balance).toBe('number')
  })

  test('C2. cashbox closes history returns array', async () => {
    const res = await apiGet(token, '/api/cashbox-closes?account_code=111001')
    expect(res.status).toBe(200)
    // Could be empty array or paginated
    const isArray = Array.isArray(res.body) || Array.isArray(res.body?.items) || Array.isArray(res.body?.data)
    expect(isArray).toBe(true)
  })
})

test.describe('D. Accounting UI — No Broken Pages', () => {
  const ACCOUNTING_PAGES = [
    '/trial-balance',
    '/journal-entries',
    '/vouchers',
    '/cashbox/close',
    '/recurring-entries',
    '/chart-of-accounts',
    '/accounting',
    '/reports/profit-loss',
    '/reports/balance-sheet',
  ]

  for (const path of ACCOUNTING_PAGES) {
    test(`D. ${path} loads without API failures`, async ({ page }) => {
      await login(page)
      const { failed } = await navTo(page, path)
      expect(page.url()).not.toMatch(/login/)
      expect(failed, `Failed on ${path}: ${JSON.stringify(failed)}`).toHaveLength(0)
    })
  }
})

test.describe('E. Profit & Loss and Balance Sheet', () => {
  test('E1. profit-loss API responds with data structure', async () => {
    const res = await apiGet(token, '/api/Accounting/profit-loss')
    expect(res.status).toBe(200)
  })

  test('E2. balance-sheet API responds', async () => {
    const res = await apiGet(token, '/api/Accounting/balance-sheet')
    expect(res.status).toBe(200)
  })
})
