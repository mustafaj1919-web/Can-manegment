'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatMoney } from '@/lib/design-system/formatting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createJournalEntry } from '@/lib/api/accounting'
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, Save } from 'lucide-react'
import { toast } from 'sonner'

interface NewJournalEntryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  accountsList: Array<{ code: string; name: string; id?: string }>
}

interface FormLine {
  account_code: string
  debit: number
  credit: number
  description: string
}

export function NewJournalEntryModal({
  open,
  onClose,
  onSuccess,
  accountsList,
}: NewJournalEntryModalProps) {
  const [entryDate, setEntryDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [referenceType, setReferenceType] = useState('General')
  const [lines, setLines] = useState<FormLine[]>([
    { account_code: accountsList[0]?.code || '111001', debit: 0, credit: 0, description: '' },
    { account_code: accountsList[1]?.code || '411001', debit: 0, credit: 0, description: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open) return null

  // Calculate totals
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const difference = totalDebit - totalCredit
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      { account_code: accountsList[0]?.code || '111001', debit: 0, credit: 0, description: '' }
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('القيد المزدوج يتطلب سطرين على الأقل')
      return
    }
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: keyof FormLine, value: any) => {
    setLines(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }

      // Ensure debit & credit are mutually exclusive on single line
      if (field === 'debit' && Number(value) > 0) {
        copy[index].credit = 0
      } else if (field === 'credit' && Number(value) > 0) {
        copy[index].debit = 0
      }

      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toast.error('يرجى كتابة بيان القيد المحاسبي')
      return
    }

    if (!isBalanced) {
      toast.error('لا يمكن حفظ القيد: القيد غير متوازن أو مجموع المبالغ صفر')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        entryDate: new Date(entryDate).toISOString(),
        description: description.trim(),
        lines: lines.map(l => {
          const selectedAcc = accountsList.find(a => a.code === l.account_code)
          return {
            accountId: selectedAcc?.id || l.account_code,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description.trim() || description.trim(),
          }
        })
      }

      await createJournalEntry(payload)
      toast.success('تمت إضافة وتحديد القيد المحاسبي الجديد بنجاح!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ القيد')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative z-10 w-full max-w-[900px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#EAECF0] bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#101828]">إنشاء قيد محاسبي جديد</h2>
              <p className="text-xs text-[#667085] mt-0.5">إدخال قيد مزدوج جديد وتحديده في دفتر اليومية</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-[#667085]">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Header Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#344054] mb-1 block">تاريخ القيد</label>
                <Input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="h-9 text-xs border-[#D0D5DD]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054] mb-1 block">نوع العملية</label>
                <select
                  value={referenceType}
                  onChange={(e) => setReferenceType(e.target.value)}
                  className="w-full h-9 rounded-md border border-[#D0D5DD] bg-white px-2.5 text-xs text-[#101828]"
                >
                  <option value="General">قيد عام</option>
                  <option value="SaleInvoice">فاتورة مبيعات</option>
                  <option value="PaymentReceipt">سند قبض</option>
                  <option value="ExpenseVoucher">سند صرف</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054] mb-1 block">البيان العام للقيد</label>
                <Input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: قيد تسوية حسابات الصندوق"
                  className="h-9 text-xs border-[#D0D5DD]"
                  required
                />
              </div>
            </div>

            {/* Lines Grid Table */}
            <div className="border border-[#EAECF0] rounded-xl overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-[#F2F4F7] text-[#475467] font-semibold h-9 border-b border-[#D0D5DD]">
                  <tr>
                    <th className="px-3 py-2 text-right min-w-[260px]">الحساب المحاسبي</th>
                    <th className="px-2 py-2 text-left w-[140px]">مدين</th>
                    <th className="px-2 py-2 text-left w-[140px]">دائن</th>
                    <th className="px-3 py-2 text-right min-w-[200px]">البيان الخاص بالسطر</th>
                    <th className="px-2 py-2 text-center w-[48px]">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {lines.map((line, index) => (
                    <tr key={index} className="bg-white">
                      {/* Account Selector */}
                      <td className="px-3 py-2">
                        <select
                          value={line.account_code}
                          onChange={(e) => handleLineChange(index, 'account_code', e.target.value)}
                          className="w-full h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-xs font-semibold text-[#101828]"
                        >
                          {accountsList.map(a => (
                            <option key={a.code} value={a.code}>
                              [{a.code}] — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Debit Input */}
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-xs font-mono font-semibold text-[#175CD3] text-left border-[#D0D5DD]"
                        />
                      </td>

                      {/* Credit Input */}
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-xs font-mono font-semibold text-[#067647] text-left border-[#D0D5DD]"
                        />
                      </td>

                      {/* Line Description */}
                      <td className="px-3 py-2">
                        <Input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          placeholder="بيان إضافي للسطر..."
                          className="h-8 text-xs border-[#D0D5DD]"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-[#B42318] hover:bg-[#FEF3F2]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Line Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="gap-1.5 border-[#D0D5DD] text-xs font-semibold text-[#175CD3]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة سطر محاسبي جديد</span>
            </Button>

            {/* Live Balance Summary Strip */}
            <div className="rounded-xl border border-[#EAECF0] bg-[#F8FAFC] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-[#667085] block font-medium">مجموع المدين</span>
                  <span className="text-base font-bold text-[#175CD3] font-numeric dir-ltr">
                    {formatMoney(totalDebit, 'IQD')}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#667085] block font-medium">مجموع الدائن</span>
                  <span className="text-base font-bold text-[#067647] font-numeric dir-ltr">
                    {formatMoney(totalCredit, 'IQD')}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#667085] block font-medium">الفرق التوازني</span>
                  <span className={`text-base font-bold font-numeric dir-ltr ${
                    Math.abs(difference) > 0.01 ? 'text-[#B42318]' : 'text-[#344054]'
                  }`}>
                    {formatMoney(difference, 'IQD')}
                  </span>
                </div>
              </div>

              {/* Balance Validation Badge */}
              <div>
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] border border-[#ABE5C5] px-3 py-1 text-xs font-bold text-[#027A48]">
                    <CheckCircle2 className="h-4 w-4 text-[#12B76A]" />
                    <span>القيد متوازن وجاهز للحفظ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3F2] border border-[#FECDCA] px-3 py-1 text-xs font-bold text-[#B42318]">
                    <AlertTriangle className="h-4 w-4 text-[#F04438]" />
                    <span>القيد غير متوازن</span>
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#EAECF0] flex justify-end gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs">
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isBalanced || isSubmitting}
                className="h-9 px-5 bg-[#175CD3] hover:bg-[#1570EF] text-white font-bold text-xs gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>حفظ وترحيل القيد</span>
              </Button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
