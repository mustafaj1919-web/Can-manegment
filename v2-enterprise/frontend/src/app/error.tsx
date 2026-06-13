'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Page Error]', error)
  }, [error])

  return (
    <div dir="rtl" className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center px-4">
      <div className="rounded-full bg-rose-500/10 p-4">
        <AlertTriangle className="h-8 w-8 text-rose-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">حدث خطأ غير متوقع</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          تعذّر تحميل هذه الصفحة. يمكنك المحاولة مجدداً أو العودة للصفحة الرئيسية.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" size="sm">
          إعادة المحاولة
        </Button>
        <Button onClick={() => (window.location.href = '/')} variant="outline" size="sm">
          الصفحة الرئيسية
        </Button>
      </div>
      {error.digest && (
        <p className="text-[11px] text-muted-foreground/40 font-mono">#{error.digest}</p>
      )}
    </div>
  )
}
