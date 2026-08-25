'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Car,
  TrendingUp,
  ShoppingBag,
  Users,
  Wallet,
  Calculator,
  FileText,
  Plus,
  Loader2,
  CalendarDays,
  ReceiptText,
  Search,
  CreditCard,
  BarChart2,
  BookOpen,
  Zap,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { get } from '@/lib/api/client'

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
  car: Car,
  sale: TrendingUp,
  purchase: ShoppingBag,
}

const TYPE_COLOR: Record<string, string> = {
  customer: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  car: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  sale: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  purchase: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
}

// Static Navigation Items
const NAV_ITEMS = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard, keywords: ['الرئيسية', 'dashboard', 'home'] },
  { href: '/cashier', label: 'لوحة الكاشير (صندوق الكاشير)', icon: Wallet, keywords: ['كاشير', 'صندوق', 'cashier', 'pos'] },
  { href: '/inventory', label: 'إدارة السيارات والمخزون', icon: Car, keywords: ['سيارات', 'معرض', 'مخزن', 'inventory', 'cars'] },
  { href: '/sales', label: 'المبيعات والفواتير', icon: TrendingUp, keywords: ['بيع', 'مبيعات', 'فواتير', 'sales', 'invoices'] },
  { href: '/purchases', label: 'المشتريات وعقود الشراء', icon: ShoppingBag, keywords: ['شراء', 'مشتريات', 'purchases'] },
  { href: '/installments', label: 'أقساط العملاء وجدولتها', icon: CalendarDays, keywords: ['أقساط', 'قسط', 'جدولة', 'installments'] },
  { href: '/customers', label: 'إدارة العملاء', icon: Users, keywords: ['عميل', 'عملاء', 'زبون', 'customers'] },
  { href: '/accounting', label: 'النظام المحاسبي والقيود', icon: Calculator, keywords: ['حسابات', 'محاسبة', 'قيود', 'accounting'] },
  { href: '/reports', label: 'التقارير المالية والمحاسبية', icon: FileText, keywords: ['تقارير', 'أرباح', 'خسائر', 'reports'] },
]

// Static Quick Actions
const ACTION_ITEMS = [
  { href: '/cashier/new-sale',             label: 'بيع جديد — الكاشير',              icon: Zap,        keywords: ['بيع', 'كاشير', 'new sale', 'pos'] },
  { href: '/cashier/installment-payment',  label: 'تحصيل قسط',                       icon: CreditCard, keywords: ['تحصيل', 'قسط', 'installment', 'payment'] },
  { href: '/inventory/new',                label: 'إضافة سيارة للمخزون',             icon: Plus,       keywords: ['إضافة سيارة', 'new car'] },
  { href: '/purchases/new',                label: 'تسجيل عقد شراء',                  icon: Plus,       keywords: ['شراء جديد', 'new purchase'] },
  { href: '/customers/new',                label: 'إضافة عميل جديد',                 icon: Plus,       keywords: ['عميل جديد', 'new customer'] },
  { href: '/reports/monthly-profit',       label: 'تقرير الأرباح الشهرية',           icon: BarChart2,  keywords: ['تقرير', 'أرباح', 'profit report'] },
  { href: '/trial-balance',                label: 'ميزان المراجعة',                   icon: BookOpen,   keywords: ['ميزان', 'محاسبة', 'trial balance'] },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  
  const router = useRouter()

  // Listen for both Ctrl+K and custom toggle event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }
    const handleToggleEvent = () => {
      setIsOpen((open) => !open)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('toggle-command-palette', handleToggleEvent)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('toggle-command-palette', handleToggleEvent)
    }
  }, [])

  // Auto-focus reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setResults([])
    }
  }, [isOpen])

  // Unified API Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await get<SearchResponse>(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        setResults(res?.results || [])
      } catch (err) {
        console.error('Error fetching search results:', err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const runCommand = useCallback((command: () => void) => {
    setIsOpen(false)
    setSearchQuery('')
    command()
  }, [])

  // Group dynamic results by type
  const groups: Record<string, SearchResult[]> = {}
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = []
    groups[r.type].push(r)
  }
  const typeOrder = ['customer', 'car', 'sale', 'purchase']

  // Manual Filter for Static Items
  const filteredNavItems = searchQuery
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : NAV_ITEMS

  const filteredActionItems = searchQuery
    ? ACTION_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : ACTION_ITEMS

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between border-b border-border/50 bg-secondary/10 px-4 py-2 text-[10px] text-muted-foreground select-none" dir="rtl">
        <span className="font-semibold">لوحة الأوامر الذكية من Al.Dulimi99</span>
        <div className="flex items-center gap-1.5">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-medium opacity-100">
            <span>Esc</span>
          </kbd>
          <span>للإغلاق</span>
        </div>
      </div>
      
      <CommandInput
        placeholder="ابحث عن صفحات، سيارات (بالاسم أو VIN)، عملاء، أو فواتير..."
        value={searchQuery}
        onValueChange={setSearchQuery}
        className="text-right focus:ring-0"
        dir="rtl"
      />
      
      <CommandList className="max-h-[380px] p-2" dir="rtl">
        {loading && (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            <span>جاري البحث في معطيات النظام...</span>
          </div>
        )}
        
        {!loading && searchQuery.trim().length >= 2 && results.length === 0 && filteredNavItems.length === 0 && filteredActionItems.length === 0 && (
          <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
            لا توجد نتائج مطابقة لبحثك
          </CommandEmpty>
        )}

        {/* Dynamic Groups from API Search */}
        {!loading && typeOrder.filter(type => groups[type]?.length).map(type => {
          const Icon = TYPE_ICON[type] ?? ReceiptText
          const colorClass = TYPE_COLOR[type] ?? 'text-muted-foreground'
          const label = groups[type][0].type_label

          return (
            <CommandGroup key={type} heading={label}>
              {groups[type].map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => runCommand(() => router.push(result.link))}
                  className="hover:bg-secondary/40 rounded-lg cursor-pointer px-3 py-2.5 flex items-center gap-3 transition-colors"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground block truncate">{result.title}</span>
                    <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{result.sub}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}

        {/* Static: Quick Actions */}
        {filteredActionItems.length > 0 && (
          <CommandGroup heading="الإجراءات السريعة">
            {filteredActionItems.map((action) => (
              <CommandItem
                key={action.href}
                onSelect={() => runCommand(() => router.push(action.href))}
                className="hover:bg-secondary/40 rounded-lg cursor-pointer px-3 py-2 flex items-center gap-2.5 transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  <action.icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-foreground">{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Static: Navigation Links */}
        {filteredNavItems.length > 0 && (
          <CommandGroup heading="التنقل السريع">
            {filteredNavItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
                className="hover:bg-secondary/40 rounded-lg cursor-pointer px-3 py-2 flex items-center gap-2.5 transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/30 text-muted-foreground/80">
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-foreground">{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
