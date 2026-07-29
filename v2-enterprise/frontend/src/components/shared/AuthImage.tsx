'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

interface AuthImageProps {
  src: string | undefined
  alt: string
  className?: string
  style?: React.CSSProperties
  onLoad?: () => void
  onError?: () => void
}

/**
 * Renders a private API image by fetching it with the JWT token,
 * then displaying via a blob URL — bypasses browser's no-auth <img src> limitation.
 */
export function AuthImage({ src, alt, className, style, onLoad, onError }: AuthImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failed, setFailed]   = useState(false)
  const token = useAuthStore(s => s.token)
  const prevBlob = useRef<string | null>(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false

    fetch(src, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.blob()
      })
      .then(blob => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        prevBlob.current = url
        setBlobUrl(url)
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          onError?.()
        }
      })

    return () => {
      cancelled = true
      if (prevBlob.current) {
        URL.revokeObjectURL(prevBlob.current)
        prevBlob.current = null
      }
      setBlobUrl(null)
      setFailed(false)
    }
  }, [src, token])

  if (!src || failed) return null

  if (!blobUrl) {
    return <div className={className} style={{ ...style, background: 'rgba(255,255,255,0.05)' }} aria-label={alt} />
  }

  return <img src={blobUrl} alt={alt} className={className} style={style} onLoad={onLoad} />
}

/**
 * Opens a private API document (image or PDF) in a new tab using the JWT token.
 */
export async function openAuthDocument(url: string, token: string | null) {
  try {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const r = await fetch(url, { headers })
    if (!r.ok) {
      if (r.status === 404) {
        alert('ملف المستند غير متوفر على القرص. يمكنك حذف هذا السجل أو إعادة رفع المستند مجدداً.')
      }
      return
    }
    const blob = await r.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.target = '_blank'
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
  } catch (err) {
    console.error('Failed to open document', err)
  }
}
