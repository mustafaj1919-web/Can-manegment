"use client"
import ThemeToggle from './ThemeToggle'

export default function Sidebar(){
  return (
    <div className="sidebar h-full">
      <div className="mb-6">
        <div className="text-2xl font-extrabold">الأصدقاء</div>
        <div className="text-sm text-white/70">نظام إدارة صالات العرض</div>
      </div>

      <nav className="mt-6 space-y-2">
        <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/6" href="/">
          <span className="text-xl">🏠</span>
          <span className="font-semibold">الرئيسية</span>
        </a>
        <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/6" href="/inventory">
          <span className="text-xl">🚗</span>
          <span className="font-semibold">المخزون</span>
        </a>
        <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/6" href="/sales">
          <span className="text-xl">💸</span>
          <span className="font-semibold">المبيعات</span>
        </a>
        <a className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/6" href="/customers">
          <span className="text-xl">👥</span>
          <span className="font-semibold">العملاء</span>
        </a>
      </nav>

      <div className="mt-auto pt-6">
        <ThemeToggle />
      </div>
    </div>
  )
}
