/**
 * Full System Audit — covers Auth, Dashboard, Accounting pages,
 * CRM, Inventory, Customers, Reports, Cashier, UI/UX
 */
import { test, expect, Page } from '@playwright/test'
import { login, navTo, apiGet, collectApiCalls, ADMIN } from './helpers'

// ─── shared state ────────────────────────────────────────────────────────────
let token = ''

test.beforeAll(async () => {
  const r = await fetch('http://localhost:8080/api/Auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN.username, password: ADMIN.password }),
  })
  const b = await r.json()
  token = b.token
})

test.describe.serial('1. Authentication', () => {
  test('1a. valid login redirects to dashboard', async ({ page }) => {
    const res = await login(page)
    expect(res.status, 'Login HTTP status').toBe(200)
    expect(res.token, 'JWT token received').toBeTruthy()
    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })

  test('1b. invalid credentials returns 401 without crashing UI', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'wrongpassword')
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/Auth/login')),
      page.click('button[type="submit"]'),
    ])
    expect(response.status()).toBe(401)
    await expect(page).toHaveURL('/login')
    // Page should still be functional — not crashed
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('1c. protected route redirects unauthenticated user to /login', async ({ page }) => {
    // fresh context — no auth
    await page.goto('/trial-balance')
    await page.waitForURL(/login/, { timeout: 8_000 }).catch(() => {})
    const url = page.url()
    // Accept either redirect to /login or remaining on /login
    expect(url).toMatch(/login/)
  })

  test('1d. token persists across navigation', async ({ page }) => {
    await login(page)
    await page.goto('/trial-balance', { waitUntil: 'networkidle' })
    await expect(page).not.toHaveURL(/login/)
  })

  test('1e. /api/Auth/me returns current user when authenticated', async () => {
    const res = await apiGet(token, '/api/Auth/me')
    expect(res.status).toBe(200)
    expect(res.body?.username ?? res.body?.user?.username).toBeTruthy()
  })
})

test.describe.serial('2. Dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('2a. dashboard loads with 4 tab buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const tabs = await page.locator('button').filter({ hasText: /نظرة عامة|الأداء|المخزون/ }).count()
    expect(tabs).toBeGreaterThanOrEqual(3)
  })

  test('2b. dashboard KPI cards visible (zeros expected — empty DB)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // Glass-panel stat blocks
    const panels = await page.locator('.glass, [class*="rounded-xl"]').count()
    expect(panels).toBeGreaterThan(0)
  })

  test('2c. dashboard API calls all succeed (no 4xx/5xx)', async ({ page }) => {
    const calls = collectApiCalls(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    const failed = calls.filter(c => c.status >= 400)
    expect(failed, `Failed API calls: ${JSON.stringify(failed)}`).toHaveLength(0)
  })

  test('2d. Clicking financial tab switches content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const perfTab = page.locator('button').filter({ hasText: /الأداء المالي/ }).first()
    await perfTab.click()
    await page.waitForTimeout(800)
    // Content area changes
    const content = await page.locator('main, [class*="content"]').first().textContent()
    expect(content).toBeTruthy()
  })

  test('2e. no console errors on dashboard', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })
})

test.describe.serial('3. Chart of Accounts', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('3a. chart-of-accounts page loads', async ({ page }) => {
    const { failed } = await navTo(page, '/chart-of-accounts')
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })

  test('3b. account tree renders (API has accounts)', async ({ page }) => {
    await navTo(page, '/chart-of-accounts')
    // Some account code or name should be visible
    const rows = await page.locator('tr, [class*="account-row"], [class*="tree"]').count()
    expect(rows).toBeGreaterThan(0)
  })
})

test.describe.serial('4. Trial Balance', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('4a. trial balance loads without errors', async ({ page }) => {
    const { failed } = await navTo(page, '/trial-balance')
    expect(failed).toHaveLength(0)
  })

  test('4b. table rows have no border-b class (border fix)', async ({ page }) => {
    await navTo(page, '/trial-balance')
    const withBorder = await page.evaluate(() =>
      Array.from(document.querySelectorAll('tbody tr')).filter(r =>
        r.className.includes('border-b')
      ).length
    )
    expect(withBorder, 'tbody rows must not have border-b').toBe(0)
  })

  test('4c. tfoot row has no border-t class (border fix)', async ({ page }) => {
    await navTo(page, '/trial-balance')
    const withBorder = await page.evaluate(() =>
      Array.from(document.querySelectorAll('tfoot tr')).filter(r =>
        r.className.includes('border-t')
      ).length
    )
    expect(withBorder, 'tfoot rows must not have border-t').toBe(0)
  })

  test('4d. API /api/Accounting/trial-balance returns 200 with accounts array', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    expect(res.status).toBe(200)
    expect(res.body?.data).toBeInstanceOf(Array)
    expect(res.body?.data?.length).toBeGreaterThan(0)
  })

  test('4e. trial balance is balanced (sum debit == sum credit)', async () => {
    const res = await apiGet(token, '/api/Accounting/trial-balance')
    const accounts = res.body?.data ?? []
    const totalDebit  = accounts.reduce((s: number, a: any) => s + (a.totalDebit ?? 0), 0)
    const totalCredit = accounts.reduce((s: number, a: any) => s + (a.totalCredit ?? 0), 0)
    expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01)
  })
})

