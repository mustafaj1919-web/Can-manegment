'use client'

import React, { useReducer, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { get, post } from '@/lib/api/client'
import { toast } from 'sonner'
import type { InstallmentPlanDetail } from '@/lib/api/installments'
import type { InstallmentScheduleItem } from '@/lib/api/sales'
import { workflowReducer, initialWorkflowContext } from './workflowReducer'
import { PaymentWorkflowProgress } from './PaymentWorkflowProgress'
import { InstallmentPaymentModal } from './InstallmentPaymentModal'
import { InstallmentPaymentReview } from './InstallmentPaymentReview'
import { InstallmentPaymentSuccess } from './InstallmentPaymentSuccess'
import { ReceiptArchiveStep } from './ReceiptArchiveStep'
import { WorkflowCompleted } from './WorkflowCompleted'
import { InstallmentReceiptA5Document, printInstallmentReceipt } from '../InstallmentReceiptA5Document'
import { adaptInstallmentReceiptData } from '../installmentReceiptAdapter'
import { Printer, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstallmentPaymentWorkflowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: InstallmentPlanDetail
  schedule: InstallmentScheduleItem
  initialState?: string
  existingPaymentId?: string
}

export function InstallmentPaymentWorkflow({
  open,
  onOpenChange,
  plan,
  schedule
}: InstallmentPaymentWorkflowProps) {
  const queryClient = useQueryClient()
  const [context, dispatch] = useReducer(workflowReducer, initialWorkflowContext)

  // Initialize workflow state when modal opens
  useEffect(() => {
    if (open) {
      dispatch({ type: 'START_WORKFLOW', initialAmount: schedule.remaining_amount })
    } else {
      dispatch({ type: 'RESET_WORKFLOW' })
    }
  }, [open, schedule.remaining_amount])

  // Fetch eligible accounts dynamically on method change
  useEffect(() => {
    if (!open) return
    let isMounted = true

    async function loadAccounts() {
      try {
        const res = await get<{ success: boolean; items: any[] }>(
          `/Payments/eligible-accounts?paymentMethod=${context.formValues.paymentMethod}`
        )
        if (isMounted && res?.items) {
          dispatch({ type: 'SET_ELIGIBLE_ACCOUNTS', accounts: res.items })
        }
      } catch {
        // Fallback
        if (isMounted) {
          dispatch({
            type: 'SET_ELIGIBLE_ACCOUNTS',
            accounts: [
              { id: 'cash-default', code: '111001', name: 'الصندوق الرئيسي', accountType: 'Cashbox', currency: 'IQD', isDefault: true }
            ]
          })
        }
      }
    }

    loadAccounts()
    return () => { isMounted = false }
  }, [open, context.formValues.paymentMethod])

  // Handle Submitting Payment
  const handleSubmitPayment = async () => {
    dispatch({ type: 'SUBMIT_PAYMENT' })
    try {
      const payload = {
        amount: parseFloat(context.formValues.amount),
        paymentMethod: context.formValues.paymentMethod,
        accountId: context.formValues.accountId || undefined,
        idempotencyKey: context.idempotencyKey,
        notes: context.formValues.notes || undefined
      }

      const res = await post<any>(`/Installments/schedules/${schedule.id}/payment`, payload)

      if (res && (res.paymentId || res.success)) {
        const result = {
          success: true,
          paymentId: res.paymentId || res.id || '0',
          receiptId: res.receiptId || res.paymentId || '0',
          receiptNumber: res.receiptNumber || res.reference_number || `REC-${Date.now()}`,
          idempotencyKey: context.idempotencyKey,
          financialStatus: res.financialStatus || 'Posted',
          accountingStatus: res.accountingStatus || 'Posted',
          receiptStatus: 'Ready',
          archiveStatus: 'Pending',
          postedAmount: res.postedAmount || payload.amount,
          currency: res.currency || schedule.currency || 'IQD',
          totalPaid: res.totalPaid || (plan.paid_amount + payload.amount),
          remainingBalance: res.remainingBalance ?? Math.max(0, plan.remaining_amount - payload.amount),
          paidInstallmentCount: res.paidInstallmentCount || 1,
          remainingInstallmentCount: res.remainingInstallmentCount || 0,
          journalEntryId: res.journalEntryId,
          journalEntryNumber: res.journalEntryNumber,
          createdAt: res.createdAt || new Date().toISOString()
        }

        dispatch({ type: 'SUBMISSION_SUCCESS', result })
        toast.success('تم تسجيل الدفعة بنجاح وتوليد قيد اليومية!')

        // Invalidate relevant query keys
        queryClient.invalidateQueries({ queryKey: ['installment-plan', plan.id] })
        queryClient.invalidateQueries({ queryKey: ['installments'] })
        queryClient.invalidateQueries({ queryKey: ['payments'] })
      } else {
        throw new Error(res?.message || 'فشل في تسجيل الدفعة')
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'حدث خطأ أثناء الاتصال بالنظام'
      dispatch({
        type: 'SET_ERROR',
        error: {
          stage: 'submitting',
          code: 'PAYMENT_FAILED',
          safeMessage: errorMsg,
          recoverable: true
        }
      })
      toast.error(errorMsg)
    }
  }

  // Handle Receipt Archiving
  const handleConfirmArchive = async (method: 'ManuallyConfirmed' | 'Uploaded', notes?: string) => {
    if (!context.paymentResult?.paymentId) return
    dispatch({ type: 'CONFIRM_ARCHIVE', method, notes })

    try {
      const res = await post<any>(`/Payments/${context.paymentResult.paymentId}/archive`, {
        paymentId: context.paymentResult.paymentId,
        archiveMethod: method,
        notes
      })

      if (res && (res.success || res.archiveStatus)) {
        dispatch({ type: 'ARCHIVE_SUCCESS', archiveStatus: method })
        toast.success('تمت أرشفة وصل السداد بنجاح وتوثيقه!')
        queryClient.invalidateQueries({ queryKey: ['installment-plan', plan.id] })
      } else {
        throw new Error('فشل حفظ الأرشفة')
      }
    } catch (err: any) {
      toast.error('خطأ أثناء الأرشفة: ' + (err?.response?.data?.message || err.message))
      dispatch({ type: 'ARCHIVE_SUCCESS', archiveStatus: method })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] p-0 gap-0 !bg-white !text-slate-900 border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden text-right font-tajawal" dir="rtl">
        {/* Pure White Clean Header */}
        <DialogHeader className="px-8 py-5 border-b border-slate-100 !bg-white flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold !text-slate-900">
              منظومة تسديد الأقساط والتوثيق المالي
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              {plan.buyer_name} — {plan.invoice_number ?? `عقد #${plan.id}`}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Modern Stepper */}
        <PaymentWorkflowProgress currentState={context.state} />

        {/* Content Container */}
        <div className="p-8 bg-slate-50/50 overflow-y-auto max-h-[80vh]">
          {context.state === 'payment_entry' && (
            <InstallmentPaymentModal
              plan={plan}
              schedule={schedule}
              context={context}
              onUpdateForm={(updates) => dispatch({ type: 'UPDATE_FORM', payload: updates })}
              onProceedToReview={() => dispatch({ type: 'PROCEED_TO_REVIEW' })}
              onClose={() => onOpenChange(false)}
            />
          )}

          {context.state === 'reviewing' && (
            <InstallmentPaymentReview
              plan={plan}
              schedule={schedule}
              context={context}
              onBackToEdit={() => dispatch({ type: 'BACK_TO_EDIT' })}
              onSubmitPayment={handleSubmitPayment}
            />
          )}

          {context.state === 'payment_posted' && context.paymentResult && (
            <InstallmentPaymentSuccess
              result={context.paymentResult}
              onOpenReceipt={() => dispatch({ type: 'FETCH_RECEIPT' })}
            />
          )}

          {(context.state === 'receipt_loading' || context.state === 'receipt_ready') && context.paymentResult && (
            <div className="space-y-6">
              <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">معاينة وصل السداد A5 الرسمي</span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void printInstallmentReceipt()}
                    className="h-10 px-5 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    <Printer className="h-4 w-4" />
                    <span>طباعة الوصل</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => dispatch({ type: 'PROCEED_TO_ARCHIVE' })}
                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                  >
                    <span>متابعة الأرشفة ➔</span>
                  </Button>
                </div>
              </div>

              <div className="flex justify-center bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="shrink-0 transform scale-75 sm:scale-85 origin-top transition-transform my-auto">
                  <InstallmentReceiptA5Document
                    data={adaptInstallmentReceiptData({
                      payment: {
                        id: context.paymentResult.paymentId,
                        amount: context.paymentResult.postedAmount,
                        currency: context.paymentResult.currency,
                        payment_method: context.formValues.paymentMethod,
                        payment_date: context.paymentResult.createdAt,
                        reference_number: context.paymentResult.receiptNumber,
                        notes: context.formValues.notes
                      },
                      schedule: schedule,
                      plan: plan,
                      customer: { name: plan.buyer_name, phone: plan.buyer_phone },
                      car: { name: plan.car_name }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {context.state === 'archive_pending' && context.paymentResult && (
            <ReceiptArchiveStep
              paymentResult={context.paymentResult}
              onConfirmArchive={handleConfirmArchive}
              isArchiving={context.isSubmitting}
            />
          )}

          {context.state === 'completed' && context.paymentResult && (
            <WorkflowCompleted
              paymentResult={context.paymentResult}
              onViewReceipt={() => dispatch({ type: 'FETCH_RECEIPT' })}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
