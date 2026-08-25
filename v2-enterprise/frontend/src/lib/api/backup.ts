import { apiClient, get, post } from './client'

export interface BackupItem {
  filename: string
  created_at: string
  created_by: string
  reason: string
  size: number
}

export interface BackupListResponse {
  backups: BackupItem[]
}

export async function listBackups(): Promise<BackupListResponse> {
  return get<BackupListResponse>('/Backups')
}

export async function createBackup(reason = 'manual'): Promise<BackupItem> {
  return post<BackupItem>('/Backups', { reason })
}

export async function restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
  return post(`/Backups/${encodeURIComponent(filename)}/restore`)
}

export async function uploadBackup(file: File): Promise<BackupItem> {
  const form = new FormData()
  form.append('file', file)
  const response = await apiClient.post<BackupItem>('/Backups/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  })
  return response.data
}

export function backupDownloadUrl(filename: string): string {
  return `/api/Backups/${encodeURIComponent(filename)}/download`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const REASON_LABELS: Record<string, string> = {
  manual: 'يدوي',
  daily_auto: 'نسخة يومية تلقائية',
  pre_restore_safety: 'نسخة أمان قبل الاستعادة',
  pre_reset_safety: 'نسخة أمان قبل التهيئة',
  online: 'تحديث إلكتروني',
}

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason
}
