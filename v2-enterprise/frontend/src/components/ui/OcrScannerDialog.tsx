'use client'

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  Scan
} from 'lucide-react'
import { post, extractApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export interface OcrResultData {
  brand: string
  model: string
  year: number
  color: string
  chassisNumber: string
  plateNumber?: string
  confidence: number
}

interface OcrScannerDialogProps {
  isOpen: boolean
  onClose: () => void
  onScanComplete: (data: OcrResultData) => void
}

export function OcrScannerDialog({ isOpen, onClose, onScanComplete }: OcrScannerDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStep, setScanStep] = useState<string>('')
  const [scanProgress, setScanProgress] = useState(0)
  const [result, setResult] = useState<OcrResultData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetScanner = () => {
    setFile(null)
    setPreviewUrl(null)
    setIsScanning(false)
    setScanStep('')
    setScanProgress(0)
    setResult(null)
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0]
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile)
        setPreviewUrl(URL.createObjectURL(selectedFile))
        setError(null)
      } else {
        setError('يرجى اختيار ملف صورة صالح (JPEG, PNG).')
      }
    }
  }

  const runOcrScan = async () => {
    if (!file) return

    setIsScanning(true)
    setError(null)
    setScanProgress(5)

    // محاكاة تحريك خطوات المسح في الواجهة بينما نطلب الـ API
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        
        // تحديث رسائل حالة المسح بناءً على النسبة
        const next = prev + Math.floor(Math.random() * 15) + 5
        if (next < 25) setScanStep('جاري رفع صورة المستند وتشفيرها...')
        else if (next < 50) setScanStep('جاري الكشف عن معالم الوثيقة الأساسية...')
        else if (next < 75) setScanStep('جاري قراءة رقم الشاصي وحقول البيانات...')
        else setScanStep('جاري تدقيق البيانات المستخرجة وتأكيدها...')
        
        return Math.min(next, 95)
      })
    }, 250)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await post<{ success: boolean; data: OcrResultData }>(
        '/ocr/scan-document',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )

      clearInterval(progressInterval)
      setScanProgress(100)
      setScanStep('اكتملت قراءة المستند بنجاح!')
      
      // تأخير بسيط لإظهار اكتمال الـ 100%
      setTimeout(() => {
        setIsScanning(false)
        setResult(response.data)
      }, 400)
      
    } catch (err) {
      clearInterval(progressInterval)
      setIsScanning(false)
      const errorMsg = extractApiError(err)
      setError(errorMsg)
      toast.error('فشل مسح المستند: ' + errorMsg)
    }
  }

  const handleApply = () => {
    if (result) {
      onScanComplete(result)
      toast.success('تمت تعبئة بيانات السيارة تلقائياً!')
      onClose()
      resetScanner()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetScanner(); }}>
      <DialogContent className="max-w-[620px] rounded-2xl border border-default bg-card shadow-2xl p-6 overflow-hidden" dir="rtl">
        {/* CSS Animations style tag for scanline and points */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scanSweep {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          .ocr-scan-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(to bottom, transparent, #10B981, transparent);
            box-shadow: 0 0 10px #10B981, 0 0 20px #10B981;
            z-index: 10;
            animation: scanSweep 3s infinite linear;
          }
          @keyframes floatPoint {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
            50% { transform: translateY(-5px) scale(1.1); opacity: 0.8; }
          }
          .ocr-highlight-box {
            position: absolute;
            border: 1.5px dashed #10B981;
            background: rgba(16, 185, 129, 0.08);
            border-radius: 4px;
            animation: floatPoint 2s infinite ease-in-out;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}} />

        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground font-family-cairo">
            <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
            قارئ المستندات الذكي بالذكاء الاصطناعي (AI OCR)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            ارفع صورة سنوية السيارة أو مستند الشراء ليقوم محرك الذكاء الاصطناعي بمسحها وقراءتها آلياً.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* ─── Uploader State ─── */}
        {!file && !isScanning && !result && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-xl p-10 cursor-pointer transition-all duration-200 group text-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="mb-4 rounded-full bg-emerald-500/10 p-4 text-emerald-500 group-hover:scale-110 transition-transform duration-200">
              <Upload className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-foreground">اسحب وأسقط صورة السنوية هنا</p>
            <p className="text-xs text-muted-foreground mt-1.5">أو انقر لتصفح ملفات جهازك</p>
            <div className="mt-6 flex items-center gap-3 text-[10px] text-muted-foreground border border-border/40 rounded-full px-3 py-1.5 bg-secondary/30">
              <FileText className="h-3 w-3 text-emerald-500" />
              <span>يدعم صيغ JPG, PNG مع التعرف الفوري على النصوص العربية والإنجليزية</span>
            </div>
          </div>
        )}

        {/* ─── Scanning State ─── */}
        {file && isScanning && (
          <div className="relative flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-h-[260px] min-h-[220px] rounded-xl overflow-hidden border border-emerald-500/30 flex items-center justify-center bg-zinc-950">
              {/* Scanline laser */}
              <div className="ocr-scan-line" />
              
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Scanned doc"
                  className="w-full h-full object-contain opacity-50 blur-[0.5px]"
                />
              )}

              {/* Floating highlight boxes simulating AI detection */}
              {scanProgress > 15 && (
                <div className="ocr-highlight-box top-[25%] right-[15%] w-[120px] h-[24px]">
                  <span className="text-[8px] font-bold text-emerald-400 bg-black/60 px-1 py-0.5 rounded">الرقم التعريفي (VIN)</span>
                </div>
              )}
              {scanProgress > 45 && (
                <div className="ocr-highlight-box top-[50%] left-[20%] w-[90px] h-[20px]" style={{ animationDelay: '0.4s' }}>
                  <span className="text-[8px] font-bold text-emerald-400 bg-black/60 px-1 py-0.5 rounded">الماركة والموديل</span>
                </div>
              )}
              {scanProgress > 65 && (
                <div className="ocr-highlight-box bottom-[25%] right-[30%] w-[80px] h-[22px]" style={{ animationDelay: '0.8s' }}>
                  <span className="text-[8px] font-bold text-emerald-400 bg-black/60 px-1 py-0.5 rounded">سنة الصنع واللون</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20 flex flex-col justify-end p-4 text-center">
                <p className="text-xs font-bold text-emerald-400 animate-pulse flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {scanStep}
                </p>
                <div className="w-full bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Results State ─── */}
        {file && !isScanning && result && (
          <div className="space-y-4">
            <div className="flex gap-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="relative w-[140px] h-[100px] shrink-0 rounded-lg border border-border overflow-hidden bg-zinc-950 flex items-center justify-center">
                {previewUrl && <img src={previewUrl} alt="Document" className="w-full h-full object-cover" />}
                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">نتائج التحليل البصري</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ثقة المسح: {result.confidence}%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">اسم الملف: {file.name}</p>
                </div>
                <button
                  onClick={resetScanner}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-emerald-500 transition-colors mt-2"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  إعادة مسح مستند آخر
                </button>
              </div>
            </div>

            {/* Extracted Fields Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-secondary/10">
              <div className="grid grid-cols-2 text-xs border-b border-border/80 bg-secondary/20 p-2 font-bold text-foreground/80">
                <div>حقل البيانات المستخرج</div>
                <div>القيمة المكتشفة</div>
              </div>
              <div className="divide-y divide-border/60">
                {[
                  { label: 'ماركة السيارة (Make)', val: result.brand, field: 'Brand' },
                  { label: 'طراز السيارة (Model)', val: result.model, field: 'Model' },
                  { label: 'سنة الصنع (Year)', val: result.year, field: 'Year' },
                  { label: 'اللون (Color)', val: result.color, field: 'Color' },
                  { label: 'رقم الشاصي (Chassis / VIN)', val: result.chassisNumber, field: 'ChassisNumber', code: true },
                  { label: 'رقم اللوحة المقترح', val: result.plateNumber ?? 'غير متوفر', field: 'PlateNumber' },
                ].map((item, i) => (
                  <div key={i} className="grid grid-cols-2 p-2.5 text-xs transition-colors hover:bg-card">
                    <div className="text-muted-foreground font-semibold">{item.label}</div>
                    <div className={item.code ? "font-mono font-bold tracking-wider text-emerald-500" : "font-semibold text-foreground"}>
                      {item.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
          {!result && file && !isScanning ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={resetScanner}>
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={runOcrScan}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 font-family-cairo"
              >
                <Scan className="h-4 w-4" />
                بدء المعالجة بالذكاء الاصطناعي
              </Button>
            </>
          ) : result ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => { onClose(); resetScanner(); }}>
                إغلاق
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 font-family-cairo"
              >
                <Check className="h-4 w-4" />
                اعتماد وتعبئة البيانات تلقائياً
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => { onClose(); resetScanner(); }}>
                إغلاق
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
