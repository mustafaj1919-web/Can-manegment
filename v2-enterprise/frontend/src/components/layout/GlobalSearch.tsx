'use client'

import { Search } from 'lucide-react'

export function GlobalSearch() {
  const openPalette = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toggle-command-palette'))
    }
  }

  return (
    <button
      onClick={openPalette}
      className="flex items-center gap-2 h-9 px-3 w-48 sm:w-64 rounded-[8px] border border-border bg-bg-surface hover:bg-bg-elevated text-[13px] text-muted-foreground transition-all duration-150 cursor-pointer"
      aria-label="البحث الذكي الشامل"
    >
      <Search className="h-4 w-4 shrink-0 text-foreground/45" />
      <span className="flex-1 text-right truncate">البحث الذكي الشامل...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border-subtle bg-bg-page px-1.5 py-0.5 text-[9px] text-muted-foreground font-mono select-none">
        Ctrl+K
      </kbd>
    </button>
  )
}
