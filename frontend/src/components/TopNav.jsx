"use client"
import ThemeToggle from './ThemeToggle'

export default function TopNav(){
  return (
    <div className="container flex items-center gap-4 py-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/70">الفرع</div>
          <select className="form-select bg-transparent border border-white/6 rounded-lg px-3 py-2 text-white/90">
            <option>الرئيسي</option>
            <option>الأصدقاء</option>
            <option>الأصدقاء 2</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-white/70">سعر الصرف: <strong className="ml-2">غير محدد</strong></div>
        <button className="icon-button p-2 rounded-lg bg-white/3">🔔</button>
        <button className="icon-button p-2 rounded-lg bg-white/3">⚙️</button>
        <ThemeToggle />
      </div>
    </div>
  )
}
