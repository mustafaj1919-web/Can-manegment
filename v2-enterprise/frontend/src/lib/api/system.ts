import { get, post } from './client'

export interface SystemHealth {
  checked_at: string
  version?: string
  status: 'ok' | 'attention'
  warnings: string[]
  database: {
    path: string
    exists: boolean
    size: number
    integrity: string
    foreign_key_issues: Record<string, unknown>[]
    table_counts: Record<string, number | null>
  }
  accounting?: {
    accounts_count: number
    journal_entries_count: number
    trial_balance: 'balanced' | 'unbalanced' | string
    trial_difference: number
    integrity_issues: number
    unbalanced_entries: number
  }
  backups: {
    count: number
    latest: Array<{
      filename: string
      size: number
      created_at: string
      created_by: string
      reason: string
    }>
  }
  logs: Array<{
    name: string
    path: string
    size: number
    modified_at: string
  }>
  error_log?: Array<{
    timestamp: string
    level: string
    logger: string
    message: string
  }>
  runtime: {
    data_dir: string
    upload_folder: string
    backup_folder: string
    session_lifetime_hours: number
    secure_cookie: boolean
  }
}

export interface AppVersion {
  version: string
  app: string
}

export function getSystemHealth(): Promise<SystemHealth> {
  return Promise.resolve({
    checked_at: new Date().toISOString(),
    status: 'ok',
    warnings: [],
    database: {
      path: '',
      exists: true,
      size: 0,
      integrity: 'ok',
      foreign_key_issues: [],
      table_counts: {}
    },
    backups: {
      count: 0,
      latest: []
    },
    logs: [],
    runtime: {
      data_dir: '',
      upload_folder: '',
      backup_folder: '',
      session_lifetime_hours: 8,
      secure_cookie: false
    }
  })
}

export function getAppVersion(): Promise<AppVersion> {
  return Promise.resolve({
    version: 'v2.0-enterprise',
    app: 'Car Showroom Management System V2'
  })
}

export function getAdminLogs(): Promise<{
  buffer: Array<{ timestamp: string; level: string; logger: string; message: string }>
  file_tail: string[]
  log_path: string
}> {
  return Promise.resolve({
    buffer: [],
    file_tail: [],
    log_path: ''
  })
}

/* ─── Autostart ─────────────────────────────────────────────────────────── */

export interface AutostartStatus {
  enabled: boolean
  supported: boolean
  exe_path?: string
  reason?: string
}

export function getAutostart(): Promise<AutostartStatus> {
  return Promise.resolve({
    enabled: false,
    supported: false,
    reason: 'غير مدعوم في هذا الإصدار'
  })
}

export function setAutostart(enabled: boolean): Promise<AutostartStatus> {
  return Promise.reject(new Error('ضبط التشغيل التلقائي غير متاح حالياً'))
}
