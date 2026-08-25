'use client'

import { useEffect, useRef, useState } from 'react'

interface UseCountUpOptions {
  start?: number
  end: number
  duration?: number
  decimals?: number
  enabled?: boolean
}

export function useCountUp({ start = 0, end, duration = 1200, decimals = 0, enabled = true }: UseCountUpOptions) {
  const [value, setValue] = useState(enabled ? start : end)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) { setValue(end); return }
    if (end === start) { setValue(end); return }

    startTimeRef.current = null

    function tick(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(parseFloat((start + (end - start) * eased).toFixed(decimals)))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setValue(end)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [end, start, duration, decimals, enabled])

  return value
}
