import { get, post } from './client'
import type { AuthResponse } from '@/types'

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/Auth/login', { username, password })
}

export async function getCurrentUser(): Promise<AuthResponse> {
  return get<AuthResponse>('/Auth/me')
}

export async function changePassword(payload: {
  current_password: string
  new_password: string
  confirm_password: string
}): Promise<{ success: boolean }> {
  // الميزة غير متوفرة في الخلفية، نرجع فشلًا آمنًا دون إرسال طلب للشبكة
  return Promise.resolve({ success: false })
}

export async function logoutUser(): Promise<void> {
  // تسجيل الخروج محلياً دون إرسال طلب للشبكة
  return Promise.resolve()
}
