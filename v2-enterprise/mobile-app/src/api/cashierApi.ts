import { apiClient } from './client'
import {
  InstallmentPlanSummaryItem,
  InstallmentPlanDetail,
  EligibleAccount,
  PaySchedulePayload,
  PaymentResultData,
  DigitalReceiptData,
} from '../features/cashier/types'

export async function getInstallmentsList(params: {
  page?: number
  per_page?: number
  filter?: string
  search?: string
} = {}): Promise<{
  total: number
  summary: any
  items: InstallmentPlanSummaryItem[]
}> {
  const res = await apiClient.get<any>('/Installments', { params })
  return {
    total: res.data.total,
    summary: res.data.summary,
    items: res.data.items || [],
  }
}

export async function getInstallmentPlan(planId: string): Promise<InstallmentPlanDetail> {
  const res = await apiClient.get<InstallmentPlanDetail>(`/Installments/${planId}`)
  return res.data
}

export async function getEligibleAccounts(paymentMethod: string = 'Cash'): Promise<EligibleAccount[]> {
  const res = await apiClient.get<{ success: boolean; items: EligibleAccount[] }>('/Payments/eligible-accounts', {
    params: { paymentMethod },
  })
  return res.data.items || []
}

export async function payInstallmentSchedule(
  scheduleId: string,
  payload: PaySchedulePayload
): Promise<PaymentResultData> {
  const res = await apiClient.post<PaymentResultData>(
    `/Installments/schedules/${scheduleId}/payment`,
    payload
  )
  return res.data
}

export async function getReceiptDetail(paymentId: string): Promise<DigitalReceiptData> {
  const res = await apiClient.get<DigitalReceiptData>(`/Payments/${paymentId}/receipt`)
  return res.data
}

export async function getRecentPayments(params: {
  type?: 'receipt' | 'payment' | 'transfer'
  page?: number
  per_page?: number
} = {}): Promise<{ total: number; items: any[] }> {
  const res = await apiClient.get<{ success: boolean; data: { total: number; items: any[] } }>('/Payments', {
    params: { type: params.type || 'receipt', page: params.page || 1, per_page: params.per_page || 25 },
  })
  return res.data.data
}

export async function getPaymentRecoveryByKey(key: string): Promise<any> {
  const res = await apiClient.get(`/Payments/recovery/by-idempotency-key/${key}`)
  return res.data
}
