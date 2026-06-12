'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Car, Users, Receipt, TrendingUp, Plus, FileText,
  History, X, Settings, Command, LayoutGrid,
  ArrowUpRight, FileSignature, UserPlus, Sparkles
} from 'lucide-react'
import { getCars } from '@/lib/api/inventory'
import { getCustomers } from '@/lib/api/customers'
import { getSales } from '@/lib/api/sales'
import { getPurchases } from '@/lib/api/purchases'

interface RecentItem {
  id: string
  type: 'page' | 'vehicle' | 'customer' | 'sale' | 'purchase'
  title: string
  subtitle: string
  url: string
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  // Search Results State
  const [vehicles, setVehicles] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])

  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 1. Static Pages & Quick Actions
  const quickActions = [
    { type: 'action', title: 'إضافة سيارة جديدة', subtitle: 'إدراج مركبة جديدة للمخزون', url: '/inventory/new', icon: Plus, badge: 'V' },
    { type: 'action', title: 'إضافة عميل جديد', subtitle: 'تسجيل زبون أو مورد جديد', url: '/customers/new', icon: UserPlus, badge: 'C' },
    { type: 'action', title: 'تسجيل عملية بيع', subtitle: 'إنشاء عقد بيع وفاتورة جديدة', url: '/sales/new', icon: FileSignature, badge: 'S' },
    { type: 'action', title: 'تسجيل عملية شراء', subtitle: 'شراء سيارة جديدة للمخزون', url: '/purchases/new', icon: Plus, badge: 'P' },
    { type: 'action', title: 'فتح لوحة الحسابات', subtitle: 'القيود المحاسبية ودليل الحسابات', url: '/accounting', icon: Settings, badge: 'A' },
    { type: 'action', title: 'فتح التقارير المالية', subtitle: 'التقارير وحركة الصندوق والأرباح', url: '/reports', icon: TrendingUp, badge: 'R' },
    { type: 'action', title: 'تصفح المخزون بالكامل', subtitle: 'عرض كافة السيارات وحالاتها', url: '/inventory', icon: Car, badge: 'I' },
  ]

  const staticPages = [
    { type: 'page', title: 'لوحة التحكم الرئيسية', subtitle: 'صالة العرض وإحصاءات المعرض السريعة', url: '/' },
    { type: 'page', title: 'صالة العرض العامة للزبائن', subtitle: 'الرابط العام لكتالوج السيارات المعروضة', url: '/showroom' },
    { type: 'page', title: 'دليل الحسابات', subtitle: 'شجرة الحسابات المحاسبية بالمعرض', url: '/chart-of-accounts' },
    { type: 'page', title: 'ميزان المراجعة', subtitle: 'ميزان المراجعة والتقارير المحاسبية الدورية', url: '/trial-balance' },
    { type: 'page', title: 'إدارة الزبائن والموردين', subtitle: 'قائمة العملاء Buyer / Seller', url: '/customers' },
    { type: 'page', title: 'عمليات البيع والفواتير', subtitle: 'إدارة الفواتير وعقود البيع', url: '/sales' },
    { type: 'page', title: 'عمليات الشراء والموردين', subtitle: 'سجل فواتير المشتريات وإدارة الموردين', url: '/purchases' },
  ]

  // 2. Load Recents from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('showroom-cmd-recent')
      if (stored) {
        try { setRecentItems(JSON.parse(stored)) } catch (e) { /* ignore */ }
      }
    }
  }, [isOpen])

  const saveRecent = (item: RecentItem) => {
    const updated = [item, ...recentItems.filter(r => r.url !== item.url)].slice(0, 5)
    setRecentItems(updated)
    localStorage.setItem('showroom-cmd-recent', JSON.stringify(updated))
  }

  // 3. Handle keydown for opening (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // 4. Perform Search API calls when query changes
  useEffect(() => {
    if (!query.trim()) {
      setVehicles([])
      setCustomers([])
      setSales([])
      setPurchases([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true)
      try {
        const [carsRes, custRes, salesRes, purchRes] = await Promise.all([
          getCars({ search: query, per_page: 4 }),
          getCustomers({ search: query, per_page: 4 }),
          getSales({ search: query, per_page: 4 }),
          getPurchases({ search: query, per_page: 4 })
        ])

        setVehicles(carsRes.items ?? [])
        setCustomers(custRes.items ?? [])
        setSales(salesRes.items ?? [])
        setPurchases(purchRes.items ?? [])
      } catch (err) {
        console.error('Command Palette Search Error:', err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(delayDebounce)
  }, [query])

  // 5. Flatten results for keyboard navigation
  const getFlattenedItems = useCallback(() => {
    if (!query.trim()) {
      const items: any[] = []
      // Add Recent Items first
      recentItems.forEach(item => {
        items.push({ ...item, isRecent: true })
      })
      // Add Quick Actions
      quickActions.forEach(action => {
        items.push({ ...action, isAction: true })
      })
      // Add Static Pages
      staticPages.forEach(page => {
        items.push({ ...page, isPage: true })
      })
      return items
    } else {
      const items: any[] = []
      vehicles.forEach(v => items.push({ type: 'vehicle', title: `${v.brand} ${v.model}`, subtitle: `سنة ${v.manufacturing_year} · رقم الشاصي: ${v.vin}`, url: `/inventory/${v.id}` }))
      customers.forEach(c => items.push({ type: 'customer', title: c.name, subtitle: `هاتف: ${c.phone || '—'} · النوع: ${c.customer_type === 'Buyer' ? 'مشتري' : 'بائع'}`, url: `/customers/${c.id}` }))
      sales.forEach(s => items.push({ type: 'sale', title: `فاتورة بيع ${s.invoice_number}`, subtitle: `العميل: ${s.buyer_name || '—'} · القيمة: ${s.selling_price.toLocaleString()} ${s.currency}`, url: `/sales/${s.id}` }))
      purchases.forEach(p => items.push({ type: 'purchase', title: `فاتورة شراء ${p.invoice_number}`, subtitle: `المورد: ${p.seller_name || '—'} · السعر: ${p.purchase_price.toLocaleString()} ${p.currency}`, url: `/purchases/${p.id}` }))
      return items
    }
  }, [query, recentItems, vehicles, customers, sales, purchases])

  const flattenedItems = getFlattenedItems()

  // Reset selected index if flattened items length changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [flattenedItems.length])

  // 6. Navigation Actions
  const handleSelect = (item: any) => {
    if (!item) return
    
    // Save to recents
    saveRecent({
      id: item.url,
      type: item.type || 'page',
      title: item.title,
      subtitle: item.subtitle,
      url: item.url
    })

    setIsOpen(false)
    router.push(item.url)
  }

  // Keyboard Navigation Handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % flattenedItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + flattenedItems.length) % flattenedItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flattenedItems[selectedIndex]) {
        handleSelect(flattenedItems[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  // Scroll into view on keyboard navigation
  useEffect(() => {
    const selectedEl = resultsRef.current?.querySelector('[data-selected="true"]')
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4" dir="rtl">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {/* Command Palette Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/95 shadow-[0_0_50px_rgba(239,27,45,0.15)] flex flex-col max-h-[500px]"
            onKeyDown={handleKeyDown}
          >
            {/* Input Bar */}
            <div className="relative flex items-center border-b border-white/[0.06] px-4 py-3 shrink-0">
              <Search className="h-5 w-5 text-neutral-500 start-4 absolute" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent ps-9 pe-12 py-1 text-sm text-white focus:outline-none placeholder-neutral-500 font-medium font-family-cairo"
                placeholder="ابحث عن سيارات، عملاء، فواتير أو صفحات... (Ctrl + K)"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="absolute end-4 flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>

            {/* Results Area */}
            <div
              ref={resultsRef}
              className="flex-1 overflow-y-auto p-2 sidebar-scroll min-h-[150px] max-h-[400px]"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-xs gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                  <span>جاري البحث الفوري في سجلات المعرض...</span>
                </div>
              ) : flattenedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-xs gap-2">
                  <X className="h-6 w-6 text-neutral-600" />
                  <span>لا توجد نتائج مطابقة لبحثك "{query}"</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Render Flattened Items with Category Headers */}
                  {flattenedItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    
                    // Determine icons based on item type
                    let IconComponent = Sparkles
                    let categoryLabel = ''
                    let iconColor = 'text-red-500'

                    if (item.isRecent) {
                      IconComponent = History
                      categoryLabel = 'العناصر الأخيرة'
                      iconColor = 'text-amber-500'
                    } else if (item.isAction) {
                      IconComponent = item.icon || Sparkles
                      categoryLabel = 'إجراءات سريعة'
                      iconColor = 'text-red-500'
                    } else if (item.isPage) {
                      IconComponent = LayoutGrid
                      categoryLabel = 'صفحات النظام'
                      iconColor = 'text-blue-400'
                    } else {
                      switch (item.type) {
                        case 'vehicle':
                          IconComponent = Car
                          categoryLabel = 'السيارات والمخزون'
                          iconColor = 'text-red-500'
                          break
                        case 'customer':
                          IconComponent = Users
                          categoryLabel = 'العملاء Buyer/Seller'
                          iconColor = 'text-blue-400'
                          break
                        case 'sale':
                          IconComponent = Receipt
                          categoryLabel = 'فواتير المبيعات'
                          iconColor = 'text-emerald-500'
                          break
                        case 'purchase':
                          IconComponent = FileText
                          categoryLabel = 'فواتير المشتريات'
                          iconColor = 'text-rose-500'
                          break
                      }
                    }

                    // Show Header only when category changes
                    const prevItem = idx > 0 ? flattenedItems[idx - 1] : null
                    const showHeader = idx === 0 || 
                      (item.isRecent !== prevItem.isRecent) || 
                      (item.isAction !== prevItem.isAction) || 
                      (item.isPage !== prevItem.isPage) ||
                      (item.type !== prevItem.type)

                    return (
                      <div key={`${item.url}-${idx}`}>
                        {showHeader && (
                          <div className="px-3 py-1.5 text-[9px] font-bold text-neutral-500 uppercase tracking-widest bg-white/[0.01] rounded-md mb-1 select-none">
                            {categoryLabel}
                          </div>
                        )}

                        <button
                          type="button"
                          data-selected={isSelected}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-right ${
                            isSelected 
                              ? 'bg-red-600/10 text-red-500 border-r-2 border-red-500 pl-4' 
                              : 'text-neutral-300 hover:bg-white/[0.02] hover:text-white'
                          }`}
                          onClick={() => handleSelect(item)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-red-500/10' : 'bg-white/[0.03] border border-white/[0.05]'
                            }`}>
                              <IconComponent className={`h-4.5 w-4.5 ${iconColor}`} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate leading-normal">{item.title}</span>
                              <span className="text-[10px] text-neutral-500 truncate mt-0.5">{item.subtitle}</span>
                            </div>
                          </div>
                          <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                            isSelected ? 'opacity-100 text-red-500' : 'opacity-0'
                          }`} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer / Instructions */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-t border-white/[0.04] text-[10px] text-neutral-500 select-none shrink-0 font-medium">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[8px]">⏎</kbd> للفتح</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[8px]">↑↓</kbd> للتنقل</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[8px]">Esc</kbd> للإغلاق</span>
              </div>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>لوحة التحكم الذكية</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Helper Loader Icon since we need to draw it manually or import it
function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}
