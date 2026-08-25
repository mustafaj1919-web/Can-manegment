'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Image, Plus, Trash2, Copy, Check, Upload, 
  Loader2, AlertCircle, Eye, Search, ExternalLink 
} from 'lucide-react'
import { getWebsiteMedia, uploadWebsiteMedia, deleteWebsiteMedia } from '@/lib/api/website'

export default function MediaCMS() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [copiedId, setCopiedId] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-media', search, page],
    queryFn: () => getWebsiteMedia(search, page, 24),
    staleTime: 10_000
  })

  const uploadMutation = useMutation({
    mutationFn: uploadWebsiteMedia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-media'] })
      setUploadError(null)
    },
    onError: (err) => {
      setUploadError(err.message || 'حدث خطأ أثناء رفع الملف.')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteMedia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-media'] })
      if (previewItem) setPreviewItem(null)
    }
  })

  const handleCopyPath = (filePath, id) => {
    const relativePath = `/static/uploads/website/${filePath}`
    navigator.clipboard.writeText(relativePath)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    uploadMutation.mutate(formData)
  }

  const handleDelete = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الملف نهائياً من الخادم؟')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">جاري تحميل مكتبة الوسائط...</span>
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-muted-foreground">فشل تحميل مكتبة الوسائط. تأكد من صلاحيات المستخدم.</p>
      </div>
    )
  }

  const items = data.data.items

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground font-family-cairo flex items-center gap-3">
            <Image className="h-7 w-7 text-violet-400" />
            مكتبة الوسائط
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">رفع وإدارة الصور والشعارات والملفات المتاحة للاستخدام في محتوى صفحات ومقالات الموقع.</p>
        </div>
        
        {/* Upload Button */}
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs cursor-pointer transition-transform hover:scale-105 active:scale-95 self-start sm:self-center">
          <Upload className="h-4.5 w-4.5" />
          <span>رفع ملف جديد</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      {/* Upload Status / Error alerts */}
      {uploadError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadMutation.isPending && (
        <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>جاري رفع الملف وحفظه...</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="البحث باسم الملف أو النص البديل..."
          className="w-full rounded-lg border border-border bg-[var(--card)] ps-10 pe-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Media Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          لا توجد ملفات وسائط متطابقة.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <div key={item.id} className="group relative bg-[var(--card)] border border-border/40 rounded-2xl overflow-hidden shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between">
              {/* Image box */}
              <div className="relative aspect-square w-full bg-secondary/10 flex items-center justify-center overflow-hidden">
                <img
                  src={`/static/uploads/website/${item.filePath}`}
                  alt={item.fileName}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                />
                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 text-white transition-colors"
                    title="عرض كامل"
                  >
                    <Eye className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => handleCopyPath(item.filePath, item.id)}
                    className="p-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 text-white transition-colors"
                    title="نسخ المسار"
                  >
                    {copiedId === item.id ? <Check className="h-4.5 w-4.5 text-emerald-400" /> : <Copy className="h-4.5 w-4.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Filename details */}
              <div className="p-2 border-t border-border/20">
                <span className="text-[10px] text-foreground font-semibold truncate block w-full" title={item.fileName}>
                  {item.fileName}
                </span>
                <span className="text-[8px] text-muted-foreground block">
                  {Math.round(item.fileSize / 1024)} KB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
          <div className="w-full max-w-2xl bg-[var(--card)] border border-border/40 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/20 pb-4">
              <h3 className="font-bold text-sm text-foreground truncate max-w-md">{previewItem.fileName}</h3>
              <button 
                onClick={() => setPreviewItem(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                إغلاق
              </button>
            </div>
            <div className="aspect-video w-full bg-secondary/15 rounded-xl overflow-hidden flex items-center justify-center">
              <img 
                src={`/static/uploads/website/${previewItem.filePath}`} 
                alt={previewItem.fileName} 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block">تاريخ الرفع:</span>
                <span className="text-foreground font-semibold">{new Date(previewItem.createdAt).toLocaleDateString('ar-IQ')}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block">رابط الملف الداخلي:</span>
                <div className="flex items-center gap-2 bg-secondary/20 p-2 rounded-lg font-mono text-[10px] break-all select-all">
                  <span>/static/uploads/website/{previewItem.filePath}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
