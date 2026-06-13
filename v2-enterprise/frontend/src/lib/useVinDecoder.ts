'use client'

import { useState } from 'react'
import { BRAND_NAMES, CAR_BRANDS } from '@/data/carBrands'

export interface VinResult {
  brand?: string
  model?: string
  year?: string
  cylinders?: string
  engineSize?: string
  fuelType?: string
  importCountry?: string
}

const COUNTRY_MAP: Record<string, string> = {
  'UNITED STATES (USA)': 'أمريكا',
  'USA': 'أمريكا',
  'UNITED STATES': 'أمريكا',
  'MEXICO': 'المكسيك',
  'CANADA': 'كندا',
  'KOREA (SOUTH)': 'كوريا',
  'SOUTH KOREA': 'كوريا',
  'KOREA': 'كوريا',
  'JAPAN': 'اليابان',
  'GERMANY': 'ألمانيا',
  'CHINA': 'الصين',
  'UNITED KINGDOM': 'بريطانيا',
  'UK': 'بريطانيا',
  'FRANCE': 'فرنسا',
  'ITALY': 'إيطاليا',
  'SWEDEN': 'السويد',
  'AUSTRALIA': 'أستراليا',
  'INDIA': 'الهند',
  'BRAZIL': 'البرازيل',
  'TAIWAN': 'تايوان',
  'SLOVAKIA': 'سلوفاكيا',
  'CZECH REPUBLIC': 'التشيك',
  'HUNGARY': 'هنغاريا',
  'BELGIUM': 'بلجيكا',
  'SPAIN': 'إسبانيا',
  'TURKEY': 'تركيا',
  'SOUTH AFRICA': 'جنوب أفريقيا',
  'THAILAND': 'تايلاند',
}

function normalizeCountry(raw: string): string {
  const upper = raw.toUpperCase().trim()
  for (const [key, val] of Object.entries(COUNTRY_MAP)) {
    if (upper.includes(key)) return val
  }
  return raw
}

function normalizeBrand(raw: string): string {
  const lower = raw.toLowerCase()
  const match = BRAND_NAMES.find((b) => b.toLowerCase() === lower)
  return match || raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

function normalizeModel(brand: string, raw: string): string {
  const models = CAR_BRANDS[brand] || []
  const lower = raw.toLowerCase()
  const match = models.find((m) => m.toLowerCase() === lower)
  return match || raw
}

type NhtsaResult = { Variable: string; Value: string | null }

function parse(results: NhtsaResult[]): VinResult {
  const get = (variable: string) => {
    const item = results.find((r) => r.Variable === variable)
    const v = item?.Value
    return v && v !== 'Not Applicable' && v !== '' && v !== 'null' ? v : undefined
  }

  const rawDisp = get('Displacement (L)')
  let engineSize: string | undefined
  if (rawDisp) {
    const n = Number.parseFloat(rawDisp)
    if (!Number.isNaN(n) && n > 0) engineSize = `${n.toFixed(1)}L`
  }

  const rawFuel = get('Fuel Type - Primary')
  let fuelType: string | undefined
  if (rawFuel) {
    const f = rawFuel.toLowerCase()
    if (f.includes('gasoline') || f === 'gas') fuelType = 'Gasoline'
    else if (f.includes('diesel')) fuelType = 'Diesel'
    else if ((f.includes('hybrid') || f.includes('plug')) && !f.includes('electric')) fuelType = 'Hybrid'
    else if (f.includes('electric')) fuelType = 'Electric'
  }

  const rawCountry = get('Plant Country')
  const importCountry = rawCountry ? normalizeCountry(rawCountry) : undefined

  const rawBrand = get('Make')
  const brand = rawBrand ? normalizeBrand(rawBrand) : undefined

  const rawModel = get('Model')
  const model = brand && rawModel ? normalizeModel(brand, rawModel) : rawModel || undefined

  return {
    brand,
    model,
    year: get('Model Year'),
    cylinders: get('Engine Number of Cylinders'),
    engineSize,
    fuelType,
    importCountry,
  }
}

export function useVinDecoder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decode(vin: string): Promise<VinResult | null> {
    const cleaned = vin.trim().toUpperCase()
    if (cleaned.length !== 17) {
      setError('رقم الشاصي يجب أن يكون 17 حرفاً')
      return null
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${cleaned}?format=json`,
      )
      if (!res.ok) throw new Error('network')
      const data = await res.json()
      const result = parse(data.Results || [])
      if (!result.brand && !result.model && !result.year) {
        setError('لم يتم العثور على بيانات لهذا الشاصي')
        return null
      }
      return result
    } catch {
      setError('فشل في الاتصال بخدمة فك شفرة الشاصي')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { decode, loading, error, clearError: () => setError(null) }
}
