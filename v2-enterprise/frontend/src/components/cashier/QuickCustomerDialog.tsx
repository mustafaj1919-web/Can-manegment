'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, UserPlus } from 'lucide-react'
import { createCustomer } from '@/lib/api/customers'
import type { Customer } from '@/lib/api/customers'
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

interface QuickCustomerDialogProps {
  onSuccess: (customer: Customer) => void
}

export function QuickCustomerDialog({ onSuccess }: QuickCustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCustomer) => {
      toast.success('تم إضافة العميل بنجاح')
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onSuccess(newCustomer)
      setOpen(false)
      // Reset form
      setName('')
      setPhone('')
      setIdNumber('')
      setAddress('')
      setErrors({})
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? err?.message ?? 'حدث خطأ أثناء إضافة العميل'
      toast.error(msg)
    },
  })

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'الاسم مطلوب'
    if (!phone.trim()) errs.phone = 'رقم الهاتف مطلوب'
    if (!idNumber.trim()) errs.idNumber = 'رقم الهوية مطلوب'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    mutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      id_number: idNumber.trim(),
      customer_type: 'Buyer',
      address: address.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          id="btn-quick-customer"
          type="button" 
          variant="outline" 
          size="sm" 
          className="gap-1.5 h-9 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          <UserPlus className="h-4 w-4" />
          <span>إضافة عميل سريع</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/5 px-1.5 font-mono text-[9px] font-medium text-cyan-400">
            F2
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="font-family-cairo text-lg font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cyan-400" />
            إضافة عميل جديد
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            أدخل البيانات الأساسية للعميل المشتري لإنشائه وتحديده فوراً في الفاتورة.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="quick-name" className="text-xs text-muted-foreground">اسم العميل بالكامل *</Label>
            <Input
              id="quick-name"
              placeholder="مثال: مصطفى علي محمد"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-rose-500/50' : 'border-border/50 bg-secondary/20'}
            />
            {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-phone" className="text-xs text-muted-foreground">رقم الهاتف *</Label>
            <Input
              id="quick-phone"
              placeholder="07xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={errors.phone ? 'border-rose-500/50' : 'border-border/50 bg-secondary/20'}
            />
            {errors.phone && <p className="text-[10px] text-rose-400 mt-1">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-id" className="text-xs text-muted-foreground">رقم الهوية / الأحوال *</Label>
            <Input
              id="quick-id"
              placeholder="رقم الهوية الوطنية"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className={errors.idNumber ? 'border-rose-500/50' : 'border-border/50 bg-secondary/20'}
            />
            {errors.idNumber && <p className="text-[10px] text-rose-400 mt-1">{errors.idNumber}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-address" className="text-xs text-muted-foreground">العنوان (اختياري)</Label>
            <Input
              id="quick-address"
              placeholder="المدينة / المنطقة"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border-border/50 bg-secondary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[100px]"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin me-1" />جاري الإضافة...</>
              ) : (
                <><Plus className="h-3.5 w-3.5 me-1" />إضافة</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
