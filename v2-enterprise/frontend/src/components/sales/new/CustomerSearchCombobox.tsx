'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Loader2, RefreshCw, Search, User, UserPlus, Users, X } from 'lucide-react'
import { CustomerOption } from '@/lib/api/sales'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreateCustomerModal } from './CreateCustomerModal'

interface CustomerSearchComboboxProps {
  customers: CustomerOption[]
  selectedBuyer?: CustomerOption
  selectedBuyerId: string
  onSelectBuyer: (buyerId: string) => void
  customerVatNumber: string
  setCustomerVatNumber: (vat: string) => void
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
  errorMsg?: string
  searchTerm?: string
  onSearchTermChange?: (term: string) => void
}

export function CustomerSearchCombobox({
  customers,
  selectedBuyer,
  selectedBuyerId,
  onSelectBuyer,
  customerVatNumber,
  setCustomerVatNumber,
  isLoading,
  isFetching,
  onRefresh,
  errorMsg,
  searchTerm: parentSearchTerm,
  onSearchTermChange,
}: CustomerSearchComboboxProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const searchTerm = parentSearchTerm !== undefined ? parentSearchTerm : localSearchTerm

  const handleSearchChange = (val: string) => {
    setLocalSearchTerm(val)
    if (onSearchTermChange) {
      onSearchTermChange(val)
    }
  }

  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCustomers = customers.filter(b => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    const name = (b.full_name || b.name || '').toLowerCase()
    const phone = (b.phone || '').toLowerCase()
    const idNum = (b.id_number || '').toLowerCase()
    return name.includes(q) || phone.includes(q) || idNum.includes(q)
  })

  // Customer initials
  const initials = selectedBuyer
    ? (selectedBuyer.full_name || selectedBuyer.name || 'ع')
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
    : ''

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">اختيار المشتري (العميل)</h2>
            <p className="text-[13px] font-medium text-[#64748B]">ابحث بالاسم أو رقم الهاتف أو الهوية الوطنية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="h-8 px-3 text-xs border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-bold rounded-xl gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
            <span>عميل جديد</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="h-8 px-2 text-xs text-[#64748B] hover:text-[#0F172A] rounded-lg gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Combobox Trigger Button */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(o => !o)}
          className={`flex w-full items-center justify-between rounded-xl border bg-slate-50/50 px-4 h-12 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            errorMsg ? 'border-rose-300 bg-rose-50/30' : 'border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          {selectedBuyer ? (
            <div className="flex items-center gap-3 truncate">
              <div className="h-7 w-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-800 shrink-0">
                {initials}
              </div>
              <span className="font-bold text-[#0F172A]">{selectedBuyer.full_name || selectedBuyer.name}</span>
              <span className="text-xs font-mono text-[#64748B]">— {selectedBuyer.phone}</span>
              {selectedBuyer.customer_type && (
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                  {selectedBuyer.customer_type === 'Company' ? 'شركة' : 'فرد'}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#94A3B8] font-medium text-xs">ابحث عن عميل بالاسم أو الهاتف...</span>
          )}

          <div className="flex items-center gap-2 shrink-0 ms-2">
            {selectedBuyerId && (
              <span
                role="button"
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation()
                  onSelectBuyer('')
                  handleSearchChange('')
                }}
                className="rounded-md p-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {errorMsg && <p className="text-[12px] font-medium text-rose-500 mt-1">{errorMsg}</p>}

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden p-2 space-y-2"
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-3 pb-2 pt-1">
              <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
              <input
                autoFocus
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="ابحث بالاسم أو الهوية أو رقم الهاتف..."
                className="flex-1 bg-transparent text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                dir="rtl"
              />
              {searchTerm && (
                <button type="button" onClick={() => handleSearchChange('')} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Customer List */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري البحث في سائل العملاء...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-4 px-3 text-center text-xs text-[#64748B] space-y-2">
                  <p>لم يتم العثور على عميل بهذا الاسم</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false)
                      setShowCreateModal(true)
                    }}
                    className="h-8 px-3 text-xs border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl gap-1"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>إضافة العميل الآن</span>
                  </Button>
                </div>
              ) : (
                filteredCustomers.map(buyer => {
                  const isSelected = String(buyer.id) === selectedBuyerId
                  const buyerInitials = (buyer.full_name || buyer.name || 'ع')
                    .split(' ')
                    .slice(0, 2)
                    .map(n => n[0])
                    .join('')

                  return (
                    <button
                      key={buyer.id}
                      type="button"
                      onClick={() => {
                        onSelectBuyer(String(buyer.id))
                        setIsOpen(false)
                        setSearchTerm('')
                      }}
                      className={`flex w-full items-center justify-between p-3 rounded-xl text-xs transition-all text-start ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                          : 'hover:bg-slate-50 text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {buyerInitials}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-2">
                            <span>{buyer.full_name || buyer.name}</span>
                            {buyer.customer_type && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                {buyer.customer_type === 'Company' ? 'شركة' : 'فرد'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B]">
                            الهاتف: {buyer.phone} | الهوية: {buyer.id_number || 'غير مسجلة'}
                          </div>
                        </div>
                      </div>

                      {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Customer Summary Card */}
      {selectedBuyer && (
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                {initials}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">{selectedBuyer.full_name || selectedBuyer.name}</h4>
                <p className="text-[11px] font-mono text-[#64748B]">{selectedBuyer.phone}</p>
              </div>
            </div>

            <a
              href={`/customers/${selectedBuyer.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
            >
              ملف العميل ↗
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">رقم الهوية الوطنية</span>
              <span className="font-bold font-mono text-[#0F172A]">{selectedBuyer.id_number || 'غير مسجلة'}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2 rounded-xl flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-[#64748B] block text-[10px] mb-1 font-medium">الرقم الضريبي للعميل (اختياري)</Label>
                <Input
                  type="text"
                  placeholder="الرقم الضريبي إن وجد..."
                  value={customerVatNumber}
                  onChange={e => setCustomerVatNumber(e.target.value)}
                  className="h-8 text-xs bg-slate-50 border-[#E2E8F0] rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Creation Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={newCustomer => {
          onSelectBuyer(String(newCustomer.id))
        }}
      />
    </div>
  )
}
