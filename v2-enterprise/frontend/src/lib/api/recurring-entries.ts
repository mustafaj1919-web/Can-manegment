import { get, post, del } from './client'

export interface RecurringLine {
  id?: string
  account_code: string
  account_name: string
  is_debit: boolean
  amount: number
  description?: string
}

export interface RecurringTemplate {
  id: string
  name: string
  description: string
  frequency: string
  day_of_month: number
  is_active: boolean
  last_run_at: string | null
  created_at: string
  lines: RecurringLine[]
}

export async function getRecurringEntries(): Promise<RecurringTemplate[]> {
  const res = await get<any>('/RecurringEntries')
  return (res?.success && res?.data) ? res.data : (res?.data ?? [])
}

export async function createRecurringEntry(payload: {
  name: string
  description?: string
  frequency?: string
  dayOfMonth?: number
  lines: Array<{ accountCode: string; accountName: string; isDebit: boolean; amount: number; description?: string }>
}): Promise<{ id: string; message: string }> {
  return post<any>('/RecurringEntries', {
    Name: payload.name,
    Description: payload.description ?? '',
    Frequency: payload.frequency ?? 'Monthly',
    DayOfMonth: payload.dayOfMonth ?? 1,
    Lines: payload.lines.map(l => ({
      AccountCode: l.accountCode,
      AccountName: l.accountName,
      IsDebit: l.isDebit,
      Amount: l.amount,
      Description: l.description,
    })),
  })
}

export async function deleteRecurringEntry(id: string): Promise<void> {
  await del(`/RecurringEntries/${id}`)
}

export async function executeRecurringEntry(id: string): Promise<{ entry_number: string; message: string }> {
  return post<any>(`/RecurringEntries/${id}/execute`, {})
}
