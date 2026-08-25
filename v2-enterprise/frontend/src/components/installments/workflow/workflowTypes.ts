export type InstallmentPaymentWorkflowState =
  | 'idle'
  | 'payment_entry'
  | 'reviewing'
  | 'submitting'
  | 'submission_unknown'
  | 'payment_posted'
  | 'receipt_loading'
  | 'receipt_ready'
  | 'receipt_failed'
  | 'archive_pending'
  | 'archiving'
  | 'archive_failed'
  | 'completed'

export type PaymentMethodType = 'Cash' | 'BankTransfer' | 'POS' | 'Cheque'

export interface EligibleAccountDto {
  id: string
  code: string
  name: string
  accountType: 'Cashbox' | 'Bank'
  currency: string
  isDefault: boolean
}

export interface PaymentWorkflowFormValues {
  amount: string
  paymentMethod: PaymentMethodType
  accountId: string
  notes: string
}

export interface PaymentResultDto {
  success: boolean
  paymentId: string
  receiptId: string
  receiptNumber: string
  idempotencyKey: string
  financialStatus: string
  accountingStatus: 'Posted' | 'Pending' | 'Failed' | string
  receiptStatus: 'Ready' | 'Failed' | string
  archiveStatus: 'Pending' | 'Uploaded' | 'ManuallyConfirmed' | 'Failed' | string
  postedAmount: number
  currency: string
  totalPaid: number
  remainingBalance: number
  paidInstallmentCount: number
  remainingInstallmentCount: number
  nextInstallmentDate?: string | null
  journalEntryId?: string | null
  journalEntryNumber?: string | null
  createdAt: string
}

export interface WorkflowErrorContext {
  stage: string
  code: string
  safeMessage: string
  recoverable: boolean
  paymentId?: string
  receiptId?: string
  idempotencyKey?: string
}

export interface WorkflowContext {
  state: InstallmentPaymentWorkflowState
  idempotencyKey: string
  formValues: PaymentWorkflowFormValues
  eligibleAccounts: EligibleAccountDto[]
  isLoadingAccounts: boolean
  isSubmitting: boolean
  paymentResult: PaymentResultDto | null
  errorContext: WorkflowErrorContext | null
  archiveMethod: 'ManuallyConfirmed' | 'Uploaded'
  archiveNotes: string
}
