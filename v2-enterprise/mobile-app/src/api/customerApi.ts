import { apiClient } from './client'
import {
  CustomerProfile,
  CustomerDashboardData,
  CustomerContract,
  CustomerInstallment,
  CustomerPayment,
} from '../features/customer/types'

export async function getCustomerProfile(): Promise<CustomerProfile> {
  const res = await apiClient.get<{ success: boolean; data: CustomerProfile }>('/customer/me')
  return res.data.data
}

export async function getCustomerDashboard(): Promise<CustomerDashboardData> {
  const res = await apiClient.get<{ success: boolean; data: CustomerDashboardData }>('/customer/dashboard')
  return res.data.data
}

export async function getCustomerContracts(): Promise<CustomerContract[]> {
  const res = await apiClient.get<{ success: boolean; data: CustomerContract[] }>('/customer/contracts')
  return res.data.data || []
}

export async function getCustomerInstallments(status?: string): Promise<CustomerInstallment[]> {
  const params = status ? { status } : {}
  const res = await apiClient.get<{ success: boolean; data: CustomerInstallment[] }>('/customer/installments', {
    params,
  })
  return res.data.data || []
}

export async function getCustomerPayments(): Promise<CustomerPayment[]> {
  const res = await apiClient.get<{ success: boolean; data: CustomerPayment[] }>('/customer/payments')
  return res.data.data || []
}
