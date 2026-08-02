import axios from 'axios'
import { getAccessToken, clearSession } from '../services/storageService'

const API_URL = (process.env as any).EXPO_PUBLIC_API_URL || 'http://localhost:8080/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request Interceptor: Attach Bearer Token from SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Callback for 401 Session Expiration
let onSessionExpiredCallback: (() => void) | null = null

export function registerSessionExpiredCallback(cb: () => void) {
  onSessionExpiredCallback = cb
}

// Response Interceptor: Single Retry Flag & Safe 401 Session Clearance
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Backend uses JWT without refresh token endpoint — clear local secure session immediately
      await clearSession()
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback()
      }
    }
    return Promise.reject(error)
  }
)
