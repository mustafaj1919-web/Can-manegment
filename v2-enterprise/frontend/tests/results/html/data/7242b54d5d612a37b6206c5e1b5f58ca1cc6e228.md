# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: receipt-print-qa-datasets.spec.ts >> dataset B: exactly one A5 page, no clipped content, receipt renders
- Location: tests/e2e/receipt-print-qa-datasets.spec.ts:75:7

# Error details

```
TimeoutError: page.goto: Timeout 20000ms exceeded.
Call log:
  - navigating to "http://localhost:3412/showroom/print-test-fixture?mode=single&dataset=B", waiting until "networkidle"

```

# Test source

```ts
  1  | /**
  2  |  * A5 installment receipt — print QA dataset suite.
  3  |  *
  4  |  * Drives all 8 named worst-case datasets (A-H, defined in
  5  |  * src/app/showroom/print-test-fixture/PrintTestFixtureClient.tsx) through a real
  6  |  * Chromium print-to-pdf pipeline and asserts:
  7  |  *   1. The generated PDF is exactly one A5-landscape page (no pagination overflow).
  8  |  *   2. The document root's scrollHeight never exceeds its fixed 148mm clientHeight while
  9  |  *      print media + `overflow: hidden` are active — (1) alone cannot catch content that
  10 |  *      is silently clipped rather than paginated, so this is the stricter of the two and
  11 |  *      the one that actually proves nothing got cut off.
  12 |  *
  13 |  * Reuses the same self-hosted dev-server pattern as receipt-print.spec.ts (own server,
  14 |  * ENABLE_PRINT_TEST_FIXTURE=true, never reachable in a normal deployment).
  15 |  */
  16 | import { test, expect } from '@playwright/test'
  17 | import fs from 'fs'
  18 | import path from 'path'
  19 | import { spawn, type ChildProcess } from 'child_process'
  20 | 
  21 | const PORT = 3412
  22 | const BASE = `http://localhost:${PORT}`
  23 | const PDF_DIR = path.join(__dirname, '../results/artifacts')
  24 | 
  25 | const DATASET_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const
  26 | 
  27 | let server: ChildProcess | null = null
  28 | 
  29 | function waitForServerReady(child: ChildProcess, timeoutMs = 60_000): Promise<void> {
  30 |   return new Promise((resolve, reject) => {
  31 |     const timer = setTimeout(() => reject(new Error('Dev server did not become ready in time')), timeoutMs)
  32 |     const onData = (chunk: Buffer) => {
  33 |       if (/Ready in|started server on/i.test(chunk.toString())) {
  34 |         clearTimeout(timer)
  35 |         child.stdout?.off('data', onData)
  36 |         resolve()
  37 |       }
  38 |     }
  39 |     child.stdout?.on('data', onData)
  40 |     child.stderr?.on('data', onData)
  41 |   })
  42 | }
  43 | 
  44 | test.beforeAll(async () => {
  45 |   fs.mkdirSync(PDF_DIR, { recursive: true })
  46 |   server = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
  47 |     cwd: path.join(__dirname, '../..'),
  48 |     env: { ...process.env, ENABLE_PRINT_TEST_FIXTURE: 'true' },
  49 |     stdio: ['ignore', 'pipe', 'pipe'],
  50 |   })
  51 |   await waitForServerReady(server)
  52 | })
  53 | 
  54 | test.afterAll(async () => {
  55 |   if (server && server.pid) {
  56 |     try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
  57 |   }
  58 | })
  59 | 
  60 | async function printToPdf(page: import('@playwright/test').Page, fileName: string) {
  61 |   const pdfPath = path.join(PDF_DIR, fileName)
  62 |   await page.pdf({
  63 |     path: pdfPath,
  64 |     printBackground: true,
  65 |     width: '210mm',
  66 |     height: '148mm',
  67 |     margin: { top: 0, bottom: 0, left: 0, right: 0 },
  68 |   })
  69 |   const text = fs.readFileSync(pdfPath).toString('latin1')
  70 |   const countMatch = text.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/)
  71 |   return countMatch ? Number(countMatch[1]) : null
  72 | }
  73 | 
  74 | for (const key of DATASET_KEYS) {
  75 |   test(`dataset ${key}: exactly one A5 page, no clipped content, receipt renders`, async ({ page }) => {
> 76 |     await page.goto(`${BASE}/showroom/print-test-fixture?mode=single&dataset=${key}`, { waitUntil: 'networkidle' })
     |                ^ TimeoutError: page.goto: Timeout 20000ms exceeded.
  77 |     await page.waitForTimeout(300)
  78 | 
  79 |     const receiptLocator = page.locator('[data-receipt-id]').first()
  80 |     await expect(receiptLocator).toBeAttached()
  81 | 
  82 |     const pageCount = await printToPdf(page, `dataset-${key}.pdf`)
  83 |     expect(pageCount, `dataset ${key} PDF page count`).toBe(1)
  84 | 
  85 |     await page.emulateMedia({ media: 'print' })
  86 |     await page.waitForTimeout(200)
  87 | 
  88 |     const overflow = await page.locator('#print-root .a5-document-root').evaluate((el) => ({
  89 |       scrollHeight: el.scrollHeight,
  90 |       clientHeight: el.clientHeight,
  91 |       scrollWidth: el.scrollWidth,
  92 |       clientWidth: el.clientWidth,
  93 |     }))
  94 |     expect(overflow.scrollHeight, `dataset ${key} vertical clip: scrollHeight ${overflow.scrollHeight} vs clientHeight ${overflow.clientHeight}`).toBeLessThanOrEqual(overflow.clientHeight)
  95 |     expect(overflow.scrollWidth, `dataset ${key} horizontal clip: scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`).toBeLessThanOrEqual(overflow.clientWidth)
  96 |   })
  97 | }
  98 | 
```