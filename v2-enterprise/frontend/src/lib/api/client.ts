import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth-store'

/* ─── Axios Instance ─────────────────────────────────────────────────────── */

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15_000,
})

// Request interceptor to attach JWT and handle FormData
apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }

  // Attach JWT Bearer Token if present in store
  try {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Ignore server-side execution errors
  }

  return config
})

/* ─── Response Error Interceptor ─────────────────────────────────────────── */

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const cfg = error.config as (InternalAxiosRequestConfig & { skipAuthRedirect?: boolean }) | undefined
      if (!cfg?.skipAuthRedirect && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        try { useAuthStore.getState().clearAuth() } catch { /* store may not be ready */ }
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/* ─── Typed Request Helpers ──────────────────────────────────────────────── */

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<T>(url, config)
  return response.data
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.post<T>(url, data, config)
  return response.data
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.put<T>(url, data, config)
  return response.data
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<T>(url, config)
  return response.data
}

/* ─── API Error Extractor ────────────────────────────────────────────────── */

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error ?? data?.message ?? error.message ?? 'حدث خطأ غير متوقع'
  }
  if (error instanceof Error) return error.message
  return 'حدث خطأ غير متوقع'
}
