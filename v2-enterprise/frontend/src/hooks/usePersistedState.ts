'use client'

import { useState, useEffect, useCallback } from 'react'

export function usePersistedState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)) }
    catch { /* quota exceeded or SSR */ }
  }, [key, state])

  const set = useCallback((val: T | ((prev: T) => T)) => {
    setState(val as any)
  }, [])

  return [state, set]
}
