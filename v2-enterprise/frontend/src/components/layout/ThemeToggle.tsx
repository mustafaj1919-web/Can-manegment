'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  // قراءة الحالة من الـ DOM بعد الـ hydration (الـ script في head هيأ الكلاس مسبقاً)
  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains('light'))
  }, [])

  function toggle() {
    const goLight = isDark
    setIsDark(!goLight)
    if (goLight) {
      document.documentElement.classList.add('light')
      localStorage.setItem('dashboardTheme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('dashboardTheme', 'dark')
    }
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        'border border-border/50 text-muted-foreground',
        'hover:bg-secondary/60 hover:text-foreground hover:border-border/70',
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
