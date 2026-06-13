'use client'

import { useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import type { ReportRow } from '@/lib/api/reports'

interface ProfitLossChartProps {
  sales: ReportRow[]
  purchases: ReportRow[]
}

export default function ProfitLossChart({ sales, purchases }: ProfitLossChartProps) {
  const timeline = useMemo(() => {
    const map: Record<string, { sales: number; purchases: number }> = {}
    
    sales.forEach(s => {
      if (!s.date) return
      const d = s.date.slice(0, 10)
      if (!map[d]) map[d] = { sales: 0, purchases: 0 }
      map[d].sales += s.total_iqd ?? 0
    })

    purchases.forEach(p => {
      if (!p.date) return
      const d = p.date.slice(0, 10)
      if (!map[d]) map[d] = { sales: 0, purchases: 0 }
      map[d].purchases += p.total_iqd ?? 0
    })

    const sortedDates = Object.keys(map).sort()
    
    if (sortedDates.length <= 8) {
      return sortedDates.map(date => ({ date, ...map[date] }))
    }

    const size = sortedDates.length
    const step = Math.ceil(size / 8)
    const result = []
    for (let i = 0; i < size; i += step) {
      const datesSlice = sortedDates.slice(i, i + step)
      let sSum = 0
      let pSum = 0
      datesSlice.forEach(d => {
        sSum += map[d].sales
        pSum += map[d].purchases
      })
      result.push({
        date: datesSlice[0],
        sales: sSum,
        purchases: pSum,
      })
    }
    return result
  }, [sales, purchases])

  const chartPoints = useMemo(() => {
    if (timeline.length === 0) return { salesPath: '', purchasesPath: '', points: [] }

    const maxVal = Math.max(
      1000,
      ...timeline.map(t => Math.max(t.sales, t.purchases))
    )

    const width = 500
    const height = 180
    const pad = 20

    const points = timeline.map((t, idx) => {
      const x = pad + (idx * (width - pad * 2)) / Math.max(1, timeline.length - 1)
      const ySales = height - pad - (t.sales / maxVal) * (height - pad * 2)
      const yPurchases = height - pad - (t.purchases / maxVal) * (height - pad * 2)
      return { x, ySales, yPurchases, date: t.date }
    })

    const salesPath = points.map(p => `${p.x},${p.ySales}`).join(' ')
    const purchasesPath = points.map(p => `${p.x},${p.yPurchases}`).join(' ')

    return {
      salesPath,
      purchasesPath,
      points,
    }
  }, [timeline])

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full text-xs text-muted-foreground select-none">
        لا توجد بيانات كافية لرسم المخطط البياني لهذه الفترة
      </div>
    )
  }

  return (
    <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="salesGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="purchasesGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(244,63,94)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="rgb(244,63,94)" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      <line x1="20" y1="20" x2="480" y2="20" stroke="currentColor" strokeOpacity="0.05" strokeDasharray="4 4" />
      <line x1="20" y1="90" x2="480" y2="90" stroke="currentColor" strokeOpacity="0.05" strokeDasharray="4 4" />
      <line x1="20" y1="160" x2="480" y2="160" stroke="currentColor" strokeOpacity="0.1" />

      {/* Areas */}
      {chartPoints.salesPath && (
        <polygon
          points={`20,160 ${chartPoints.salesPath} 480,160`}
          fill="url(#salesGlow)"
        />
      )}
      {chartPoints.purchasesPath && (
        <polygon
          points={`20,160 ${chartPoints.purchasesPath} 480,160`}
          fill="url(#purchasesGlow)"
        />
      )}

      {/* Lines */}
      {chartPoints.salesPath && (
        <polyline
          fill="none"
          stroke="rgb(16,185,129)"
          strokeWidth="2.5"
          points={chartPoints.salesPath}
        />
      )}
      {chartPoints.purchasesPath && (
        <polyline
          fill="none"
          stroke="rgb(244,63,94)"
          strokeWidth="2.5"
          points={chartPoints.purchasesPath}
        />
      )}

      {/* Points */}
      {chartPoints.points.map((p, idx) => (
        <g key={idx}>
          <circle cx={p.x} cy={p.ySales} r="3" fill="rgb(16,185,129)" />
          <circle cx={p.x} cy={p.yPurchases} r="3" fill="rgb(244,63,94)" />
        </g>
      ))}

      {/* Axis dates */}
      {chartPoints.points.filter((_, i) => i === 0 || i === Math.floor(chartPoints.points.length / 2) || i === chartPoints.points.length - 1).map((p, idx) => (
        <text
          key={idx}
          x={p.x}
          y="176"
          textAnchor="middle"
          fill="currentColor"
          fillOpacity="0.4"
          className="text-[9px] font-numeric font-medium select-none"
        >
          {formatDate(p.date)}
        </text>
      ))}
    </svg>
  )
}
