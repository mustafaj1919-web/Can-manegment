'use client'

import { useState, useEffect } from 'react'
import { Car, Search, AlertCircle, CheckCircle2, Lock, ShieldAlert, History, Layers, Loader2, ArrowRight } from 'lucide-react'
import { getCustomerPurchasedVehicles, CustomerPurchasedVehicle } from '@/lib/api/customers'
import { formatMoney, cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CustomerVehicleHistorySelectorProps {
  customerId: string
  customerName: string
  selectedVehicleId?: string
  onSelectVehicle: (vehicle: CustomerPurchasedVehicle | null) => void
  onModeChange: (mode: 'history' | 'manual') => void
}

export function CustomerVehicleHistorySelector({
  customerId,
  customerName,
  selectedVehicleId,
  onSelectVehicle,
  onModeChange,
}: CustomerVehicleHistorySelectorProps) {
  const [mode, setMode] = useState<'history' | 'manual'>('history')
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<CustomerPurchasedVehicle[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) return

    setLoading(true)
    setError(null)
    onSelectVehicle(null)

    getCustomerPurchasedVehicles(customerId)
      .then((data) => {
        setVehicles(data)
        setLoading(false)
      })
      .catch((err) => {
        setError('تعذر تحميل سيارات الزبون، يرجى إعادة المحاولة')
        setLoading(false)
      })
  }, [customerId])

  function handleSwitchMode(newMode: 'history' | 'manual') {
    setMode(newMode)
    onModeChange(newMode)
    if (newMode === 'manual') {
      onSelectVehicle(null)
    }
  }

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q) ||
      v.chassisNumber.toLowerCase().includes(q) ||
      v.saleContractNumber.toLowerCase().includes(q) ||
      (v.plateNumber && v.plateNumber.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/10 p-4">
      {/* Mode Selection Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="text-xs font-bold text-foreground">مصدر السيارة من الزبون</h3>
            <p className="text-[11px] text-muted-foreground">اختر إعادة شراء سيارة مباعة سابقاً أو تسجيل سيارة خارجية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchMode('history')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              mode === 'history'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60'
            )}
          >
            <Car className="h-3.5 w-3.5" />
            <span>مشتريات الزبون السابقة ({vehicles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('manual')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              mode === 'manual'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>سيارة غير مباعة سابقاً من المعرض</span>
          </button>
        </div>
      </div>

      {/* Mode: Historical Vehicles */}
      {mode === 'history' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              <span>جاري تحميل سجل مبيعات الزبون...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-center text-xs text-rose-300">
              <p>{error}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  setLoading(true)
                  getCustomerPurchasedVehicles(customerId).then(setVehicles).finally(() => setLoading(false))
                }}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-6 text-center space-y-3">
              <Car className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">لا توجد سيارات مباعة سابقاً لهذا الزبون</p>
                <p className="text-xs text-muted-foreground">لم يقم الزبون "{customerName}" بشراء أي سيارة من المعرض من قبل.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSwitchMode('manual')}
                className="gap-2 text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              >
                شراء سيارة غير مباعة سابقاً من المعرض (شراء خارجي)
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search Filter for History */}
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="تصفية حسب الماركة، الموديل، رقم الشاصي، رقم اللوحة، أو عقد البيع..."
                  className="h-9 pr-9 bg-secondary/30 text-xs border-border/60"
                />
              </div>

              {/* Vehicles Grid / List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {filteredVehicles.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">لا توجد سيارة تطابق تصفية البحث</p>
                ) : (
                  filteredVehicles.map((v) => {
                    const isSelected = selectedVehicleId === v.vehicleId
                    return (
                      <div
                        key={v.saleContractId}
                        className={cn(
                          'flex flex-col gap-3 rounded-lg border p-3 transition-all sm:flex-row sm:items-center sm:justify-between',
                          isSelected
                            ? 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/40'
                            : v.eligibleForBuyback
                            ? 'border-border/60 bg-card hover:border-amber-500/40 hover:bg-secondary/40'
                            : 'border-border/40 bg-secondary/20 opacity-70'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-amber-400 font-bold">
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">
                                {v.make} {v.model} {v.year}
                              </span>
                              {v.trim && <span className="text-xs text-muted-foreground">({v.trim})</span>}
                              {v.color && (
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {v.color}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                              <span className="font-mono text-[11px]">الشاصي: {v.vin}</span>
                              <span className="text-amber-400/80 font-mono">عقد: #{v.saleContractNumber}</span>
                              <span>تاريخ البيع: {new Date(v.saleDate).toLocaleDateString('ar-IQ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 border-border/40 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] text-muted-foreground">سعر البيع السابق</p>
                            <p className="font-bold text-xs font-numeric text-foreground money">
                              {formatMoney(v.previousSalePrice, 'IQD')}
                            </p>
                          </div>

                          {v.eligibleForBuyback ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => onSelectVehicle(isSelected ? null : v)}
                              className={cn(
                                'gap-1.5 text-xs h-8',
                                isSelected
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-amber-600 text-white hover:bg-amber-500'
                              )}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  محددة لإعادة الشراء
                                </>
                              ) : (
                                <>
                                  <Car className="h-3.5 w-3.5" />
                                  اختر لإعادة الشراء
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>{v.ineligibilityReason || 'غير متاحة لإعادة الشراء'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode: Manual External Vehicle */}
      {mode === 'manual' && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-blue-200">السيارة غير مباعة سابقاً من المعرض (شراء خارجي)</p>
            <p className="text-[11px] text-blue-300/80">
              يتم الشراء مباشرة من الزبون لسيارة اقتناها من خارج المعرض. يرجى إدخال كافة مواصفات السيارة ورقم الشاصي في الاستمارة أدناه.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
