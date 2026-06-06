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

/**
 * Exports data as a proper .xlsx file using write-excel-file.
 * The library is dynamically imported so it is not included in the initial bundle.
 */
export async function exportXlsx(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const sheetData = [
    headers.map((h) => ({ value: h, fontWeight: 'bold' as const })),
    ...rows.map((row) => row.map((cell) => ({ value: cell }))),
  ]
  // write-excel-file uses wrapper types (String, Number) but accepts primitives at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (writeXlsxFile as any)(sheetData, { fileName: `${filename}.xlsx` })
}
