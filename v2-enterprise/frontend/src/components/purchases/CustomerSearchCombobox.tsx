'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, User, X, Check, Phone, CreditCard, Sparkles, ChevronDown } from 'lucide-react'
import { getCustomers, Customer } from '@/lib/api/customers'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CustomerSearchComboboxProps {
  value: string // customerId
  onChange: (customer: Customer | null) => void
  error?: string
  initialCustomers?: Customer[]
}

export function CustomerSearchCombobox({
  value,
  onChange,
  error,
  initialCustomers = [],
}: CustomerSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Customer[]>(initialCustomers)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce logic (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Sync selectedCustomer with value
  useEffect(() => {
    if (!value) {
      setSelectedCustomer(null)
      return
    }
    const found = results.find((c) => String(c.id) === String(value)) || initialCustomers.find((c) => String(c.id) === String(value))
    if (found) {
      setSelectedCustomer(found)
    } else {
      getCustomers({ per_page: 50 }).then((res) => {
        const list = res?.items ?? (Array.isArray(res) ? res : [])
        const item = list.find((c) => String(c.id) === String(value))
        if (item) setSelectedCustomer(item)
      })
    }
  }, [value, results, initialCustomers])

  // Remote Search Effect
  useEffect(() => {
    if (!isOpen) return

    if (debouncedTerm.length < 2) {
      setResults(initialCustomers.slice(0, 20))
      setLoading(false)
      return
    }

    let isSubscribed = true
    setLoading(true)

    getCustomers({ search: debouncedTerm, per_page: 20 })
      .then((res) => {
        if (isSubscribed) {
          const list = res?.items ?? (Array.isArray(res) ? res : [])
          setResults(list)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isSubscribed) setLoading(false)
      })

    return () => {
      isSubscribed = false
    }
  }, [debouncedTerm, isOpen, initialCustomers])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(customer: Customer) {
    setSelectedCustomer(customer)
    onChange(customer)
    setIsOpen(false)
    setSearchTerm('')
  }

  function handleClear() {
    setSelectedCustomer(null)
    onChange(null)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Box / Trigger */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              <User className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  {selectedCustomer.full_name || selectedCustomer.name}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {selectedCustomer.customer_type === 'Company' ? 'شركة' : 'فرد'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3 text-muted-foreground/60" />
                  {selectedCustomer.phone || '-'}
                </span>
                {selectedCustomer.id_number && (
                  <span className="flex items-center gap-1 font-mono">
                    <CreditCard className="h-3 w-3 text-muted-foreground/60" />
                    رقم الزبون: {selectedCustomer.id_number}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
            title="إلغاء التحديد"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'flex cursor-pointer items-center justify-between rounded-lg border bg-secondary/30 px-3 py-2.5 text-xs transition-all hover:border-emerald-500/40',
            error ? 'border-rose-500/60' : 'border-border/60',
            isOpen && 'border-emerald-500/60 ring-1 ring-emerald-500/40'
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 text-muted-foreground/60" />
            <span>ابحث واختر الزبون بالاسم، الهاتف، أو رقم الهوية...</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border/80 bg-card p-2 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
          {/* Internal Search Input */}
          <div className="relative mb-2">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب الاسم، الهاتف، أو رقم الهوية للبحث..."
              className="h-9 pr-9 pl-8 bg-secondary/40 text-xs border-border/60"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>جاري البحث عن الزبون...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                <User className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1" />
                <p className="font-semibold text-foreground">لم يتم العثور على زبون مطاطق</p>
                <p className="text-[11px] text-muted-foreground/70">
                  {searchTerm ? `لا توجد نتائج تطابق "${searchTerm}"` : 'ابدأ بكتابة اسم الزبون للبحث'}
                </p>
              </div>
            ) : (
              results.map((cust) => {
                const isSelected = String(cust.id) === String(value)
                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelect(cust)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition-colors',
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-secondary/60 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground font-bold text-xs">
                        {(cust.name || cust.full_name || 'Z')[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{cust.full_name || cust.name}</span>
                          <span className="rounded-full bg-secondary/80 px-1.5 py-0.2 text-[9px] text-muted-foreground font-normal">
                            {cust.customer_type === 'Company' ? 'شركة' : 'فرد'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono">{cust.phone || '-'}</span>
                          {cust.id_number && (
                            <span className="font-mono text-[10px]">كود: {cust.id_number}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