test.describe.serial('5. Journal Entries', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('5a. journal entries page loads', async ({ page }) => {
    const { failed } = await navTo(page, '/journal-entries')
    expect(failed).toHaveLength(0)
  })

  test('5b. open new entry form shows AccountCombobox for each line', async ({ page }) => {
    await navTo(page, '/journal-entries')
    const addBtn = page.locator('button').filter({ hasText: /قيد جديد|إضافة|جديد/ }).first()
    if (await addBtn.isVisible()) await addBtn.click()
    await page.waitForTimeout(1200)
    const combos = await page.locator('button[type="button"]').filter({ hasText: /اختر الحساب/ }).count()
    expect(combos).toBeGreaterThanOrEqual(2)
  })

  test('5c. AccountCombobox search filters accounts', async ({ page }) => {
    await navTo(page, '/journal-entries')
    const addBtn = page.locator('button').filter({ hasText: /قيد جديد|إضافة|جديد/ }).first()
    if (await addBtn.isVisible()) await addBtn.click()
    await page.waitForTimeout(1200)
    const firstCombo = page.locator('button[type="button"]').filter({ hasText: /اختر الحساب/ }).first()
    if (await firstCombo.isVisible()) {
      await firstCombo.click()
      await page.waitForTimeout(400)
      const searchInput = page.locator('input[placeholder*="ابحث"]').first()
      if (await searchInput.isVisible()) {
        await searchInput.fill('111')
        await page.waitForTimeout(500)
        const items = await page.locator('[cmdk-item]').count()
        expect(items).toBeGreaterThan(0)
      }
    }
  })

  test('5d. cannot submit unbalanced journal entry', async ({ page }) => {
    await navTo(page, '/journal-entries')
    const addBtn = page.locator('button').filter({ hasText: /قيد جديد|إضافة|جديد/ }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(1000)
      // Submit button should be disabled when not balanced
      const submitBtn = page.locator('button').filter({ hasText: /حفظ|تسجيل|ترحيل/ }).first()
      if (await submitBtn.count() > 0) {
        const disabled = await submitBtn.isDisabled()
        expect(disabled).toBe(true)
      }
    }
  })
})

test.describe.serial('6. Vouchers', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('6a. vouchers page loads', async ({ page }) => {
    const { failed } = await navTo(page, '/vouchers')
    expect(failed).toHaveLength(0)
  })

  test('6b. debit/credit AccountComboboxes visible in form', async ({ page }) => {
    await navTo(page, '/vouchers')
    // Form is toggled — click "سند جديد" to open it
    const toggleBtn = page.locator('button').filter({ hasText: /سند جديد|جديد/ }).first()
    if (await toggleBtn.isVisible()) await toggleBtn.click()
    await page.waitForTimeout(1000)
    const combos = await page.locator('button[type="button"]').filter({ hasText: /اختر حساب/ }).count()
    expect(combos).toBeGreaterThanOrEqual(2)
  })
})

test.describe.serial('7. Cashbox Close', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('7a. cashbox close loads and shows account combobox', async ({ page }) => {
    const { failed } = await navTo(page, '/cashbox/close')
    expect(failed).toHaveLength(0)
    // Combobox shows selected account (has صندوق text since 111001 is default)
    const cashCombo = await page.locator('button[type="button"]').filter({ hasText: /صندوق|اختر/ }).count()
    expect(cashCombo).toBeGreaterThanOrEqual(1)
  })

  test('7b. current balance API returns valid value', async () => {
    // Check correct method — this endpoint is GET
    const res = await apiGet(token, '/api/cashbox-closes/current-balance?account_code=111001')
    expect(res.status, `cashbox balance: ${JSON.stringify(res.body)}`).toBe(200)
    expect(typeof res.body?.balance).toBe('number')
  })
})

test.describe.serial('8. Recurring Entries', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('8a. recurring entries page loads', async ({ page }) => {
    const { failed } = await navTo(page, '/recurring-entries')
    expect(failed).toHaveLength(0)
  })

  test('8b. create form shows AccountCombobox per line', async ({ page }) => {
    await navTo(page, '/recurring-entries')
    const addBtn = page.locator('button').filter({ hasText: /جديد|إضافة|إنشاء/ }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(1000)
    }
    const combos = await page.locator('button[type="button"]').filter({ hasText: /اختر الحساب/ }).count()
    expect(combos).toBeGreaterThanOrEqual(2)
  })
})

