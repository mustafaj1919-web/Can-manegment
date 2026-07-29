'use client'

import React from 'react'

export function LoginFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-8 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#64748B] font-tajawal font-medium select-none">
      <div>
        <span>شركة الأصدقاء لتجارة السيارات © {currentYear}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#059669]" />
        <span>منصة إدارة المعرض المتكاملة</span>
      </div>
    </footer>
  )
}
