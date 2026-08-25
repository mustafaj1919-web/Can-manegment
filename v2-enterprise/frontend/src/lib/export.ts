/**
 * Client-side export utilities for CSV and Excel.
 * Only write operations — no file parsing.
 */

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports data as a UTF-8 CSV file.
 * Prefixes a BOM so Arabic text renders correctly when opened directly in Excel.
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escape = (cell: string | number): string => {
    const s = String(cell)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  triggerDownload(blob, `${filename}.csv`)
}

export function normalizeFilename(filename?: string): string {
  let name = (filename || '').trim()
  if (!name) return 'export.xlsx'
  if (name.toLowerCase().endsWith('.xlsx')) return name
  return `${name}.xlsx`
}

/**
 * Exports data as a proper .xlsx file using write-excel-file.
 * The library is dynamically imported so it is not included in the initial bundle.
 */
export async function exportXlsx(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | Date | null | undefined)[][]
): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  
  const normalizedFilename = normalizeFilename(filename)
  
  const sheetData = [
    headers.map((h) => ({ value: h, fontWeight: 'bold' as const, type: String })),
    ...rows.map((row) =>
      row.map((cell) => {
        let val: any = cell
        if (val === null || val === undefined) {
          val = ''
        }
        
        let type: any = String
        if (typeof val === 'number') {
          type = Number
        } else if (typeof val === 'boolean') {
          type = Boolean
        } else if (val instanceof Date) {
          type = Date
        } else {
          let strVal = String(val)
          if (/^[=+\-@]/.test(strVal)) {
            strVal = `'` + strVal
          }
          val = strVal
        }
        
        return { value: val, type }
      })
    ),
  ]
  
  const writer = writeXlsxFile(sheetData, { rightToLeft: true })
  if (!writer || typeof writer.toFile !== 'function') {
    throw new Error('فشل إنشاء ملف Excel: لم يتم التعرف على واجهة الكتابة (writeXlsxFile)')
  }
  
  await writer.toFile(normalizedFilename)
}
