/**
 * Receipt print-isolation regression suite.
 *
 * Exercises the fix for the "prints 5 pages / prints the modal / prints the workflow
 * stepper" bug: InstallmentReceiptA5Document portals itself into a dedicated #print-root
 * node, and a global print stylesheet removes every other direct child of <body> so
 * nothing else can ever reach the printer, regardless of what modal/stepper/background
 * content the receipt happens to be mounted inside.
 *
 * Runs against a test-only fixture route (src/app/showroom/print-test-fixture) that
 * reproduces the real bug shape (Dialog + fake stepper + a long underlying page). That
 * route 404s unless ENABLE_PRINT_TEST_FIXTURE=true is set on the server process, so it
 * is never reachable in a normal deployment — see beforeAll below for how this suite
 * starts its own server with that flag set.
 */
import { test, expect, type ConsoleMessage } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { spawn, type ChildProcess } from 'child_process'

const PORT = 3411
const BASE = `http://localhost:${PORT}`
const PDF_DIR = path.join(__dirname, '../results/artifacts')

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
    // Kill the whole process group so Next's spawned child processes die too.
    try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
  }
})

/** Real Chromium print-to-pdf pipeline, sized to exactly match the receipt's own
 *  `@page { size: A5 landscape }` rule — this is what a print dialog that honors
 *  @page would default to, and lets us assert an exact page count. */
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
  const mediaBoxMatch = text.match(/\/MediaBox\s*\[([^\]]+)\]/)
  return {
    pageCount: countMatch ? Number(countMatch[1]) : null,
    mediaBox: mediaBoxMatch ? mediaBoxMatch[1].trim() : null,
  }
}

test.describe('Receipt print isolation', () => {
  test('no React hydration warnings on the fixture route', async ({ page }) => {
    const consoleMessages: string[] = []
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' || msg.type() === 'warning') consoleMessages.push(msg.text())
    })

    await page.goto(`${BASE}/showroom/print-test-fixture?mode=single`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const hydrationIssues = consoleMessages.filter((m) => /hydrat/i.test(m))
    expect(hydrationIssues, `Console messages: ${JSON.stringify(consoleMessages)}`).toEqual([])
  })

  test('#print-root is hidden on screen and has no visible box', async ({ page }) => {
    await page.goto(`${BASE}/showroom/print-test-fixture?mode=single`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    const display = await page.evaluate(() => getComputedStyle(document.getElementById('print-root')!).display)
    expect(display).toBe('none')
  })

  test('single receipt: exactly one A5 page, no workflow/modal/stepper leakage, receipt number present', async ({ page }) => {
    await page.goto(`${BASE}/showroom/print-test-fixture?mode=single`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    // Sanity: the markers really are present on screen (proves the test would fail
    // honestly if isolation broke, rather than trivially passing because the
    // fixture never rendered them in the first place).
    const screenText = await page.locator('body').innerText()
    expect(screenText).toContain('WORKFLOW_HEADER_MARKER_TEXT')
    expect(screenText).toContain('STEPPER_MARKER_TEXT')
    expect(screenText).toContain('BACKGROUND_MARKER_TEXT')

    const { pageCount, mediaBox } = await printToPdf(page, 'single-mode.pdf')
    expect(pageCount).toBe(1)
    expect(mediaBox).toBeTruthy()

    await page.emulateMedia({ media: 'print' })
    await page.waitForTimeout(200)
    const printRootText = await page.locator('#print-root').innerText()

    expect(printRootText).not.toContain('WORKFLOW_HEADER_MARKER_TEXT')
    expect(printRootText).not.toContain('STEPPER_MARKER_TEXT')
    expect(printRootText).not.toContain('BACKGROUND_MARKER_TEXT')
    expect(printRootText).toContain('RCPT-TEST-AAA111')

    const receiptIdAttr = await page.locator('#print-root [data-receipt-id]').getAttribute('data-receipt-id')
    expect(receiptIdAttr).toBe('RCPT-TEST-AAA111')
  })

  test('two receipts mounted simultaneously: only the most-recently-mounted one prints', async ({ page }) => {
    await page.goto(`${BASE}/showroom/print-test-fixture?mode=dual`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    // Both instances are genuinely mounted on screen.
    const screenText = await page.locator('body').innerText()
    expect(screenText).toContain('RCPT-TEST-AAA111')
    expect(screenText).toContain('RCPT-TEST-BBB222')

    const { pageCount } = await printToPdf(page, 'dual-mode.pdf')
    expect(pageCount).toBe(1)

    await page.emulateMedia({ media: 'print' })
    await page.waitForTimeout(200)

    const printRootChildCount = await page.locator('#print-root').evaluate((el) => el.children.length)
    expect(printRootChildCount).toBe(1)

    const printRootText = await page.locator('#print-root').innerText()
    expect(printRootText).toContain('RCPT-TEST-BBB222')
    expect(printRootText).not.toContain('RCPT-TEST-AAA111')
  })

  test('print-root is emptied after the owning receipt unmounts', async ({ page }) => {
    await page.goto(`${BASE}/showroom/print-test-fixture?mode=single`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    const beforeCount = await page.locator('#print-root').evaluate((el) => el.children.length)
    expect(beforeCount).toBe(1)

    // The fixture's fake Dialog overlay visually sits on top of this control by design
    // (it's a test-only affordance, not real UI), so a real positional mouse click would
    // land on the overlay instead — even with force:true, since force only skips
    // Playwright's actionability checks, not the browser's own hit-testing. Invoking the
    // DOM click() method directly targets the element itself and fires its React handler.
    await page.$eval('[data-testid="unmount-receipt-toggle"]', (el) => (el as HTMLElement).click())
    await page.waitForTimeout(200)

    const afterCount = await page.locator('#print-root').evaluate((el) => el.children.length)
    expect(afterCount).toBe(0)
  })

  test('fixture route is gated behind ENABLE_PRINT_TEST_FIXTURE (production safety)', () => {
    // This suite's own server always sets the flag (see beforeAll), so a live request
    // would need a second, unflagged server to prove the 404 — too costly to spin up
    // per run. Instead assert the gate itself is present in source: this fails loudly
    // if someone ever removes the notFound() check and lets the fixture ship for real.
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/app/showroom/print-test-fixture/page.tsx'),
      'utf-8'
    )
    expect(source).toContain("process.env.ENABLE_PRINT_TEST_FIXTURE")
    expect(source).toContain('notFound()')
  })
})
