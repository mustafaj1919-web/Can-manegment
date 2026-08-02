import { apiClient } from './client'
import {
  InventoryQueryFilters,
  InventoryListResponse,
  VehicleDetails,
} from '../features/inventory/types'

const API_BASE_URL = (process.env as any).EXPO_PUBLIC_API_URL || 'http://localhost:8080/api'
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export async function getInventory(
  filters: InventoryQueryFilters = {}
): Promise<InventoryListResponse> {
  const params: Record<string, any> = {
    page: filters.page || 1,
    per_page: filters.perPage || 25,
  }

  if (filters.status && filters.status !== 'All') {
    params.status = filters.status
  }

  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim()
  }

  const res = await apiClient.get<InventoryListResponse>('/Inventory', { params })
  return res.data
}

export async function getVehicleDetails(id: string): Promise<VehicleDetails> {
  const res = await apiClient.get<{ success: boolean; data: VehicleDetails }>(`/Inventory/${id}`)
  return res.data.data
}

export async function changeVehicleStatus(
  id: string,
  newStatus: string,
  notes?: string
): Promise<void> {
  await apiClient.patch(`/Inventory/${id}/status`, {
    newStatus,
    notes,
  })
}

export function getVehicleImageUrl(filename?: string | null): string | null {
  if (!filename) return null
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename
  }
  return `${SERVER_BASE_URL}/static/uploads/vehicles/${filename}`
}
