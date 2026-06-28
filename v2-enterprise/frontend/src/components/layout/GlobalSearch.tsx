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
      className="flex items-center gap-2.5 h-9 px-3.5 w-full rounded-full border border-border/70 bg-secondary/30 hover:bg-secondary/50 text-xs text-muted-foreground/80 hover:text-foreground transition-all duration-150 cursor-pointer select-none"
      aria-label="البحث الذكي الشامل"
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className="flex-1 text-right truncate">البحث الذكي الشامل...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground/50 select-none">
        ⌘ K
      </kbd>
    </button>
  )
}
