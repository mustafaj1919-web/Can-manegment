'use client'

import React, { useState } from 'react'
import { PageHeader } from '@/components/enterprise/page-header'
import { StatCard } from '@/components/enterprise/stat-card'
import { DataTable } from '@/components/enterprise/data-table/DataTable'
import { EmptyState } from '@/components/enterprise/empty-state'
import { ErrorState } from '@/components/enterprise/error-state'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { ButtonGroup } from '@/components/ui/button-group'
import { StatusBadge } from '@/components/ui/status-badge'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/panel'
import { Drawer } from '@/components/ui/drawer'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Filter, RefreshCw, Trash2, Edit3, CheckCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { notFound } from 'next/navigation'
import { formatMoney } from '@/lib/design-system/formatting'

export default function DesignSystemShowcasePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const sampleData = [
    { id: 1, invoice: 'INV-2026-001', customer: 'شركة الأمل للمقاولات', vehicle: 'تويوتا لاند كروزر 2025', price: 65000, status: 'Active', method: 'Cash' },
    { id: 2, invoice: 'INV-2026-002', customer: 'أحمد محمود العبيدي', vehicle: 'لكزس LX600 2026', price: 125000, status: 'Active', method: 'Installment' },
    { id: 3, invoice: 'INV-2026-003', customer: 'معرض بغداد الدولي', vehicle: 'مرسيدس G63 AMG 2025', price: 210000, status: 'Cancelled', method: 'Bank transfer' },
  ]

  const sampleColumns = [
    { key: 'invoice', header: 'رقم الفاتورة' },
    { key: 'customer', header: 'اسم العميل' },
    { key: 'vehicle', header: 'السيارة' },
    {
      key: 'price',
      header: 'المبلغ',
      isNumeric: true,
      render: (row: any) => formatMoney(row.price, 'USD')
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (row: any) => <StatusBadge status={row.status} />
    },
  ]

  const sparklineData = [
    { date: '2026-07-01', value: 120000 },
    { date: '2026-07-02', value: 185000 },
    { date: '2026-07-03', value: 160000 },
    { date: '2026-07-04', value: 240000 },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      
      {/* Header */}
      <PageHeader
        title="Enterprise Design System v1 Showcase"
        subtitle="دليل المكونات والنظام البصري الموحد لجميع شاشات النظام"
        icon={<ShieldCheck className="h-5 w-5 text-[#0F766E]" />}
        actions={
          <Button variant="primary" size="sm" onClick={() => toast.success('نظام التصميم يعتمد معايير SAP Fiori & Dynamics 365')}>
            <CheckCircle className="h-3.5 w-3.5" />
            <span>نظام التصميم نشط</span>
          </Button>
        }
      />

      {/* Section 1: Color Tokens */}
      <Panel title="1. الرموز اللونية الأساسية (Semantic Color Tokens)">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <div className="h-10 rounded-lg bg-[#0F766E] shadow-2xs" />
            <span className="text-xs font-bold text-[#111827] block">Primary Accent</span>
            <code className="text-[10px] text-[#6B7280]">#0F766E</code>
          </div>
          <div className="space-y-1">
            <div className="h-10 rounded-lg bg-[#16A34A] shadow-2xs" />
            <span className="text-xs font-bold text-[#111827] block">Success</span>
            <code className="text-[10px] text-[#6B7280]">#16A34A</code>
          </div>
          <div className="space-y-1">
            <div className="h-10 rounded-lg bg-[#D97706] shadow-2xs" />
            <span className="text-xs font-bold text-[#111827] block">Warning</span>
            <code className="text-[10px] text-[#6B7280]">#D97706</code>
          </div>
          <div className="space-y-1">
            <div className="h-10 rounded-lg bg-[#DC2626] shadow-2xs" />
            <span className="text-xs font-bold text-[#111827] block">Danger</span>
            <code className="text-[10px] text-[#6B7280]">#DC2626</code>
          </div>
          <div className="space-y-1">
            <div className="h-10 rounded-lg bg-[#2563EB] shadow-2xs" />
            <span className="text-xs font-bold text-[#111827] block">Info</span>
            <code className="text-[10px] text-[#6B7280]">#2563EB</code>
          </div>
          <div className="space-y-1">
            <div className="h-10 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB]" />
            <span className="text-xs font-bold text-[#111827] block">Background</span>
            <code className="text-[10px] text-[#6B7280]">#F8FAFC</code>
          </div>
        </div>
      </Panel>

      {/* Section 2: Buttons & Actions */}
      <Panel title="2. الأزرار وأدوات التحكم (Buttons & Actions)">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="primary" loading>Loading Button</Button>
            <IconButton icon={<RefreshCw className="h-3.5 w-3.5" />} aria-label="تحديث البيانات" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#6B7280]">مجموعة أزرار مقسمة:</span>
            <ButtonGroup>
              <Button variant="ghost" size="sm" className="bg-white font-bold text-[#0F766E]">الكل</Button>
              <Button variant="ghost" size="sm">النشطة</Button>
              <Button variant="ghost" size="sm">الملغاة</Button>
            </ButtonGroup>
          </div>
        </div>
      </Panel>

      {/* Section 3: Status Badges */}
      <Panel title="3. الشارات وحالات النظام (Semantic Status Badges)">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="Active" />
          <StatusBadge status="Cancelled" />
          <StatusBadge status="Pending" />
          <StatusBadge status="Reserved" />
          <StatusBadge status="Paid" />
          <StatusBadge status="Overdue" />
        </div>
      </Panel>

      {/* Section 4: Enterprise Stat Cards */}
      <Panel title="4. بطاقات المؤشرات الرقمية (Enterprise Stat Cards)">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="إجمالي الفواتير" value="142 فاتورة" comparison="— لا تتوفر مقارنة" />
          <StatCard title="إجمالي المبيعات" value="$400,000" sparklineData={sparklineData} sparklineLabel="حركة المبيعات" />
          <StatCard title="المقبوض الفعلي" value="$350,000" subtext="المبالغ المحصلة حقيقياً" />
          <StatCard title="المستحق المتبقي" value="$50,000" subtext="ذمم غير مسددة" />
        </div>
      </Panel>

      {/* Section 5: Enterprise Data Table */}
      <Panel title="5. جدول البيانات والمصفوفات الرقمية (Enterprise Data Table)">
        <DataTable
          tableId="showcase_table"
          data={sampleData}
          columns={sampleColumns}
          searchPlaceholder="البحث في شاشة العرض..."
          primaryAction={
            <Button variant="primary" size="sm" onClick={() => setDrawerOpen(true)}>
              <Filter className="h-3.5 w-3.5" />
              <span>فتح التصفية</span>
            </Button>
          }
          rowActions={(row) => [
            { label: 'تعديل', icon: <Edit3 className="h-3 w-3" />, onClick: (r) => toast.info(`تعديل الفاتورة ${r.invoice}`) },
            { label: 'حذف', icon: <Trash2 className="h-3 w-3" />, variant: 'danger', onClick: () => setConfirmOpen(true) },
          ]}
        />
      </Panel>

      {/* Section 6: States & Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="حالة فارغة (Empty State)">
          <EmptyState title="لا توجد بيانات مطابقة" description="جرّب تغيير فلتر البحث أو إضافة سجل جديد" actionLabel="إضافة سجل" onAction={() => toast.info('إضافة')} />
        </Panel>
        <Panel title="حالة الخطأ (Error State)">
          <ErrorState onRetry={() => toast.success('تمت إعادة المحاولة')} />
        </Panel>
      </div>

      {/* Interactive Overlays */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="تصفية البيانات المتقدمة">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#374151]">اسم الفاتورة</label>
            <Input placeholder="أدخل رقم الفاتورة..." />
          </div>
          <Button variant="primary" className="w-full" onClick={() => setDrawerOpen(false)}>تطبيق التصفية</Button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          toast.success('تم التأكيد بنجاح')
        }}
        title="تأكيد حذف الفاتورة"
        description="هل أنت أكرر التأكيد على إجراء هذه العملية؟ لا يمكن التراجع بعد التنفيذ."
      />

    </div>
  )
}
