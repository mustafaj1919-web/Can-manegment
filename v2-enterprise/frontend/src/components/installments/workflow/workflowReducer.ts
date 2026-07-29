import type { WorkflowContext, InstallmentPaymentWorkflowState, EligibleAccountDto, PaymentResultDto, WorkflowErrorContext, PaymentWorkflowFormValues } from './workflowTypes'

export type WorkflowAction =
  | { type: 'START_WORKFLOW'; initialAmount: number; defaultMethod?: 'Cash' | 'BankTransfer' }
  | { type: 'UPDATE_FORM'; payload: Partial<PaymentWorkflowFormValues> }
  | { type: 'SET_ELIGIBLE_ACCOUNTS'; accounts: EligibleAccountDto[] }
  | { type: 'PROCEED_TO_REVIEW' }
  | { type: 'BACK_TO_EDIT' }
  | { type: 'SUBMIT_PAYMENT' }
  | { type: 'SUBMISSION_SUCCESS'; result: PaymentResultDto }
  | { type: 'SUBMISSION_TIMEOUT'; idempotencyKey: string }
  | { type: 'FETCH_RECEIPT' }
  | { type: 'RECEIPT_LOADED' }
  | { type: 'RECEIPT_ERROR'; error: WorkflowErrorContext }
  | { type: 'PROCEED_TO_ARCHIVE' }
  | { type: 'CONFIRM_ARCHIVE'; method: 'ManuallyConfirmed' | 'Uploaded'; notes?: string }
  | { type: 'ARCHIVE_SUCCESS'; archiveStatus: string }
  | { type: 'SET_ERROR'; error: WorkflowErrorContext }
  | { type: 'RESET_WORKFLOW' }

export const initialWorkflowContext: WorkflowContext = {
  state: 'idle',
  idempotencyKey: '',
  formValues: {
    amount: '',
    paymentMethod: 'Cash',
    accountId: '',
    notes: ''
  },
  eligibleAccounts: [],
  isLoadingAccounts: false,
  isSubmitting: false,
  paymentResult: null,
  errorContext: null,
  archiveMethod: 'ManuallyConfirmed',
  archiveNotes: ''
}

export function workflowReducer(state: WorkflowContext, action: WorkflowAction): WorkflowContext {
  switch (action.type) {
    case 'START_WORKFLOW':
      return {
        ...initialWorkflowContext,
        state: 'payment_entry',
        idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`,
        formValues: {
          amount: String(action.initialAmount || ''),
          paymentMethod: action.defaultMethod || 'Cash',
          accountId: '',
          notes: ''
        }
      }

    case 'UPDATE_FORM':
      return {
        ...state,
        formValues: {
          ...state.formValues,
          ...action.payload
        }
      }

    case 'SET_ELIGIBLE_ACCOUNTS': {
      const defaultAccount = action.accounts.find(a => a.isDefault) || action.accounts[0]
      return {
        ...state,
        eligibleAccounts: action.accounts,
        isLoadingAccounts: false,
        formValues: {
          ...state.formValues,
          accountId: state.formValues.accountId || (defaultAccount?.id ?? '')
        }
      }
    }

    case 'PROCEED_TO_REVIEW':
      if (state.state !== 'payment_entry') return state
      if (!state.formValues.amount || parseFloat(state.formValues.amount) <= 0) return state
      return {
        ...state,
        state: 'reviewing'
      }

    case 'BACK_TO_EDIT':
      if (state.state !== 'reviewing') return state
      return {
        ...state,
        state: 'payment_entry'
      }

    case 'SUBMIT_PAYMENT':
      if (state.state !== 'reviewing' && state.state !== 'submission_unknown') return state
      return {
        ...state,
        state: 'submitting',
        isSubmitting: true,
        errorContext: null
      }

    case 'SUBMISSION_SUCCESS':
      return {
        ...state,
        state: 'payment_posted',
        isSubmitting: false,
        paymentResult: action.result,
        errorContext: null
      }

    case 'SUBMISSION_TIMEOUT':
      return {
        ...state,
        state: 'submission_unknown',
        isSubmitting: false,
        errorContext: {
          stage: 'submitting',
          code: 'TIMEOUT',
          safeMessage: 'جارٍ التحقق من حالة عملية الدفع...',
          recoverable: true,
          idempotencyKey: action.idempotencyKey
        }
      }

    case 'FETCH_RECEIPT':
      return {
        ...state,
        state: 'receipt_loading'
      }

    case 'RECEIPT_LOADED':
      return {
        ...state,
        state: 'receipt_ready'
      }

    case 'RECEIPT_ERROR':
      return {
        ...state,
        state: 'receipt_failed',
        errorContext: action.error
      }

    case 'PROCEED_TO_ARCHIVE':
      return {
        ...state,
        state: 'archive_pending'
      }

    case 'CONFIRM_ARCHIVE':
      return {
        ...state,
        state: 'archiving',
        archiveMethod: action.method,
        archiveNotes: action.notes || ''
      }

    case 'ARCHIVE_SUCCESS':
      return {
        ...state,
        state: 'completed',
        paymentResult: state.paymentResult ? {
          ...state.paymentResult,
          archiveStatus: action.archiveStatus
        } : null
      }

    case 'SET_ERROR':
      return {
        ...state,
        isSubmitting: false,
        errorContext: action.error
      }

    case 'RESET_WORKFLOW':
      return initialWorkflowContext

    default:
      return state
  }
}
