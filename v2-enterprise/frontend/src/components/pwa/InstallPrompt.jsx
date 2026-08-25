'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // تحقق إذا مثبت مسبقاً
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    if (ios) {
      // على iOS نظهر التعليمات بعد 3 ثواني
      setTimeout(() => setShow(true), 3000)
      return
    }

    // Android / Chrome
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') setShow(false)
        setDeferredPrompt(null)
      })
    }
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!show || isInstalled) return null

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-card shadow-2xl shadow-black/40">
        {/* Glow */}
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Smartphone className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">ثبّت التطبيق على جوالك</p>
              {isIOS ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                  اضغط <span className="font-bold text-amber-400">مشاركة ⎙</span> ثم{' '}
                  <span className="font-bold text-amber-400">«إضافة للشاشة الرئيسية»</span>
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  يعمل بدون إنترنت • أسرع • مثل أي تطبيق
                </p>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!isIOS && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-400 transition-colors"
              >
                <Download className="h-4 w-4" />
                تثبيت الآن
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-border/40 px-4 py-2.5 text-xs text-muted-foreground hover:bg-secondary/40 transition-colors"
              >
                لاحقاً
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
