'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/enterprise/page-header'
import { StatCard } from '@/components/enterprise/stat-card'
import { DataTable, ColumnDef } from '@/components/enterprise/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { badgeVariants } from '@/lib/design-system/variants'
import { Drawer } from '@/components/ui/drawer'
import { getCustomers, Customer } from '@/lib/api/customers'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { formatDate } from '@/lib/design-system/formatting'
import { cn } from '@/lib/utils'
import { exportXlsx } from '@/lib/export'
import { toast } from 'sonner'
import {
  Users, Plus, RefreshCw, Copy, Check, Eye, FileText
} from 'lucide-react'

function getHashColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return {
    bg: `hsla(${h}, 60%, 45%, 0.12)`,
    text: `hsl(${h}, 75%, 55%)`,
  }
}

function maskNationalId(idNumber: string | null | undefined, isAuthorized: boolean): string {
  if (!idNumber || typeof idNumber !== 'string') return '—'
  const trimmed = idNumber.trim()
  if (trimmed.length === 0) return '—'
  if (isAuthorized) return trimmed
  if (trimmed.length <= 4) return '****'
  return `****${trimmed.slice(-4)}`
}

function getCustomerTypeConfig(type: string | null | undefined) {
  if (type === 'Company' || type === 'Corporate') {
    return { variant: 'warning' as const, label: 'شركة' }
  }
  if (type === 'Individual') {
    return { variant: 'info' as const, label: 'فرد' }
  }
  return { variant: 'neutral' as const, label: 'غير محدد' }
}

function CustomerIdentityCell({ customer }: { customer: Customer }) {
  const name = customer.full_name || customer.name || 'عميل بدون اسم'
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('') || 'ع'
  const color = getHashColor(name)
  const typeConfig = getCustomerTypeConfig(customer.customer_type)

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs border border-[var(--ds-border)]"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[var(--ds-text-primary)] truncate">
            {name}
          </span>
          <span className={cn(badgeVariants({ variant: typeConfig.variant }), 'py-0 px-1.5 text-[10px]')}>
            {typeConfig.label}
          </span>
        </div>
        <div className="text-[10px] text-[var(--ds-text-secondary)] truncate mt-0.5">
          رقم العميل: #{customer.id} {customer.address ? `• ${customer.address}` : ''}
        </div>
      </div>
    </div>
  )
}

