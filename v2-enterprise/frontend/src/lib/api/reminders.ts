import { get, post } from './client'

export interface ReminderSettings {
  smsProvider: string // "Simulator" | "Twilio" | "WhatsApp"
  twilioAccountSid: string
  twilioAuthToken: string
  twilioFromNumber: string
  whatsAppToken: string
  dueTodayTemplate: string
  dueSoonTemplate: string
  overdueTemplate: string
}

export interface ReminderHistoryItem {
  id: string
  customerName: string
  phone: string
  type: 'sms' | 'whatsapp'
  message: string
  status: string
  timestamp: string
}

export interface TriggerRemindersResult {
  smsSent: number
  whatsAppSent: number
  details: string[]
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  return get<ReminderSettings>('/reminders/settings')
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<{ message: string }> {
  return post<{ message: string }>('/reminders/settings', settings)
}

export async function triggerReminders(): Promise<TriggerRemindersResult> {
  return post<TriggerRemindersResult>('/reminders/send-due')
}

export async function getReminderHistory(): Promise<ReminderHistoryItem[]> {
  return get<ReminderHistoryItem[]>('/reminders/history')
}
