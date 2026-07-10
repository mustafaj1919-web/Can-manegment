import { Page, expect } from '@playwright/test'

export const BASE = 'http://localhost:3000'
export const API  = 'http://localhost:8080'
export const ADMIN = { username: 'admin', password: 'Admin@Showroom2024!' }

/** Login and wait for dashboard */
export async function login(page: Page, creds = ADMIN) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="text"], input[name="username"]', creds.username)
  await page.fill('input[type="password"]', creds.password)
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/Auth/login')),
    page.click('button[type="submit"]'),
  ])
  const body = await response.json().catch(() => ({}))
  return { status: response.status(), token: body?.token, user: body?.user }
}

/** Navigate and wait for networkidle, return console errors collected during load */
export async function navTo(page: Page, path: string) {
  const errors: string[] = []
  const failed: string[] = []
  const handler = (msg: any) => { if (msg.type() === 'error') errors.push(msg.text()) }
  const failedHandler = (r: any) => {
    if (r.url().includes('/api/') && r.status() >= 400)
      failed.push(`${r.status()} ${new URL(r.url()).pathname}`)
  }
  page.on('console', handler)
  page.on('response', failedHandler)
  await page.goto(path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  page.off('console', handler)
  page.off('response', failedHandler)
  return { errors, failed }
}

/** Call API directly with token */
export async function apiGet(token: string, path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

export async function apiPost(token: string, path: string, data: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

/** Collect all API calls during a page action */
export function collectApiCalls(page: Page) {
  const calls: { status: number; method: string; path: string }[] = []
  page.on('response', r => {
    if (r.url().includes('/api/'))
      calls.push({ status: r.status(), method: r.request().method(), path: new URL(r.url()).pathname })
  })
  return calls
}
