"use client"
import { useState } from 'react'

export default function SearchFilters({ onSearch }){
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const submit = (e) => {
    e?.preventDefault()
    onSearch({ q, status })
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 items-stretch">
      <input placeholder="ابحث برقم الشاصي، اللوحة، الماركة، الموديل، السنة" value={q} onChange={e=>setQ(e.target.value)} className="flex-1 p-3 rounded-lg bg-white/6 border border-white/6"/>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="p-3 rounded-lg bg-white/6 border border-white/6">
        <option value="">الكل</option>
        <option value="Available">متوفر</option>
        <option value="Reserved">محجوز</option>
        <option value="Sold">مباع</option>
      </select>
      <button type="submit" className="p-3 bg-gradient-to-br from-[#7C3CFF] to-[#24C8FF] rounded-lg font-bold">بحث</button>
    </form>
  )
}
