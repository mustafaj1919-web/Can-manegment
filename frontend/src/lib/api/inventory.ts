import { get, post, put } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface CarPhoto {
  id: number
  filename: string
  subfolder?: string
}

export interface Car {
  id: number
  branch_id: number | null
  branch?: { id: number; name: string; is_main: boolean; created_at?: string } | null
  brand: string
  model: string
  manufacturing_year: number
  trim: string | null
  condition?: 'New' | 'Used' | 'Damaged' | 'Salvage' | null
  color: string
  vin: string
  plate_number: string
  plate_status?: 'No Plate' | 'Temporary' | 'Registered' | null
  mileage?: number | null
  engine_size?: string | null
  cylinders?: number | null
  transmission?: 'Automatic' | 'Manual' | 'CVT' | 'DCT' | null
  fuel_type?: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric' | null
  import_country?: string | null
  seat_count?: number | null
  seat_material?: string | null
  purchase_price: number
  selling_price: number | null
  currency: 'USD' | 'IQD'
  status: 'Available' | 'Reserved' | 'Sold'
  notes: string | null
  created_at: string | null
  photos?: CarPhoto[]
  cover_photo?: CarPhoto | null
}

export interface CarsListResponse {
  total: number
  page: number
  per_page: number
  items: Car[]
}

export interface CarPayload {
  brand: string
  model: string
  manufacturing_year: number
  color: string
  vin: string
  plate_number: string
  mileage: number
  purchase_price: number
  currency?: 'USD' | 'IQD'
  trim?: string
  condition?: string
  plate_status?: string
  engine_size?: string
  cylinders?: number
  transmission?: string
  fuel_type?: string
  import_country?: string
  seat_count?: number
  seat_material?: string
  selling_price?: number
  notes?: string
}

/* ─── API functions ──────────────────────────────────────────────────────── */

export async function getCars(params: {
  page?: number; per_page?: number; status?: string; search?: string
} = {}): Promise<CarsListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.status) qs.set('status', params.status)
  if (params.search) qs.set('search', params.search)
  return get<CarsListResponse>(`/inventory?${qs.toString()}`)
}

export async function getCarById(id: number): Promise<Car> {
  return get<Car>(`/inventory/${id}`)
}

export async function getPublicCars(params: {
  page?: number; per_page?: number; search?: string
} = {}): Promise<CarsListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.search) qs.set('search', params.search)
  return get<CarsListResponse>(`/public/inventory?${qs.toString()}`)
}

export async function getPublicCarById(id: number): Promise<Car> {
  return get<Car>(`/public/inventory/${id}`)
}

export async function createCar(payload: CarPayload): Promise<Car> {
  return post<Car>('/inventory', payload)
}

export async function updateCar(id: number, payload: CarPayload): Promise<Car> {
  return put<Car>(`/inventory/${id}`, payload)
}

export async function uploadCarPhotos(
  carId: number,
  files: File[]
): Promise<{ photos: CarPhoto[] }> {
  const formData = new FormData()
  files.forEach((f) => formData.append('photos', f))
  const { apiClient } = await import('./client')
  const response = await apiClient.post<{ photos: CarPhoto[] }>(
    `/inventory/${carId}/photos`,
    formData,
  )
  return response.data
}

export async function deleteCarPhoto(carId: number, photoId: number): Promise<void> {
  const { apiClient } = await import('./client')
  await apiClient.delete(`/inventory/${carId}/photos/${photoId}`)
}

/* ─── Vehicle Costs & Profitability ─────────────────────────────────────── */

export interface VehicleCostItem {
  id: number
  cost_type: string
  amount: number
  currency: string
  description: string | null
  created_at: string | null
}

export interface VehicleProfitability {
  car_id: number
  brand: string
  model: string
  year: number
  vin: string
  status: string
  purchase_price_iqd: number
  costs_total_iqd: number
  total_cost_iqd: number
  selling_price_iqd: number | null
  net_profit_iqd: number | null
  profit_pct: number | null
  cost_breakdown: Record<string, number>
  costs: VehicleCostItem[]
}

export interface ProfitabilityReport {
  cars: VehicleProfitability[]
  summary: {
    most_profitable: VehicleProfitability[]
    least_profitable: VehicleProfitability[]
    losing: VehicleProfitability[]
    avg_profit_iqd: number
    avg_profit_pct: number
    total_cars: number
    sold_cars: number
  }
}

export function getVehicleCosts(carId: number): Promise<VehicleProfitability> {
  return get<VehicleProfitability>(`/vehicles/${carId}/costs`)
}

export function addVehicleCost(carId: number, data: {
  cost_type: string; amount: number; currency: string; description?: string
}): Promise<VehicleCostItem> {
  return post<VehicleCostItem>(`/vehicles/${carId}/costs`, data)
}

export async function deleteVehicleCost(carId: number, costId: number): Promise<void> {
  const { del } = await import('./client')
  await del(`/vehicles/${carId}/costs/${costId}`)
}

export function getVehicleProfitabilityReport(onlySold = false): Promise<ProfitabilityReport> {
  return get<ProfitabilityReport>(`/reports/vehicle-profitability${onlySold ? '?only_sold=true' : ''}`)
}
