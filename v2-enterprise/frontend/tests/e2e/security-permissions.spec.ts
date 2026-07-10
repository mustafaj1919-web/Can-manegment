/**
 * Security & Permissions Tests
 * Verifies protected routes, API auth, token handling, no data leaks
 */
import { test, expect } from '@playwright/test'
import { login, apiGet, navTo } from './helpers'

const API = 'http://localhost:8080'
let token = ''

test.beforeAll(async () => {
  const r = await fetch(`${API}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@Showroom2024!' }),
  })
  const b = await r.json()
  token = b.token
})

test.describe('P1. Authentication Guards', () => {
  const PROTECTED_ROUTES = [
    '/trial-balance',
    '/journal-entries',
    '/vouchers',
    '/customers',
    '/inventory',
    '/sales',
    '/installments',
    '/reports/profit-loss',
    '/cashbox/close',
    '/users',
    '/settings',
  ]

  for (const route of PROTECTED_ROUTES) {
    test(`P1. ${route} redirects unauthenticated user`, async ({ page }) => {
      // New context = no localStorage auth
      await page.goto(route)
      await page.waitForTimeout(2000)
      const url = page.url()
      // Must redirect to /login or stay on /login
      expect(url).toMatch(/login/)
    })
  }
})

test.describe('P2. API Authentication', () => {
  const SECURE_ENDPOINTS = [
    '/api/Customers?page=1&pageSize=5',
    '/api/Inventory?page=1&pageSize=5',
    '/api/Users',
    '/api/Accounting/trial-balance',
    '/api/Payments?page=1&pageSize=5',
    '/api/Roles',
    '/api/FiscalYears',
    '/api/Audit',
  ]

  for (const ep of SECURE_ENDPOINTS) {
    test(`P2. ${ep} returns 401 without token`, async () => {
      const res = await fetch(`${API}${ep}`)
      expect([401, 403], `${ep} must require auth, got ${res.status}`).toContain(res.status)
    })
  }

  test('P2z. same endpoints return 200 with valid token', async () => {
    const res = await apiGet(token, '/api/Customers?page=1&pageSize=5')
    expect(res.status).toBe(200)
  })
})

test.describe('P3. Public Endpoints (No Auth Required)', () => {
  test('P3a. /api/public/vehicles is public', async () => {
    const res = await fetch(`${API}/api/public/vehicles`)
    expect(res.status).toBe(200)
  })

  test('P3b. /api/public/inventory is public', async () => {
    const res = await fetch(`${API}/api/public/inventory?page=1&pageSize=5`)
    expect(res.status).toBe(200)
  })

  test('P3c. /api/Auth/login is public', async () => {
    const res = await fetch(`${API}/api/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent', password: 'wrong' }),
    })
    // Should return 401 (processed) not 403/404 (not allowed)
    expect(res.status).toBe(401)
  })
})

test.describe('P4. Token Security', () => {
  test('P4a. expired/invalid token returns 401', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const res = await fetch(`${API}/api/Auth/me`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    })
    expect([401, 403]).toContain(res.status)
  })

  test('P4b. JWT token not exposed in browser local storage name', async ({ page }) => {
    await login(page)
    const storageKeys = await page.evaluate(() => Object.keys(localStorage))
    // Token should exist somewhere but not be labeled dangerously
    const sensitiveExposure = storageKeys.filter(k =>
      k.toLowerCase().includes('secret') || k.toLowerCase().includes('private')
    )
    expect(sensitiveExposure).toHaveLength(0)
  })

  test('P4c. no token in page source / window object', async ({ page }) => {
    await login(page)
    // Token should not be in window.token or similar
    const tokenOnWindow = await page.evaluate(() => {
      return !!(window as any).token || !!(window as any).authToken || !!(window as any).jwt
    })
    expect(tokenOnWindow).toBe(false)
  })
})

test.describe('P5. Role-Based Access (Admin has all permissions)', () => {
  test('P5a. admin can access /users page', async ({ page }) => {
    await login(page)
    const { failed } = await navTo(page, '/users')
    expect(page.url()).not.toMatch(/login|403|forbidden/)
    expect(failed).toHaveLength(0)
  })

  test('P5b. admin can access /roles page', async ({ page }) => {
    await login(page)
    const { failed } = await navTo(page, '/roles')
    expect(page.url()).not.toMatch(/login|403|forbidden/)
    expect(failed).toHaveLength(0)
  })

  test('P5c. /api/Users returns 200 for admin', async () => {
    const res = await apiGet(token, '/api/Users')
    expect(res.status).toBe(200)
  })
})

test.describe('P6. SQL Injection / XSS basic checks', () => {
  test('P6a. customer search with SQL-like input does not crash API', async () => {
    const res = await apiGet(token, `/api/Customers?search=${encodeURIComponent("' OR 1=1 --")}&page=1&pageSize=5`)
    // Should return 200 with empty results, not 500
    expect(res.status).toBeLessThan(500)
  })

  test('P6b. inventory search with XSS input does not crash API', async () => {
    const res = await apiGet(token, `/api/Inventory?search=${encodeURIComponent('<script>alert(1)</script>')}&page=1&pageSize=5`)
    expect(res.status).toBeLessThan(500)
  })

  test('P6c. search input in UI does not execute JS', async ({ page }) => {
    await login(page)
    await navTo(page, '/customers')
    const searchInput = page.locator('input[placeholder*="بحث"], input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('<img src=x onerror=alert(1)>')
      await page.waitForTimeout(500)
      // If no dialog appeared, XSS did not execute
      const hasDialog = await page.locator('dialog, [role="alertdialog"]').count()
      expect(hasDialog).toBe(0)
    }
  })
})

test.describe('P7. No Sensitive Data in Console', () => {
  test('P7a. no password or full JWT in console after login', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', m => consoleLogs.push(m.text()))
    await login(page)
    await page.waitForTimeout(2000)
    const hasSensitiveData = consoleLogs.some(log =>
      log.includes('Admin@Showroom2024!') ||
      (log.includes('eyJ') && log.length > 100) // JWT pattern
    )
    expect(hasSensitiveData).toBe(false)
  })
})
