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
  return get<SystemHealth>('/admin/system-health')
}

export function getAppVersion(): Promise<AppVersion> {
  return get<AppVersion>('/version')
}

export function getAdminLogs(): Promise<{
  buffer: Array<{ timestamp: string; level: string; logger: string; message: string }>
  file_tail: string[]
  log_path: string
}> {
  return get('/admin/logs')
}

/* ─── Autostart ─────────────────────────────────────────────────────────── */

export interface AutostartStatus {
  enabled: boolean
  supported: boolean
  exe_path?: string
  reason?: string
}

export function getAutostart(): Promise<AutostartStatus> {
  return get<AutostartStatus>('/system/autostart')
}

export function setAutostart(enabled: boolean): Promise<AutostartStatus> {
  return post<AutostartStatus>('/system/autostart', { enabled })
}
