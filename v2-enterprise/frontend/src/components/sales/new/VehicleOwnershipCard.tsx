'use client'

import React from 'react'
import { User, Building2, ShieldCheck, FileText, ExternalLink, Check, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { SHOWROOM } from '@/lib/showroom-config'

export interface SupplierOption {
  id: string | number
  name: string
  code?: string
  phone?: string
  address?: string
}

export interface CustomerSellerOption {
  id: string | number
  name: string
  full_name?: string | null
  phone?: string
  id_number?: string
}

export interface VehicleOwnershipCardProps {
  ownershipType: number // 1 = PERSON, 2 = SUPPLIER, 3 = COMPANY
  setOwnershipType: (val: number) => void
  ownerPersonName: string
  setOwnerPersonName: (val: string) => void
  ownerPersonPhone: string
  setOwnerPersonPhone: (val: string) => void
  ownerPersonIdNumber: string
  setOwnerPersonIdNumber: (val: string) => void
  ownerNotes: string
  setOwnerNotes: (val: string) => void
  supplierId: string
  setSupplierId: (val: string) => void
  supplierReference: string
  setSupplierReference: (val: string) => void
  suppliers?: SupplierOption[]
  customersAsSellers?: CustomerSellerOption[]
}

export function VehicleOwnershipCard({
  ownershipType,
  setOwnershipType,
  ownerPersonName,
  setOwnerPersonName,
  ownerPersonPhone,
  setOwnerPersonPhone,
  ownerPersonIdNumber,
  setOwnerPersonIdNumber,
  ownerNotes,
  setOwnerNotes,
  supplierId,
  setSupplierId,
  supplierReference,
  setSupplierReference,
  suppliers = [],
  customersAsSellers = []
}: VehicleOwnershipCardProps) {

  // Selected quick seller key for single dropdown
  const [selectedQuickSellerKey, setSelectedQuickSellerKey] = React.useState<string>('company')

  const handleQuickSellerChange = (key: string) => {
    setSelectedQuickSellerKey(key)

    if (key === 'company') {
      setOwnershipType(3)
      setOwnerPersonName('')
      setOwnerPersonPhone('')
      setOwnerPersonIdNumber('')
      setSupplierId('')
    } else if (key.startsWith('supplier-')) {
      const id = key.replace('supplier-', '')
      const s = suppliers.find(x => String(x.id) === id)
      setOwnershipType(2)
      setSupplierId(id)
      if (s) {
        setSupplierReference(s.code ? `REF-${s.code}` : '')
      }
      setOwnerPersonName('')
      setOwnerPersonPhone('')
      setOwnerPersonIdNumber('')
    } else if (key.startsWith('person-')) {
      const id = key.replace('person-', '')
      const p = customersAsSellers.find(x => String(x.id) === id)
      setOwnershipType(1)
      if (p) {
        setOwnerPersonName(p.full_name || p.name || '')
        setOwnerPersonPhone(p.phone || '')
        setOwnerPersonIdNumber(p.id_number || '')
      }
      setSupplierId('')
    } else if (key === 'custom-person') {
      setOwnershipType(1)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
      
      {/* Header with Title + Link to Sellers/Suppliers Directory */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0F223D]/10 flex items-center justify-center text-[#0F223D]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">بيانات البائع / ملكية السيارة قبل البيع</h3>
            <p className="text-xs text-slate-500">تحديد الجهة أو الشخص المسجلة باسمه السيارة (السنوية)</p>
          </div>
        </div>

        {/* Directory Management Button */}
        <Link
          href="/suppliers"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0F223D] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>إدارة الموردين والبائعين</span>
        </Link>
      </div>

      {/* ─── QUICK SELECTION DROPDOWN (مثل اختر موظف / اختر البائع) ─── */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#0F223D]">
            اختر البائع / المالك المسجل في النظام:
          </label>
          <span className="text-[11px] text-slate-500">اختيار سريع بنقرة واحدة</span>
        </div>

        <select
          value={selectedQuickSellerKey}
          onChange={e => handleQuickSellerChange(e.target.value)}
          className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#0F223D] outline-none shadow-sm cursor-pointer"
        >
          <optgroup label="🏢 ملكية المعرض الرسمية">
            <option value="company">🏢 {SHOWROOM.name} (ملك المعرض المباشر)</option>
          </optgroup>

          {suppliers.length > 0 && (
            <optgroup label="🏭 الشركات الموردة المسجلة في النظام">
              {suppliers.map(s => (
                <option key={`supplier-${s.id}`} value={`supplier-${s.id}`}>
                  🏭 {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </optgroup>
          )}

          {customersAsSellers.length > 0 && (
            <optgroup label="👤 البائعون والمالكون الأشخاص المسجلون">
              {customersAsSellers.map(p => (
                <option key={`person-${p.id}`} value={`person-${p.id}`}>
                  👤 {p.full_name || p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </optgroup>
          )}

          <optgroup label="✍️ إدخال يدوي شخصي">
            <option value="custom-person">✍️ إضافة مالك شخصي جديد (يدوي)...</option>
          </optgroup>
        </select>
      </div>

      {/* Selector Tabs (Company, Person, Supplier) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleQuickSellerChange('company')}
          className={`flex items-center gap-3 p-3.5 rounded-lg border text-right transition-all ${
            ownershipType === 3
              ? 'border-[#0F223D] bg-[#0F223D]/5 text-[#0F223D] font-bold shadow-sm'
              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
          }`}
        >
          <Building2 className="w-5 h-5 text-[#0F223D] shrink-0" />
          <div>
            <div className="text-sm">باسم الشركة</div>
            <div className="text-[11px] text-slate-500 font-normal">ملك المعرض المباشر</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setOwnershipType(1)
            setSelectedQuickSellerKey('custom-person')
          }}
          className={`flex items-center gap-3 p-3.5 rounded-lg border text-right transition-all ${
            ownershipType === 1
              ? 'border-[#0F223D] bg-[#0F223D]/5 text-[#0F223D] font-bold shadow-sm'
              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
          }`}
        >
          <User className="w-5 h-5 text-[#0F223D] shrink-0" />
          <div>
            <div className="text-sm">باسم شخص</div>
            <div className="text-[11px] text-slate-500 font-normal">مالك فردي / وكالة</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setOwnershipType(2)
            if (suppliers.length > 0 && !supplierId) {
              handleQuickSellerChange(`supplier-${suppliers[0].id}`)
            }
          }}
          className={`flex items-center gap-3 p-3.5 rounded-lg border text-right transition-all ${
            ownershipType === 2
              ? 'border-[#0F223D] bg-[#0F223D]/5 text-[#0F223D] font-bold shadow-sm'
              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
          }`}
        >
          <FileText className="w-5 h-5 text-[#0F223D] shrink-0" />
          <div>
            <div className="text-sm">باسم المورّد</div>
            <div className="text-[11px] text-slate-500 font-normal">شركة استيراد / مورد</div>
          </div>
        </button>
      </div>

      {/* Dynamic Fields */}
      {ownershipType === 1 && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-bold text-[#0F223D]">بيانات الشخص المالك قبل البيع (الطرف الأول)</h4>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              سيظهر كـ بائع رسمياً بالعقد
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المالك السابق *</label>
              <input
                type="text"
                value={ownerPersonName}
                onChange={e => setOwnerPersonName(e.target.value)}
                placeholder="أدخل الاسم الثلاثي للمالك"
                className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#0F223D] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={ownerPersonPhone}
                onChange={e => setOwnerPersonPhone(e.target.value)}
                placeholder="0770..."
                className="w-full text-sm border border-slate-300 rounded-md p-2 dir-ltr text-right focus:ring-1 focus:ring-[#0F223D] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهوية / الوطنية</label>
              <input
                type="text"
                value={ownerPersonIdNumber}
                onChange={e => setOwnerPersonIdNumber(e.target.value)}
                placeholder="رقم البطاقة"
                className="w-full text-sm border border-slate-300 rounded-md p-2 dir-ltr text-right focus:ring-1 focus:ring-[#0F223D] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التوثيق والوكالة</label>
            <input
              type="text"
              value={ownerNotes}
              onChange={e => setOwnerNotes(e.target.value)}
              placeholder="مثال: السيارة مباعة بموجب وكالة خاصة رقم 1234"
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#0F223D] outline-none"
            />
          </div>
        </div>
      )}

      {ownershipType === 2 && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-bold text-[#0F223D]">بيانات المورّد المصدر (الطرف الأول)</h4>
            <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              شركة موردة بالعقد
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اختر المورّد</label>
              <select
                value={supplierId}
                onChange={e => handleQuickSellerChange(`supplier-${e.target.value}`)}
                className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#0F223D] outline-none bg-white font-bold"
              >
                <option value="">-- اختر المورّد المسجل --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم مرجع الفاتورة / التوريد</label>
              <input
                type="text"
                value={supplierReference}
                onChange={e => setSupplierReference(e.target.value)}
                placeholder="مثال: SUP-INV-2026-009"
                className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-[#0F223D] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {ownershipType === 3 && (
        <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0F223D] shrink-0" />
            <span>سيتم توثيق الطرف الأول كـ <b>{SHOWROOM.name}</b> (ملك المعرض المباشر).</span>
          </div>
          <span className="font-bold text-[#0F223D] bg-white px-2 py-1 rounded border border-blue-200 shrink-0">المعرض الرئيسي</span>
        </div>
      )}
    </div>
  )
}
