'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Car, Loader2, Search, ShoppingBag, TrendingUp, Users, X, Receipt } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { get } from '@/lib/api/client'

const MIN_QUERY = 2

interface SearchResult {
  type: 'customer' | 'car' | 'sale' | 'purchase'
  type_label: string
  id: number
  title: string
  sub: string
  link: string
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

const TYPE_ICON: Record<string, React.ElementType> = {
  customer: Users,
  car:      Car,
  sale:     TrendingUp,
  purchase: ShoppingBag,
}

const TYPE_COLOR: Record<string, string> = {
  customer: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  car:      'text-violet-300 bg-violet-500/10 border-violet-500/20',
  sale:     'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  purchase: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [debounced, setDebounced] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) { setQuery(''); setDebounced('') }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = debounced.length >= MIN_QUERY

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => get<SearchResponse>(`/search?q=${encodeURIComponent(debounced)}`),
    enabled: active,
    staleTime: 10_000,
  })

  const results   = data?.results ?? []
  const isLoading = active && isFetching

  // Group by type
  const groups: Record<string, SearchResult[]> = {}
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = []
    groups[r.type].push(r)
  }
  const typeOrder = ['customer', 'car', 'sale', 'purchase']

  function go(href: string) { setOpen(false); router.push(href) }

  return (
    <>
      <Button
        variant="ghost" size="icon-sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
        aria-label="بحث ذكي"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[8vh] translate-y-0 max-w-xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">البحث الذكي الشامل</DialogTitle>

          {/* Search bar */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3" dir="rtl">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن عميل، سيارة، فاتورة، رقم هوية، VIN..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
            />
            {query ? (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono select-none">
                Ctrl+K
              </kbd>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[480px] overflow-y-auto" dir="rtl">
            {!active && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Search className="mb-3 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">بحث ذكي شامل</p>
                <p className="mt-1 text-xs text-muted-foreground/50">عملاء · سيارات · مبيعات · مشتريات · أقساط</p>
              </div>
            )}

            {active && isLoading && (
              <div className="flex items-center justify-center gap-2 py-12">
                <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
                <span className="text-sm text-muted-foreground">جاري البحث...</span>
              </div>
            )}

            {active && !isLoading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <AlertCircle className="mb-3 h-7 w-7 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">لا نتائج لـ &ldquo;{debounced}&rdquo;</p>
              </div>
            )}

            {active && !isLoading && results.length > 0 && (
              <div className="py-1.5">
                {typeOrder.filter(t => groups[t]?.length).map(type => {
                  const Icon = TYPE_ICON[type] ?? Receipt
                  const color = TYPE_COLOR[type] ?? 'text-slate-300 bg-white/5 border-white/10'
                  const [iconColor] = color.split(' ')
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-1.5 px-4 py-2">
                        <Icon className={`h-3 w-3 ${iconColor}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          {groups[type][0].type_label}
                        </span>
                      </div>
                      {groups[type].map(result => (
                        <button
                          key={result.id}
                          onClick={() => go(result.link)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-right"
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                            <p className="text-[11px] text-muted-foreground/70 truncate">{result.sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}

                {data && data.total > results.length && (
                  <p className="px-4 py-2 text-center text-[10px] text-muted-foreground/50">
                    يُعرض {results.length} من {data.total} نتيجة
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
