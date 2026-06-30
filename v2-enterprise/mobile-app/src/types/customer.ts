export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  id_number: string;
}

export interface CustomerDashboard {
  contracts_count: number;
  total_installments: number;
  total_paid: number;
  total_remaining: number;
  next_due_date?: string;
  next_due_amount: number;
}

export interface SalesContract {
  id: string;
  contract_number: string;
  sale_date: string;
  total_price: number;
  down_payment: number;
  remaining_balance: number;
  status: string;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
  };
}
