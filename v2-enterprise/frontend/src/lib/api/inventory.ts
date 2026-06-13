import { get, post, put } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface CarPhoto {
  id: string | number
  filename: string
  subfolder?: string
}

export interface Car {
  id: string | number
  branch_id: string | number | null
  branch?: { id: string | number; name: string; is_main: boolean; created_at?: string } | null
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
  const res = await get<any>(`/Inventory?${qs.toString()}`)
  if (res && res.success && res.data) {
    const data = res.data
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params.page ?? 1,
        per_page: params.per_page ?? 25
      }
    }
    return data
  }
  return res
}

export async function getCarById(id: string | number): Promise<Car> {
  const res = await get<any>(`/Inventory/${id}`)
  if (res && res.success && res.data) {
    return res.data
  }
  return res
}

export async function getPublicCars(params: {
  page?: number; per_page?: number; search?: string
} = {}): Promise<CarsListResponse> {
  const qs = new URLSearchParams()
  qs.set('page',     String(params.page     ?? 1))
  qs.set('per_page', String(params.per_page ?? 25))
  if (params.search) qs.set('search', params.search)
  const res = await get<any>(`/public/inventory?${qs.toString()}`)
  if (res && res.success && res.data) {
    const data = res.data
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params.page ?? 1,
        per_page: params.per_page ?? 25
      }
    }
    return data
  }
  return res
}

export async function getPublicCarById(id: string | number): Promise<Car> {
  const res = await get<any>(`/public/inventory/${id}`)
  if (res && res.success && res.data) {
    return res.data
  }
  return res
}

export async function createCar(payload: CarPayload): Promise<Car> {
  return post<Car>('/Inventory', payload)
}

export async function updateCar(id: string | number, payload: CarPayload): Promise<Car> {
  // لا توجد دالة تعديل في الخلفية حالياً، نقوم برفض العملية
  return Promise.reject(new Error('تعديل بيانات السيارات غير متاح حالياً'))
}

export async function uploadCarPhotos(
  carId: string | number,
  files: File[]
): Promise<{ photos: CarPhoto[] }> {
  if (files.length === 0) return { photos: [] }
  const { apiClient } = await import('./client')
  const uploadedPhotos: CarPhoto[] = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await apiClient.post<any>(
        `/Inventory/${carId}/images`,
        formData,
      )
      if (response.data && response.data.success) {
        uploadedPhotos.push({
          id: response.data.vehicleImageId,
          filename: response.data.filename ?? file.name,
          subfolder: 'vehicles'
        })
      }
    } catch (error) {
      console.error(`Failed to upload photo ${file.name}:`, error)
    }
  }

  return { photos: uploadedPhotos }
}

export async function deleteCarPhoto(carId: string | number, photoId: string | number): Promise<void> {
  // حذف الصور غير مدعوم في الخلفية بنقطة اتصال منفصلة
  return Promise.resolve()
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

export async function getVehicleCosts(carId: number | string): Promise<VehicleProfitability> {
  // جلب تكاليف السيارة يتم عن طريق جلب تفاصيل السيارة نفسها وضبط الاستجابة
  const res = await get<any>(`/Inventory/${carId}`)
  if (res && res.success && res.data) {
    const car = res.data
    const purchasePrice = car.purchasePrice ?? car.purchase_price ?? 0
    const bookValue = car.bookValue ?? car.total_cost ?? purchasePrice
    return {
      car_id: Number(carId),
      brand: car.brand ?? '',
      model: car.model ?? '',
      year: car.manufacturingYear ?? car.year ?? 0,
      vin: car.vin ?? car.chassisNumber ?? '',
      status: car.status ?? '',
      purchase_price_iqd: purchasePrice,
      costs_total_iqd: Math.max(0, bookValue - purchasePrice),
      total_cost_iqd: bookValue,
      selling_price_iqd: car.sellingPrice ?? car.selling_price ?? null,
      net_profit_iqd: car.sellingPrice ? (car.sellingPrice - bookValue) : null,
      profit_pct: car.sellingPrice ? ((car.sellingPrice - bookValue) / bookValue) * 100 : null,
      cost_breakdown: {},
      costs: car.costs ?? []
    }
  }
  return res
}

export function addVehicleCost(carId: number | string, data: {
  cost_type: string; amount: number; currency: string; description?: string
}): Promise<VehicleCostItem> {
  // مطابقة الحقول إلى PascalCase لـ ASP.NET Core Command
  const payload = {
    CostType: data.cost_type,
    Amount: data.amount,
    Currency: data.currency,
    Description: data.description
  }
  return post<any>(`/Inventory/${carId}/costs`, payload).then(res => {
    return {
      id: res.vehicleCostId,
      cost_type: data.cost_type,
      amount: data.amount,
      currency: data.currency,
      description: data.description ?? null,
      created_at: new Date().toISOString()
    }
  })
}

export async function deleteVehicleCost(carId: number | string, costId: number | string): Promise<void> {
  // حذف التكلفة غير مدعوم في الخلفية بنقطة اتصال منفصلة
  return Promise.resolve()
}

export async function getVehicleProfitabilityReport(onlySold = false): Promise<ProfitabilityReport> {
  // تقرير الربحية غير مدعوم بالخلفية، نرجع كائن فارغ لإظهار شاشة فارغة دون 404
  return Promise.resolve({
    cars: [],
    summary: {
      most_profitable: [],
      least_profitable: [],
      losing: [],
      avg_profit_iqd: 0,
      avg_profit_pct: 0,
      total_cars: 0,
      sold_cars: 0
    }
  })
}
