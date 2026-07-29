'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCustomer } from '@/lib/api/customers'
import { CustomerOption } from '@/lib/api/sales'
import { extractApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus, X } from 'lucide-react'

interface CreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newCustomer: CustomerOption) => void
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [customerType, setCustomerType] = useState<'Individual' | 'Company'>('Individual')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-search'] })
      toast.success(`تم إنشاء ملف العميل (${name}) بنجاح`)
      const createdObj: CustomerOption = {
        id: res.id || res.customerId,
        name: name,
        full_name: name,
        phone: phone,
        id_number: idNumber,
        customer_type: customerType,
      }
      onSuccess(createdObj)
      onClose()
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err))
    },
  })

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('أدخل اسم العميل')
    if (!phone.trim()) return toast.error('أدخل رقم الهاتف')
    if (!idNumber.trim()) return toast.error('أدخل رقم الهوية الوطنية')

    mutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      id_number: idNumber.trim(),
      customer_type: customerType,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden space-y-4 p-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">إضافة عميل جديد</h3>
              <p className="text-xs text-[#64748B]">إنشاء سجل عميل جديد وتحديده في الفاتورة مباشرة</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1 text-start">
            <Label className="text-xs font-semibold text-[#64748B]">اسم العميل الكامل *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="أدخل اسم العميل الرباعي..."
              className="h-11 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#64748B]">رقم الهاتف *</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0770xxxxxxx"
                className="h-11 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#64748B]">رقم الهوية / الوطنية *</Label>
              <Input
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                placeholder="أدخل رقم الهوية..."
                className="h-11 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-start">
            <Label className="text-xs font-semibold text-[#64748B]">تصنيف العميل</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCustomerType('Individual')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  customerType === 'Individual'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : 'bg-slate-50 border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                فرد (شخص)
              </button>

              <button
                type="button"
                onClick={() => setCustomerType('Company')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  customerType === 'Company'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : 'bg-slate-50 border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                شركة / مؤسسة
              </button>
            </div>
          </div>

          <div className="space-y-1 text-start">
            <Label className="text-xs font-semibold text-[#64748B]">ملاحظات (اختياري)</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات العميل..."
              className="h-11 rounded-xl border-[#E2E8F0] bg-slate-50 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 font-bold min-w-[120px]"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ واختيار'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
