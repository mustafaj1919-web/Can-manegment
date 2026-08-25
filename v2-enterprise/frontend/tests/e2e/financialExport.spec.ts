import { test, expect } from '@playwright/test'
import { fetchPaginatedExportData } from '../../src/lib/financialExport'

test.describe('financialExport.ts Infrastructure Helper Unit Tests', () => {

  test('1. Deduplicates duplicate IDs inside Page 1', async () => {
    const mockItems = [
      { id: '1', val: 'a' },
      { id: '1', val: 'a-dup' },
      { id: '2', val: 'b' },
    ]

    const result = await fetchPaginatedExportData({
      fetchPage: async () => ({ items: mockItems, total: 3 }),
      pageSize: 10,
    })

    expect(result.items.length).toBe(2)
    expect(result.items.map(i => i.id)).toEqual(['1', '2'])
  })

  test('2. Deduplicates duplicate IDs across Pages 2+', async () => {
    const page1 = [{ id: '1' }, { id: '2' }]
    const page2 = [{ id: '2' }, { id: '3' }]

    const result = await fetchPaginatedExportData({
      fetchPage: async ({ page }) => {
        if (page === 1) return { items: page1, total: 3 }
        return { items: page2, total: 3 }
      },
      pageSize: 2,
    })

    expect(result.items.length).toBe(3)
    expect(result.items.map(i => i.id)).toEqual(['1', '2', '3'])
    expect(result.pagesFetched).toBe(2)
  })

  test('3. Missing/undefined ID throws safe assertion error', async () => {
    const badItems = [{ id: undefined, val: 'no-id' }]

    await expect(
      fetchPaginatedExportData({
        fetchPage: async () => ({ items: badItems as any, total: 1 }),
      })
    ).rejects.toThrow('Export pagination requires a stable unique identifier')
  })

  test('4. Total > 0 but Page 1 empty throws error', async () => {
    await expect(
      fetchPaginatedExportData({
        fetchPage: async () => ({ items: [], total: 100 }),
      })
    ).rejects.toThrow('فشل جلب بيانات التصدير')
  })

  test('5. Stops when target count is reached', async () => {
    const page1 = [{ id: '1' }, { id: '2' }]
    const page2 = [{ id: '3' }, { id: '4' }]

    const result = await fetchPaginatedExportData({
      fetchPage: async ({ page }) => {
        if (page === 1) return { items: page1, total: 3 }
        return { items: page2, total: 3 }
      },
      maxRows: 3,
      pageSize: 2,
    })

    expect(result.items.length).toBe(3)
    expect(result.exportedCount).toBe(3)
  })

  test('6. Safe stop when page returns no new IDs', async () => {
    const page1 = [{ id: '1' }, { id: '2' }]
    const page2 = [{ id: '1' }, { id: '2' }] // same IDs again

    const result = await fetchPaginatedExportData({
      fetchPage: async ({ page }) => {
        if (page === 1) return { items: page1, total: 10 }
        return { items: page2, total: 10 }
      },
      pageSize: 2,
    })

    expect(result.items.length).toBe(2)
    expect(result.pagesFetched).toBe(2)
  })

  test('7. Exact 5000 does not mark truncated', async () => {
    const mockItems = Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1) }))
    const result = await fetchPaginatedExportData({
      fetchPage: async () => ({ items: mockItems, total: 10 }),
      maxRows: 10,
    })

    expect(result.truncated).toBe(false)
  })

  test('8. 5001 marks truncated', async () => {
    const mockItems = Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1) }))
    const result = await fetchPaginatedExportData({
      fetchPage: async () => ({ items: mockItems, total: 11 }),
      maxRows: 10,
    })

    expect(result.truncated).toBe(true)
  })

  test('9. Caller-specific pageSize is preserved', async () => {
    let capturedPageSize = 0
    await fetchPaginatedExportData({
      fetchPage: async ({ per_page }) => {
        capturedPageSize = per_page
        return { items: [{ id: '1' }], total: 1 }
      },
      pageSize: 50,
    })

    expect(capturedPageSize).toBe(50)
  })

  test('10. Base filters forwarded unchanged', async () => {
    let capturedParams: any = null
    await fetchPaginatedExportData({
      fetchPage: async (params) => {
        capturedParams = params
        return { items: [{ id: '1' }], total: 1 }
      },
      baseParams: { account_code: '111001', search: 'cash' },
    })

    expect(capturedParams.account_code).toBe('111001')
    expect(capturedParams.search).toBe('cash')
  })

})
