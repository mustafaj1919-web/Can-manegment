import { cn } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartTooltip(props: any) {
  const { active, payload, label, formatter, labelFormatter, className } = props

  if (!active || !payload?.length) return null

  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-bg-elevated/95 backdrop-blur-md shadow-xl px-3.5 py-2.5 min-w-[140px]',
      className,
    )} dir="rtl">
      {label && (
        <p className="text-[10px] text-muted-foreground font-bold mb-1.5 font-family-cairo">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry: any, i: number) => {
        const val: number = entry.value ?? 0
        const name: string = entry.name ?? entry.dataKey ?? ''
        const color: string = entry.color ?? entry.fill ?? '#888'
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[11px] text-muted-foreground font-family-cairo">{name}</span>
            </div>
            <span className="text-[12px] font-bold text-foreground tabular-nums">
              {formatter ? formatter(val, name) : val.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
