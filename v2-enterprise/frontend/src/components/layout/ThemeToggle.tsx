'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('light', theme === 'light')
  localStorage.setItem('dashboardTheme', theme)
}

export default function ThemeToggle() {
  // null = not yet hydrated (avoid flash)
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const saved = (localStorage.getItem('dashboardTheme') as 'light' | 'dark') || 'dark'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      title={isLight ? 'التبديل للوضع الداكن' : 'التبديل للوضع المضيء'}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground',
        'transition-all duration-150 hover:bg-secondary hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {/* Sun = currently light → click to go dark */}
      <Sun className={cn('absolute h-4 w-4 transition-all duration-200', isLight ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-90')} />
      {/* Moon = currently dark → click to go light */}
      <Moon className={cn('absolute h-4 w-4 transition-all duration-200', isLight ? 'scale-0 opacity-0 -rotate-90' : 'scale-100 opacity-100 rotate-0')} />
    </button>
  )
}
