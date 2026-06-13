'use client'

import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartPrintButtonProps {
  targetId: string
  label?: string
  className?: string
  variant?: 'button' | 'icon'
}

export function SmartPrintButton({ targetId, label = 'طباعة', className, variant = 'button' }: SmartPrintButtonProps) {
  function handlePrint() {
    const el = document.getElementById(targetId)
    if (!el) return

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>طباعة</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Segoe UI', sans-serif;
      direction: rtl;
      background: #fff;
      color: #111;
      padding: 24px;
      font-size: 13px;
      line-height: 1.6;
    }
    h1, h2, h3 { font-weight: 800; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: right; }
    th { background: #f9fafb; font-weight: 700; }
    .print-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; }
    .print-header h1 { font-size: 20px; }
    .print-header p { font-size: 11px; color: #555; margin-top: 4px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
    .row:last-child { border: 0; }
    .label { color: #555; font-size: 11px; }
    .value { font-weight: 700; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .badge-green  { background: #dcfce7; color: #166534; }
    .badge-red    { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef9c3; color: #713f12; }
    .badge-blue   { background: #dbeafe; color: #1d4ed8; }
    .total-row { font-weight: 900; font-size: 15px; background: #f9fafb; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
${el.innerHTML}
<script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`)
    win.document.close()
  }

  if (variant === 'icon') {
    return (
      <button onClick={handlePrint} title={label} className={cn('p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors', className)}>
        <Printer className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button onClick={handlePrint} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 text-[12px] font-bold hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground', className)}>
      <Printer className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
