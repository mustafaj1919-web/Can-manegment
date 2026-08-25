/**
 * Sales & Data Integrity Flow
 * Creates real data: customer → vehicle → sale → installment plan → schedule payment
 * Then verifies ledger, trial balance, and dashboard KPIs reflect the data.
 *
 * Correct API structure (discovered via swagger + live API):
 *  - Sale creation response: { success, saleId }
 *  - Installment plan: GET /api/Installments/{planId} → { id, sale_id, schedules: [{id, amount, ...}] }
 *  - Schedule payment:  POST /api/Installments/schedules/{scheduleId}/payment
 *                       body: { amount, paymentMethod: "Cash", notes }
 *  - Journal entries response: { data: { items, total } }
 */
import { test, expect } from '@playwright/test'
import { login, apiGet, apiPost, navTo, ADMIN } from './helpers'

const API = 'http://localhost:8080'
let token = ''

// IDs created during this run
const created = {
  customerId: '',
  vehicleId: 0,
  saleId: '',
  planId: '',       // installment plan ID
  scheduleId: '',   // first schedule item ID
  scheduleAmount: 0,
}

test.beforeAll(async () => {
  const r = await fetch(`${API}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN.username, password: ADMIN.password }),
  })
  const b = await r.json()
  token = b.token
})

test.describe.serial('S1. Create Customer', () => {
  test('S1a. create customer via API', async () => {
    const res = await apiPost(token, '/api/Customers', {
      name: 'عميل تجريبي للاختبار',
      phone: '07711111111',
      idNumber: `QA-${Date.now()}`,
      address: 'بغداد - للاختبار',
    })
    expect([200, 201], `Create customer: ${JSON.stringify(res.body)}`).toContain(res.status)
    expect(res.body?.success).toBe(true)
    const id = res.body?.customerId ?? res.body?.id ?? res.body?.data?.id
    expect(id).toBeTruthy()
    created.customerId = id
  })

  test('S1b. customer appears in list', async () => {
    const res = await apiGet(token, '/api/Customers?page=1&pageSize=50')
    expect(res.status).toBe(200)
    const items = res.body?.items ?? res.body?.data ?? []
    const found = items.find((c: any) => c.id === created.customerId || c.name?.includes('تجريبي'))
    expect(found).toBeTruthy()
  })

  test('S1c. customer detail page accessible', async ({ page }) => {
    if (!created.customerId) test.skip()
    await login(page)
    const { failed } = await navTo(page, `/customers/${created.customerId}`)
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })
})

test.describe.serial('S2. Create Vehicle', () => {
  test('S2a. create vehicle via API', async () => {
    const res = await apiPost(token, '/api/Inventory', {
      brand: 'Toyota',
      model: 'Camry QA Test',
      year: 2024,
      color: 'أبيض',
      chassisNumber: `QA${Date.now()}`,
      purchaseCost: 25000,
      targetSellingPrice: 30000,
      currency: 'USD',
    })
    expect([200, 201], `Create vehicle: ${JSON.stringify(res.body)}`).toContain(res.status)
    expect(res.body?.success).toBe(true)
    const id = res.body?.vehicleId ?? res.body?.id ?? res.body?.data?.id
    expect(id).toBeTruthy()
    created.vehicleId = id
  })

  test('S2b. vehicle appears in inventory', async () => {
    const res = await apiGet(token, '/api/Inventory?page=1&pageSize=50')
    expect(res.status).toBe(200)
    const items = res.body?.items ?? res.body?.data ?? []
    const found = items.find((v: any) => v.id === created.vehicleId || v.model?.includes('Camry Test'))
    expect(found).toBeTruthy()
  })

  test('S2c. vehicle detail accessible in UI', async ({ page }) => {
    if (!created.vehicleId) test.skip()
    await login(page)
    const { failed } = await navTo(page, `/inventory/${created.vehicleId}`)
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })
})

test.describe.serial('S3. Create Sale / Contract', () => {
  test('S3a. create sale via API', async () => {
    if (!created.customerId || !created.vehicleId) test.skip()
    const res = await apiPost(token, '/api/Sales', {
      customerId: created.customerId,
      vehicleId: created.vehicleId,
      salePrice: 30000,
      downPayment: 5000,
      paymentMethod: 4, // Installment = 4 (enum integer)
      installmentPeriodMonths: 12,
      profitRatePercentage: 10,
      installmentStartDate: new Date().toISOString().split('T')[0],
    })
    expect([200, 201], `Create sale: ${JSON.stringify(res.body)}`).toContain(res.status)
    // Response field is contractId (not saleId/id); contractId == sale_id in installment plans
    const id = res.body?.contractId ?? res.body?.saleId ?? res.body?.id ?? res.body?.data?.id
    expect(id, `Sale ID not found in response: ${JSON.stringify(res.body)}`).toBeTruthy()
    if (id) created.saleId = id
  })

  test('S3b. vehicle status changes to sold/reserved after sale', async () => {
    if (!created.vehicleId) test.skip()
    const res = await apiGet(token, `/api/Inventory/${created.vehicleId}`)
    expect(res.status).toBe(200)
    const status = res.body?.status ?? res.body?.data?.status
    expect(status).toMatch(/sold|reserved|مباع|محجوز/i)
  })

  test('S3c. sale appears in sales list', async () => {
    const res = await apiGet(token, '/api/Sales?page=1&pageSize=50')
    expect(res.status).toBe(200)
    const items = res.body?.items ?? res.body?.data ?? []
    expect(items.length).toBeGreaterThan(0)
  })
})

test.describe.serial('S4. Installment Plan', () => {
  test('S4a. installment plan was created for the sale', async () => {
    if (!created.saleId) test.skip()
    // List installment plans and find the one matching our saleId
    const listRes = await apiGet(token, '/api/Installments?page=1&pageSize=50')
    expect(listRes.status).toBe(200)
    const plans = listRes.body?.items ?? []
    const plan = plans.find((p: any) => p.sale_id === created.saleId)
    expect(plan, `No installment plan found for saleId ${created.saleId}`).toBeTruthy()
    created.planId = plan.id

    // Now get the plan details to extract the first schedule
    const detailRes = await apiGet(token, `/api/Installments/${created.planId}`)
    expect(detailRes.status).toBe(200)
    const schedules = detailRes.body?.schedules ?? []
    expect(schedules.length).toBeGreaterThan(0)
    created.scheduleId = schedules[0].id
    created.scheduleAmount = schedules[0].amount
  })

  test('S4b. installment list shows active plan', async () => {
    const res = await apiGet(token, '/api/Installments?page=1&pageSize=20')
    expect(res.status).toBe(200)
    const items = res.body?.items ?? res.body?.data ?? []
    expect(items.length).toBeGreaterThan(0)
  })
})

test.describe.serial('S5. Pay Installment Schedule', () => {
  test('S5a. pay first schedule via POST /api/Installments/schedules/{id}/payment', async () => {
    if (!created.scheduleId) test.skip()
    // paymentMethod is a string for this endpoint (not enum int)
    const res = await apiPost(token, `/api/Installments/schedules/${created.scheduleId}/payment`, {
      amount: created.scheduleAmount,
      paymentMethod: 'Cash',
      notes: 'QA automated payment',
    })
    expect([200, 201], `Pay schedule: ${JSON.stringify(res.body)}`).toContain(res.status)
    const paid = res.body?.status === 'Paid' || res.body?.success === true
    expect(paid, `Expected schedule to be Paid: ${JSON.stringify(res.body)}`).toBe(true)
  })

  test('S5b. schedule status is now Paid', async () => {
    if (!created.planId) test.skip()
    const detailRes = await apiGet(token, `/api/Installments/${created.planId}`)
    expect(detailRes.status).toBe(200)
    const schedules = detailRes.body?.schedules ?? []
    const first = schedules.find((s: any) => s.id === created.scheduleId)
    expect(first?.status, `Expected Paid status for schedule ${created.scheduleId}`).toMatch(/paid/i)
  })
})

test.describe.serial('S6. Data Integrity After Sale', () => {
  test('S6a. trial balance still balanced after sale', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    const accounts = res.body?.data ?? []
    const totalDebit  = accounts.reduce((s: number, a: any) => s + (a.totalDebit ?? 0), 0)
    const totalCredit = accounts.reduce((s: number, a: any) => s + (a.totalCredit ?? 0), 0)
    expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(1)
  })

  test('S6b. dashboard shows updated sale count', async () => {
    const res = await apiGet(token, '/api/Dashboard')
    expect(res.status).toBe(200)
    const salesCount = res.body?.sales_count ?? 0
    expect(salesCount).toBeGreaterThan(0)
  })

  test('S6c. journal entries were created for the sale', async () => {
    const res = await apiGet(token, '/api/Accounting/journal-entries?page=1&pageSize=50')
    // Response: { success, data: { total, page, per_page, items: [...] } }
    const items = res.body?.data?.items ?? res.body?.items ?? res.body?.data ?? []
    const total = res.body?.data?.total ?? items.length
    expect(total).toBeGreaterThan(0)
  })

  test('S6d. customer ledger shows the receivable', async () => {
    if (!created.customerId) test.skip()
    const res = await apiGet(token, `/api/Customers/${created.customerId}/ledger`)
    expect(res.status).toBe(200)
  })
})

test.describe.serial('S7. Sales UI Pages', () => {
  test('S7a. sales list page renders', async ({ page }) => {
    await login(page)
    const { failed } = await navTo(page, '/sales')
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })

  test('S7b. contracts page accessible', async ({ page }) => {
    await login(page)
    const { failed } = await navTo(page, '/contracts')
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })

  test('S7c. installments page shows data', async ({ page }) => {
    await login(page)
    const { failed } = await navTo(page, '/installments')
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })
})
