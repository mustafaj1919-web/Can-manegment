'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Shortcut {
  keys: string[]
  label: string
  action?: () => void
  href?: string
}

export function ShortcutsPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const shortcuts: Shortcut[] = [
    { keys: ['G', 'H'], label: 'الصفحة الرئيسية', href: '/' },
    { keys: ['G', 'I'], label: 'المخزون', href: '/inventory' },
    { keys: ['G', 'S'], label: 'المبيعات', href: '/sales' },
    { keys: ['G', 'P'], label: 'المشتريات', href: '/purchases' },
    { keys: ['G', 'C'], label: 'العملاء', href: '/customers' },
    { keys: ['G', 'L'], label: 'الأقساط', href: '/installments' },
    { keys: ['G', 'A'], label: 'المحاسبة', href: '/trial-balance' },
    { keys: ['?'], label: 'اختصارات لوحة المفاتيح', action: () => setOpen(v => !v) },
    { keys: ['Esc'], label: 'إغلاق الحوار', action: () => setOpen(false) },
  ]

  useEffect(() => {
    let buffer = ''
    let timer: ReturnType<typeof setTimeout>

    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === '?') { setOpen(v => !v); return }

      buffer += e.key.toUpperCase()
      clearTimeout(timer)
      timer = setTimeout(() => { buffer = '' }, 600)

      for (const sc of shortcuts) {
        if (sc.href && buffer === sc.keys.join('')) {
          router.push(sc.href)
          buffer = ''
          break
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer) }
  }, [router])

  return (
    <>
      {/* Trigger hint */}
      <button
        onClick={() => setOpen(true)}
        title="اختصارات لوحة المفاتيح"
        className="fixed bottom-5 start-5 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-bg-surface text-muted-foreground shadow-md hover:text-foreground transition-colors print:hidden"
      >
        <Keyboard className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 bottom-16 z-50 mx-auto max-w-sm rounded-2xl border border-subtle bg-bg-surface p-5 shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground font-family-cairo">اختصارات لوحة المفاتيح</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-secondary/60 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {shortcuts.map((sc, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                    <span className="text-[12px] text-foreground/80 font-family-cairo">{sc.label}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border/60 bg-secondary/40 px-1.5 text-[10px] font-mono font-bold text-muted-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
