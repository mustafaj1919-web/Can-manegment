'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ReceiptText,
  Search,
  Printer,
  Calendar,
  AlertCircle,
  Filter,
  DollarSign
} from 'lucide-react'
import { getVouchers } from '@/lib/api/vouchers'
import { formatMoney, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'
import { Skeleton } from '@/components/ui/skeleton'
import { PrintReceiptModal } from '@/components/cashier/PrintReceiptModal'

export default function CashierReceipts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10))
  
  // Print receipt modal state
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Fetch today's vouchers of type 'receipt'
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vouchers-receipts', filterDate],
    queryFn: () => getVouchers({ type: 'receipt', per_page: 100 }),
    staleTime: 15_000,
  })

  const items = data?.items ?? []

  // Filter items in memory based on search and filters
  const filteredItems = items.filter(v => {
    // 1. Search term (customer/description/number)
    const matchesSearch = 
      (v.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.voucher_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.debit_account_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.credit_account_name || '').toLowerCase().includes(searchTerm.toLowerCase())

    // 2. Payment method (Cash or Bank account based on debit account code/name)
    let matchesMethod = true
    if (filterMethod === 'Cash') {
      matchesMethod = v.debit_account_code === '111001' || (v.debit_account_name || '').includes('صندوق')
    } else if (filterMethod === 'Bank') {
      matchesMethod = v.debit_account_code !== '111001' && !(v.debit_account_name || '').includes('صندوق')
    }

    // 3. Date filter (match strictly or fallback)
    const matchesDate = !filterDate || (v.voucher_date && v.voucher_date.startsWith(filterDate))

    return matchesSearch && matchesMethod && matchesDate
  })

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt({
      id: receipt.id,
      buyer_name: receipt.credit_account_name || 'العميل',
      amount: receipt.amount,
      payment_method: receipt.debit_account_code === '111001' ? 'Cash' : 'Bank',
      payment_date: receipt.voucher_date,
      notes: receipt.description,
      currency: receipt.currency ?? 'IQD',
    })
    setShowPrintModal(true)
  }

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      
      <PageHeader
        title="سندات الكاشير والمقبوضات اليومية"
        subtitle="مراجعة وتصفية كافة المقبوضات النقدية والبنكية التي تمت اليوم"
        icon={<ReceiptText className="h-5 w-5" />}
      />

      {/* Filters Bar */}
      <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 border border-border/40">
        <div className="relative sm:col-span-2">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث برقم السند، الحساب الدائن، أو الوصف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-9 border-border/50 bg-secondary/20 h-9 text-xs"
          />
        </div>

        <div>
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="border-border/50 bg-secondary/20 h-9 text-xs">
              <SelectValue placeholder="طريقة القبض..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل طرق الدفع</SelectItem>
              <SelectItem value="Cash">نقداً (الصندوق)</SelectItem>
              <SelectItem value="Bank">حوالة بنكية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border-border/50 bg-secondary/20 h-9 text-xs"
          />
        </div>
      </div>

      {/* List Container */}
      <SectionCard title="سجل السندات المقبوضة" description="قائمة السندات التي تم إصدارها ومطابقتها بالتاريخ المحدد">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-rose-400 space-y-2">
            <AlertCircle className="mx-auto h-8 w-8" />
            <p className="text-xs">حدث خطأ أثناء تحميل السندات المحاسبية</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <ReceiptText className="mx-auto h-12 w-12 opacity-25 text-cyan-400" />
            <h4 className="font-bold text-foreground">لا توجد سندات</h4>
            <p className="text-xs max-w-xs mx-auto">لم يتم تسجيل أو العثور على أي مقبوضات تطابق معايير البحث والفلترة المحددة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/20 text-[10px] text-muted-foreground">
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">تاريخ السند</th>
                  <th className="p-3">المستلم في (حساب الصندوق)</th>
                  <th className="p-3">المقبوض من (الحساب الدائن)</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">طريقة القبض</th>
                  <th className="p-3 text-center">الخيارات</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((v) => {
                  const isCash = v.debit_account_code === '111001' || (v.debit_account_name || '').includes('صندوق')
                  return (
                    <tr key={v.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                      <td className="p-3 font-semibold text-cyan-400">#{v.voucher_number}</td>
                      <td className="p-3 font-numeric text-muted-foreground">{v.voucher_date ? formatDate(v.voucher_date) : '-'}</td>
                      <td className="p-3 text-muted-foreground">{v.debit_account_name}</td>
                      <td className="p-3 font-medium">{v.credit_account_name || '-'}</td>
                      <td className="p-3 font-numeric font-bold text-emerald-400">{formatMoney(v.amount, v.currency as 'USD' | 'IQD' ?? 'IQD')}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          isCash 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {isCash ? 'نقدي' : 'بنكي'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipt(v)}
                          className="h-7 text-[10px] gap-1 px-2 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>عرض وطباعة</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Receipts Printing Modal */}
      <PrintReceiptModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        type="payment"
        data={selectedReceipt}
      />
    </div>
  )
}
