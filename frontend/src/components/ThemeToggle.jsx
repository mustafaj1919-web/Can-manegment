"use client"

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('dashboardTheme') || 'dark'
    setTheme(saved)
    document.documentElement.classList.toggle('light', saved === 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('dashboardTheme', next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الأبيض'}
      aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الأبيض'}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  )
}
