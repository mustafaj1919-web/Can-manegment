import { get, post } from './client'

export interface FiscalYear {
  id: string
  year: number
  start_date: string
  end_date: string
  status: 'Open' | 'Closed'
  notes: string | null
  created_at: string
}

export async function getFiscalYears(): Promise<FiscalYear[]> {
  const res = await get<any>('/FiscalYears')
  return (res?.success && res?.data) ? res.data : (res?.data ?? [])
}

export async function createFiscalYear(payload: {
  year: number
  startDate: string
  endDate: string
  notes?: string
}): Promise<{ id: string; message: string }> {
  return post<any>('/FiscalYears', {
    Year: payload.year,
    StartDate: payload.startDate + 'T00:00:00Z',
    EndDate: payload.endDate + 'T23:59:59Z',
    Notes: payload.notes,
  })
}

export async function closeFiscalYear(id: string): Promise<{ closing_entry_id: string; message: string }> {
  return post<any>(`/FiscalYears/${id}/close`, {})
}
