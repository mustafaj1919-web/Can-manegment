import { get, post, put, del } from './client'

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

/* ─── Backend → Frontend field mapper ───────────────────────────────────── */

function mapVehicleFromBackend(v: any): Car {
  // الباكيند يرجع images: string[] (أسماء الملفات فقط)
  // نحوّلها إلى CarPhoto[] لاستخدامها مع photoUrl()
  const rawImages: any[] = v.images ?? v.Images ?? v.photos ?? v.Photos ?? []
  const photos: CarPhoto[] = rawImages.map((img: any) =>
    typeof img === 'string'
      ? { id: img, filename: img, subfolder: 'vehicles' }
      : typeof img === 'object' && img !== null && (img.id ?? img.Id) && (img.fileName ?? img.FileName)
      ? { id: img.id ?? img.Id, filename: img.fileName ?? img.FileName, subfolder: 'vehicles' }
      : img
  )

  // cover photo: from photos array or from coverImage field (list endpoint)
  const coverFilename: string | null = v.coverImage ?? v.CoverImage ?? null
  const cover_photo: CarPhoto | null = photos.length > 0
    ? photos[0]
    : coverFilename
      ? { id: coverFilename, filename: coverFilename, subfolder: 'vehicles' }
      : null

  return {
    id:                v.id               ?? v.Id               ?? '',
    branch_id:         v.branchId         ?? v.branch_id        ?? null,
    brand:             v.brand            ?? v.Brand            ?? '',
    model:             v.model            ?? v.Model            ?? '',
    manufacturing_year: v.year            ?? v.manufacturingYear ?? v.manufacturing_year ?? 0,
    trim:              v.trim             ?? v.Trim             ?? null,
    condition:         v.condition        ?? v.Condition        ?? null,
    color:             v.color            ?? v.Color            ?? null,
    vin:               v.chassisNumber    ?? v.vin              ?? v.ChassisNumber ?? '',
    plate_number:      v.plateNumber      ?? v.plate_number     ?? v.PlateNumber ?? '',
    plate_status:      v.plateStatus      ?? v.plate_status     ?? v.PlateStatus ?? null,
    mileage:           v.mileage          ?? v.Mileage          ?? null,
    engine_size:       v.engineSize       ?? v.EngineSize       ?? v.engine_size ?? null,
    cylinders:         v.cylinders        ?? v.Cylinders        ?? null,
    transmission:      v.transmission     ?? v.Transmission     ?? null,
    fuel_type:         v.fuelType         ?? v.FuelType         ?? v.fuel_type ?? null,
    import_country:    v.importCountry    ?? v.ImportCountry    ?? v.import_country ?? null,
    seat_count:        v.seatCount        ?? v.SeatCount        ?? v.seat_count ?? null,
    seat_material:     v.seatMaterial     ?? v.SeatMaterial     ?? v.seat_material ?? null,
    purchase_price:    v.purchaseCost     ?? v.purchase_price   ?? v.PurchaseCost ?? 0,
    selling_price:     v.targetSellingPrice ?? v.selling_price  ?? v.TargetSellingPrice ?? null,
    currency:          v.currency         ?? v.Currency         ?? 'IQD',
    status:            v.status           ?? v.Status           ?? 'Available',
    notes:             v.notes            ?? v.Notes            ?? null,
    created_at:        v.createdAt        ?? v.created_at       ?? null,
    photos,
    cover_photo,
  }
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
        items: data.map(mapVehicleFromBackend),
        total: res.total ?? data.length,
        page:  res.page  ?? params.page     ?? 1,
        per_page: res.per_page ?? params.per_page ?? 25,
      }
    }
    return data
  }
  return res
}

export async function getCarById(id: string | number): Promise<Car> {
  const res = await get<any>(`/Inventory/${id}`)
  if (res && res.success && res.data) {
    return mapVehicleFromBackend(res.data)
  }
  return mapVehicleFromBackend(res)
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
        items: data.map(mapVehicleFromBackend),
        total: res.total ?? data.length,
        page:  res.page  ?? params.page     ?? 1,
        per_page: res.per_page ?? params.per_page ?? 25,
      }
    }
    return data
  }
  return res
}

export async function getPublicCarById(id: string | number): Promise<Car> {
  const res = await get<any>(`/public/inventory/${id}`)
  if (res && res.success && res.data) {
    return mapVehicleFromBackend(res.data)
  }
  return mapVehicleFromBackend(res)
}

// تحويل حقول الفورم (snake_case) إلى حقول أمر السيارة في الباكيند (PascalCase).
function mapVehicleCreateBody(payload: CarPayload) {
  return {
    Brand:              payload.brand || null,
    Model:              payload.model,
    Trim:               payload.trim || null,
    ChassisNumber:      payload.vin,
    Color:              payload.color || null,
    Year:               payload.manufacturing_year,
    Condition:          payload.condition || null,
    PlateNumber:        payload.plate_number || null,
    PlateStatus:        payload.plate_status || null,
    Mileage:            payload.mileage || null,
    EngineSize:         payload.engine_size || null,
    Cylinders:          payload.cylinders || null,
    Transmission:       payload.transmission || null,
    FuelType:           payload.fuel_type || null,
    ImportCountry:      payload.import_country || null,
    SeatCount:          payload.seat_count || null,
    SeatMaterial:       payload.seat_material || null,
    Currency:           payload.currency ?? 'IQD',
    Notes:              payload.notes || null,
    PurchaseCost:       payload.purchase_price,
    TargetSellingPrice: payload.selling_price ?? payload.purchase_price,
  }
}

export async function createCar(payload: CarPayload): Promise<Car> {
  const res = await post<any>('/Inventory', mapVehicleCreateBody(payload))
  // Backend returns { success: true, vehicleId: "guid", message: "..." }
  if (res?.success && res?.vehicleId) {
    return { id: res.vehicleId, ...payload } as unknown as Car
  }
  return res as Car
}

export async function updateCar(id: string | number, payload: CarPayload): Promise<Car> {
  const body = {
    Brand:              payload.brand || null,
    Model:              payload.model,
    Trim:               payload.trim || null,
    ChassisNumber:      payload.vin,
    Color:              payload.color || null,
    Year:               payload.manufacturing_year,
    Condition:          payload.condition || null,
    PlateNumber:        payload.plate_number || null,
    PlateStatus:        payload.plate_status || null,
    Mileage:            payload.mileage || null,
    EngineSize:         payload.engine_size || null,
    Cylinders:          payload.cylinders || null,
    Transmission:       payload.transmission || null,
    FuelType:           payload.fuel_type || null,
    ImportCountry:      payload.import_country || null,
    SeatCount:          payload.seat_count || null,
    SeatMaterial:       payload.seat_material || null,
    Currency:           payload.currency ?? 'IQD',
    Notes:              payload.notes || null,
    TargetSellingPrice: payload.selling_price ?? 0,
  }
  const res = await put<any>(`/Inventory/${id}`, body)
  // Backend returns { success: true, vehicleId: "guid", message: "..." }
  if (res?.success) {
    return { id: res.vehicleId ?? id, ...payload } as unknown as Car
  }
  return { id, ...payload } as unknown as Car
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
  await del<void>(`/Inventory/${carId}/images/${photoId}`)
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
  const res = await get<any>(`/Inventory/profitability-report?onlySold=${onlySold}`)
  const d = (res && res.success && res.data) ? res.data : res
  return {
    cars: d?.cars ?? [],
    summary: d?.summary ?? { most_profitable: [], least_profitable: [], losing: [], avg_profit_iqd: 0, avg_profit_pct: 0, total_cars: 0, sold_cars: 0 },
  }
}
