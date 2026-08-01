import { test, expect } from '@playwright/test'
import { login, navTo } from './helpers'
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

})
