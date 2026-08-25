'use client'

import React from 'react'
import { Input } from '@/components/ui/input'

export interface FormattedNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number | undefined
  onChangeValue: (rawNumericValue: string) => void
  allowDecimals?: boolean
}

/** Formats number string with thousands separators e.g. 22000000 -> 22,000,000 */
export function formatWithCommas(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return ''
  const str = String(val).replace(/,/g, '')
  
  // Allow typing single minus or single dot during editing
  if (str === '-' || str === '.' || str === '-.') return str

  const parts = str.split('.')
  // Format integer part with thousands commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

export function unformatCommas(val: string): string {
  return val.replace(/,/g, '')
}

export const FormattedNumberInput = React.forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onChangeValue, allowDecimals = true, className, placeholder = '0', ...props }, ref) => {
    const displayValue = formatWithCommas(value)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputVal = e.target.value
      // Keep only digits, dots, and minus
      if (allowDecimals) {
        inputVal = inputVal.replace(/[^0-9.-]/g, '')
        // Prevent multiple dots
        const parts = inputVal.split('.')
        if (parts.length > 2) {
          inputVal = parts[0] + '.' + parts.slice(1).join('')
        }
      } else {
        inputVal = inputVal.replace(/[^0-9-]/g, '')
      }

      const cleanRaw = unformatCommas(inputVal)
      onChangeValue(cleanRaw)
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        dir="ltr"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        className={className}
      />
    )
  }
)

FormattedNumberInput.displayName = 'FormattedNumberInput'
