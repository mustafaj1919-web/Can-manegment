'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Car, Plus, ArrowUpRight, Fuel, Palette } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn, formatMoney, photoUrl } from '@/lib/utils'
import { DashboardWidget } from './DashboardWidget'
import { getCars } from '@/lib/api/inventory'

const FUEL_AR: Record<string, string> = { Gasoline:'بنزين', Diesel:'ديزل', Hybrid:'هايبرد', Electric:'كهرباء' }

function CarTile({ car, index }: { car: any; index: number }) {
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:index*0.05 }}
      className="group relative rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ background:'var(--s2)', border:'1px solid var(--border-card)' }}>

      {/* Photo */}
      <div className="relative h-24 overflow-hidden" style={{ background:'var(--s3)' }}>
        {car.cover_photo
          ? <img src={photoUrl(car.cover_photo.filename, car.cover_photo.subfolder ?? 'vehicles')}
              alt={`${car.brand} ${car.model}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="h-full w-full flex items-center justify-center p-2 bg-[radial-gradient(circle_at_50%_110%,rgba(239,27,45,0.08),transparent_46%)]">
              <img src="/fallback_car.png" alt="Showroom Car" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_8px_16px_rgba(239,27,45,0.2)]" />
            </div>
        }
        {/* Status pip */}
        <div className="absolute bottom-0 inset-x-0 h-0.5" style={{
          background: car.status === 'Available' ? '#10b981' : car.status === 'Reserved' ? '#f59e0b' : '#cc2118'
        }} />
        {/* Price overlay */}
        {car.selling_price && (
          <div className="absolute bottom-1.5 end-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold money text-amber-400"
            style={{ background:'rgba(0,0,0,0.7)' }}>
            {formatMoney(car.selling_price, car.currency)}
          </div>
        )}
      </div>

      <div className="p-2.5">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{car.brand} {car.model}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{car.manufacturing_year}{car.color ? ` · ${car.color}` : ''}</p>
        <Link href={`/inventory/${car.id}`}
          className="absolute inset-0"
          aria-label={`عرض ${car.brand} ${car.model}`} />
      </div>
    </motion.div>
  )
}

function TileSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background:'var(--s2)', border:'1px solid var(--border-card)' }}>
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="p-2.5 space-y-1.5">
        <Skeleton className="h-3 w-3/4 rounded" />
        <Skeleton className="h-2.5 w-1/2 rounded" />
      </div>
    </div>
  )
}

export function InventoryPreviewWidget() {
  const { data: availData, isLoading: loadAvail } = useQuery({
    queryKey: ['dash-inv-avail'],
    queryFn:  () => getCars({ status:'Available', per_page:4, page:1 }),
    staleTime: 60_000, retry:1,
  })
  const { data: soldData, isLoading: loadSold } = useQuery({
    queryKey: ['dash-inv-sold'],
    queryFn:  () => getCars({ status:'Sold', per_page:4, page:1 }),
    staleTime: 60_000, retry:1,
  })

  const avail = availData?.items ?? []
  const sold  = soldData?.items  ?? []

  const actions = (
    <div className="flex items-center gap-1.5">
      <Button asChild size="sm" className="h-6 gap-1 text-[11px] bg-primary/90 hover:bg-primary text-white px-2.5 shadow-none">
        <Link href="/inventory/new"><Plus className="h-2.5 w-2.5" />إضافة</Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2">
        <Link href="/inventory">الكل<ArrowUpRight className="h-2.5 w-2.5" /></Link>
      </Button>
    </div>
  )

  return (
    <DashboardWidget title="المخزون" subtitle={`${availData?.total ?? 0} متاحة · ${soldData?.total ?? 0} مباعة`} icon={Car} action={actions} noPadding>
      <div className="dash-body space-y-4">

        {/* Available */}
        <div>
          <p className="dash-row-label mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            متاحة للبيع
          </p>
          {loadAvail ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Array.from({length:4}).map((_,i) => <TileSkeleton key={i} />)}
            </div>
          ) : avail.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-lg" style={{ background:'var(--s2)', border:'1px dashed var(--border-card)' }}>
              <Car className="h-7 w-7 text-muted-foreground/15 mb-2" />
              <p className="text-xs text-muted-foreground/60">لا توجد سيارات متاحة</p>
              <Button asChild size="sm" className="mt-2.5 h-7 gap-1 text-xs bg-primary/90 hover:bg-primary text-white px-3">
                <Link href="/inventory/new"><Plus className="h-3 w-3" />إضافة سيارة</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {avail.map((c: any, i: number) => <CarTile key={c.id} car={c} index={i} />)}
            </div>
          )}
        </div>

        {/* Sold */}
        {(sold.length > 0 || loadSold) && (
          <div style={{ borderTop:'1px solid var(--border-inner)', paddingTop:'1rem' }}>
            <p className="dash-row-label mb-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
              مباعة مؤخراً
            </p>
            {loadSold ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Array.from({length:4}).map((_,i) => <TileSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {sold.map((c: any, i: number) => <CarTile key={c.id} car={c} index={i} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardWidget>
  )
}
