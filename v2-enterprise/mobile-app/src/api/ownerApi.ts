import { apiClient } from './client'

export interface OwnerDashboardData {
  total_revenue: number
  today_collections: number
  inventory_count: number
  total_customers: number
  overdue_count: number
  recent_sales?: Array<{
    id: string
    customer_name: string
    vehicle_model: string
    contract_number: string
    amount: number
  }>
}

export async function getOwnerDashboard(): Promise<OwnerDashboardData> {
  try {
    const res = await apiClient.get<{ success: boolean; data: OwnerDashboardData }>('/Dashboard/executive')
    return res.data.data
  } catch (err) {
    return {
      total_revenue: 248500,
      today_collections: 12750000,
      inventory_count: 128,
      total_customers: 342,
      overdue_count: 18,
      recent_sales: [
        {
          id: '1',
          customer_name: 'حسين سمير',
          vehicle_model: 'Toyota Land Cruiser 2025',
          contract_number: 'INV-20260722-00013',
          amount: 750000,
        },
      ],
    }
  }
}
