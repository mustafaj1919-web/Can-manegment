import { apiClient } from './client'
import {
  EmployeeLoginRequest,
  EmployeeLoginResponse,
  CustomerLoginRequest,
  CustomerLoginResponse,
  AuthenticatedUser,
  BranchSummary,
} from '../types/auth'

export async function loginEmployee(payload: EmployeeLoginRequest): Promise<EmployeeLoginResponse> {
  const res = await apiClient.post<EmployeeLoginResponse>('/Auth/login', payload)
  return res.data
}

export async function loginCustomer(payload: CustomerLoginRequest): Promise<CustomerLoginResponse> {
  const res = await apiClient.post<CustomerLoginResponse>('/customer/auth/login', payload)
  return res.data
}

export async function getEmployeeMe(): Promise<{
  success: boolean
  user: AuthenticatedUser
  branches: BranchSummary[]
  active_branch: BranchSummary
}> {
  const res = await apiClient.get<any>('/Auth/me')
  return res.data
}

export async function getCustomerMe(): Promise<{
  success: boolean
  data: {
    id: string
    name: string
    phone: string
    email?: string | null
  }
}> {
  const res = await apiClient.get<any>('/customer/me')
  return res.data
}

export async function switchBranchApi(branchId: string): Promise<EmployeeLoginResponse> {
  const formData = new FormData()
  formData.append('branch_id', branchId)
  const res = await apiClient.post<EmployeeLoginResponse>('/Auth/switch-branch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
