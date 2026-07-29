'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getChartOfAccounts, createJournalEntry } from '@/lib/api/accounting'
import { formatMoney } from '@/lib/design-system/formatting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronLeft, Plus, Trash2, CheckCircle2, AlertTriangle, Save,
  FileText, Calendar, Building2, DollarSign, Paperclip, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface FormLine {
  account_code: string
  debit: number
  credit: number
  description: string
}

export default function NewJournalEntryPage() {
  const router = useRouter()
  const [entryDate, setEntryDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [referenceType, setReferenceType] = useState('General')
  const [lines, setLines] = useState<FormLine[]>([
    { account_code: '111001', debit: 0, credit: 0, description: '' },
    { account_code: '411001', debit: 0, credit: 0, description: '' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const coaQuery = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts(),
    staleTime: 60_000,
  })

  // Filter out parent group accounts (only keep leaf posting accounts)
  const accountsList = (coaQuery.data?.flat || [])
    .filter(a => a.is_persisted !== false)
    .map(a => ({ code: a.code, name: a.name, id: a.id || a.code }))

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
      toast.error('لا يمكن ترحيل القيد: القيد غير متوازن أو مجموع المبالغ صفر')
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
            accountId: String(selectedAcc?.id || l.account_code),
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description.trim() || description.trim(),
          }
        })
      }

      await createJournalEntry(payload)
      toast.success('تم إنشاء وتأييد القيد المحاسبي بنجاح!')
      router.push('/journal-entries')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء ترحيل القيد')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      data-layout="full-width"
      className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 space-y-4 text-right dir-rtl bg-[#F8FAFC] min-h-screen"
      dir="rtl"
    >
      {/* 1. Header & Navigation */}
      <div className="rounded-xl border border-[#EAECF0] bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-[#667085]">
            <Link href="/journal-entries" className="flex items-center gap-1 hover:text-[#101828]">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>الرجوع للقيود اليومية</span>
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-[#98A2B3] rotate-180" />
            <span className="text-[#175CD3] font-bold">إنشاء قيد محاسبي جديد</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828]">
            مساحة عمل إنشاء القيد المحاسبي اليومي
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/journal-entries')}
            className="h-9 px-4 text-xs border-[#D0D5DD]"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!isBalanced || isSubmitting}
            className="h-9 px-5 bg-[#175CD3] hover:bg-[#1570EF] text-white font-bold text-xs gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>حفظ وترحيل القيد المحاسبي</span>
          </Button>
        </div>
      </div>

      {/* 2. Primary Form Body */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Header Fields Panel */}
        <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#101828] border-b border-[#EAECF0] pb-2">بيانات القيد الأساسية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[#344054] mb-1 block">البيان والوصف العام للقيد</label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="أدخل بياناً مفصلاً للقيد المحاسبي..."
                className="h-9 text-xs border-[#D0D5DD]"
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Lines Data Grid */}
        <div className="rounded-xl border border-[#EAECF0] bg-white shadow-xs overflow-hidden">
          <div className="p-3 border-b border-[#EAECF0] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#101828]">سطور القيد المحاسبي المزدوج ({lines.length} سطر)</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="gap-1.5 border-[#D0D5DD] text-xs font-semibold text-[#175CD3] h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة سطر</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead className="bg-[#F2F4F7] text-[#475467] font-semibold h-9 border-b border-[#D0D5DD]">
                <tr>
                  <th className="px-3 py-2 text-right w-[40px]">#</th>
                  <th className="px-3 py-2 text-right min-w-[280px]">الحساب المحاسبي (تفصيلي فقط)</th>
                  <th className="px-2 py-2 text-left w-[160px]">مدين</th>
                  <th className="px-2 py-2 text-left w-[160px]">دائن</th>
                  <th className="px-3 py-2 text-right min-w-[240px]">البيان الخاص بالسطر</th>
                  <th className="px-2 py-2 text-center w-[50px]">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {lines.map((line, index) => (
                  <tr key={index} className="bg-white hover:bg-[#F9FAFB]">
                    <td className="px-3 py-2 text-[#667085] font-numeric font-medium">{index + 1}</td>
                    
                    {/* Account Selector */}
                    <td className="px-3 py-2">
                      <select
                        value={line.account_code}
                        onChange={(e) => handleLineChange(index, 'account_code', e.target.value)}
                        className="w-full h-9 rounded-md border border-[#D0D5DD] bg-white px-2 text-xs font-semibold text-[#101828]"
                      >
                        {accountsList.map(a => (
                          <option key={a.code} value={a.code}>
                            [{a.code}] — {a.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Debit */}
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={line.debit || ''}
                        onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9 text-xs font-mono font-semibold text-[#175CD3] text-left border-[#D0D5DD]"
                      />
                    </td>

                    {/* Credit */}
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={line.credit || ''}
                        onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9 text-xs font-mono font-semibold text-[#067647] text-left border-[#D0D5DD]"
                      />
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        placeholder="بيان اختياري للسطر..."
                        className="h-9 text-xs border-[#D0D5DD]"
                      />
                    </td>

                    {/* Actions */}
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
        </div>

        {/* 4. Financial Summary & Validation Bar */}
        <div className="rounded-xl border border-[#EAECF0] bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-xs text-[#667085] block font-medium">مجموع المدين</span>
              <span className="text-lg font-bold text-[#175CD3] font-numeric dir-ltr">
                {formatMoney(totalDebit, 'IQD')}
              </span>
            </div>

            <div>
              <span className="text-xs text-[#667085] block font-medium">مجموع الدائن</span>
              <span className="text-lg font-bold text-[#067647] font-numeric dir-ltr">
                {formatMoney(totalCredit, 'IQD')}
              </span>
            </div>

            <div>
              <span className="text-xs text-[#667085] block font-medium">الفرق التوازني</span>
              <span className={`text-lg font-bold font-numeric dir-ltr ${
                Math.abs(difference) > 0.01 ? 'text-[#B42318]' : 'text-[#344054]'
              }`}>
                {formatMoney(difference, 'IQD')}
              </span>
            </div>
          </div>

          <div>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] border border-[#ABE5C5] px-4 py-1.5 text-xs font-bold text-[#027A48]">
                <CheckCircle2 className="h-4 w-4 text-[#12B76A]" />
                <span>القيد متوازن وجاهز للترحيل الفوري</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3F2] border border-[#FECDCA] px-4 py-1.5 text-xs font-bold text-[#B42318]">
                <AlertTriangle className="h-4 w-4 text-[#F04438]" />
                <span>القيد غير متوازن: يجب أن يتساوى مجموع المدين مع الدائن</span>
              </span>
            )}
          </div>
        </div>

      </form>
    </div>
  )
}
