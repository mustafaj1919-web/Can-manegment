/**
 * A5 installment receipt — print QA dataset suite.
 *
 * Drives all 8 named worst-case datasets (A-H, defined in
 * src/app/showroom/print-test-fixture/PrintTestFixtureClient.tsx) through a real
 * Chromium print-to-pdf pipeline and asserts:
 *   1. The generated PDF is exactly one A5-landscape page (no pagination overflow).
 *   2. The document root's scrollHeight never exceeds its fixed 148mm clientHeight while
 *      print media + `overflow: hidden` are active — (1) alone cannot catch content that
 *      is silently clipped rather than paginated, so this is the stricter of the two and
 *      the one that actually proves nothing got cut off.
 *
 * Reuses the same self-hosted dev-server pattern as receipt-print.spec.ts (own server,
 * ENABLE_PRINT_TEST_FIXTURE=true, never reachable in a normal deployment).
 */
import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'

const PORT = 3412
const BASE = `http://localhost:${PORT}`
const PDF_DIR = path.join(__dirname, '../results/artifacts')

const DATASET_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

let server: ChildProcess | null = null

function waitForServerReady(child: ChildProcess, timeoutMs = 60_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Dev server did not become ready in time')), timeoutMs)
    const onData = (chunk: Buffer) => {
      if (/Ready in|started server on/i.test(chunk.toString())) {
        clearTimeout(timer)
        child.stdout?.off('data', onData)
        resolve()
      }
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
  })
}

test.beforeAll(async () => {
  fs.mkdirSync(PDF_DIR, { recursive: true })
  server = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, ENABLE_PRINT_TEST_FIXTURE: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await waitForServerReady(server)
})

test.afterAll(async () => {
  if (server && server.pid) {
    try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
  }
})

async function printToPdf(page: import('@playwright/test').Page, fileName: string) {
  const pdfPath = path.join(PDF_DIR, fileName)
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    width: '210mm',
    height: '148mm',
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  })
  const text = fs.readFileSync(pdfPath).toString('latin1')
  const countMatch = text.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/)
  return countMatch ? Number(countMatch[1]) : null
}

for (const key of DATASET_KEYS) {
  test(`dataset ${key}: exactly one A5 page, no clipped content, receipt renders`, async ({ page }) => {
    await page.goto(`${BASE}/showroom/print-test-fixture?mode=single&dataset=${key}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    const receiptLocator = page.locator('[data-receipt-id]').first()
    await expect(receiptLocator).toBeAttached()

    const pageCount = await printToPdf(page, `dataset-${key}.pdf`)
    expect(pageCount, `dataset ${key} PDF page count`).toBe(1)

    await page.emulateMedia({ media: 'print' })
    await page.waitForTimeout(200)

    const overflow = await page.locator('#print-root .a5-document-root').evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(overflow.scrollHeight, `dataset ${key} vertical clip: scrollHeight ${overflow.scrollHeight} vs clientHeight ${overflow.clientHeight}`).toBeLessThanOrEqual(overflow.clientHeight)
    expect(overflow.scrollWidth, `dataset ${key} horizontal clip: scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`).toBeLessThanOrEqual(overflow.clientWidth)
  })
}
