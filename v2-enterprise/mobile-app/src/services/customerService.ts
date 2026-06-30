import { requestApi } from './apiClient';
import { CustomerProfile, CustomerDashboard, SalesContract } from '../types/customer';
import { Installment, PaymentHistory } from '../types/installment';

export const customerService = {
  async getProfile() {
    return requestApi<CustomerProfile>('customer/me');
  },

  async getDashboard() {
    return requestApi<CustomerDashboard>('customer/dashboard');
  },

  async getContracts() {
    return requestApi<SalesContract[]>('customer/contracts');
  },

  async getInstallments(status?: string) {
    const endpoint = status ? `customer/installments?status=${encodeURIComponent(status)}` : 'customer/installments';
    return requestApi<Installment[]>(endpoint);
  },

  async getPayments() {
    return requestApi<PaymentHistory[]>('customer/payments');
  }
};
