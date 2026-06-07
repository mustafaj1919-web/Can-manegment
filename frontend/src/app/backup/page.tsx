'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, DatabaseBackup, Download, RefreshCw, RotateCcw, Upload } from 'lucide-react'
import {
  backupDownloadUrl,
  createBackup,
  formatBytes,
  listBackups,
  reasonLabel,
  restoreBackup,
  uploadBackup,
  type BackupItem,
} from '@/lib/api/backup'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" dir="rtl">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a1628] p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className={cn('h-5 w-5', danger ? 'text-rose-400' : 'text-amber-400')} />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>إلغاء</Button>
          <Button
            size="sm"
            className={cn(danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500', 'text-white')}
            onClick={onConfirm}
          >
            تأكيد
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function BackupPage() {
  const qc = useQueryClient()
  const [confirmRestore, setConfirmRestore] = useState<BackupItem | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backups'],
    queryFn: listBackups,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () => createBackup('manual'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadBackup(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backups'] })
      setUploadError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'فشل رفع الملف'
      setUploadError(msg)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (filename: string) => restoreBackup(filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backups'] })
      setConfirmRestore(null)
    },
  })

  const busy = createMutation.isPending || restoreMutation.isPending || uploadMutation.isPending

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    uploadMutation.mutate(file)
  }

  return (
    <div className="space-y-5" dir="rtl">
      {confirmRestore && (
        <ConfirmDialog
          title="تأكيد الاستعادة"
          description={`سيتم استعادة النسخة الاحتياطية "${confirmRestore.filename}". ستُنشأ نسخة أمان تلقائياً قبل المتابعة. هل تريد الاستمرار؟`}
          onConfirm={() => restoreMutation.mutate(confirmRestore.filename)}
          onCancel={() => setConfirmRestore(null)}
          danger
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
            <DatabaseBackup className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">النسخ الاحتياطي والاستعادة</h1>
            <p className="text-xs text-muted-foreground">إدارة نسخ قاعدة البيانات وملفات uploads</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            aria-label="رفع نسخة احتياطية"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="رفع نسخة احتياطية من جهاز آخر"
          >
            {uploadMutation.isPending
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Upload className="h-4 w-4" />}
            رفع نسخة
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => createMutation.mutate()}
            disabled={busy}
          >
            {createMutation.isPending
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <DatabaseBackup className="h-4 w-4" />}
            إنشاء نسخة احتياطية الآن
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-xs text-rose-300">{uploadError}</p>
        </div>
      )}

      {uploadMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
          <p className="text-xs text-emerald-300">تم رفع النسخة الاحتياطية بنجاح — يمكنك الآن استعادتها</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : isError ? (
        <div className="glass rounded-lg py-16 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
          <p className="text-sm text-muted-foreground">تعذر تحميل قائمة النسخ الاحتياطية</p>
        </div>
      ) : !data?.backups?.length ? (
        <div className="glass rounded-lg py-16 text-center">
          <DatabaseBackup className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">لا توجد نسخ احتياطية بعد</p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-lg">
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">قائمة النسخ السابقة</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{data.backups.length} نسخة</p>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {data.backups.map((backup) => (
              <li key={backup.filename} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{backup.filename}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(backup.created_at)} · {backup.created_by} · {reasonLabel(backup.reason)} · {formatBytes(backup.size)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-1.5 border border-white/10 text-xs"
                  >
                    <a href={backupDownloadUrl(backup.filename)} download>
                      <Download className="h-3.5 w-3.5" />
                      تحميل
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 border border-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/10"
                    onClick={() => setConfirmRestore(backup)}
                    disabled={busy}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    استعادة
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
