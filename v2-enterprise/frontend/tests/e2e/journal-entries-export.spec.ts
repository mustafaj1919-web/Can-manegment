import { test, expect } from '@playwright/test'
import { login, navTo, apiGet } from './helpers'
import { normalizeFilename } from '../../src/lib/export'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Batch 1 Financial Excel Export Physical Download Suite', () => {

  test('Unit Test: normalizeFilename helper', () => {
    expect(normalizeFilename('journal-entries')).toBe('journal-entries.xlsx')
    expect(normalizeFilename('journal-entries.xlsx')).toBe('journal-entries.xlsx')
    expect(normalizeFilename(' journal-entries.xlsx ')).toBe('journal-entries.xlsx')
    expect(normalizeFilename('')).toBe('export.xlsx')
    expect(normalizeFilename(undefined)).toBe('export.xlsx')
  })

  test('1. Physical Download: Export Excel on /journal-entries', async ({ page }) => {
    await login(page)
    await navTo(page, '/journal-entries')

    const exportBtn = page.getByRole('button', { name: /تصدير Excel/i })
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()
    
    expect(suggestedFilename.endsWith('.xlsx'), `Filename ${suggestedFilename} must end with .xlsx`).toBe(true)
    expect(suggestedFilename.endsWith('.xlsx.xlsx')).toBe(false)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-je-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    // Check OOXML PK Zip magic bytes
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
    expect(buffer[2]).toBe(0x03)
    expect(buffer[3]).toBe(0x04)

    fs.unlinkSync(tempPath)
  })

  test('2. Physical Download: Export Excel on /general-ledger', async ({ page }) => {
    await login(page)
    await navTo(page, '/general-ledger')

    const exportBtn = page.getByRole('button', { name: /تصدير Excel/i })
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)
    expect(suggestedFilename.endsWith('.xlsx.xlsx')).toBe(false)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-gl-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('3. Physical Download: Export Excel on /trial-balance', async ({ page }) => {
    await login(page)
    await navTo(page, '/trial-balance')

    const exportBtn = page.getByRole('button', { name: /تصدير Excel/i })
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()
    console.log('[TrialBalance Download Suggested Filename]:', suggestedFilename)

    expect(suggestedFilename.endsWith('.xlsx'), `Expected .xlsx extension but got ${suggestedFilename}`).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-tb-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('4. Physical Download: Export Excel on /chart-of-accounts', async ({ page }) => {
    await login(page)
    await navTo(page, '/chart-of-accounts')

    const exportBtn = page.getByRole('button', { name: /تصدير Excel/i })
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-coa-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('5. Physical Download: Export Excel on /reports/profit-loss', async ({ page }) => {
    await login(page)
    await navTo(page, '/reports/profit-loss')

    const exportBtn = page.getByRole('button', { name: /تصدير/i }).first()
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-pl-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('6. Physical Download: Export Excel on /reports/balance-sheet', async ({ page }) => {
    await login(page)
    await navTo(page, '/reports/balance-sheet')

    const exportBtn = page.getByRole('button', { name: /تصدير/i }).first()
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-bs-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('7. Physical Download: Export Excel on /reports/cashbox-movement', async ({ page }) => {
    await login(page)
    await navTo(page, '/reports/cashbox-movement')

    const exportBtn = page.getByRole('button', { name: /تصدير/i }).first()
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-cb-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('8. Physical Download: Export Excel on /reports/bank-movement', async ({ page }) => {
    await login(page)
    await navTo(page, '/reports/bank-movement')

    const exportBtn = page.getByRole('button', { name: /تصدير/i }).first()
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-bm-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('9. Physical Download: Export Excel on /customers/[id]/statement', async ({ page }) => {
    const { token } = await login(page)
    const { body } = await apiGet(token!, '/api/Customers')
    const items = Array.isArray(body?.data) ? body.data : (body?.data?.items || body?.items || [])
    const realId = items[0]?.id || items[0]?.Id || '1'

    await navTo(page, `/customers/${realId}/statement`)

    const exportBtn = page.locator('button:has-text("تصدير Excel")').first()
    await expect(exportBtn).toBeVisible({ timeout: 15_000 })
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)
    expect(suggestedFilename.startsWith('customer-statement-')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-cs-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('10. Physical Download: Export Excel on /suppliers/[id]/ledger', async ({ page }) => {
    const { token } = await login(page)
    const { body } = await apiGet(token!, '/api/Suppliers')
    const items = Array.isArray(body?.data) ? body.data : (body?.data?.items || body?.items || [])
    const realId = items[0]?.id || items[0]?.Id || '1'

    await navTo(page, `/suppliers/${realId}/ledger`)

    const exportBtn = page.locator('button:has-text("تصدير Excel")').first()
    await expect(exportBtn).toBeVisible({ timeout: 15_000 })
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)
    expect(suggestedFilename.startsWith('supplier-ledger-')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-sl-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('11. Physical Download: Export Excel on /installments', async ({ page }) => {
    await login(page)
    await navTo(page, '/installments')

    const exportBtn = page.locator('button:has-text("تصدير Excel")').first()
    await expect(exportBtn).toBeVisible({ timeout: 15_000 })
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)
    expect(suggestedFilename.startsWith('installments-list-')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-inst-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('12. Physical Download: Export Excel on /reports/ar-aging', async ({ page }) => {
    await login(page)
    await navTo(page, '/reports/ar-aging')

    const exportBtn = page.locator('button:has-text("تصدير Excel")').first()
    await expect(exportBtn).toBeVisible({ timeout: 15_000 })
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)
    expect(suggestedFilename.startsWith('ar-aging-report-')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-arag-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

  test('13. Physical Download: Export Excel on /reports/installment-aging', async ({ page }) => {
    await login(page)
    await navTo(page, '/reports/installment-aging')

    const exportBtn = page.locator('button:has-text("تصدير Excel")').first()
    await expect(exportBtn).toBeVisible({ timeout: 15_000 })
    await expect(exportBtn).toBeEnabled({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await exportBtn.click()

    const download = await downloadPromise
    const suggestedFilename = download.suggestedFilename()

    expect(suggestedFilename.endsWith('.xlsx')).toBe(true)
    expect(suggestedFilename.startsWith('installment-aging-report-')).toBe(true)

    const tempPath = path.join(process.cwd(), 'tests', 'results', `test-instag-${Date.now()}.xlsx`)
    await download.saveAs(tempPath)

    expect(fs.existsSync(tempPath)).toBe(true)
    const buffer = fs.readFileSync(tempPath)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)

    fs.unlinkSync(tempPath)
  })

})