function PhoneCell({ phone }: { phone: string | null | undefined }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopied(true)
    toast.success('تم نسخ رقم الهاتف')
    setTimeout(() => setCopied(false), 1500)
  }

  if (!phone || phone.trim().length === 0) {
    return <span className="text-[11px] text-[var(--ds-text-muted)]">غير متوفر</span>
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-[var(--ds-background)] border border-[var(--ds-border)] rounded-md px-2 py-0.5 dir-ltr">
      <span className="text-xs font-mono font-bold text-[var(--ds-text-primary)] dir-ltr">
        {phone}
      </span>
      <button
        type="button"
        aria-label="نسخ رقم الهاتف"
        title="نسخ رقم الهاتف"
        onClick={handleCopy}
        className="text-[var(--ds-text-secondary)] hover:text-[var(--ds-primary)] transition-colors p-0.5"
      >
        {copied ? <Check className="h-3 w-3 text-[var(--ds-success)]" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  )
}

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user)
  const activeBranch = useBranchStore((s) => s.activeBranch)
  const isAuthorized = user?.role === 'Admin' || user?.role === 'Owner' || user?.role === 'Accountant'

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(25)
  const [sortKey, setSortKey] = useState<string | null>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false)

  const branchScope = activeBranch?.id ? String(activeBranch.id) : 'all'
  const branchLabel = activeBranch ? activeBranch.name : 'جميع الفروع'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', page, perPage, typeFilter, searchQuery, branchScope, sortKey, sortDir],
    queryFn: () => getCustomers({
      page,
      per_page: perPage,
      customer_type: typeFilter === 'all' ? undefined : typeFilter,
      search: searchQuery || undefined,
      branch_id: activeBranch?.id ? String(activeBranch.id) : undefined,
      sort_by: sortKey ?? undefined,
      sort_dir: sortDir,
    }),
    staleTime: 30_000,
  })

  const rawCustomers = data?.items ?? []
  const totalCount = data?.total ?? 0

  const pageStats = useMemo(() => {
    let individuals = 0
    let companies = 0

    rawCustomers.forEach(c => {
      if (c.customer_type === 'Company' || c.customer_type === ('Corporate' as any)) companies++
      else if (c.customer_type === 'Individual') individuals++
    })

    return { individuals, companies }
  }, [rawCustomers])

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDetailDrawerOpen(true)
  }

  const handleExportAll = async () => {
    try {
      const capLimit = 1000
      if (totalCount > capLimit) {
        toast.warning(`سيتم تصدير أول ${capLimit} سجل فقط من أصل ${totalCount}`)
      } else {
        toast.info('جاري تصدير سجلات العملاء...')
      }

      const allCustomers: Customer[] = []
      const perPageCap = 100
      const fetchTotal = Math.min(totalCount, capLimit)
      const totalPages = Math.ceil(fetchTotal / perPageCap) || 1

      for (let p = 1; p <= totalPages; p++) {
        const pageRes = await getCustomers({
          page: p,
          per_page: perPageCap,
          customer_type: typeFilter === 'all' ? undefined : typeFilter,
          search: searchQuery || undefined,
          branch_id: activeBranch?.id ? String(activeBranch.id) : undefined,
        })
        if (pageRes?.items) allCustomers.push(...pageRes.items)
      }

      const headers = ['رقم العميل', 'اسم العميل', 'رقم الهاتف', 'نوع العميل', 'الفرع', 'تاريخ التسجيل']
      if (isAuthorized) headers.push('رقم الهوية / المستمسك (حسّاس)')

      const rows = allCustomers.map(c => {
        const row = [
          c.id,
          c.full_name || c.name,
          c.phone ?? '—',
          c.customer_type === 'Company' ? 'شركة' : 'فرد',
          c.branch?.name ?? 'الفرع الرئيسي',
          c.created_at ? formatDate(c.created_at) : '—',
        ]
        if (isAuthorized) row.push(c.id_number ?? '—')
        return row
      })

      await exportXlsx(`العملاء-${allCustomers.length}-سجل`, headers, rows)
      toast.success(`تم تصدير ${allCustomers.length} سجل بنجاح`)
    } catch {
      toast.error('حدث خطأ أثناء تصدير البيانات')
    }
  }

  // Column definitions for Enterprise DataTable (Status column removed cleanly)
  const columns: ColumnDef<Customer>[] = [
    {
      key: 'identity',
      header: 'العميل',
      width: 220,
      render: (customer) => <CustomerIdentityCell customer={customer} />
    },
    {
      key: 'phone',
      header: 'رقم الهاتف',
      width: 160,
      render: (customer) => <PhoneCell phone={customer.phone} />
    },
    {
      key: 'id_number',
      header: 'رقم الهوية / المستمسك',
      width: 170,
      render: (customer) => (
        <span className="text-xs font-mono font-bold text-[var(--ds-text-secondary)] dir-ltr">
          {maskNationalId(customer.id_number, isAuthorized)}
        </span>
      )
    },
    {
      key: 'branch',
      header: 'الفرع',
      width: 130,
      render: (customer) => (
        <span className="text-xs font-semibold text-[var(--ds-text-secondary)]">
          {customer.branch?.name ?? 'الفرع الرئيسي'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'تاريخ التسجيل',
      width: 130,
      render: (customer) => (
        <span className="text-xs font-numeric text-[var(--ds-text-secondary)]">
          {customer.created_at ? formatDate(customer.created_at) : '—'}
        </span>
      )
    },
  ]

  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0)

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-4 sm:p-6 text-right" dir="rtl">

      <PageHeader
        title="العملاء — إدارة وسجل المتعاملين"
        subtitle={`النظام المركزي • نطاق العرض: ${branchLabel}`}
        icon={<Users className="h-5 w-5 text-[var(--ds-primary)]" />}
        count={totalCount}
        filtered={activeFilterCount > 0}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="تحديث بيانات العملاء"
              onClick={() => refetch()}
              className="border border-[var(--ds-border)] gap-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تحديث</span>
            </Button>

            <Button asChild variant="primary" size="sm" className="gap-1.5 font-bold">
              <Link href="/customers/new">
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة عميل جديد</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Operational KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="إجمالي العملاء المطابقين"
          value={`${totalCount.toLocaleString('ar-IQ')} عميل`}
          comparison="— إجمالي النظام"
          subtext="سجلات العملاء المسجلة"
        />

        <StatCard
          title="العملاء الأفراد"
          value={`${pageStats.individuals.toLocaleString('ar-IQ')} عميل`}
          comparison="— الصفحة الحالية"
          subtext="حسابات عملاء أفراد"
        />

        <StatCard
          title="الشركات والمؤسسات"
          value={`${pageStats.companies.toLocaleString('ar-IQ')} شركة`}
          comparison="— الصفحة الحالية"
          subtext="حسابات عملاء شركات"
        />
      </div>

      <DataTable
        tableId="customers_table_v1"
        data={rawCustomers}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={handleRowClick}
        searchPlaceholder="البحث بالاسم، رقم الهاتف، رقم الهوية..."
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1) }}
        exportFilename={`العملاء-${totalCount}-سجل`}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key) => {
          if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
          else { setSortKey(key); setSortDir('asc') }
          setPage(1)
        }}
        onFilterDrawerToggle={() => setFilterDrawerOpen(false)}
        activeFilterCount={activeFilterCount}
        quickFilterControl={
          <div className="flex items-center gap-1 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-background)] p-0.5">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'Individual', label: 'أفراد' },
              { id: 'Company', label: 'شركات' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setTypeFilter(tab.id); setPage(1) }}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                  typeFilter === tab.id
                    ? 'bg-white text-[var(--ds-primary)] font-bold shadow-2xs'
                    : 'text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
        rowActions={(customer) => [
          { label: 'كشف الحساب', icon: <FileText className="h-3 w-3" />, onClick: () => window.location.href = `/customers/${customer.id}/statement` },
          { label: 'معاينة الملف', icon: <Eye className="h-3 w-3" />, onClick: () => handleRowClick(customer) },
          { label: 'تعديل البيانات', icon: <Plus className="h-3 w-3" />, onClick: () => window.location.href = `/customers/${customer.id}/edit` },
        ]}
      />

      {/* Customer Quick Inspection Drawer */}
      {selectedCustomer && (
        <Drawer
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          title={selectedCustomer.full_name || selectedCustomer.name}
          subtitle={`رقم العميل: #${selectedCustomer.id} • ${selectedCustomer.branch?.name ?? 'الفرع الرئيسي'}`}
        >
          <div className="space-y-4 text-right">
            <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-background)] p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--ds-text-secondary)]">نوع الحساب:</span>
                <span className="font-bold">{selectedCustomer.customer_type === 'Company' ? 'شركة / مؤسسة' : 'عميل فرد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ds-text-secondary)]">رقم الهاتف:</span>
                <PhoneCell phone={selectedCustomer.phone} />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ds-text-secondary)]">رقم الهوية:</span>
                <span className="font-mono font-bold">{maskNationalId(selectedCustomer.id_number, isAuthorized)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ds-text-secondary)]">العنوان:</span>
                <span className="font-semibold">{selectedCustomer.address ?? '—'}</span>
              </div>
            </div>

            <div className="border-t border-[var(--ds-border)] pt-4 space-y-2">
              <Button asChild variant="primary" size="sm" className="w-full justify-center">
                <Link href={`/customers/${selectedCustomer.id}/statement`}>
                  <FileText className="h-3.5 w-3.5 gap-1.5" />
                  <span>فتح كشف الحساب المالي الكامل</span>
                </Link>
              </Button>

              <Button asChild variant="secondary" size="sm" className="w-full justify-center">
                <Link href={`/customers/${selectedCustomer.id}`}>
                  <span>فتح البروفايل الكامل</span>
                </Link>
              </Button>
            </div>
          </div>
        </Drawer>
      )}

    </div>
  )
}
