'use client'

import { Building2, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BankMovementPage() {
  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
            <Building2 className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="section-title">حركة البنك</h1>
            <p className="section-subtitle">الحركات والعمليات البنكية التفصيلية</p>
          </div>
        </div>
        <Button variant="glass" size="sm" disabled className="gap-2 h-8 cursor-not-allowed">
          <RefreshCw className="h-3.5 w-3.5" />
          تحديث
        </Button>
      </div>

      {/* Under Construction Placeholder */}
      <div className="glass rounded-xl py-20 text-center border border-border/30 max-w-xl mx-auto">
        <Clock className="mx-auto mb-4 h-10 w-10 text-amber-500/60 animate-pulse" />
        <h3 className="text-sm font-semibold text-foreground">هذا التقرير سيتوفر قريباً</h3>
        <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          نحن نعمل على توفير تقرير حركة البنك التفصيلية والعمليات البنكية في التحديثات القادمة لربطه مباشرة بنقاط نهاية الباكيند الحقيقية.
        </p>
      </div>
    </div>
  )
}
