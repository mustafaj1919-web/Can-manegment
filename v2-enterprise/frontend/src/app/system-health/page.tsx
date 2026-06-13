'use client'

import React from 'react'
import { Activity } from 'lucide-react'
import { FeatureUnavailable } from '@/components/ui/FeatureUnavailable'

export default function SystemHealthPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">فحص النظام</h1>
            <p className="text-xs text-muted-foreground mt-0.5">حالة النظام والمحاسبة والنسخ الاحتياطية</p>
          </div>
        </div>
      </div>

      {/* Feature Unavailable State */}
      <FeatureUnavailable 
        title="فحص صحة النظام غير متاح"
        description="ميزة فحص صحة النظام التفصيلي وإحصائيات الجداول البرمجية غير مدعومة في هذا الإصدار لعدم توفر نقاط النهاية المخصصة لها في خادم الخلفية (ASP.NET Core)."
      />
    </div>
  )
}
