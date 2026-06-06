'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, ReceiptText, Save } from 'lucide-react'
import { createExpense, type CreateExpensePayload } from '@/lib/api/accounting'
import { extractApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

function todayInput() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function NewExpensePage() {
  const router = useRouter()
  const [form, setForm] = useState<CreateExpensePayload>({
    title: '',
    amount: 0,
    currency: 'IQD',
    category: '',
    notes: '',
    expense_date: todayInput(),
  })

  const mutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      toast.success('تم تسجيل المصروف بنجاح')
      router.push('/expenses')
    },
    onError: (error) => toast.error(extractApiError(error)),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10">
            <ReceiptText className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">مصروف جديد</h1>
            <p className="text-xs text-muted-foreground">تسجيل مصروف فعلي في النظام</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.push('/expenses')} className="gap-2 border border-white/10">
          <ArrowRight className="h-4 w-4" />رجوع
        </Button>
      </div>

      <form onSubmit={submit} className="glass rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs text-muted-foreground">عنوان المصروف</label>
            <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required className="border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">المبلغ</label>
            <Input type="number" min="0" step="0.01" value={form.amount || ''} onChange={(e) => setForm((current) => ({ ...current, amount: Number(e.target.value) }))} required className="border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">العملة</label>
            <Select value={form.currency} onValueChange={(value: 'USD' | 'IQD') => setForm((current) => ({ ...current, currency: value }))}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IQD">الدينار العراقي</SelectItem>
                <SelectItem value="USD">الدولار</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">تاريخ المصروف</label>
            <Input type="date" value={form.expense_date} onChange={(e) => setForm((current) => ({ ...current, expense_date: e.target.value }))} required className="border-white/10 bg-white/5" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">التصنيف</label>
            <Input value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))} className="border-white/10 bg-white/5" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs text-muted-foreground">ملاحظات</label>
            <Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="min-h-28 border-white/10 bg-white/5" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} className="gap-2 bg-orange-600 text-white hover:bg-orange-500">
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'جاري الحفظ...' : 'حفظ المصروف'}
          </Button>
        </div>
      </form>
    </div>
  )
}
