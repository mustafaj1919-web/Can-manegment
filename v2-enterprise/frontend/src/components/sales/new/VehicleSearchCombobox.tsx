'use client'

import { useState, useRef, useEffect } from 'react'
import { Car, Check, ChevronDown, Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react'
import { CarOption } from '@/lib/api/sales'
import { formatNumber, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface VehicleSearchComboboxProps {
  cars: CarOption[]
  selectedCar?: CarOption
  selectedCarId: string
  onSelectCar: (carId: string) => void
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
  errorMsg?: string
}

export function VehicleSearchCombobox({
  cars,
  selectedCar,
  selectedCarId,
  onSelectCar,
  isLoading,
  isFetching,
  onRefresh,
  errorMsg,
}: VehicleSearchComboboxProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
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

  // Filter cars based on search term
  const filteredCars = cars.filter(c => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return (
      (c.brand || '').toLowerCase().includes(q) ||
      (c.model || '').toLowerCase().includes(q) ||
      (c.vin || '').toLowerCase().includes(q) ||
      (c.plate_number || '').toLowerCase().includes(q) ||
      String(c.manufacturing_year || '').includes(q)
    )
  })

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Car className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">اختيار السيارة</h2>
            <p className="text-[13px] font-medium text-[#64748B]">ابحث بالشاصي (VIN) أو الماركة أو رقم اللوحة</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="h-8 px-2 text-xs text-[#64748B] hover:text-[#0F172A] rounded-lg gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Combobox Search Trigger */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(o => !o)}
          className={`flex w-full items-center justify-between rounded-xl border bg-slate-50/50 px-4 h-12 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            errorMsg ? 'border-rose-300 bg-rose-50/30' : 'border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          {selectedCar ? (
            <div className="flex items-center gap-3 truncate">
              <span className="font-bold text-[#0F172A]">
                {selectedCar.brand} {selectedCar.model} {selectedCar.manufacturing_year}
              </span>
              <span className="text-xs font-mono font-semibold text-[#64748B] bg-slate-100 px-2 py-0.5 rounded-md">
                VIN: {selectedCar.vin}
              </span>
              {selectedCar.selling_price && (
                <span className="text-xs font-numeric font-bold text-emerald-600">
                  {formatMoney(selectedCar.selling_price, selectedCar.currency)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#94A3B8] font-medium text-xs">ابحث عن سيارة متاحة للبيع...</span>
          )}

          <div className="flex items-center gap-2 shrink-0 ms-2">
            {selectedCarId && (
              <span
                role="button"
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation()
                  onSelectCar('')
                  setSearchTerm('')
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
            {/* Inner Search Field */}
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-3 pb-2 pt-1">
              <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
              <input
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ادخل الماركة أو الموديل أو رقم الشاصي..."
                className="flex-1 bg-transparent text-xs text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                dir="rtl"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* List Items */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري تحميل السيارات المتاحة...</span>
                </div>
              ) : filteredCars.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#64748B]">لا توجد سيارات مطابقة للبحث</div>
              ) : (
                filteredCars.map(car => {
                  const isSelected = String(car.id) === selectedCarId
                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => {
                        onSelectCar(String(car.id))
                        setIsOpen(false)
                        setSearchTerm('')
                      }}
                      className={`flex w-full items-center justify-between p-3 rounded-xl text-xs transition-all text-start ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                          : 'hover:bg-slate-50 text-[#0F172A]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-2">
                          <span>
                            {car.brand} {car.model} {car.manufacturing_year}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                            متاحة
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          VIN: {car.vin} {car.plate_number ? `| اللوحة: ${car.plate_number}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {car.selling_price && (
                          <span className="font-numeric font-extrabold text-[#0F172A]">
                            {formatMoney(car.selling_price, car.currency)}
                          </span>
                        )}
                        {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Vehicle Compact Summary Card */}
      {selectedCar && (
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-[#0F172A]">بيانات السيارة المختارة</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              جاهزة للبيع
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">المركبة</span>
              <span className="font-bold text-[#0F172A]">{selectedCar.brand} {selectedCar.model}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">سنة الصنع / اللون</span>
              <span className="font-bold text-[#0F172A]">{selectedCar.manufacturing_year} — {selectedCar.color || 'غير محدد'}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">رقم الشاصي (VIN)</span>
              <span className="font-bold font-mono text-[#0F172A] truncate block">{selectedCar.vin}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-xl">
              <span className="text-[#64748B] block text-[11px] mb-0.5 font-medium">السعر المقترح</span>
              <span className="font-extrabold font-numeric text-emerald-600">
                {selectedCar.selling_price ? formatMoney(selectedCar.selling_price, selectedCar.currency) : 'حسب الاتفاق'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
