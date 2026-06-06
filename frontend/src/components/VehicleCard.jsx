"use client"
import Link from 'next/link'
import { formatNumber } from '@/lib/utils'

export default function VehicleCard({ vehicle }){
  return (
    <div className="bg-white/4 border border-white/6 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-lg transition">
      <div className="h-40 bg-white/6 rounded-lg flex items-center justify-center">صورة السيارة</div>
      <div className="flex justify-between items-start">
        <div>
          <div className="font-extrabold">{vehicle.brand} {vehicle.model} ({vehicle.manufacturing_year || ''})</div>
          <div className="text-sm text-white/70">الشاصي: {vehicle.vin}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/80">{formatNumber(vehicle.selling_price)} د.ع</div>
          <div className="text-xs text-white/60">{formatNumber(vehicle.purchase_price)} $</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/inventory/${vehicle.id}`} className="p-2 bg-white/6 rounded-md">عرض</Link>
      </div>
    </div>
  )
}
