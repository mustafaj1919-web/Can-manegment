import { get, post } from './client'
import type { AuthResponse } from '@/types'

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', { username, password })
}

export async function getCurrentUser(): Promise<AuthResponse> {
  return get<AuthResponse>('/auth/me')
}

export async function changePassword(payload: {
  current_password: string
  new_password: string
  confirm_password: string
}): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('/auth/change-password', payload)
}

export async function logoutUser(): Promise<void> {
  await post('/auth/logout').catch(() => {})
}
