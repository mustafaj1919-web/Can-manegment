type LogLevel = 'info' | 'warn' | 'error'

function sanitizeData(data: any): any {
  if (!data) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }

  const sanitized: Record<string, any> = {}
  const sensitiveKeys = ['token', 'password', 'jwt', 'id_number', 'national_id', 'accountid', 'authorization']

  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some((k) => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeData(data[key])
    } else {
      sanitized[key] = data[key]
    }
  }

  return sanitized
}

export const safeLogger = {
  info: (message: string, meta?: any) => {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, meta ? sanitizeData(meta) : '')
    }
  },
  warn: (message: string, meta?: any) => {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, meta ? sanitizeData(meta) : '')
    }
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta ? sanitizeData(meta) : '')
  },
}
