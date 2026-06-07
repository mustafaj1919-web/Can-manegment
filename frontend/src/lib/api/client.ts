import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

/* ─── Axios Instance ─────────────────────────────────────────────────────── */

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15_000,
})

// FormData must set its own multipart boundary. The shared JSON header causes
// Flask to receive an empty request.files collection.
apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

/* ─── Response Error Interceptor ─────────────────────────────────────────── */

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session expired — redirect to login (Flask session cookie is gone)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
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
