import type { InstallmentReceiptViewModel, ContractProgressInfo, NextInstallmentInfo } from './installmentReceiptTypes'
import { mapReceiptStatusArabic, maskNationalId, formatArabicDate } from './installmentReceiptFormatters'

export function adaptInstallmentReceiptData(raw: any): InstallmentReceiptViewModel {
  const payment = raw?.payment ?? raw ?? {}
  const schedule = raw?.schedule ?? null
  const plan = raw?.plan ?? null
  const sale = raw?.sale ?? null
  const customer = raw?.customer ?? null
  const car = raw?.car ?? null

  const paymentId = payment.id ?? raw?.id ?? '0'
  const receiptNumber = raw?.receiptNumber ?? `RCPT-${String(paymentId).padStart(6, '0')}`

  const currency = payment.currency ?? plan?.currency ?? raw?.currency ?? 'IQD'
  const rawDate = payment.payment_date ?? payment.created_at ?? raw?.payment_date ?? new Date().toISOString()
  const { date: issuedAtDate, time: issuedAtTime } = formatArabicDate(rawDate)

  const rawStatus = payment.status ?? raw?.status ?? 'Posted'
  const statusMapped = mapReceiptStatusArabic(rawStatus)
  const isCancelledOrReversed = statusMapped.isError

  // Contract progress calculations (using backend numbers safely)
  let contractProgress: ContractProgressInfo | null = null
  if (plan) {
    const totalAmount = Number(plan.total_amount ?? 0)
    const paidAmount = Number(plan.paid_amount ?? 0)
    const remainingAmount = Number(plan.remaining_amount ?? Math.max(0, totalAmount - paidAmount))
    const currentPaymentAmount = Number(payment.amount ?? 0)
    const previouslyPaid = Math.max(0, paidAmount - currentPaymentAmount)
    const totalInstallmentsCount = Number(plan.number_of_months ?? plan.total_installments ?? 24)
    const paidInstallmentsCount = schedule?.installment_number ?? Math.round((paidAmount / (plan.installment_amount || 1)))
    
    let completionPercentage = 0
    if (totalAmount > 0) {
      completionPercentage = Number(((paidAmount / totalAmount) * 100).toFixed(1))
    }

    // Optional adjustments — only surfaced on the receipt when the backend actually reports them.
    const discount = Number(plan.discount_amount ?? raw?.discount_amount ?? 0) || undefined
    const penalty = Number(plan.penalty_amount ?? raw?.penalty_amount ?? 0) || undefined
    const tax = Number(plan.tax_amount ?? raw?.tax_amount ?? 0) || undefined
    const hasAdjustment = Boolean(discount || penalty || tax)
    const netPaid = hasAdjustment
      ? paidAmount - (discount ?? 0) + (penalty ?? 0) + (tax ?? 0)
      : undefined

    contractProgress = {
      totalAmount,
      previouslyPaid,
      paidThisTime: currentPaymentAmount,
      totalPaid: paidAmount,
      remainingBalance: remainingAmount,
      paidInstallmentsCount,
      totalInstallmentsCount,
      completionPercentage: Math.min(100, Math.max(0, completionPercentage)),
      isCompleted: remainingAmount <= 0 || paidInstallmentsCount >= totalInstallmentsCount,
      discount,
      penalty,
      tax,
      netPaid
    }
  }

  // Next installment information (if backend provides schedule/next installment info)
  let nextInstallment: NextInstallmentInfo | null = null
  if (raw?.nextInstallment) {
    nextInstallment = {
      installmentNumber: Number(raw.nextInstallment.installment_number ?? 0),
      dueDate: raw.nextInstallment.due_date ?? '',
      amount: Number(raw.nextInstallment.amount ?? plan?.installment_amount ?? 0),
      currency,
      overdueDays: raw.nextInstallment.overdue_days ?? null
    }
  } else if (schedule && contractProgress && !contractProgress.isCompleted) {
    const nextNum = (schedule.installment_number ?? 0) + 1
    if (nextNum <= contractProgress.totalInstallmentsCount) {
      nextInstallment = {
        installmentNumber: nextNum,
        dueDate: raw?.next_due_date ?? 'حسب الجدول المعتمد',
        amount: Number(plan?.installment_amount ?? payment.amount ?? 0),
        currency,
        overdueDays: null
      }
    }
  }

  const verificationUrl: string = raw?.verification_url ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/receipt/${receiptNumber}`

  return {
    receiptNumber,
    status: rawStatus,
    statusLabel: statusMapped.label,
    issuedAtDate,
    issuedAtTime,
    branchName: raw?.branch_name ?? raw?.branch ?? 'الفرع الرئيسي',
    customer: {
      id: customer?.id,
      name: customer?.name ?? raw?.customer_name ?? raw?.buyer_name ?? 'العميل المحترم',
      phone: customer?.phone ?? raw?.customer_phone ?? null,
      nationalIdMasked: maskNationalId(customer?.national_id ?? raw?.national_id),
      customerCode: customer?.code ?? (customer?.id ? `CUST-${customer.id}` : null),
      contractNumber: sale?.invoice_number ?? raw?.contract_number ?? (plan?.id ? `CNT-${plan.id}` : null),
      salesRepName: sale?.sales_rep_name ?? raw?.sales_rep_name ?? null
    },
    vehicle: car ? {
      name: car.name ?? `${car.brand ?? ''} ${car.model ?? ''}`.trim(),
      brand: car.brand ?? null,
      model: car.model ?? null,
      year: car.year ?? car.manufacturing_year ?? null,
      vin: car.vin ?? null,
      plateNumber: car.plate_number ?? null,
      color: car.color ?? null,
      engineSize: car.engine_size ?? car.engine ?? null,
      imageUrl: car.image_url ?? car.cover_image ?? null
    } : null,
    contractDetails: (sale || plan) ? {
      contractDate: formatArabicDate(sale?.sale_date ?? plan?.created_at ?? null).date,
      installmentMonths: plan?.number_of_months ?? plan?.total_installments ?? null,
      financingType: raw?.financing_type ?? (plan ? 'تمويل بالتقسيط الداخلي' : null)
    } : null,
    payment: {
      id: paymentId,
      installmentNumber: schedule?.installment_number ?? raw?.installment_number ?? null,
      totalInstallments: contractProgress?.totalInstallmentsCount ?? null,
      amount: Number(payment.amount ?? 0),
      currency,
      paymentMethod: payment.payment_method ?? raw?.payment_method ?? 'Cash',
      dueDate: schedule?.due_date ?? raw?.due_date ?? null,
      paymentDate: issuedAtDate,
      paymentTime: issuedAtTime,
      referenceNumber: payment.reference_number ?? raw?.reference_number ?? (paymentId ? `REF-${paymentId}` : null),
      transactionId: payment.transaction_id ?? raw?.transaction_id ?? null,
      bankName: payment.bank_name ?? raw?.bank_name ?? null,
      approvalCode: payment.approval_code ?? raw?.approval_code ?? null,
      notes: payment.notes ?? raw?.notes ?? null
    },
    contractProgress,
    nextInstallment,
    verification: {
      journalEntryNumber: raw?.journal_entry_number ?? (paymentId ? `JE-${paymentId}` : null),
      cashAccountName: raw?.cash_account_name ?? 'صندوق الأقساط الرئيسي',
      verificationUrl: verificationUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(verificationUrl)}`,
      receivedBy: raw?.received_by ?? 'أمين الصندوق',
      approvedBy: raw?.approved_by ?? null
    },
    company: {
      name: 'شركة الأصدقاء لتجارة السيارات',
      subtitle: 'منصة إدارة المعرض المتكاملة',
      phone: '+964 770 123 4567',
      email: 'info@alasdiqaacars.com',
      website: 'al-asdiqa.com',
      address: 'بغداد - الكريعات - شارع الوقف السيني',
      logoUrl: '/logo.png'
    },
    isCancelledOrReversed,
    cancellationReason: raw?.cancellation_reason ?? null
  }
}
