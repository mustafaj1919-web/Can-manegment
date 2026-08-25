'use client'

import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { X, Check, RefreshCw } from 'lucide-react'
import {
  createAccount, updateAccount, AccountPayload,
  AccountClassification, CLASSIFICATION_LABELS
} from '@/lib/api/accounting'
import { extractApiError } from '@/lib/api/client'

interface AccountFormModalProps {
  mode: 'add' | 'edit'
  initial?: Partial<AccountPayload>
  allAccounts: Array<{ id: number; code: string; name: string }>
  onClose: () => void
  onSuccess: () => void
}

const ACCOUNT_TYPES: Array<{ value: AccountPayload['type']; label: string }> = [
  { value: 'Asset',     label: 'موجودات (الأصول)' },
  { value: 'Liability', label: 'مطلوبات (الالتزامات)' },
  { value: 'Equity',    label: 'حقوق ملكية' },
  { value: 'Income',    label: 'إيرادات' },
  { value: 'Expense',   label: 'مصروفات' },
]

const CLASSIFICATION_OPTIONS: Array<{ value: AccountClassification; label: string }> = [
  { value: 'current_asset',       label: CLASSIFICATION_LABELS.current_asset },
  { value: 'fixed_asset',         label: CLASSIFICATION_LABELS.fixed_asset },
  { value: 'current_liability',   label: CLASSIFICATION_LABELS.current_liability },
  { value: 'long_term_liability', label: CLASSIFICATION_LABELS.long_term_liability },
  { value: 'equity',              label: CLASSIFICATION_LABELS.equity },
  { value: 'operating_revenue',   label: CLASSIFICATION_LABELS.operating_revenue },
  { value: 'other_revenue',       label: CLASSIFICATION_LABELS.other_revenue },
  { value: 'cogs',                label: CLASSIFICATION_LABELS.cogs },
  { value: 'operating_expense',   label: CLASSIFICATION_LABELS.operating_expense },
  { value: 'admin_expense',       label: CLASSIFICATION_LABELS.admin_expense },
]

export function AccountFormModal({ mode, initial, allAccounts, onClose, onSuccess }: AccountFormModalProps) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<AccountPayload['type']>(initial?.type ?? 'Asset')
  const [clf, setClf] = useState<string>(initial?.classification || 'none')
  const [parentCode, setParentCode] = useState<string>(initial?.parent_code || 'none')

  const createMut = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      toast.success('تم إضافة الحساب بنجاح')
      onSuccess()
    },
    onError: (e) => toast.error(extractApiError(e))
  })

  const updateMut = useMutation({
    mutationFn: ({ code, ...p }: AccountPayload) => updateAccount(code, p),
    onSuccess: () => {
      toast.success('تم تعديل بيانات الحساب بنجاح')
      onSuccess()
    },
    onError: (e) => toast.error(extractApiError(e))
  })

  const isPending = createMut.isPending || updateMut.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    const payload: AccountPayload = {
      code: code.trim(),
      name: name.trim(),
      type,
      classification: (clf && clf !== 'none' ? clf as AccountClassification : undefined),
      parent_code: (parentCode && parentCode !== 'none' ? parentCode : null),
    }

    if (mode === 'add') {
      createMut.mutate(payload)
    } else {
      updateMut.mutate(payload)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 dir-rtl"
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-md rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xl text-right"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#DDE3EA] pb-3">
          <h3 className="text-sm font-bold text-[#172033]">
            {mode === 'add' ? 'إضافة حساب جديد في الدليل' : 'تعديل بيانات الحساب'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1 text-[#667085] hover:bg-[#F8FAFC] hover:text-[#172033] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#172033]">
                رمز الحساب <span className="text-[#C33B4A]">*</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="111001"
                disabled={mode === 'edit'}
                required
                className="h-8 border-[#DDE3EA] bg-[#F8FAFC] font-mono text-xs text-left dir-ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#172033]">
                نوع الحساب <span className="text-[#C33B4A]">*</span>
              </label>
              <Select value={type} onValueChange={(val) => setType(val as AccountPayload['type'])} required>
                <SelectTrigger className="h-8 border-[#DDE3EA] bg-[#F8FAFC] text-xs">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent align="end" className="text-right">
                  {ACCOUNT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#172033]">
              اسم الحساب <span className="text-[#C33B4A]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الحساب بالعربية..."
              required
              className="h-8 border-[#DDE3EA] bg-[#F8FAFC] text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#172033]">
              الحساب الأب (الهيكل الشجري)
            </label>
            <Select value={parentCode} onValueChange={setParentCode}>
              <SelectTrigger className="h-8 border-[#DDE3EA] bg-[#F8FAFC] text-xs">
                <SelectValue placeholder="بدون أب (حساب رئيسي)" />
              </SelectTrigger>
              <SelectContent align="end" className="text-right max-h-56">
                <SelectItem value="none" className="text-xs font-semibold text-[#1769AA]">
                  بدون أب (حساب رئيسي)
                </SelectItem>
                {allAccounts.map(a => (
                  <SelectItem key={a.id} value={a.code} className="text-xs">
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#172033]">
              التصنيف المحاسبي
            </label>
            <Select value={clf} onValueChange={setClf}>
              <SelectTrigger className="h-8 border-[#DDE3EA] bg-[#F8FAFC] text-xs">
                <SelectValue placeholder="بدون تصنيف" />
              </SelectTrigger>
              <SelectContent align="end" className="text-right">
                <SelectItem value="none" className="text-xs">بدون تصنيف</SelectItem>
                {CLASSIFICATION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#DDE3EA]">
            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="flex-1 bg-[#1769AA] hover:bg-[#135488] text-white font-bold text-xs h-8 gap-1.5"
            >
              {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{mode === 'add' ? 'إضافة الحساب' : 'حفظ التعديلات'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#DDE3EA] text-xs h-8 px-4"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
