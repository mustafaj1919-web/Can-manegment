'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2, Save, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface SalesFloatingActionBarProps {
  isVisible: boolean
  isPending: boolean
  isReady: boolean
  errors: Record<string, string>
  onSubmit: () => void
}

export function SalesFloatingActionBar({
  isVisible,
  isPending,
  isReady,
  errors,
  onSubmit,
}: SalesFloatingActionBarProps) {
  const router = useRouter()
  const errorCount = Object.keys(errors).length

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[calc(100%-2rem)] md:w-full px-4 md:px-0"
        dir="rtl"
      >
        <div className="bg-[#0F172A] text-white border border-slate-700/80 rounded-[20px] p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Status & Validation Error Summary */}
          <div className="flex items-center gap-3 text-xs">
            <div className={`h-3 w-3 rounded-full shrink-0 ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <p className="font-bold text-sm text-slate-100">
                {isReady ? 'جاهز لحفظ الفاتورة' : 'يرجى مراجعة البيانات'}
              </p>
              <p className="text-slate-400 text-[11px]">
                {errorCount > 0
                  ? `يوجد ${errorCount} حقل يتطلب التصحيح`
                  : 'تأكد من اختيار السيارة والعميل وسعر البيع'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isPending}
              className="h-11 px-4 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              إلغاء
            </Button>

            <Button
              type="button"
              onClick={onSubmit}
              disabled={isPending}
              className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg hover:shadow-emerald-600/25 transition-all gap-2 min-w-[150px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>حفظ الفاتورة الآن</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
