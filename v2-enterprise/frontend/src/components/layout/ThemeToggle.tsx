'use client'

import { useEffect } from 'react'

export default function ThemeToggle() {
  useEffect(() => {
    document.documentElement.classList.remove('light')
    localStorage.setItem('dashboardTheme', 'dark')
  }, [])

  return null
}
