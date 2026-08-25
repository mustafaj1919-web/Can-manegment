import { Skeleton } from '@/components/ui/skeleton'

interface ChartSkeletonProps {
  height?: number
  label?: string
}

export function ChartSkeleton({ height = 200, label }: ChartSkeletonProps) {
  return (
    <div className="rounded-xl border border-subtle bg-bg-surface p-5 shadow-sm">
      {label && <Skeleton className="h-3.5 w-32 rounded mb-4" />}
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}
