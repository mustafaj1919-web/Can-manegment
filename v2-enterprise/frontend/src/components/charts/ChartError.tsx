import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ChartErrorProps {
  message?: string
  onRetry?: () => void
  height?: number
}

export function ChartError({ message = 'تعذر تحميل البيانات', onRetry, height = 200 }: ChartErrorProps) {
  return (
    <div
      className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] flex flex-col items-center justify-center gap-3 text-center p-5"
      style={{ minHeight: height }}
    >
      <AlertTriangle className="h-6 w-6 text-rose-400" />
      <p className="text-xs text-rose-400 font-semibold font-family-cairo">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}
