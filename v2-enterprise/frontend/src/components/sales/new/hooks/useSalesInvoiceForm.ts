'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createSale, CarOption, CustomerOption } from '@/lib/api/sales'
import { extractApiError } from '@/lib/api/client'

export interface SalesFormState {
  carId: string
  buyerId: string
  sellingPrice: string
  discount: string
  paidAmount: string
  currency: 'USD' | 'IQD'
  paymentMethod: string
  saleDate: string
  customerVatNumber: string
  salesRepId: string
  enableInstallment: boolean
  calcMode: 'months' | 'amount'
  numMonths: string
  customMonthlyAmount: string
  startDate: string
  dueDay: string
  installNotes: string
}

export function useSalesInvoiceForm(
  selectedCar?: CarOption,
  selectedBuyer?: CustomerOption,
  userRole?: string
) {
  const router = useRouter()
  const queryClient = useQueryClient()

  /* ── 1. Authoritative Form State ── */
  const [formState, setFormState] = useState<SalesFormState>({
    carId: '',
    buyerId: '',
    sellingPrice: '',
    discount: '0',
    paidAmount: '',
    currency: 'USD',
    paymentMethod: 'Cash',
    saleDate: new Date().toISOString().slice(0, 10),
    customerVatNumber: '',
    salesRepId: '',
    enableInstallment: false,
    calcMode: 'months',
    numMonths: '',
    customMonthlyAmount: '',
    startDate: '',
    dueDay: '',
    installNotes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)

  // Helper setter
  const setFieldValue = <K extends keyof SalesFormState>(key: K, value: SalesFormState[K]) => {
    setFormState(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  /* ── 2. Sync Selected Car Price (only initial/explicit) ── */
  useEffect(() => {
    if (selectedCar?.selling_price && !formState.sellingPrice) {
      setFormState(prev => ({
        ...prev,
        sellingPrice: String(selectedCar.selling_price),
        currency: selectedCar.currency,
      }))
    }
  }, [selectedCar])

  /* ── 3. Payment Method Controls Installment Accordion ── */
  useEffect(() => {
    if (formState.paymentMethod === 'Installment') {
      setFieldValue('enableInstallment', true)
    } else {
      setFieldValue('enableInstallment', false)
    }
  }, [formState.paymentMethod])

  /* ── 4. Unsaved Changes Warning ── */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  /* ── 5. Derived Financial Previews (Clearly Labeled as Preview) ── */
  const sp = parseFloat(formState.sellingPrice) || 0
  const dc = parseFloat(formState.discount) || 0
  const pa = parseFloat(formState.paidAmount) || 0
  const netRevenuePreview = Math.max(sp - dc, 0)
  const remainingPreview = Math.max(sp - dc - pa, 0)

  // Role-restricted profit metrics (Only for Owner, Admin, Accountant)
  const isAuthorizedRole = useMemo(() => {
    if (!userRole) return true // Default view if role isn't explicitly restricted
    const roleUpper = userRole.toUpperCase()
    return roleUpper.includes('ADMIN') || roleUpper.includes('OWNER') || roleUpper.includes('ACCOUNTANT') || roleUpper.includes('MANAGER')
  }, [userRole])

  const purchaseCost = selectedCar ? (parseFloat(String(selectedCar.purchase_price)) || 0) : 0
  const profitPreview = purchaseCost > 0 ? netRevenuePreview - purchaseCost : 0
  const profitPctPreview = purchaseCost > 0 ? (profitPreview / purchaseCost) * 100 : 0
  const isBelowCost = purchaseCost > 0 && netRevenuePreview < purchaseCost

  /* ── 6. Validation ── */
  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!formState.carId) e.carId = 'اختر السيارة المتاحة'
    if (!formState.buyerId) e.buyerId = 'اختر العميل المشتري'
    if (!formState.sellingPrice || sp <= 0) e.sellingPrice = 'أدخل سعر البيع الصحيح'
    if (!formState.paymentMethod) e.paymentMethod = 'اختر طريقة الدفع'
    if (!formState.saleDate) e.saleDate = 'أدخل تاريخ البيع'

    if (formState.paymentMethod === 'Installment') {
      if (formState.calcMode === 'months') {
        if (!formState.numMonths || parseInt(formState.numMonths) <= 0) {
          e.numMonths = 'أدخل عدد الأشهر'
        }
      } else {
        if (!formState.customMonthlyAmount || parseFloat(formState.customMonthlyAmount) <= 0) {
          e.customMonthlyAmount = 'أدخل قيمة القسط الشهري'
        }
      }
      if (!formState.startDate) e.startDate = 'أدخل تاريخ بداية الأقساط'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── 7. Submission Mutation ── */
  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['available-cars'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['buyers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`تم إنشاء فاتورة البيع ${res.invoice_number}`)
      router.push(`/sales/${res.id}`)
    },
    onError: (err: unknown) => {
      toast.error(extractApiError(err))
    },
  })

  function handleSubmit() {
    if (!validate()) {
      toast.error('يرجى تصحيح الحقول المطلوبة قبل الحفظ')
      return
    }

    // Prepare ISO format for installment start date if provided
    let isoStartDate: string | null = null
    if (formState.startDate) {
      try {
        isoStartDate = new Date(formState.startDate).toISOString()
      } catch {
        isoStartDate = formState.startDate
      }
    }

    mutation.mutate({
      car_id: formState.carId as any,
      buyer_id: formState.buyerId as any,
      selling_price: sp,
      discount: dc,
      paid_amount: pa,
      currency: formState.currency,
      payment_method: formState.paymentMethod,
      sale_date: formState.saleDate,
      enable_installment: formState.paymentMethod === 'Installment',
      number_of_months: formState.calcMode === 'months' && formState.numMonths ? parseInt(formState.numMonths) : 0,
      custom_monthly_installment_amount: formState.calcMode === 'amount' && formState.customMonthlyAmount ? parseFloat(formState.customMonthlyAmount) : null,
      installment_start_date: isoStartDate,
      installment_due_day: formState.dueDay ? parseInt(formState.dueDay) : null,
      installment_notes: formState.installNotes || null,
      customer_vat_number: formState.customerVatNumber || null,
      sales_rep_id: formState.salesRepId && formState.salesRepId.trim().length > 0 ? formState.salesRepId : null,
    } as any)
  }

  return {
    formState,
    setFieldValue,
    errors,
    isDirty,
    setIsDirty,
    sp,
    dc,
    pa,
    netRevenuePreview,
    remainingPreview,
    isAuthorizedRole,
    purchaseCost,
    profitPreview,
    profitPctPreview,
    isBelowCost,
    handleSubmit,
    isPending: mutation.isPending,
  }
}
