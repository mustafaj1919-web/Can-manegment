'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { getInstallmentPlan } from '@/lib/api/installments'
import { formatDate, formatMoney, translateStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ContractTable, PrintableContract } from '@/components/contracts/PrintableContract'

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ar-IQ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function InstallmentContractPage() {
  const params = useParams<{ id: string }>()
  const planId = Number(params.id)

  const { data: plan, isLoading, isError, refetch } = useQuery({
    queryKey: ['installment-contract', planId],
    queryFn: () => getInstallmentPlan(planId),
    enabled: Number.isFinite(planId),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07111f] p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[820px] rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] p-6" dir="rtl">
        <div className="glass rounded-lg p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
          <p className="text-sm text-muted-foreground">تعذر تحميل ملحق الأقساط</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3">إعادة المحاولة</Button>
        </div>
      </div>
    )
  }

  return (
    <PrintableContract
      title="ملحق عقد البيع بالتقسيط"
      contractNumber={plan.invoice_number ? `${plan.invoice_number}-INST-${plan.id}` : `INST-${plan.id}`}
      contractDate={formatDateTime(plan.installment_start_date)}
      branchName={plan.branch?.name}
      intro="يعد هذا الملحق جزءا مكملا لعقد البيع، ويوضح جدول الأقساط والمبالغ المستحقة كما هي مسجلة في النظام."
      parties={[
        {
          title: 'بيانات البائع',
          fields: [
            { label: 'الاسم', value: 'شركة الأصدقاء لتجارة السيارات' },
            { label: 'الصفة', value: 'البائع' },
            { label: 'رقم الفاتورة', value: plan.invoice_number },
          ],
        },
        {
          title: 'بيانات المشتري',
          fields: [
            { label: 'الاسم', value: plan.buyer_name },
            { label: 'الهاتف', value: plan.buyer_phone },
            { label: 'رقم الخطة', value: plan.id },
            { label: 'بيان العميل', value: plan.customer_statement ? `${plan.customer_statement.plans_count} خطة` : '-' },
          ],
        },
      ]}
      vehicle={[
        { label: 'السيارة', value: plan.car_name },
        { label: 'رقم الفاتورة', value: plan.invoice_number },
        { label: 'رقم خطة الأقساط', value: plan.id },
        { label: 'حالة الخطة', value: translateStatus(plan.status) },
      ]}
      financial={[
        { label: 'إجمالي الأقساط', value: formatMoney(plan.total_amount, plan.currency) },
        { label: 'المدفوع', value: formatMoney(plan.paid_amount, plan.currency) },
        { label: 'المتبقي', value: formatMoney(plan.remaining_amount, plan.currency) },
        { label: 'عدد الأشهر', value: plan.number_of_months ?? '-' },
        { label: 'قيمة القسط', value: formatMoney(plan.installment_amount, plan.currency) },
        { label: 'يوم الاستحقاق', value: plan.installment_due_day },
      ]}
    >
      <ContractTable
        title="جدول الأقساط"
        rows={plan.schedules}
        emptyText="لا توجد أقساط في هذه الخطة"
        columns={[
          { key: 'number', label: 'رقم القسط', render: (row) => row.installment_number },
          { key: 'due', label: 'تاريخ الاستحقاق', render: (row) => formatDate(row.due_date) },
          { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount, row.currency) },
          { key: 'paid', label: 'المدفوع', render: (row) => formatMoney(row.paid_amount, row.currency) },
          { key: 'remaining', label: 'المتبقي', render: (row) => formatMoney(row.remaining_amount, row.currency) },
          { key: 'payment_date', label: 'تاريخ الدفع', render: (row) => formatDate(row.payment_date) },
          { key: 'status', label: 'الحالة', render: (row) => translateStatus(row.status) },
        ]}
      />

      {plan.customer_statement && (
        <ContractTable
          title="بيان أقساط العميل"
          rows={[plan.customer_statement]}
          emptyText="لا يوجد بيان للعميل"
          columns={[
            { key: 'name', label: 'العميل', render: (row) => row.customer_name },
            { key: 'plans', label: 'عدد الخطط', render: (row) => row.plans_count },
            { key: 'total', label: 'الإجمالي', render: (row) => formatMoney(row.total_amount, row.currency) },
            { key: 'paid', label: 'المدفوع', render: (row) => formatMoney(row.paid_amount, row.currency) },
            { key: 'remaining', label: 'المتبقي', render: (row) => formatMoney(row.remaining_amount, row.currency) },
            { key: 'overdue', label: 'المتأخر', render: (row) => formatMoney(row.overdue_amount, row.currency) },
          ]}
        />
      )}
    </PrintableContract>
  )
}
