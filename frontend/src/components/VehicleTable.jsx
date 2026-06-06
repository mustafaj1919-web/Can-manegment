"use client"
import Link from 'next/link'
import { formatNumber } from '@/lib/utils'

export default function VehicleTable({ items }){
  return (
    <div className="overflow-x-auto bg-white/3 rounded-xl p-3">
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-white/80">
            <th className="p-2">الموديل</th>
            <th className="p-2">الشاصي</th>
            <th className="p-2">اللوحة</th>
            <th className="p-2">سعر البيع (د.ع)</th>
            <th className="p-2">الحالة</th>
            <th className="p-2">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {items.map(v=> (
            <tr key={v.id} className="border-t border-white/6 hover:bg-white/2">
              <td className="p-2">{v.brand} {v.model} {v.manufacturing_year || ''}</td>
              <td className="p-2">{v.vin}</td>
              <td className="p-2">{v.plate_number || '-'}</td>
              <td className="p-2">{formatNumber(v.selling_price)}</td>
              <td className="p-2">{v.status}</td>
              <td className="p-2"><Link href={`/inventory/${v.id}`} className="px-3 py-1 bg-white/6 rounded-md">تفاصيل</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
