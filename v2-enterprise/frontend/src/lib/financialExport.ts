/**
 * Generic multi-page retrieval helper for list-style APIs in the ERP.
 * Infrastructure concern only — does NOT compute accounting business formulas.
 */

export const MAX_EXPORT_ROWS = 5000

export interface FetchPageParams {
  page: number
  per_page: number
  [key: string]: any
}

export interface PaginatedExportConfig<T> {
  fetchPage: (params: FetchPageParams) => Promise<{ items: T[]; total: number }>
  baseParams?: Record<string, any>
  getId?: (item: T) => string | number
  maxRows?: number
  pageSize?: number
}

export interface PaginatedExportResult<T> {
  items: T[]
  totalMatching: number
  exportedCount: number
  truncated: boolean
  pagesFetched: number
}

export async function fetchPaginatedExportData<T>(
  config: PaginatedExportConfig<T>
): Promise<PaginatedExportResult<T>> {
  const maxRows = config.maxRows ?? MAX_EXPORT_ROWS
  const pageSize = config.pageSize ?? 200
  const baseParams = config.baseParams ?? {}
  const getId = config.getId ?? ((item: any) => item.id)

  const firstPageRes = await config.fetchPage({ ...baseParams, page: 1, per_page: pageSize })
  const totalMatching = firstPageRes?.total ?? 0
  const firstPageItems = firstPageRes?.items ?? []

  // Assertion: total > 0 but Page 1 items.length === 0 indicates an API/pagination mismatch
  if (totalMatching > 0 && firstPageItems.length === 0) {
    throw new Error('فشل جلب بيانات التصدير: الاستجابة غير متوافقة مع إجمالي السجلات')
  }

  if (totalMatching === 0 && firstPageItems.length === 0) {
    return { items: [], totalMatching: 0, exportedCount: 0, truncated: false, pagesFetched: 1 }
  }

  const targetCount = Math.min(totalMatching > 0 ? totalMatching : firstPageItems.length, maxRows)
  const collectedItems: T[] = []
  const seenIds = new Set<string | number>()
  let pagesFetched = 0

  function appendUnique(items: T[]): number {
    let added = 0
    for (const item of items) {
      const id = getId(item)
      if (id === null || id === undefined) {
        throw new Error('Export pagination requires a stable unique identifier')
      }
      if (!seenIds.has(id)) {
        seenIds.add(id)
        collectedItems.push(item)
        added++
        if (collectedItems.length >= targetCount) break
      }
    }
    return added
  }

  // Deduplicate Page 1
  pagesFetched++
  appendUnique(firstPageItems)

  const maxPagesNeeded = Math.ceil(targetCount / pageSize)

  if (maxPagesNeeded > 1 && collectedItems.length < targetCount) {
    for (let p = 2; p <= maxPagesNeeded; p++) {
      pagesFetched++
      const res = await config.fetchPage({ ...baseParams, page: p, per_page: pageSize })
      if (!res?.items || res.items.length === 0) break

      const added = appendUnique(res.items)
      if (added === 0 || collectedItems.length >= targetCount) break
    }
  }

  const exportedItems = collectedItems.slice(0, maxRows)
  const truncated = totalMatching > maxRows

  return {
    items: exportedItems,
    totalMatching,
    exportedCount: exportedItems.length,
    truncated,
    pagesFetched,
  }
}
