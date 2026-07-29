'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, ShoppingBag, Users, Calendar, Search, 
  ArrowUpDown, Download, EyeOff, Eye, ChevronLeft, ChevronRight, RefreshCw 
} from 'lucide-react'
import { cn, formatMoney, formatDate, translateStatus, getStatusVariant } from '@/lib/utils'
import { getSales } from '@/lib/api/sales'
import { getPurchases } from '@/lib/api/purchases'
import { getCustomers } from '@/lib/api/customers'
import { getInstallments } from '@/lib/api/installments'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type TableType = 'sales' | 'purchases' | 'customers' | 'installments'

export function PremiumTablesWidget() {
  const [activeTab, setActiveTab] = useState<TableType>('sales')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    desc: true,
    amount: true,
    status: true,
    date: true,
  })

  // Queries for all tabs
  const salesQuery = useQuery({
    queryKey: ['dashboard-sales', page],
    queryFn: () => getSales({ page, per_page: 5 }),
    enabled: activeTab === 'sales',
    staleTime: 30_000,
  })

  const purchasesQuery = useQuery({
    queryKey: ['dashboard-purchases', page],
    queryFn: () => getPurchases({ page, per_page: 5 }),
    enabled: activeTab === 'purchases',
    staleTime: 30_000,
  })

  const customersQuery = useQuery({
    queryKey: ['dashboard-customers', page, searchQuery],
    queryFn: () => getCustomers({ page, per_page: 5, search: searchQuery }),
    enabled: activeTab === 'customers',
    staleTime: 30_000,
  })

  const installmentsQuery = useQuery({
    queryKey: ['dashboard-installments', page],
    queryFn: () => getInstallments({ page, per_page: 5 }),
    enabled: activeTab === 'installments',
    staleTime: 30_000,
  })

  const getQueryState = () => {
    switch (activeTab) {
      case 'sales': return salesQuery
      case 'purchases': return purchasesQuery
      case 'customers': return customersQuery
      default: return installmentsQuery
    }
  }

  const queryState = getQueryState()
  const rawItems = (queryState.data as any)?.items ?? []
  const totalPages = (queryState.data as any)?.total_pages ?? 1

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedItems = [...rawItems].sort((a: any, b: any) => {
    if (!sortField) return 0
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Filter items by client-side search (for tabs other than customers which does server-side search)
  const filteredItems = sortedItems.filter((item: any) => {
    if (activeTab === 'customers') return true // already filtered server-side
    if (!searchQuery) return true
    const s = searchQuery.toLowerCase()
    
    // Check invoice numbers, names, or statuses
    return (
      (item.invoice_number && item.invoice_number.toLowerCase().includes(s)) ||
      (item.car_name && item.car_name.toLowerCase().includes(s)) ||
      (item.buyer_name && item.buyer_name.toLowerCase().includes(s)) ||
      (item.status && item.status.toLowerCase().includes(s))
    )
  })

  // Export CSV Helper
  const exportToCsv = () => {
    let headers: string[] = []
    let rows: string[][] = []

    if (activeTab === 'sales') {
      headers = ['رقم الفاتورة', 'السيارة', 'العميل', 'المبلغ', 'الحالة', 'التاريخ']
      rows = filteredItems.map((item: any) => [
        item.invoice_number || '',
        item.car?.brand ? `${item.car.brand} ${item.car.model}` : item.car_name || '',
        item.buyer?.name || item.buyer_name || '',
        `${item.selling_price || 0}`,
        item.status || '',
        item.sale_date || '',
      ])
    } else if (activeTab === 'purchases') {
      headers = ['رقم الشراء', 'السيارة', 'المورد', 'التكلفة', 'الحالة', 'التاريخ']
      rows = filteredItems.map((item: any) => [
        item.purchase_number || `#${item.id}`,
        item.car_name || '',
        item.supplier_name || '',
        `${item.purchase_cost || 0}`,
        item.status || '',
        item.purchase_date || '',
      ])
    } else if (activeTab === 'customers') {
      headers = ['الاسم', 'الهاتف', 'العنوان', 'مجموع العقود']
      rows = filteredItems.map((item: any) => [
        item.name || '',
        item.phone || '',
        item.address || '',
        `${item.sales_contracts_count || 0}`,
      ])
    } else {
      headers = ['العقد', 'العميل', 'رقم القسط', 'المبلغ', 'تاريخ الاستحقاق', 'الحالة']
      rows = filteredItems.map((item: any) => [
        item.contract_invoice_number || '',
        item.customer_name || '',
        `${item.installment_number || 0}`,
        `${item.amount || 0}`,
        item.due_date || '',
        item.status || '',
      ])
    }

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `report-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <section className="rounded-[24px] border border-border/40 bg-card p-5 shadow-sm space-y-4 text-right" dir="rtl">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-foreground">الحركة والعمليات الجارية</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">تتبع أحدث المستندات والعملاء والأقساط المستحقة</p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 border border-border/40 rounded-xl p-1 gap-1 w-full lg:w-auto overflow-x-auto">
          {[
            { id: 'sales', label: 'المبيعات', icon: TrendingUp },
            { id: 'purchases', label: 'المشتريات', icon: ShoppingBag },
            { id: 'customers', label: 'العملاء', icon: Users },
            { id: 'installments', label: 'الأقساط', icon: Calendar },
          ].map((tab) => {
            const active = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TableType)
                  setPage(1)
                  setSearchQuery('')
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all focus:outline-none whitespace-nowrap',
                  active 
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm border border-border/10'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter Options, Search, Export */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/10 p-3 rounded-xl border border-border/20">
        <div className="relative w-full md:w-64 flex items-center bg-card border border-border/50 rounded-lg px-3 py-1.5 gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث وتصفية سريعة..."
            className="bg-transparent border-none text-xs outline-none text-slate-700 dark:text-slate-300 w-full text-right"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Column Visibility Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCols(prev => ({ ...prev, desc: !prev.desc }))}
            className="h-8 text-[10px] font-bold rounded-lg gap-1 border-border/50 bg-card hover:bg-slate-50"
          >
            {visibleCols.desc ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            تفاصيل الوصف
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            className="h-8 text-[10px] font-bold rounded-lg gap-1.5 border-border/50 bg-card hover:bg-slate-50"
          >
            <Download className="h-3 w-3" />
            تصدير CSV
          </Button>

          {/* Refresh Button */}
          <button
            onClick={() => queryState.refetch()}
            disabled={queryState.isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground hover:bg-slate-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', queryState.isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border border-border/20 rounded-xl bg-card">
        {queryState.isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : queryState.isError || filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground/60">
            <Users className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs font-semibold">
              {queryState.isError ? 'خطأ في جلب البيانات من الخادم' : 'لا توجد سجلات مطابقة حالياً'}
            </p>
          </div>
        ) : (
          <table className="app-table w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-border/20">
                <th className="py-3 px-4 text-xs font-bold text-slate-500">العنوان / المعرف</th>
                {visibleCols.desc && <th className="py-3 px-4 text-xs font-bold text-slate-500">التفاصيل</th>}
                <th className="py-3 px-4 text-xs font-bold text-slate-500 cursor-pointer select-none" onClick={() => handleSort(activeTab === 'sales' ? 'selling_price' : activeTab === 'purchases' ? 'purchase_cost' : 'amount')}>
                  <span className="flex items-center gap-1.5">
                    المبلغ
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">الحالة</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {filteredItems.map((item: any, i: number) => {
                  let idLabel = ''
                  let title = ''
                  let subtitle = ''
                  let amountValue = 0
                  let status = ''
                  let dateLabel = ''
                  let linkUrl = '#'

                  if (activeTab === 'sales') {
                    idLabel = item.invoice_number || `#${item.id}`
                    title = item.car?.brand ? `${item.car.brand} ${item.car.model}` : item.car_name || 'مركبة'
                    subtitle = item.buyer?.name || item.buyer_name || 'عميل مبيعات'
                    amountValue = item.selling_price || 0
                    status = item.status || 'Pending'
                    dateLabel = formatDate(item.sale_date)
                    linkUrl = `/sales/${item.id}`
                  } else if (activeTab === 'purchases') {
                    idLabel = item.purchase_number || `#${item.id}`
                    title = item.car_name || 'مركبة شراء'
                    subtitle = item.supplier_name || 'مورد غير محدد'
                    amountValue = item.purchase_cost || 0
                    status = item.status || 'Completed'
                    dateLabel = formatDate(item.purchase_date)
                    linkUrl = `/purchases/${item.id}`
                  } else if (activeTab === 'customers') {
                    idLabel = `العميل #${item.id}`
                    title = item.name || ''
                    subtitle = item.phone || 'بدون رقم هاتف'
                    amountValue = item.sales_contracts_count || 0
                    status = item.address || 'عنوان غير محدد'
                    dateLabel = 'نشط'
                    linkUrl = `/customers/${item.id}`
                  } else {
                    idLabel = `قسط #${item.id}`
                    title = item.customer_name || 'قسط عميل'
                    subtitle = `العقد: ${item.contract_invoice_number || '—'} · قسط ${item.installment_number}`
                    amountValue = item.amount || 0
                    status = item.status || 'Pending'
                    dateLabel = formatDate(item.due_date)
                    linkUrl = `/installments/${item.id}`
                  }

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="border-b border-border/20 hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Link href={linkUrl} className="hover:underline">
                          {idLabel}
                        </Link>
                      </td>
                      {visibleCols.desc && (
                        <td className="py-3 px-4 text-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{title}</p>
                          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
                        </td>
                      )}
                      <td className="py-3 px-4 text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                        {activeTab === 'customers' ? `${amountValue} عقود` : formatMoney(amountValue, 'IQD')}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold',
                          activeTab === 'customers' ? 'bg-blue-500/10 text-blue-600' : getStatusVariant(status)
                        )}>
                          {activeTab === 'customers' ? status : translateStatus(status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-muted-foreground tabular-nums">
                        {dateLabel}
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-4 p-1">
        <p className="text-[10px] text-muted-foreground">
          الصفحة {page} من أصل {totalPages}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
