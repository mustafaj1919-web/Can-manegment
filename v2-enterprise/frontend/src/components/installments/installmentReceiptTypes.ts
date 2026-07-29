export type PaymentMethodType = 'Cash' | 'BankTransfer' | 'Bank' | 'POS' | 'Cheque' | string

export type ReceiptStatusType = 'Posted' | 'Pending' | 'Reversed' | 'Cancelled' | string

export interface CustomerReceiptInfo {
  id?: number | string
  name: string
  phone?: string | null
  nationalIdMasked?: string | null
  customerCode?: string | null
  contractNumber?: string | null
  salesRepName?: string | null
}

export interface VehicleReceiptInfo {
  name: string
  brand?: string | null
  model?: string | null
  year?: string | number | null
  vin?: string | null
  plateNumber?: string | null
  color?: string | null
  engineSize?: string | null
  imageUrl?: string | null
}

export interface ContractDetailsInfo {
  contractDate?: string | null
  installmentMonths?: number | null
  financingType?: string | null
}

export interface CurrentPaymentInfo {
  id: number | string
  installmentNumber?: number | null
  totalInstallments?: number | null
  amount: number
  currency: 'IQD' | 'USD' | string
  paymentMethod: PaymentMethodType
  dueDate?: string | null
  paymentDate: string
  paymentTime?: string | null
  referenceNumber?: string | null
  transactionId?: string | null
  bankName?: string | null
  approvalCode?: string | null
  notes?: string | null
}

export interface ContractProgressInfo {
  totalAmount: number
  previouslyPaid: number
  paidThisTime: number
  totalPaid: number
  remainingBalance: number
  paidInstallmentsCount: number
  totalInstallmentsCount: number
  completionPercentage: number
  isCompleted: boolean
  discount?: number
  penalty?: number
  tax?: number
  netPaid?: number
}

export interface NextInstallmentInfo {
  installmentNumber: number
  dueDate: string
  amount: number
  currency: string
  overdueDays?: number | null
}

export interface VerificationInfo {
  journalEntryNumber?: string | null
  cashAccountName?: string | null
  verificationUrl?: string | null
  qrCodeUrl?: string | null
  receivedBy?: string | null
  approvedBy?: string | null
}

export interface CompanyInfo {
  name: string
  subtitle: string
  phone?: string
  email?: string
  website?: string
  address?: string
  logoUrl: string
}

export interface InstallmentReceiptViewModel {
  receiptNumber: string
  status: ReceiptStatusType
  statusLabel: string
  issuedAtDate: string
  issuedAtTime?: string
  branchName?: string
  customer: CustomerReceiptInfo
  vehicle?: VehicleReceiptInfo | null
  contractDetails?: ContractDetailsInfo | null
  payment: CurrentPaymentInfo
  contractProgress?: ContractProgressInfo | null
  nextInstallment?: NextInstallmentInfo | null
  verification?: VerificationInfo | null
  company: CompanyInfo
  isCancelledOrReversed: boolean
  cancellationReason?: string | null
}
