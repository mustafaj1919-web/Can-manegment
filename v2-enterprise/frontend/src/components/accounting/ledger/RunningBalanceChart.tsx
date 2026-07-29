'use client'

import { useMemo, useState } from 'react'
import { formatNumber, formatDate } from '@/lib/utils'

interface LedgerEntry {
  date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  running_balance: number
  reference_type: string
  currency: 'USD' | 'IQD'
}

interface Props {
  entries: LedgerEntry[]
  currency: 'USD' | 'IQD'
}

export function RunningBalanceChart({ entries, currency }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null)

  const chartData = useMemo(() => {
    return [...entries]
      .filter(e => e.currency === currency)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [entries, currency])

  const { pointsList, areaPoints, minVal, maxVal, gridY } = useMemo(() => {
    if (chartData.length === 0) {
      return { pointsList: [], areaPoints: '', minVal: 0, maxVal: 0, gridY: [] }
    }

    const balances = chartData.map(d => d.running_balance)
    let max = Math.max(...balances)
    let min = Math.min(...balances)

    if (max === min) {
      max += 1000
      min -= 1000
    }

    const range = max - min
    const width = 600
    const height = 180
    const padding = 20

    const list = chartData.map((d, index) => {
      const x = padding + (index / Math.max(1, chartData.length - 1)) * (width - padding * 2)
      const y = padding + (1 - (d.running_balance - min) / range) * (height - padding * 2)
      return { x, y, val: d.running_balance, entry: d }
    })

    const pointsStr = list.map(p => `${p.x},${p.y}`).join(' ')
    
    let areaPointsStr = ''
    if (list.length > 0) {
      const firstX = list[0].x
      const lastX = list[list.length - 1].x
      const bottomY = height - padding
      areaPointsStr = `${firstX},${bottomY} ${pointsStr} ${lastX},${bottomY}`
    }

    const gridYValues = [min, min + range * 0.5, max]

    return {
      pointsList: list,
      areaPoints: areaPointsStr,
      minVal: min,
      maxVal: max,
      gridY: gridYValues.map((v) => ({
        val: v,
        y: padding + (1 - (v - min) / range) * (height - padding * 2),
      })),
    }
  }, [chartData])

  if (chartData.length < 2) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] min-h-[260px] flex items-center justify-center text-xs text-[#64748B] font-medium no-print">
        تحتاج إلى حركتين على الأقل بالـ {currency === 'USD' ? 'دولار' : 'دينار'} لعرض المخطط البياني.
      </div>
    )
  }

  const isUSD = currency === 'USD'
  const symbol = isUSD ? '$' : 'د.ع'

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[22px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col gap-4 relative no-print">
      
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-[#0F172A] leading-tight">منحنى حركة الرصيد</h2>
          <p className="text-[13px] font-medium text-[#64748B] mt-1">تتبع التطور التاريخي لالتزامات المورد بالـ {isUSD ? 'دولار الأمريكي (USD)' : 'دينار العراقي (IQD)'}</p>
        </div>
        <div className="text-left">
          <p className="text-[13px] font-medium text-[#64748B]">الرصيد الجاري الحالي</p>
          <div className="flex items-baseline gap-1 justify-end mt-0.5" dir="rtl">
            <span className="font-numeric text-lg font-extrabold text-[#0F172A] tabular-nums">
              {formatNumber(Math.abs(chartData[chartData.length - 1].running_balance))}
            </span>
            <span className="text-xs font-bold text-slate-400 self-end mb-0.5">
              {symbol}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[190px] dir-ltr mt-2">
        <svg 
          className="w-full h-full overflow-visible" 
          viewBox="0 0 600 180" 
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Grid lines */}
          {gridY.map((g, i) => (
            <g key={i}>
              <line 
                x1="20" 
                y1={g.y} 
                x2="580" 
                y2={g.y} 
                className="stroke-slate-100" 
                strokeWidth="1.5" 
                strokeDasharray="4 4"
              />
              <text 
                x="20" 
                y={g.y - 6} 
                className="fill-[#94A3B8] font-numeric text-[10px] font-semibold"
                textAnchor="start"
              >
                {formatNumber(g.val)} {symbol}
              </text>
            </g>
          ))}

          {/* Area under the line */}
          <polygon
            points={areaPoints}
            className="fill-blue-50/20"
          />

          {/* Sparkline Line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            points={pointsList.map(p => `${p.x},${p.y}`).join(' ')}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* First & Last indicator dots */}
          {pointsList.map((p, idx) => {
            const isHovered = hoveredPoint?.entry?.entry_number === p.entry.entry_number
            if (idx === 0 || idx === pointsList.length - 1 || isHovered) {
              return (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? '6' : '4'}
                  className={`${isHovered ? 'fill-blue-600 stroke-blue-100' : 'fill-white stroke-blue-600'}`}
                  strokeWidth={isHovered ? '4' : '2'}
                />
              )
            }
            return null
          })}

          {/* Hover interactive bars */}
          {pointsList.map((p, idx) => {
            const barWidth = 600 / pointsList.length
            return (
              <rect
                key={idx}
                x={p.x - barWidth / 2}
                y="0"
                width={barWidth}
                height="180"
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredPoint(p)}
              />
            )
          })}
        </svg>

        {/* Hover Tooltip Overlay (RTL display) */}
        {hoveredPoint && (
          <div 
            className="absolute z-30 bg-[#0F172A] text-white border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-2 pointer-events-none text-right text-xs"
            style={{
              left: `${Math.min(80, (hoveredPoint.x / 600) * 100)}%`,
              top: `${Math.min(60, (hoveredPoint.y / 180) * 100)}%`,
              transform: 'translate(-50%, -105%)',
            }}
          >
            <p className="font-bold text-slate-300 font-numeric">{formatDate(hoveredPoint.entry.date)}</p>
            <div className="space-y-1">
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">البيان:</span>
                <span className="font-semibold text-slate-100">{hoveredPoint.entry.description}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">رقم الحركة:</span>
                <span className="font-mono text-slate-100">{hoveredPoint.entry.entry_number}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">مدين (سداد):</span>
                <span className="font-numeric text-emerald-400 font-bold">
                  {hoveredPoint.entry.debit > 0 ? `${formatNumber(hoveredPoint.entry.debit)} ${symbol}` : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">دائن (شراء):</span>
                <span className="font-numeric text-rose-400 font-bold">
                  {hoveredPoint.entry.credit > 0 ? `${formatNumber(hoveredPoint.entry.credit)} ${symbol}` : '—'}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1.5 flex justify-between gap-6">
                <span className="text-slate-400">الرصيد بعد الحركة:</span>
                <span className="font-numeric text-blue-400 font-bold">
                  {formatNumber(hoveredPoint.entry.running_balance)} {symbol}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#94A3B8] font-medium">
        <span>{formatDate(chartData[0].date)}</span>
        <span>مسار الرصيد المتسلسل ({chartData.length} حركة بالـ {currency})</span>
        <span>{formatDate(chartData[chartData.length - 1].date)}</span>
      </div>
    </div>
  )
}
