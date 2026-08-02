export type VehicleStatusType = 'Available' | 'Reserved' | 'Sold' | 'UnderMaintenance' | string

export interface VehicleListItem {
  id: string
  brand?: string | null
  model: string
  trim?: string | null
  chassisNumber: string
  color?: string | null
  year: number
  condition?: string | null
  mileage?: number | null
  transmission?: string | null
  fuelType?: string | null
  currency: string
  purchaseCost: number
  bookValue: number
  targetSellingPrice: number
  isSold: boolean
  status: VehicleStatusType
  branchId: string
  coverImage?: string | null
  supplierId?: string | null
  supplierName?: string | null
}

export interface VehicleImageDto {
  id: string
  fileName: string
}

export interface VehicleCostDto {
  id: string
  costType: string
  amount: number
  currency: string
  description?: string | null
  createdAt: string
}

export interface VehicleDetails {
  id: string
  brand?: string | null
  model: string
  trim?: string | null
  chassisNumber: string
  engineNumber?: string | null
  color?: string | null
  year: number
  condition?: string | null
  plateNumber?: string | null
  plateStatus?: string | null
  mileage?: number | null
  engineSize?: string | null
  cylinders?: number | null
  transmission?: string | null
  fuelType?: string | null
  importCountry?: string | null
  seatCount?: number | null
  seatMaterial?: string | null
  currency: string
  notes?: string | null
  purchaseCost: number
  customDuties: number
  maintenanceCost: number
  totalCost: number
  bookValue: number
  targetSellingPrice: number
  isSold: boolean
  status: VehicleStatusType
  branchId: string
  images: VehicleImageDto[]
  detailedCosts: VehicleCostDto[]
}

export interface InventoryQueryFilters {
  status?: string
  search?: string
  page?: number
  perPage?: number
}

export interface InventoryListResponse {
  success: boolean
  total: number
  page: number
  per_page: number
  data: VehicleListItem[]
}

export function getStatusBadgeConfig(status: VehicleStatusType): {
  label: string
  badgeStatus: 'Available' | 'Reserved' | 'Sold' | 'Overdue' | 'Cancelled'
} {
  switch (status) {
    case 'Available':
      return { label: 'متاح للبيع', badgeStatus: 'Available' }
    case 'Reserved':
      return { label: 'محجوز', badgeStatus: 'Reserved' }
    case 'Sold':
      return { label: 'مباع', badgeStatus: 'Sold' }
    case 'UnderMaintenance':
      return { label: 'تحت الصيانة', badgeStatus: 'Overdue' }
    default:
      return { label: status, badgeStatus: 'Available' }
  }
}
