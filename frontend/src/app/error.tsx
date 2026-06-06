'use client'

import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError() {
  return (
    <div dir="rtl" className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="glass w-full max-w-lg rounded-xl border border-white/10 p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
          <AlertTriangle className="h-6 w-6 text-rose-300" />
        </div>
        <h2 className="text-xl font-bold text-foreground">حدث خطأ غير متوقع</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          تعذر تحميل هذه الصفحة بشكل صحيح. يمكنك إعادة التحميل أو العودة إلى لوحة التحكم.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            إعادة التحميل
          </Button>
          <Button asChild variant="ghost" className="gap-2 border border-white/10">
            <Link href="/">
              <Home className="h-4 w-4" />
              لوحة التحكم
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
