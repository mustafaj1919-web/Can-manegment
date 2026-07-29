import React from 'react'
import type { VehicleReceiptInfo } from '../installmentReceiptTypes'
import { InfoCard } from './InfoCard'
import { Field } from './Field'

interface VehicleCardProps {
  vehicle?: VehicleReceiptInfo | null
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  if (!vehicle) {
    return (
      <InfoCard title="المركبة">
        <p className="col-span-2 text-[10px] text-[#9CA3AF]">لا توجد بيانات مركبة</p>
      </InfoCard>
    )
  }

  const displayName = vehicle.name || [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')
  const metaLine = [
    vehicle.color ? `اللون: ${vehicle.color}` : null,
    vehicle.engineSize ? `المحرك: ${vehicle.engineSize}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <InfoCard title="المركبة">
      <Field label="نوع المركبة" value={displayName} span={2} emphasis />
      <Field label="رقم الهيكل" value={vehicle.vin} mono dir="ltr" />
      <Field label="رقم اللوحة" value={vehicle.plateNumber} mono dir="ltr" />
      {metaLine && (
        <p className="col-span-2 text-[8.5px] text-[#9CA3AF] font-medium truncate mt-0.5">{metaLine}</p>
      )}
    </InfoCard>
  )
}
