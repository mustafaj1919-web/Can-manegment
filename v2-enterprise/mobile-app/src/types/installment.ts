export interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  status: 'Paid' | 'Pending' | 'PartiallyPaid' | 'Overdue';
  payment_date?: string;
  contract_number: string;
}

export interface PaymentHistory {
  id: string;
  reference_number: string;
  amount: number;
  payment_date: string;
  method: string;
  description: string;
}
