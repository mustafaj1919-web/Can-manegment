import { apiClient } from './client'

export interface NotificationItem {
  id: string
  customer_name: string
  car_name: string
  invoice_number: string
  amount: number
  currency: string
  due_date: string
  status: string
}

export interface NotificationsResponse {
  overdue: NotificationItem[]
  due_today: NotificationItem[]
  due_soon: NotificationItem[]
  defaulting_customers: any[]
  audit_logs: any[]
}

export async function getNotificationsList(): Promise<NotificationsResponse> {
  const res = await apiClient.get<NotificationsResponse>('/Notifications')
  return res.data
}
