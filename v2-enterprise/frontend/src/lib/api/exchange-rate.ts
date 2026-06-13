import { get, post } from './client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface ExchangeRate {
  id: number
  rate: number
  source: 'online' | 'manual'
  updated_at: string | null
  updated_by: string | null
}

export interface AccountingResponse {
  cashbox_balance: number
  total_sales_paid: number
  total_purchases_paid: number
  total_expenses: number
}

/* ─── API functions ──────────────────────────────────────────────────────── */

export async function getExchangeRate(): Promise<ExchangeRate | null> {
  try {
    const data = await get<ExchangeRate | null>('/exchange-rate/current')
    return data ?? null
  } catch {
    return null
  }
}

export async function getExchangeRateHistory(): Promise<ExchangeRate[]> {
  try {
    return await get<ExchangeRate[]>('/exchange-rate/history')
  } catch {
    return []
  }
}

export async function setExchangeRate(
  params: { action: 'manual'; rate: number } | { action: 'online' }
): Promise<ExchangeRate> {
  return post<ExchangeRate>('/exchange-rate', params)
}

export async function getAccountingStats(): Promise<AccountingResponse> {
  return Promise.resolve({
    cashbox_balance: 0,
    total_sales_paid: 0,
    total_purchases_paid: 0,
    total_expenses: 0
  })
}
