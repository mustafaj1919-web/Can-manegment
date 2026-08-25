'use client'

import { UserCheck } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface EmployeeOption {
  id: number | string
  fullName?: string
  full_name?: string
  FullName?: string
  title?: string
  Title?: string
}

interface SalesRepresentativeCardProps {
  employees: EmployeeOption[]
  salesRepId: string
  setSalesRepId: (id: string) => void
}

export function SalesRepresentativeCard({
  employees,
  salesRepId,
  setSalesRepId,
}: SalesRepresentativeCardProps) {
  const selectedEmp = employees.find(e => String(e.id) === salesRepId)
  const selectedName = selectedEmp ? (selectedEmp.fullName || selectedEmp.full_name || selectedEmp.FullName || '—') : ''
  const selectedTitle = selectedEmp ? (selectedEmp.title || selectedEmp.Title || 'مسؤول مبيعات') : ''

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
          <UserCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">مندوب المبيعات المسجل</h2>
          <p className="text-[13px] font-medium text-[#64748B]">تحديد الموظف المسؤول عن إتمام الصفقة لتسليم العمولات</p>
        </div>
      </div>

      <div className="space-y-3 text-start">
        <div>
          <Label className="text-xs font-semibold text-[#64748B] mb-1.5 block">اختيار المندوب (اختياري)</Label>
          <select
            value={salesRepId}
            onChange={e => setSalesRepId(e.target.value)}
            className="w-full h-12 rounded-xl border border-[#E2E8F0] bg-slate-50 px-4 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">— بدون مندوب محدد —</option>
            {employees.map(emp => {
              const name = emp.fullName || emp.full_name || emp.FullName || 'موظف'
              const title = emp.title || emp.Title || ''
              return (
                <option key={emp.id} value={String(emp.id)}>
                  {name} {title ? `— (${title})` : ''}
                </option>
              )
            })}
          </select>
        </div>

        {selectedEmp && (
          <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[#64748B] text-[11px] block">المندوب المختار</span>
              <span className="font-bold text-[#0F172A] text-sm">{selectedName}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-700 bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-lg">
              {selectedTitle}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
