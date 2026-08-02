export interface VinValidationResult {
  type: 'vin' | 'chassis' | 'invalid'
  value: string
  isLikelyVin: boolean
  message?: string
}

export function normalizeVinOrChassis(raw: string): string {
  if (!raw) return ''
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function validateVinOrChassis(rawInput: string): VinValidationResult {
  const normalized = normalizeVinOrChassis(rawInput)

  if (!normalized || normalized.length < 3) {
    return {
      type: 'invalid',
      value: normalized,
      isLikelyVin: false,
      message: 'رقم الشاصي قصير جداً غير صالح للمسح',
    }
  }

  // Standard 17-character VIN format (alphanumeric except I, O, Q)
  const isStandardVinLength = normalized.length === 17
  const containsInvalidVinChars = /[IOQ]/.test(normalized)
  const isAlphanumericOnly = /^[A-Z0-9]+$/.test(normalized)

  if (isStandardVinLength && !containsInvalidVinChars && isAlphanumericOnly) {
    return {
      type: 'vin',
      value: normalized,
      isLikelyVin: true,
    }
  }

  if (isAlphanumericOnly) {
    return {
      type: 'chassis',
      value: normalized,
      isLikelyVin: false,
      message: 'رقم شاصي محلي/غير قياسي',
    }
  }

  return {
    type: 'invalid',
    value: normalized,
    isLikelyVin: false,
    message: 'يتضمن رمز غير مسموح به',
  }
}
