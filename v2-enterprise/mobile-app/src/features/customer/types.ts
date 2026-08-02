export interface CustomerProfile {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  id_number?: string | null
}

export interface CustomerDashboardData {
  contracts_count: number
  total_installments: number
  total_paid: number
  total_remaining: number
  next_due_date?: string | null
  next_due_amount: number
}

export interface CustomerContractVehicle {
  id: string
  brand?: string | null
  model?: string | null
  year?: number | null
}

export interface CustomerContract {
  id: string
  contract_number: string
  sale_date: string
  total_price: number
  down_payment: number
  remaining_balance: number
  status: string
  vehicle?: CustomerContractVehicle | null
}

export interface CustomerInstallment {
  id: string
  installment_number: number
  due_date: string
  amount: number
  paid_amount: number
  remaining: number
  status: 'Pending' | 'Paid' | 'PartiallyPaid' | 'Overdue' | 'Cancelled' | string
  payment_date?: string | null
  contract_number: string
}

export interface CustomerPayment {
  id: string
  reference_number: string
  amount: number
  payment_date: string
  method: string
  description?: string | null
}

export function getCustomerInstallmentStatusConfig(status: string): {
  label: string
  badgeStatus: 'Available' | 'Reserved' | 'Sold' | 'Overdue' | 'Cancelled' | 'Paid'
} {
  switch (status) {
    case 'Paid':
      return { label: 'مسدد', badgeStatus: 'Paid' }
    case 'PartiallyPaid':
      return { label: 'مسدد جزئياً', badgeStatus: 'Reserved' }
    case 'Overdue':
      return { label: 'متأخر', badgeStatus: 'Overdue' }
    case 'Pending':
    default:
      return { label: 'قادم / مستحق', badgeStatus: 'Available' }
  }
}
