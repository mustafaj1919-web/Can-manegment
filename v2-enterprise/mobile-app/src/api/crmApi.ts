import { apiClient } from './client'
import {
  PipelineSummaryData,
  CreateDealRequest,
  MoveStageRequest,
  CreateInteractionRequest,
  CrmInteraction,
  CustomerSearchItem,
} from '../features/crm/types'

export async function getCrmSummary(): Promise<any> {
  const res = await apiClient.get<{ success: boolean; data: any }>('/Crm/summary')
  return res.data.data
}

export async function getPipeline(employeeId?: string): Promise<PipelineSummaryData> {
  const params: Record<string, any> = {}
  if (employeeId) params.employee_id = employeeId

  const res = await apiClient.get<{ success: boolean; data: PipelineSummaryData }>('/Crm/pipeline', { params })
  return res.data.data
}

export async function createDeal(payload: CreateDealRequest): Promise<{ id: string }> {
  const res = await apiClient.post<{ success: boolean; id: string; message: string }>('/Crm/deals', payload)
  return { id: res.data.id }
}

export async function moveDealStage(id: string, payload: MoveStageRequest): Promise<void> {
  await apiClient.post(`/Crm/deals/${id}/stage`, payload)
}

export async function updateDeal(id: string, payload: Partial<CreateDealRequest>): Promise<void> {
  await apiClient.put(`/Crm/deals/${id}`, payload)
}

export async function deleteDeal(id: string): Promise<void> {
  await apiClient.delete(`/Crm/deals/${id}`)
}

export async function getInteractions(params: {
  customer_id?: string
  page?: number
  type?: string
  outcome?: string
} = {}): Promise<{
  total: number
  items: CrmInteraction[]
  due_soon: CrmInteraction[]
}> {
  const res = await apiClient.get<{
    success: boolean
    data: { total: number; items: CrmInteraction[]; due_soon: CrmInteraction[] }
  }>('/Crm/interactions', { params })
  return res.data.data
}

export async function createInteraction(payload: CreateInteractionRequest): Promise<{ id: string }> {
  const res = await apiClient.post<{ success: boolean; id: string; message: string }>('/Crm/interactions', payload)
  return { id: res.data.id }
}

export async function searchCustomers(query: string): Promise<CustomerSearchItem[]> {
  const res = await apiClient.get<{
    success: boolean
    total: number
    data: any[]
  }>('/Customers', {
    params: { search: query, page: 1, per_page: 25 },
  })

  return (res.data.data || []).map((c) => ({
    id: c.id,
    name: c.name || c.full_name || 'عميل',
    full_name: c.full_name,
    phone: c.phone || '',
    customer_type: c.customer_type,
  }))
}

export async function createCustomer(payload: {
  name: string
  phone: string
  address?: string
  notes?: string
}): Promise<{ customerId: string }> {
  const res = await apiClient.post<{ success: boolean; customerId: string; message: string }>('/Customers', {
    name: payload.name,
    phone: payload.phone,
    address: payload.address || 'العراق',
    customerType: 'Individual',
    notes: payload.notes,
  })
  return { customerId: res.data.customerId }
}
