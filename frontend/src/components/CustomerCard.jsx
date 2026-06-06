"use client"
import Link from 'next/link'

export default function CustomerCard({ c }){
  return (
    <div className="bg-white/4 border border-white/6 rounded-2xl p-4 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-extrabold">{c.full_name || c.name}</div>
          <div className="text-sm text-white/70">الهاتف: {c.phone}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/80">#{c.id}</div>
          <Link href={`/customers/${c.id}`} className="mt-2 inline-block p-2 bg-white/6 rounded-md">عرض الملف</Link>
        </div>
      </div>
    </div>
  )
}