test.describe.serial('9. CRM Pipeline', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('9a. CRM page loads with correct title', async ({ page }) => {
    const { failed } = await navTo(page, '/crm')
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toMatch(/رحلة|CRM|عميل/)
    expect(failed).toHaveLength(0)
  })

  test('9b. CRM pipeline API responds', async () => {
    // Try both pipeline and deals endpoints
    const res1 = await apiGet(token, '/api/Crm/pipeline')
    const res2 = await apiGet(token, '/api/Crm/deals')
    const ok = [res1.status, res2.status].some(s => s === 200)
    expect(ok, `CRM pipeline/deals: ${res1.status} / ${res2.status}`).toBe(true)
  })

  test('9c. no JS errors on CRM page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await navTo(page, '/crm')
    expect(errors).toHaveLength(0)
  })
})

test.describe.serial('10. Customers', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('10a. customers list loads', async ({ page }) => {
    const { failed } = await navTo(page, '/customers')
    expect(failed).toHaveLength(0)
  })

  test('10b. /api/Customers returns 200', async () => {
    const res = await apiGet(token, '/api/Customers?page=1&pageSize=10')
    expect(res.status).toBe(200)
  })

  test('10c. empty state displays — no crash with 0 customers', async ({ page }) => {
    await navTo(page, '/customers')
    // Either a table or an empty state message must be visible
    const hasContent = await page.locator('table, [class*="empty"], p').count()
    expect(hasContent).toBeGreaterThan(0)
  })
})

test.describe.serial('11. Inventory / Vehicles', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('11a. inventory page loads', async ({ page }) => {
    const { failed } = await navTo(page, '/inventory')
    expect(failed).toHaveLength(0)
  })

  test('11b. /api/Inventory returns 200', async () => {
    const res = await apiGet(token, '/api/Inventory?page=1&pageSize=10')
    expect(res.status).toBe(200)
  })

  test('11c. public showroom accessible without auth', async ({ page }) => {
    await page.goto('/showroom', { waitUntil: 'networkidle' })
    const status = page.url()
    expect(status).not.toMatch(/error/)
  })
})

test.describe.serial('12. Reports', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  const REPORT_PAGES = [
    { path: '/trial-balance',          label: 'Trial Balance' },
    { path: '/reports/profit-loss',    label: 'Profit & Loss' },
    { path: '/reports/balance-sheet',  label: 'Balance Sheet' },
    { path: '/reports/cashbox-movement', label: 'Cashbox Movement' },
    { path: '/reports/bank-movement',  label: 'Bank Movement' },
  ]

  for (const { path, label } of REPORT_PAGES) {
    test(`12. ${label} report loads without API failures`, async ({ page }) => {
      const { failed } = await navTo(page, path)
      expect(page.url()).not.toMatch(/login/)
      expect(failed, `${label} failed calls: ${JSON.stringify(failed)}`).toHaveLength(0)
    })
  }
})

test.describe.serial('13. Cashier / POS', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('13a. cashier area accessible', async ({ page }) => {
    const { failed } = await navTo(page, '/cashier')
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })

  test('13b. cashier receipts page loads', async ({ page }) => {
    const { failed } = await navTo(page, '/cashier/receipts')
    expect(page.url()).not.toMatch(/login/)
    expect(failed).toHaveLength(0)
  })
})

test.describe.serial('14. UI / RTL / Layout', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('14a. HTML dir attribute is rtl', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const dir = await page.locator('html, body, div[dir]').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('14b. no horizontal overflow on dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => {
      const body = document.body
      return body.scrollWidth > body.clientWidth + 10
    })
    expect(overflow).toBe(false)
  })

  test('14c. login page renders correctly (no JS errors)', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/login', { waitUntil: 'networkidle' })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})

test.describe.serial('15. API Health Check — All Key Endpoints', () => {
  const ENDPOINTS = [
    '/api/Auth/me',
    '/api/Dashboard',
    '/api/Inventory?page=1&pageSize=5',
    '/api/Customers?page=1&pageSize=5',
    '/api/Accounting/trial-balance',
    '/api/Payments?page=1&pageSize=5',
    '/api/Accounting/journal-entries?page=1&pageSize=5',
    '/api/RecurringEntries',
    '/api/cashbox-closes?account_code=111001',
    '/api/cashbox-closes/current-balance?account_code=111001',
    '/api/Crm/pipeline',
    '/api/smart-alerts',
    '/api/reports/kpi',
    '/api/FiscalYears',
    '/api/Roles',
    '/api/Users',
  ]

  for (const ep of ENDPOINTS) {
    test(`API ${ep}`, async () => {
      const res = await apiGet(token, ep)
      expect(res.status, `${ep} should return 2xx`).toBeLessThan(400)
    })
  }
})
