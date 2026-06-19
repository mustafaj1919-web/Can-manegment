'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Truck } from 'lucide-react'
import { createSupplier } from '@/lib/api/purchases'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface QuickSupplierDialogProps {
  onSuccess: (supplierId: string) => void
}

export function QuickSupplierDialog({ onSuccess }: QuickSupplierDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: (res) => {
      toast.success('تم إضافة المورد بنجاح')
      queryClient.invalidateQueries({ queryKey: ['purchase-sellers'] })
      onSuccess(res.id)
      setOpen(false)
      setName(''); setPhone(''); setAddress(''); setErrors({})
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'تعذّر إضافة المورد')
    },
  })

  function handleSubmit() {
    const next: Record<string, string> = {}
    if (!name.trim())  next.name  = 'اسم المورد مطلوب'
    if (!phone.trim()) next.phone = 'رقم الهاتف مطلوب'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    mutation.mutate({ name: name.trim(), phone: phone.trim(), address: address.trim() || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          إضافة مورد
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-cyan-400" />
            إضافة مورد جديد
          </DialogTitle>
          <DialogDescription>سجّل بيانات المورد (البائع) لاستخدامه في فواتير الشراء.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">اسم المورد *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المورد" />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">رقم الهاتف *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXXX" />
            {errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">العنوان</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="اختياري" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ المورد
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
