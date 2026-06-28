'use client'

import React, { useState, useEffect } from 'react'
import { useBranchStore } from '@/lib/stores/branch-store'
import {
  Car,
  MapPin,
  Trash2,
  Search,
  Sparkles,
  Move,
  Check,
  ChevronLeft,
  X,
  Compass,
  LayoutGrid
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatMoney } from '@/lib/utils'

// Types representing cars from the backend inventory
export interface PlannerCar {
  id: string
  brand?: string
  model: string
  year: number
  color?: string
  chassisNumber: string
  plateNumber?: string
  sellingPrice?: number
  currency?: 'USD' | 'IQD'
  status: string // Available, Sold, Reserved
  coverPhoto?: {
    filename: string
    subfolder?: string
  }
}

interface ShowroomPlannerProps {
  cars: PlannerCar[]
}

// 16 parking spots split into two zones
const SPOTS_ZONE_A = Array.from({ length: 8 }, (_, i) => `A-${i + 1}`)
const SPOTS_ZONE_B = Array.from({ length: 8 }, (_, i) => `B-${i + 1}`)

export function ShowroomPlanner({ cars }: ShowroomPlannerProps) {
  const activeBranch = useBranchStore((s) => s.activeBranch)
  const branchId = activeBranch?.id ? String(activeBranch.id) : 'default'
  const layoutKey = `showroom-layout-${branchId}`

  // Layout state: Mapping of { [spotId]: carId }
  const [layout, setLayout] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [draggedCarId, setDraggedCarId] = useState<string | null>(null)

  // Load layout from localStorage when branch changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(layoutKey)
      if (saved) {
        setLayout(JSON.parse(saved))
      } else {
        setLayout({})
      }
    } catch {
      setLayout({})
    }
  }, [layoutKey])

  // Save layout helper
  const saveLayout = (newLayout: Record<string, string>) => {
    setLayout(newLayout)
    try {
      localStorage.setItem(layoutKey, JSON.stringify(newLayout))
    } catch (e) {
      console.error('Failed to save showroom layout', e)
    }
  }

  // Filter available cars in this branch
  const availableCars = cars.filter(c => c.status === 'Available')

  // Find which cars are already parked
  const parkedCarIds = new Set(Object.values(layout))

  // Unassigned cars (available cars not in the layout)
  const unassignedCars = availableCars.filter(
    c => !parkedCarIds.has(c.id) &&
    (searchQuery === '' ||
      `${c.brand} ${c.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.chassisNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Assign a car to a spot
  const assignCar = (spotId: string, carId: string) => {
    // Check if car is already in another spot, if so, remove it
    const updated = { ...layout }
    Object.keys(updated).forEach(k => {
      if (updated[k] === carId) delete updated[k]
    })
    
    updated[spotId] = carId
    saveLayout(updated)
    setSelectedCarId(null)
    setDraggedCarId(null)
    toast.success('تم ركن السيارة في الموقف المحدد بنجاح.')
  }

  // Unassign/release a car from a spot
  const releaseSpot = (spotId: string) => {
    const updated = { ...layout }
    delete updated[spotId]
    saveLayout(updated)
    toast.info('تم إخلاء الموقف وإعادة السيارة للمخزن.')
  }

  // Reset entire layout
  const clearLayout = () => {
    if (window.confirm('هل أنت متأكد من إخلاء كافة مواقف صالة العرض بالكامل؟')) {
      saveLayout({})
      toast.info('تم تفريغ مخطط صالة العرض بالكامل.')
    }
  }

  // Handle HTML5 Drag and Drop
  const handleDragStart = (carId: string) => {
    setDraggedCarId(carId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (spotId: string) => {
    const carId = draggedCarId || selectedCarId
    if (carId) {
      assignCar(spotId, carId)
    }
  }

  // Helper to render a car card parked in a spot
  const renderParkedCar = (carId: string, spotId: string) => {
    const car = availableCars.find(c => c.id === carId)
    if (!car) {
      // If car was sold/deleted or no longer available, clean up the slot
      setTimeout(() => {
        const updated = { ...layout }
        delete updated[spotId]
        saveLayout(updated)
      }, 0)
      return null
    }

    const title = `${car.brand ?? ''} ${car.model}`
    const photoUrl = car.coverPhoto 
      ? `/static/uploads/${car.coverPhoto.subfolder ?? 'vehicles'}/${car.coverPhoto.filename}`
      : '/fallback_car.png'

    return (
      <div className="relative h-full w-full group rounded-xl overflow-hidden bg-bg-surface border border-subtle transition-all duration-200 hover:shadow-md">
        {/* Car Photo */}
        <div className="relative h-[80px] w-full bg-zinc-900 overflow-hidden">
          <img
            src={photoUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/fallback_car.png'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <span className="absolute top-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white shadow">
            ✓
          </span>
          <span className="absolute bottom-1 right-2 text-[10px] font-bold text-white truncate max-w-[90%]">
            {title}
          </span>
        </div>

        {/* Details and release action */}
        <div className="p-2 space-y-1 text-right">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span className="font-mono font-medium">{car.chassisNumber.substring(0, 8)}</span>
            <span className="font-semibold text-foreground/80">{car.color || 'اللون غير محدد'}</span>
          </div>
          <p className="text-[10px] font-bold text-primary font-numeric tabular-nums">
            {car.sellingPrice ? formatMoney(car.sellingPrice, car.currency) : 'سعر غير محدد'}
          </p>
        </div>

        {/* Hover/Action overlay */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <p className="text-[10px] font-bold text-white text-center">{title}</p>
          <button
            onClick={() => releaseSpot(spotId)}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[9px] px-2 py-1 shadow-sm transition-colors"
          >
            <Trash2 className="h-2.5 w-2.5" />
            إخلاء الموقف
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" dir="rtl">
      
      {/* ─── Right Sidebar: Unassigned Cars ─── */}
      <div className="lg:col-span-1 border border-border/50 rounded-2xl p-4 bg-card shadow-xs flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
        <div className="space-y-3 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground font-family-cairo flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4 text-primary" />
              السيارات الجاهزة للركن
            </h3>
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-secondary/80 text-[10px] font-bold text-muted-foreground px-2 font-numeric tabular-nums">
              {unassignedCars.length} سيارة
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            اسحب سيارة من القائمة وأفلتها في أحد المواقف، أو اضغط عليها ثم اختر الموقف.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="ابحث بالماركة، الموديل، الشاصي..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pr-8 pl-3 py-2 bg-secondary/30 border border-border/60 focus:border-primary/50 focus:ring-0 rounded-lg outline-none transition-colors"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
          {unassignedCars.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-70">
              <Car className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-bold text-muted-foreground">لا توجد سيارات شاغرة</p>
              <p className="text-[9px] text-muted-foreground/80 mt-0.5">كافة السيارات المتوفرة تم ركنها في الصالة.</p>
            </div>
          ) : (
            unassignedCars.map(car => {
              const isSelected = selectedCarId === car.id
              const title = `${car.brand ?? ''} ${car.model}`
              const photoUrl = car.coverPhoto
                ? `/static/uploads/${car.coverPhoto.subfolder ?? 'vehicles'}/${car.coverPhoto.filename}`
                : '/fallback_car.png'

              return (
                <div
                  key={car.id}
                  draggable
                  onDragStart={() => handleDragStart(car.id)}
                  onClick={() => setSelectedCarId(isSelected ? null : car.id)}
                  className={cn(
                    'flex items-center gap-2.5 p-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-xs group',
                    isSelected
                      ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/40 bg-secondary/10 hover:border-border/80'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative h-11 w-16 shrink-0 rounded-lg overflow-hidden border border-border bg-zinc-950">
                    <img
                      src={photoUrl}
                      alt={title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/fallback_car.png'
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-right space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-bold text-foreground truncate">{title}</p>
                      <span className="text-[9px] font-family-cairo font-semibold text-muted-foreground/80 shrink-0">
                        {car.year}
                      </span>
                    </div>
                    <p className="text-[8px] font-mono text-muted-foreground truncate">{car.chassisNumber}</p>
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-primary font-numeric tabular-nums">
                        {car.sellingPrice ? formatMoney(car.sellingPrice, car.currency) : 'غير محدد'}
                      </span>
                      <span className="text-[9px] text-foreground/70 font-semibold">{car.color}</span>
                    </div>
                  </div>

                  {/* Grab icon indicator */}
                  <div className="text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors shrink-0">
                    {isSelected ? (
                      <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center animate-pulse">
                        <Check className="h-3 w-3" />
                      </div>
                    ) : (
                      <Move className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ─── Left Canvas: 2D Showroom grid mapping ─── */}
      <div className="lg:col-span-3 border border-border/50 rounded-2xl p-5 bg-card/85 shadow-xs flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
        {/* Header toolbar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-5">
          <div>
            <h3 className="text-sm font-bold text-foreground font-family-cairo flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-emerald-500 animate-spin-slow" />
              مخطط تموضع السيارات بـ {activeBranch?.name ?? 'الفرع الرئيسي'}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              تنظيم المواقف وركن السيارات بصرياً لتوزيع صالة العرض والساحة الخارجية.
            </p>
          </div>
          <button
            onClick={clearLayout}
            disabled={Object.keys(layout).length === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-bold text-[10px] px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3 w-3" />
            إخلاء الصالة
          </button>
        </div>

        {/* Content grid with zones */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* ZONE A: صالة العرض الرئيسية */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 bg-secondary/25 py-1 px-2.5 rounded-lg border border-border/40 w-fit">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              صالة العرض الرئيسية (Main Showroom)
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SPOTS_ZONE_A.map(spotId => {
                const carId = layout[spotId]
                const isOccupied = !!carId
                const isSelectedForSpot = selectedCarId !== null

                return (
                  <div
                    key={spotId}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(spotId)}
                    onClick={() => {
                      if (selectedCarId && !isOccupied) {
                        assignCar(spotId, selectedCarId)
                      }
                    }}
                    className={cn(
                      'relative h-[135px] rounded-xl flex items-center justify-center transition-all duration-200',
                      isOccupied 
                        ? 'bg-bg-surface border border-default' 
                        : isSelectedForSpot
                          ? 'border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70 hover:bg-emerald-500/10 cursor-pointer animate-pulse'
                          : 'border-2 border-dashed border-border/40 hover:border-border/80 bg-secondary/5'
                    )}
                  >
                    {/* Spot label in background */}
                    <div className="absolute top-1.5 left-2 text-[9px] font-bold text-muted-foreground/55 z-10 font-mono select-none">
                      موقف {spotId}
                    </div>

                    {isOccupied ? (
                      renderParkedCar(carId, spotId)
                    ) : (
                      <div className="text-center p-3 opacity-45 group hover:opacity-80 transition-opacity">
                        <MapPin className="h-6 w-6 text-muted-foreground/60 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-family-cairo font-bold text-muted-foreground">موقف شاغر</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ZONE B: الساحة الخارجية */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 bg-secondary/25 py-1 px-2.5 rounded-lg border border-border/40 w-fit">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              الساحة الخارجية والمخزن (Outdoor Lot)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SPOTS_ZONE_B.map(spotId => {
                const carId = layout[spotId]
                const isOccupied = !!carId
                const isSelectedForSpot = selectedCarId !== null

                return (
                  <div
                    key={spotId}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(spotId)}
                    onClick={() => {
                      if (selectedCarId && !isOccupied) {
                        assignCar(spotId, selectedCarId)
                      }
                    }}
                    className={cn(
                      'relative h-[135px] rounded-xl flex items-center justify-center transition-all duration-200',
                      isOccupied 
                        ? 'bg-bg-surface border border-default' 
                        : isSelectedForSpot
                          ? 'border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70 hover:bg-emerald-500/10 cursor-pointer animate-pulse'
                          : 'border-2 border-dashed border-border/40 hover:border-border/80 bg-secondary/5'
                    )}
                  >
                    {/* Spot label in background */}
                    <div className="absolute top-1.5 left-2 text-[9px] font-bold text-muted-foreground/55 z-10 font-mono select-none">
                      موقف {spotId}
                    </div>

                    {isOccupied ? (
                      renderParkedCar(carId, spotId)
                    ) : (
                      <div className="text-center p-3 opacity-45 group hover:opacity-80 transition-opacity">
                        <MapPin className="h-6 w-6 text-muted-foreground/60 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-family-cairo font-bold text-muted-foreground">موقف شاغر</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
